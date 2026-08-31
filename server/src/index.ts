import 'express-async-errors'; // must be imported before routes: forwards async errors to errorHandler
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

const app = express();

app.set('trust proxy', 1); // correct req.ip behind a local proxy/dev setup
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'secure-vault', time: new Date().toISOString() });
});

app.use('/auth', authLimiter, authRouter);
app.use(apiLimiter);
app.use('/items', itemsRouter);
app.use('/files', filesRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
