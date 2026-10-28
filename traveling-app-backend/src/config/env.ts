import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
  PAYMENT_MODE: process.env.PAYMENT_MODE || 'disabled',
  MOCK_WEBHOOK_SECRET: process.env.MOCK_WEBHOOK_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  PAYMENT_HOLD_MINUTES: Number(process.env.PAYMENT_HOLD_MINUTES || 15),
  TAX_RATE: Number(process.env.TAX_RATE || 0),
  DATABASE_SSL: process.env.DATABASE_SSL || 'no-verify',
};

if (!['disabled','mock','stripe_test'].includes(ENV.PAYMENT_MODE)) throw new Error('Invalid PAYMENT_MODE');
if (ENV.NODE_ENV === 'production' && ENV.PAYMENT_MODE === 'mock') throw new Error('Mock payments are disabled in production');
if (ENV.PAYMENT_MODE === 'stripe_test' && (!ENV.STRIPE_SECRET_KEY.startsWith('sk_test_') || !ENV.STRIPE_WEBHOOK_SECRET.startsWith('whsec_'))) throw new Error('Stripe TEST key and webhook secret required');
if (!Number.isInteger(ENV.PAYMENT_HOLD_MINUTES) || ENV.PAYMENT_HOLD_MINUTES < 1 || ENV.PAYMENT_HOLD_MINUTES > 60) throw new Error('Invalid PAYMENT_HOLD_MINUTES');
if (!Number.isFinite(ENV.TAX_RATE) || ENV.TAX_RATE < 0 || ENV.TAX_RATE > 1) throw new Error('Invalid TAX_RATE');
if (!['disable','verify','no-verify'].includes(ENV.DATABASE_SSL)) throw new Error('DATABASE_SSL must be disable, verify, or no-verify');
