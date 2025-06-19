import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Logging out...");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Çıkış Yapılıyor...</h2>
    </div>
  );
}
