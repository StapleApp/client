import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navigator from "./Components/Navigator";
import Home from "./pages/Home"; 
import Settings from "./pages/Settings";
import AddFriends from "./pages/AddFriends"; 
import SearchServer from "./pages/SearchServer";
import Profile from "./pages/Profile";
import DirectMessaging from "./pages/DirectMessaging";
import Notifications from "./pages/Notifications";
import CreateServer from "./pages/CreateServer";
import Server from "./pages/ServerPage";

import { AnimatePresence } from "framer-motion";


import SignIn from "./auth/signin";
import Login from "./auth/login"; 
import EmailVerification from "./auth/emailVerification";
import Terms from "./auth/terms";
import CreateProfile from "./auth/createProfile";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

import Logout from "./pages/clear_user";

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>  
    </AuthProvider>
  );
}

function MainLayout() {
  const location = useLocation();
  const hideNavigatorRoutes = ["/login", "/signin", "/forgetPassword", "/terms", "/create_profile","/cleare_user"];

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
          <Route path="/" element={<Profile />} />
          <Route path="/Home" element={<Profile />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/AddFriends" element={<AddFriends />} />
          <Route path="/SearchServer" element={<SearchServer />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/DirectMessaging" element={<DirectMessaging />} />
          <Route path="/Notifications" element={<Notifications />} />
          <Route path="/create-server" element={<CreateServer />} />
          <Route path="/server/:serverId/*" element={<Server />} />


          {/* Auth Routes */}

          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<SignIn />} />      
          <Route path="/forgetPassword" element={<EmailVerification />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/create_profile" element={<CreateProfile />} />

          <Route path="/clear_user" element={<Logout />} />
          
          
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
