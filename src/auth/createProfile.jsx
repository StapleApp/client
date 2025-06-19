import React, { useState ,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import toast from 'react-hot-toast';
import { onAuthStateChanged } from "firebase/auth";
import { UpdateNickname } from "../../firebase";
import profileImage from "../assets/360.png";
import { useAuth } from "../context/AuthContext";


const CreateProfile = () => {
  // Kullanıcının takma adını tutmak için state
  const [nickname, setNickname] = useState('');
  // Kullanıcının profil fotoğrafını tutmak için state
  const [profilePhoto, setProfilePhoto] = useState(null);
  const { userData } = useAuth();
  const navigate = useNavigate(); // Sayfalar arasında geçiş yapmak için hook
  const auth = getAuth(); // Firebase kimlik doğrulama nesnesi

  // Profil fotoğrafı değiştirildiğinde çalışacak fonksiyon
  const handleChangeImage = (e) => {
    const file = e.target.files[0]; // Seçilen ilk dosyayı al
    if (file) setProfilePhoto(file); // Dosya varsa state'e kaydet
  };

  // Form gönderildiğinde çalışacak fonksiyon
  const handleSubmit = async (e) => {
    e.preventDefault(); // Sayfanın yeniden yüklenmesini engeller

    // Nickname boş bırakılmışsa uyarı ver
    if (nickname === "") {
      toast.error("Nickname cannot be blank");
      return;
    }

    // Nickname 12 karakterden uzunsa uyarı ver
    if (nickname.length > 12) {
      toast.error("Nickname should be less than 12 characters");
      return;
    }

    // Kullanıcı oturum açmış mı kontrol et
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Current User:", user); // Kullanıcı konsola yazdırılır
        UpdateNickname(user.uid, nickname); // Takma ad güncellenir (UpdateNickname fonksiyonu senin tanımladığın bir fonksiyon olmalı)
        navigate('/home'); // Kullanıcı ana sayfaya yönlendirilir
      } else {
        console.log("No user is signed in."); // Oturum açan kullanıcı yoksa bilgi ver
      }
    });
  };

  useEffect(() => {
     console.log(userData.nickName)
     if(userData.nickName !== ""){
      navigate("/home")
     }
  });

return (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex min-h-full w-96 flex-col justify-center px-10 py-12 lg:px-12 bg-white border border-gray-300 rounded-2xl shadow-lg">
      <h3 className="mb-4 text-center text-2xl font-bold tracking-tight text-gray-900">
        Create Your Profile
      </h3>

      <div className="flex flex-col items-center relative">
        <div className="w-32 h-32 mb-4 rounded-full bg-gray-300 flex items-center justify-center">
        <img
            src={profileImage}
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
  
        <label className="absolute bottom-28 right-20 p-1 bg-gray-200 rounded-full cursor-pointer shadow-lg">
            <img src="https://img.icons8.com/?size=100&id=35635&format=png&color=000000" 
              alt="Edit Icon" 
              className="w-6 h-6"
            />
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleChangeImage} 
              className="hidden"
            />
          </label>
        </div>

        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          className="mb-4 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
        />

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

}


export default CreateProfile;
