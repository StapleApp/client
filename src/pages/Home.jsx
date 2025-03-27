import logo from "../assets/logoDark.svg";
import FriendsBar from "./FriendsBar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import React, { useEffect } from "react";

const Home = () => {
  const navigate = useNavigate();

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
        <div className="background fixed grid grid-cols-3 bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-screen left-16 top-0 z-0">
          <div>
            <FriendsBar />
          </div>
          <div>
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={handleLogout}
            >
              Log Out
            <div>
          </div>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Home;
