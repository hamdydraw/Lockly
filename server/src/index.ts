import 'express-async-errors'; // must be imported before routes: forwards async errors to errorHandler
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { itemsRouter } from './routes/items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = env.NODE_ENV === 'production';

const app = express();

app.set('trust proxy', 1); // honor X-Forwarded-* behind the host's TLS proxy (Railway/Render)
app.use(
  helmet({
    // Allow the built SPA + Google Fonts to load while keeping scripts locked to same-origin.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  }),
);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- API (namespaced under /api so it never collides with client routes) ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'lockly', time: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/items', apiLimiter, itemsRouter);
app.use('/api/files', apiLimiter, filesRouter);

// Unknown API path → JSON 404 (before the SPA fallback below)
app.use('/api', notFound);

// ---- Static client (production single-service deploy) ----
if (isProd) {
  const clientDir = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDir));
  // SPA fallback: any non-API GET returns index.html so client-side routing works on refresh/deep-link.
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
});
