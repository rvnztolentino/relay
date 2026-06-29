// Relay API entry point.
// NOTE: ./config/env.js MUST be imported before anything that reads process.env,
// so it loads the .env file first (see the comment in env.ts).
import { config } from './config/env.js';

import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);

// 404 fallback (Express 5: a middleware with no path matches everything left).
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`Relay API listening on http://localhost:${config.port}`);
});
