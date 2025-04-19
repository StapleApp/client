import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import { IoLogInOutline } from "react-icons/io5";
import { FaPowerOff } from "react-icons/fa6";

const Settings = () => {
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

    return(
        <>
            <motion.div
                initial={{ opacity: 0, x: -100 }}  
                animate={{ opacity: 1, x: 0 }}   
                exit={{ opacity: 0, x: 100 }}   
                transition={{ duration: 0.1 }}  
                className="fixed top-0 left-0 w-full h-screen"
                >
                <div className="fixed grid grid-cols-3 background bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-screen top-0 z-0">
                    <div className="w-auto h-auto col-start-2 mt-auto mb-auto text-5xl font-bold">
                    <div>
                        <SideBarLogOut handleLogout={handleLogout}/>
                        <SideBarPowerOff />
                    </div>
                    </div>
                </div>
            </motion.div>
        </>
    );   
};

const SideBarLogOut = ({ handleLogout }) => {
    return (
      <>
        <div
          className={`icon group w-100 h-30`}
          onClick={handleLogout}
        >
            <IoLogInOutline size="100" />
            <span className="ml-4">Log Out</span>
        </div>
      </>
    );
};

const SideBarPowerOff = () => {
    const navigate = useNavigate();
    return (
      <>
        <div
          className={`icon group w-100 h-30`}
        >
          <FaPowerOff size="80" />
          <span className="ml-4">Kapat</span>
        </div>
      </>
    );
};
  
export default Settings;