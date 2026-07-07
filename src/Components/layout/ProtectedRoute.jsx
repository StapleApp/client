import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // AuthContext already shows a loading spinner while loading
  if (loading) return null;

  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
