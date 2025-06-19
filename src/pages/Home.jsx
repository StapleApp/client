import SocialBar from "../Components/SocialBar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData === null) {
      navigate("/login");
    } 
    console.log(userData.nickName)
  }, [userData, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.1 }}
      className="fixed top-0 left-0 w-full h-screen"
    >
      <div
        className="background fixed grid grid-cols-3 
        bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-screen top-0 z-0"
      >
        <div>
          <SocialBar />
        </div>
        <div className="w-auto h-auto col-start-2 my-auto text-5xl font-bold">
          ANA SAYFA
        </div>
      </div>
    </motion.div>
  );
};

export default Home;
