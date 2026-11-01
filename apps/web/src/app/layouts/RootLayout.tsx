import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiMe } from '@/shared/api/api';

export function RootLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiMe();
        if (active) setIsAuthenticated(true);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => { active = false; };
  }, []);

  if (!authChecked) return null;

  if (!isAuthenticated && location.pathname !== '/login') {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Outlet />
    </div>
  );
}
