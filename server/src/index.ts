// Relay API entry point.
// NOTE: ./config/env.js MUST be imported before anything that reads process.env,
// so it loads the .env file first (see the comment in env.ts).
import { config } from './config/env.js';

import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
// All project/task routes require a valid JWT.
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);

// 404 fallback (Express 5: a middleware with no path matches everything left).
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`Relay API listening on http://localhost:${config.port}`);
});
