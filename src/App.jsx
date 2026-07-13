import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navigator from "./Components/layout/Navigator";
import SettingsPage from "./features/settings/SettingsPage";
import AddFriendsPage from "./features/friends/AddFriendsPage";
import SearchServerPage from "./features/servers/SearchServerPage";
import ProfilePage from "./features/profile/ProfilePage";
import ProfileSettings from "./features/profile/ProfileSettings";
import HomePage from "./features/home/HomePage";
import DirectMessagingPage from "./features/messaging/DirectMessagingPage";
import CreateServerPage from "./features/servers/CreateServerPage";
import ServerPage from "./features/servers/ServerPage";
import InvitePage from "./features/servers/InvitePage";

import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { VoiceProvider } from "./context/VoiceContext";
import { MusicProvider } from "./context/MusicContext";
import VoiceBar from "./Components/voice/VoiceBar";
import MusicPanel from "./Components/voice/MusicPanel";

import RegisterPage from "./features/auth/RegisterPage";
import LoginPage from "./features/auth/LoginPage"; 
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import TermsPage from "./features/auth/TermsPage";
import CreateProfilePage from "./features/auth/CreateProfilePage";
import AuthCallbackPage from "./features/auth/AuthCallbackPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import ProtectedRoute from "./Components/layout/ProtectedRoute";
import NotFound from "./Components/layout/NotFound";
import ErrorBoundary from "./Components/layout/ErrorBoundary";
import { MobileMenuProvider, useMobileMenu } from "./context/MobileMenuContext";
import { PresenceProvider } from "./context/PresenceContext";
import { NavDataProvider } from "./context/NavDataContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <PresenceProvider>
          <NavDataProvider>
            <MobileMenuProvider>
              <VoiceProvider>
                <MusicProvider>
                  <Router>
                    <MainLayout />
                    <VoiceBar />
                    <MusicPanel />
                  </Router>
                </MusicProvider>
              </VoiceProvider>
            </MobileMenuProvider>
          </NavDataProvider>
        </PresenceProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function MainLayout() {
  const location = useLocation();
  const { setIsOpen } = useMobileMenu();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, setIsOpen]);

  const hideNavigatorRoutes = [
    "/login",
    "/signin",
    "/forgetPassword",
    "/terms",
    "/create_profile",
    "/auth/callback",
    "/reset-password",
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      document.documentElement.style.setProperty("--parallax-x", `${x * 12}px`);
      document.documentElement.style.setProperty("--parallax-y", `${y * 12}px`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="flex">
      {!hideNavigatorRoutes.includes(location.pathname) &&
        !location.pathname.startsWith("/invite/") && (
        <div className="hidden md:block shrink-0">
          <Navigator />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <AnimatedSwitch />
      </div>
    </div>
  );
}

function AnimatedSwitch() {
  const location = useLocation();
  return (
    <>
      <Toaster />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/Home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/Settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/AddFriends" element={<ProtectedRoute><AddFriendsPage /></ProtectedRoute>} />
          <Route path="/SearchServer" element={<ProtectedRoute><SearchServerPage /></ProtectedRoute>} />
          <Route path="/Profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/ProfileSettings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
          <Route path="/DirectMessaging" element={<ProtectedRoute><DirectMessagingPage /></ProtectedRoute>} />
          <Route path="/create-server" element={<ProtectedRoute><CreateServerPage /></ProtectedRoute>} />
          <Route path="/server/:serverId/*" element={<ProtectedRoute><ServerPage /></ProtectedRoute>} />
          <Route path="/invite/:code" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<RegisterPage />} />      
          <Route path="/forgetPassword" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/create_profile"
            element={
              <ProtectedRoute requireProfile={false}>
                <CreateProfilePage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
