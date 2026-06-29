// Augments Express's Request type so authenticated handlers can read `req.user`.
// requireAuth (middleware/auth.ts) sets this after verifying the JWT.

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

export {};
