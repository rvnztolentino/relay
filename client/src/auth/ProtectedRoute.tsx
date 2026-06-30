import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Gate routes that need a logged-in user. While the session is being restored we
// hold off rendering; once known, either show the page or redirect to /login.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
