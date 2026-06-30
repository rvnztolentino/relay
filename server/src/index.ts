// Relay API entry point.
// NOTE: ./config/env.js MUST be imported before anything that reads process.env,
// so it loads the .env file first (see the comment in env.ts).
import { config } from './config/env.js';

import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import attachmentsRouter from './routes/attachments.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
// All project/task routes require a valid JWT.
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/attachments', requireAuth, attachmentsRouter);

// 404 fallback (Express 5: a middleware with no path matches everything left).
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler. Turns Multer upload errors (e.g. oversized files) into clean
// JSON instead of Express's default HTML 500.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.message });
  }
  console.error('[server] unhandled error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Relay API listening on http://localhost:${config.port}`);
});
