import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    // Fail fast in production, warn in development so local setup isn't blocked immediately.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`[env] Warning: ${name} is not set. Using empty value.`);
    return '';
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5001),
  apiPrefix: process.env.API_PREFIX ?? '/api',

  clientOrigins: [
    ...(process.env.CLIENT_ORIGIN ?? 'http://localhost:1574')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // Local dev frontends must always be able to reach the API (including the
    // production API) so a locally-run Admin panel can read production data.
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  razorpay: {
    keyId: required('RAZORPAY_KEY_ID'),
    keySecret: required('RAZORPAY_KEY_SECRET'),
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM || 'Triplora <onboarding@resend.dev>',
    frontendUrl: process.env.FRONTEND_URL ?? process.env.CLIENT_ORIGIN?.split(',')[0] ?? 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
  },
};
