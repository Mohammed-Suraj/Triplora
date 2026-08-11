/**
 * LIVE email diagnostic — sends one real email through Resend and prints the
 * COMPLETE API response (HTTP status, body, error code/name/message).
 * Uses raw fetch to capture everything the SDK might hide.
 *
 * Usage: npx tsx scripts/send-live-test.ts [recipient]
 */
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

const RESEND_API = 'https://api.resend.com/emails';
const key = process.env.RESEND_API_KEY ?? '';
const from = process.env.EMAIL_FROM || 'Triplora <onboarding@resend.dev>';
const to = process.argv[2] ?? 'mohammedsuraj098@gmail.com';

console.log('=== ENV LOAD ===');
console.log('cwd:', process.cwd());
console.log('loaded .env file:', path.join(process.cwd(), '.env'));
console.log('RESEND_API_KEY set:', key.length > 0, '| first6:', key.length > 6 ? key.slice(0, 6) + '...' : '(none)', '| length:', key.length);
console.log('EMAIL_FROM:', from);
console.log('to (recipient):', to);
console.log('NODE_ENV:', process.env.NODE_ENV ?? 'development');

const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#0f1f1b;padding:32px;color:#e8f2ef;">
    <h1 style="font-family:Georgia,serif;color:#ffffff;">Triplora Email Test</h1>
    <p>This is a live test email from Triplora.</p>
    <p style="color:#9db8b2;font-size:13px;">Sent ${new Date().toISOString()}</p>
  </div>`;

async function main(): Promise<void> {
  if (!key) {
    console.log('\n=== RESULT: NO API KEY ===');
    console.log('RESEND_API_KEY is empty in .env -> mock mode. Nothing was sent.');
    process.exit(1);
  }

  console.log('\n=== SENDING (raw fetch) ===');
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject: 'Triplora Email Test', html }),
    });

    const bodyText = await res.text();
    console.log('HTTP Status:', res.status, res.statusText);
    console.log('Response Body:', bodyText);

    let parsed: { id?: string; name?: string; message?: string; code?: string } | null = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }

    if (res.ok && parsed?.id) {
      console.log('\n=== DELIVERED TO RESEND ===');
      console.log('Success Response: email accepted, Resend message id =', parsed.id);
      console.log('Status: SENT (queued for delivery)');
    } else {
      console.log('\n=== RESEND REJECTED ===');
      console.log('Error Code:', parsed?.code ?? '(none)');
      console.log('Error Name:', parsed?.name ?? '(none)');
      console.log('Error Message:', parsed?.message ?? '(none)');
    }
  } catch (err) {
    console.log('\n=== NETWORK/CLIENT ERROR ===');
    console.log('Error:', err instanceof Error ? err.message : String(err));
    console.log('Error Code:', (err as { code?: string })?.code ?? '(none)');
  }
}

void main();
