import express from 'express';
import cors from 'cors';
import sqliteRouter from './modules/sqlite/router.js';
import { env } from './shared/config/env.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health
app.use('/api/health', sqliteRouter);

// Auth (login, me, logout)
app.use('/api/auth', sqliteRouter);

// Dashboard data from SQLite
app.use('/api/dashboard', sqliteRouter);

// SPA fallback — отдаём 404 для API маршрутов (фронтенд отдаёт Netlify)
app.get('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(env.PORT, () => {
  console.warn(
    `[api] Listening on http://localhost:${env.PORT} (${env.NODE_ENV}), source=sqlite`
  );
});

function shutdown(signal: string): void {
  console.warn(`[api] ${signal} received, shutting down`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
