import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Hook that redirects unauthenticated users to the login page.
 * Uses AuthContext as the single source of truth (not localStorage).
 */
export const useRequireAuth = (redirectTo = "/login") => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate(redirectTo, { replace: true });
    }
  }, [currentUser, loading, navigate, redirectTo]);

  return { currentUser, loading };
};
