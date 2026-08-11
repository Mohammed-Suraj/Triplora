import fs from 'node:fs/promises';
import path from 'node:path';
import { Resend } from 'resend';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import type { EmailLog, EmailStatus, EmailType } from '@prisma/client';
import * as templates from '../emails/templates';
import type {
  BookingEmailInput,
  BookingCancelledEmailInput,
  PaymentEmailInput,
  AiTripSavedEmailInput,
  TripReminderEmailInput,
} from '../emails/templates';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_MAX_AGE_HOURS = 24;
const PREVIEW_DIR = path.join(process.cwd(), '.email-previews');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function savePreview(to: string, subject: string, html: string): Promise<string> {
  const file = path.join(
    PREVIEW_DIR,
    `${Date.now()}-${to.replace(/[^a-z0-9@._-]/gi, '_')}-${subject
      .replace(/[^a-z0-9@._-]/gi, '_')
      .slice(0, 60)}.html`,
  );
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.writeFile(file, html, 'utf8');
  return file;
}

export interface EmailPrefs {
  bookingEmails: boolean;
  marketingEmails: boolean;
  aiPlannerEmails: boolean;
  tripReminderEmails: boolean;
}

export interface EnqueueInput {
  to: string;
  type: EmailType;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  /** Explicit user prefs. null/omitted = resolved from the recipient user. */
  prefs?: Partial<EmailPrefs> | null;
}

/** Which preference key gates each email type (undefined = always sent). */
const PREF_GATE: Partial<Record<EmailType, keyof EmailPrefs>> = {
  BOOKING_CONFIRMATION: 'bookingEmails',
  PAYMENT_SUCCESS: 'bookingEmails',
  BOOKING_CANCELLED: 'bookingEmails',
  AI_TRIP_SAVED: 'aiPlannerEmails',
  TRIP_REMINDER: 'tripReminderEmails',
};

class EmailService {
  private client: Resend | null = null;

