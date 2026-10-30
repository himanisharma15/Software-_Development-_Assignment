import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

dotenv.config();

console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'Missing');

console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Loaded' : 'Missing');

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  JWT_SECRET: z.string().default('dev-secret'),
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal('')),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal('')),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),
  SLACK_CLIENT_ID: z.string().optional().or(z.literal('')),
  SLACK_CLIENT_SECRET: z.string().optional().or(z.literal('')),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:4000/api/slack/callback'),
  SLACK_OAUTH_STATE_TTL_MS: z.coerce.number().default(10 * 60 * 1000),
  WORKER_CONCURRENCY: z.coerce.number().default(4),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(100),
  SENDER_COUNT: z.coerce.number().default(3),
  BULL_BOARD_USER: z.string().default('admin'),
  BULL_BOARD_PASS: z.string().default('admin')
});

export const env = envSchema.parse(process.env);

if (!env.GOOGLE_CLIENT_ID) {
  console.warn('GOOGLE_CLIENT_ID is empty. Google OAuth will not work until it is configured.');
}

if (!env.SLACK_CLIENT_ID) {
  console.warn('SLACK_CLIENT_ID is empty. Slack OAuth will not work until it is configured.');
}
