import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute component acts as a navigation guard.
 * Redirects unauthenticated users to the login portal.
 * 
 * @returns {React.ReactElement} The protected content or a redirect to login.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