  constructor() {
    if (env.email.resendApiKey) {
      this.client = new Resend(env.email.resendApiKey);
    } else {
      console.warn(
        '[email] RESEND_API_KEY is not set — running in MOCK mode. Emails are logged and written to .email-previews/ instead of being sent.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Persist an email to EmailLog and process it in the background.
   * Never blocks the calling flow: the API response is returned immediately
   * and failures are recorded + retried by the scheduler.
   */
  enqueue(input: EnqueueInput): void {
    void this.enqueueAndProcess(input);
  }

  private async enqueueAndProcess(input: EnqueueInput): Promise<void> {
    let prefs: EmailPrefs | null = null;
    if (input.prefs === undefined) {
      try {
        const user = await userRepository.findByEmail(input.to);
        if (user) prefs = prefsOf(user);
      } catch {
        // Preference lookup is best-effort; send anyway.
      }
    } else if (input.prefs !== null) {
      prefs = { ...defaultPrefs(), ...input.prefs };
    }

    const gate = PREF_GATE[input.type];
    if (gate && prefs && !prefs[gate]) {
      await this.persistLog(input, 'SKIPPED', {
        reason: `recipient disabled ${gate}`,
      });
      return;
    }

    let log: EmailLog;
    try {
      log = await prisma.emailLog.create({
        data: {
          to: input.to,
          type: input.type,
          subject: input.subject,
          html: input.html,
          status: 'PENDING',
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    } catch (err) {
      console.error(
        `[email] failed to persist log (${input.type} -> ${input.to}): ${err instanceof Error ? err.message : err}`,
      );
      // Fall back to a direct background send so the email still goes out.
      void this.deliver(input.to, input.subject, input.html, null);
      return;
    }

    void this.processLog(log.id);
  }

  /** Deliver one persisted log with in-process retry/backoff. */
  async processLog(logId: string): Promise<void> {
    const log = await prisma.emailLog.findUnique({ where: { id: logId } });
    if (!log || log.status === 'SENT' || log.status === 'SKIPPED') return;

    const result = await this.deliver(log.to, log.subject, log.html, log);

    const data: { status: EmailStatus; attempts: number; error?: string | null; sentAt?: Date } = {
      status: result.ok ? 'SENT' : 'FAILED',
      attempts: result.attempts,
      error: result.error ?? null,
    };
    if (result.ok && !log.sentAt) data.sentAt = new Date();

    await prisma.emailLog.update({ where: { id: log.id }, data });
  }

  /**
   * Retry emails that previously failed or were orphaned as PENDING
   * (e.g. process crashed mid-send). Bounded by attempts and age so a
   * permanently-broken recipient never loops forever.
   */
  async retryFailed(): Promise<number> {
    const ageCutoff = new Date(Date.now() - RETRY_MAX_AGE_HOURS * 60 * 60 * 1000);
    const stalePendingCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const logs = await prisma.emailLog.findMany({
      where: {
        createdAt: { gte: ageCutoff },
        attempts: { lt: RETRY_MAX_ATTEMPTS },
        OR: [
          { status: 'FAILED' },
          { status: 'PENDING', createdAt: { lte: stalePendingCutoff } },
        ],
      },
      take: 50,
    });
    for (const log of logs) {
      await this.processLog(log.id);
    }
    return logs.length;
  }

  private async deliver(
    to: string,
    subject: string,
    html: string,
    log: EmailLog | null,
  ): Promise<{ ok: boolean; attempts: number; id?: string; error?: string }> {
    let attempts = 0;
    let lastError: string | undefined;

    if (!this.client) {
      const previewPath = await savePreview(to, subject, html);
      console.log(`[email:MOCK] -> ${to} | type/attempts/status below | preview: ${previewPath}`);
      return { ok: true, attempts: 1 };
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      attempts = attempt;
      try {
        const { data, error } = await this.client.emails.send({
          from: env.email.from,
          to,
          subject,
          html,
        });
        if (error) throw new Error(error.message);
        console.log(`[email] sent -> ${to} | subject: "${subject}" | id: ${data?.id ?? 'n/a'}`);
        return { ok: true, id: data?.id, attempts };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(
          `[email] send failed (attempt ${attempt}/${MAX_ATTEMPTS}) -> ${to} | subject: "${subject}" | ${lastError}`,
        );
        if (attempt < MAX_ATTEMPTS) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }

    return { ok: false, attempts, error: lastError };
  }

  private async persistLog(
    input: EnqueueInput,
    status: EmailStatus,
    extra?: { reason?: string },
  ): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          to: input.to,
          type: input.type,
          subject: input.subject,
          html: input.html,
          status,
          error: extra?.reason ?? null,
          attempts: 0,
          sentAt: status === 'SENT' ? new Date() : null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    } catch (err) {
      console.error(
        `[email] failed to persist ${status} log (${input.type} -> ${input.to}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Typed flow helpers (all fire-and-forget)
  // -------------------------------------------------------------------------

  sendWelcomeEmail(to: string, name: string, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.welcomeEmail({
      name,
      exploreUrl: `${env.email.frontendUrl}/explore`,
      websiteUrl: env.email.frontendUrl,
    });
    this.enqueue({ to, type: 'WELCOME', subject, html, prefs });
  }

  sendVerificationEmail(to: string, name: string, verificationUrl: string, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.verificationEmail({ name, verificationUrl });
    this.enqueue({ to, type: 'VERIFICATION', subject, html, prefs });
  }

  sendForgotPasswordEmail(to: string, name: string, resetUrl: string, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.forgotPasswordEmail({
      name,
      resetUrl,
      expiresInLabel: '15 minutes',
    });
    this.enqueue({ to, type: 'FORGOT_PASSWORD', subject, html, prefs });
  }

  sendPasswordResetEmail(to: string, name: string, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.passwordResetEmail({
      name,
      exploreUrl: `${env.email.frontendUrl}/explore`,
    });
    this.enqueue({ to, type: 'PASSWORD_RESET', subject, html, prefs });
  }

  sendBookingConfirmationEmail(to: string, input: BookingEmailInput, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.bookingConfirmationEmail(input);
    this.enqueue({
      to,
      type: 'BOOKING_CONFIRMATION',
      subject,
      html,
      metadata: { bookingId: input.bookingId, destination: input.destinationName },
      prefs,
    });
  }

  sendPaymentSuccessEmail(to: string, input: PaymentEmailInput, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.paymentSuccessEmail(input);
    this.enqueue({
      to,
      type: 'PAYMENT_SUCCESS',
      subject,
      html,
      metadata: { bookingId: input.bookingId, paymentId: input.paymentId },
      prefs,
    });
  }

  sendBookingCancelledEmail(to: string, input: BookingCancelledEmailInput, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.bookingCancelledEmail(input);
    this.enqueue({
      to,
      type: 'BOOKING_CANCELLED',
      subject,
      html,
      metadata: { bookingId: input.bookingId },
      prefs,
    });
  }

  sendAiTripSavedEmail(to: string, input: AiTripSavedEmailInput, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.aiTripSavedEmail(input);
    this.enqueue({
      to,
      type: 'AI_TRIP_SAVED',
      subject,
      html,
      metadata: { tripPlanId: input.tripPlanId },
      prefs,
    });
  }

  sendTripReminderEmail(to: string, input: TripReminderEmailInput, prefs?: Partial<EmailPrefs> | null): void {
    const { subject, html } = templates.tripReminderEmail(input);
    this.enqueue({
      to,
      type: 'TRIP_REMINDER',
      subject,
      html,
      metadata: { bookingId: input.bookingId },
      prefs,
    });
  }

  /** Send a raw email with full logging (used by the test script). */
  sendLogged(to: string, type: EmailType, subject: string, html: string, metadata?: Record<string, unknown>): Promise<EmailLog> {
    return new Promise((resolve, reject) => {
      prisma.emailLog
        .create({
          data: {
            to,
            type,
            subject,
            status: 'PENDING',
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        })
        .then((log) => {
          this.processLog(log.id)
            .then(async () => {
              const updated = await prisma.emailLog.findUnique({ where: { id: log.id } });
              resolve(updated ?? log);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }
}

function defaultPrefs(): EmailPrefs {
  return {
    bookingEmails: true,
    marketingEmails: true,
    aiPlannerEmails: true,
    tripReminderEmails: true,
  };
}

function prefsOf(user: {
  bookingEmails: boolean;
  marketingEmails: boolean;
  aiPlannerEmails: boolean;
  tripReminderEmails: boolean;
}): EmailPrefs {
  return {
    bookingEmails: user.bookingEmails,
    marketingEmails: user.marketingEmails,
    aiPlannerEmails: user.aiPlannerEmails,
    tripReminderEmails: user.tripReminderEmails,
  };
}

export const emailService = new EmailService();
export { prefsOf };
