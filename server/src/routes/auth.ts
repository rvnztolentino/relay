// Auth routes — Phase 3.
//   POST /api/auth/register  (public)  create a user, return a JWT
//   POST /api/auth/login     (public)  verify credentials, return a JWT
//   GET  /api/auth/me        (private) return the current user's profile
// Raw SQL against the `users` table; passwords hashed with bcrypt.

import { Router } from 'express';
import { pool } from '../config/db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/token.js';
import { errMessage, isUniqueViolation } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Deliberately simple email check — good enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), passwordHash, name.trim()],
    );

    const user = rows[0];
    const token = signToken({ sub: Number(user.id), email: user.email });
    return res.status(201).json({ token, user });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    console.error('[auth] register failed:', errMessage(err));
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, password_hash, created_at
         FROM users
        WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = rows[0];

    // One generic message whether the email is unknown or the password is wrong,
    // so we don't reveal which emails are registered.
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
    };
    const token = signToken({ sub: Number(row.id), email: row.email });
    return res.json({ token, user });
  } catch (err) {
    console.error('[auth] login failed:', errMessage(err));
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, created_at FROM users WHERE id = $1`,
      [req.user!.id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    console.error('[auth] me failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
