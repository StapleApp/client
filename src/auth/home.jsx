import React , { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  // Kullanici çikis fonksiyonu
  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  // Kullanici daha once giris yapmamissa login sayfasına yonlendirir.
  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
  
    if (!storedUser) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div>
      <button 
        type="button" 
        className="font-semibold text-indigo-600 hover:text-indigo-500"
        onClick={handleLogout}
      >
        Log Out
      </button>
    </div>
  );
};

export default Home;
