import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navigator from "./Components/layout/Navigator";

// Route-based Code Splitting (lazy loading) — sayfa kodları sadece ihtiyaç duyulduğunda yüklenir
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));
const AddFriendsPage = lazy(() => import("./features/friends/AddFriendsPage"));
const SearchServerPage = lazy(() => import("./features/servers/SearchServerPage"));
const ProfileSettings = lazy(() => import("./features/profile/ProfileSettings"));
const HomePage = lazy(() => import("./features/home/HomePage"));
const DirectMessagingPage = lazy(() => import("./features/messaging/DirectMessagingPage"));
const CreateServerPage = lazy(() => import("./features/servers/CreateServerPage"));
const ServerPage = lazy(() => import("./features/servers/ServerPage"));
const InvitePage = lazy(() => import("./features/servers/InvitePage"));

const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const LoginPage = lazy(() => import("./features/auth/LoginPage")); 
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));
const TermsPage = lazy(() => import("./features/auth/TermsPage"));
const CreateProfilePage = lazy(() => import("./features/auth/CreateProfilePage"));
const AuthCallbackPage = lazy(() => import("./features/auth/AuthCallbackPage"));
const ResetPasswordPage = lazy(() => import("./features/auth/ResetPasswordPage"));

import { AnimatePresence, MotionConfig } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { VoiceProvider } from "./context/VoiceContext";
import { MusicProvider } from "./context/MusicContext";
import VoiceBar from "./Components/voice/VoiceBar";
import MusicPanel from "./Components/voice/MusicPanel";
import ImageLightbox from "./Components/chat/ImageLightbox";

import ProtectedRoute from "./Components/layout/ProtectedRoute";
import NotFound from "./Components/layout/NotFound";
import ErrorBoundary from "./Components/layout/ErrorBoundary";
import { MobileMenuProvider, useMobileMenu } from "./context/MobileMenuContext";
import { PresenceProvider } from "./context/PresenceContext";
import { NavDataProvider } from "./context/NavDataContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// framer-motion animasyonlarını "Hareketi azalt" tercihine bağla
function MotionPrefs({ children }) {
  const { reduceMotion } = useTheme();
  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <MotionPrefs>
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
                    <ImageLightbox />
                  </Router>
                </MusicProvider>
              </VoiceProvider>
            </MobileMenuProvider>
          </NavDataProvider>
        </PresenceProvider>
      </AuthProvider>
      </MotionPrefs>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function MainLayout() {
  const location = useLocation();
  const { setIsOpen } = useMobileMenu();
  const { parallax, reduceMotion } = useTheme();

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
    // Parallax kapalı ya da hareket azaltılmışsa: dinleme yok, ofseti sıfırla
    if (!parallax || reduceMotion) {
      document.documentElement.style.setProperty("--parallax-x", "0px");
      document.documentElement.style.setProperty("--parallax-y", "0px");
      return undefined;
    }
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      document.documentElement.style.setProperty("--parallax-x", `${x * 12}px`);
      document.documentElement.style.setProperty("--parallax-y", `${y * 12}px`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [parallax, reduceMotion]);

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

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--primary-bg)] text-[var(--secondary-text)]">
      <div className="w-8 h-8 border-4 border-[var(--tertiary-bg)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AnimatedSwitch() {
  const location = useLocation();
  return (
    <>
      <Toaster />
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/Home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/Settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/AddFriends" element={<ProtectedRoute><AddFriendsPage /></ProtectedRoute>} />
            <Route path="/SearchServer" element={<ProtectedRoute><SearchServerPage /></ProtectedRoute>} />
            <Route path="/Profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
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
        </Suspense>
      </AnimatePresence>
    </>
  );
}

export default App;
