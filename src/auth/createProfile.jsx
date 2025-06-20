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

  const profileImages = [
    "/0.png",
    "/1.png",
    "/2.png",
    "/3.png",
    "/4.png",
    "/5.png",
    "/6.png",
    "/7.png",
  ];

  const [selectedImage, setSelectedImage] = useState(profileImages[0]);

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
        UpdateNickname(user.uid, nickname, selectedImage); // Takma ad güncellenir (UpdateNickname fonksiyonu senin tanımladığın bir fonksiyon olmalı)
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
  <div className="fixed flex background left-0 top-0 items-center justify-center">
    <div className="flex w-full max-w-md flex-col justify-center px-8 py-10 bg-white border border-gray-200 rounded-3xl shadow-2xl">
      <h3 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-blue-700">
        Create Your Profile
      </h3>

      <div className="flex flex-col items-center relative">
        {/* Seçilen profil görseli büyük şekilde yukarıda */}
        <div className="w-32 h-32 mb-4 rounded-full bg-gray-200 flex items-center justify-center shadow-md border-4 border-blue-200 relative">
          <img
            src={selectedImage}
            alt="Selected Profile"
            className="w-full h-full object-cover rounded-full"
          />
          <label className="absolute bottom-2 right-2 p-2 bg-white border border-gray-300 rounded-full cursor-pointer shadow hover:bg-blue-100 transition">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleChangeImage} 
              className="hidden"
            />
          </label>
        </div>

        {/* 8 görseli 4 üstte 4 altta grid olarak göster */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-3">
            {profileImages.slice(0, 4).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`profile-${idx}`}
                className={`w-14 h-14 rounded-full cursor-pointer border-4 transition-all duration-200 shadow-sm hover:scale-105 ${selectedImage === img ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200"}`}
                onClick={() => setSelectedImage(img)}
                draggable={false}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            {profileImages.slice(4, 8).map((img, idx) => (
              <img
                key={idx + 4}
                src={img}
                alt={`profile-${idx + 4}`}
                className={`w-14 h-14 rounded-full cursor-pointer border-4 transition-all duration-200 shadow-sm hover:scale-105 ${selectedImage === img ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200"}`}
                onClick={() => setSelectedImage(img)}
                draggable={false}
              />
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          className="mb-5 px-5 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-lg shadow"
        />

        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold shadow hover:bg-blue-600 transition"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

}


export default CreateProfile;
