import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navigator from "./Components/layout/Navigator";
import SettingsPage from "./features/settings/SettingsPage";
import AddFriendsPage from "./features/friends/AddFriendsPage";
import SearchServerPage from "./features/servers/SearchServerPage";
import ProfilePage from "./features/profile/ProfilePage";
import HomePage from "./features/home/HomePage";
import DirectMessagingPage from "./features/messaging/DirectMessagingPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import CreateServerPage from "./features/servers/CreateServerPage";
import ServerPage from "./features/servers/ServerPage";

import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { VoiceProvider } from "./context/VoiceContext";
import VoiceBar from "./Components/voice/VoiceBar";

import RegisterPage from "./features/auth/RegisterPage";
import LoginPage from "./features/auth/LoginPage"; 
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import TermsPage from "./features/auth/TermsPage";
import CreateProfilePage from "./features/auth/CreateProfilePage";
import ProtectedRoute from "./Components/layout/ProtectedRoute";
import NotFound from "./Components/layout/NotFound";
import ErrorBoundary from "./Components/layout/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <VoiceProvider>
          <Router>
            <MainLayout />
            <VoiceBar />
          </Router>
        </VoiceProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function MainLayout() {
  const location = useLocation();
  const hideNavigatorRoutes = ["/login", "/signin", "/forgetPassword", "/terms", "/create_profile"];

  return (
    <div className="flex">
      {!hideNavigatorRoutes.includes(location.pathname) && <Navigator />}
      <div className="flex-1">
        <AnimatedSwitch />
      </div>
    </div>
  );
}

function AnimatedSwitch() {
  return (
    <>
      <Toaster />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/Home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/Settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/AddFriends" element={<ProtectedRoute><AddFriendsPage /></ProtectedRoute>} />
          <Route path="/SearchServer" element={<ProtectedRoute><SearchServerPage /></ProtectedRoute>} />
          <Route path="/Profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/DirectMessaging" element={<ProtectedRoute><DirectMessagingPage /></ProtectedRoute>} />
          <Route path="/Notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/create-server" element={<ProtectedRoute><CreateServerPage /></ProtectedRoute>} />
          <Route path="/server/:serverId/*" element={<ProtectedRoute><ServerPage /></ProtectedRoute>} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<RegisterPage />} />      
          <Route path="/forgetPassword" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/create_profile" element={<CreateProfilePage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
