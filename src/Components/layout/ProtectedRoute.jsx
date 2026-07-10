import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// requireProfile=false → /create_profile gibi "girişli ama profili eksik"
// kullanıcının görebileceği sayfalar için.
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const { currentUser, userData, loading, passwordRecovery } = useAuth();
  const location = useLocation();

  // AuthContext zaten spinner gösteriyor
  if (loading) return null;

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Şifre sıfırlama oturumu uygulamayı gezmek için değil
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;

  // userData null olabilir (profil çekilemedi) — o durumda kilitleme, içeri al.
  if (requireProfile && userData && !userData.nickName) {
    return <Navigate to="/create_profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
