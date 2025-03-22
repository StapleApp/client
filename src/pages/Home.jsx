import logo from "../assets/logoDark.svg";
import FriendsBar from "./FriendsBar";
import { motion } from "framer-motion";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

const Home = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        console.log("Firebase User:", user);
      } else {
        setCurrentUser(null);
        console.log("No user is logged in");
      }
    });

    return () => unsubscribe(); 
  }, [auth]);

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.1 }}
        className="fixed top-0 left-0 w-full h-screen"
      >
        <div className="fixed grid grid-cols-3 bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-[calc(100vw-16rem)] left-16 top-0 z-0">
          <div>
            <FriendsBar />
          </div>
          <div className="w-auto h-auto col-start-2 mt-auto mb-auto text-5xl font-bold">
            <img src={logo} className="rounded-full opacity-15" />
            {currentUser ? `Welcome, ${currentUser.email}!` : "HOME"}
          </div>
          <div>
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Home;
