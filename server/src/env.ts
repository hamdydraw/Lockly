import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the server directory root (works regardless of cwd).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env.`);
  }
  return v;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '2h',
  DATA_ENCRYPTION_KEY: required('DATA_ENCRYPTION_KEY'),
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Extra allowed origins, comma-separated. The Android APK is a WebView served
  // from its own origin (see CAPACITOR_ORIGINS in index.ts), never the web app's.
  CORS_EXTRA_ORIGINS: process.env.CORS_EXTRA_ORIGINS ?? '',
  // Persistent blob dir (set to a mounted volume in production). storage.ts reads
  // process.env.STORAGE_DIR directly; mirrored here for visibility.
  STORAGE_DIR: process.env.STORAGE_DIR ?? '',
  // "true" reopens the register endpoint after the first account is created.
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION ?? '',
};
