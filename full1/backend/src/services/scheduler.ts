import { emailService } from './email.service';
import { runDueReminders } from './reminder.service';

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // hourly
const RETRY_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const REMINDER_FIRST_RUN_DELAY_MS = 30 * 1000;
const RETRY_FIRST_RUN_DELAY_MS = 60 * 1000;

let started = false;

/**
 * Background email workers:
 *  - trip reminders 24h before departure (hourly scan)
 *  - retry of failed emails (every 15 min, bounded)
 * Both run fire-and-forget so the HTTP server is never blocked.
 */
export function startEmailSchedulers(): void {
  if (started) return;
  started = true;

  setTimeout(() => {
    void runDueReminders();
  }, REMINDER_FIRST_RUN_DELAY_MS);
  setInterval(() => {
    void runDueReminders();
  }, REMINDER_INTERVAL_MS);

  setTimeout(() => {
    void emailService.retryFailed();
  }, RETRY_FIRST_RUN_DELAY_MS);
  setInterval(() => {
    void emailService.retryFailed();
  }, RETRY_INTERVAL_MS);

  console.log('[email] schedulers started (trip reminders hourly, failed-email retries every 15 min).');
}
