import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// App chrome: the blue intranet header bar with the app name and the logged-in
// user + log-out control, then the routed page below.
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <div className="header">
        <Link to="/" className="header-title">
          Relay
        </Link>
        {user && (
          <div className="header-right">
            <span>{user.name}</span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
}
