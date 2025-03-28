import { IoIosAddCircle } from "react-icons/io";
import pfp from "../assets/360.png";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io"; // Arama ikonu
import profileBackground2_small from "../assets/profileBackground2_small.png";
import { useAuth } from "../context/AuthContext";
import { GetUserByFriendshipID } from "../../firebase";
import toast from 'react-hot-toast';

const ArkadasEkle = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [friendData, setFriendData] = useState(null);

  const handleSearch = () => {
    if (searchId) {
      setShowProfile(true);

      GetUserByFriendshipID(searchId).then((friend) => {
        if (friend) {
            setFriendData(friend); 
            console.log("User found:", friend);
        } else {
            setFriendData(null); 
            toast.error("No user found with this friendshipID.");
            console.log("No user found with this friendshipID.");
        }
    });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.1 }}
        className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
      >
        {/* Arama Çubuğu */}
        <div className="flex items-center justify-center relative w-110 h-25 mx-auto  hover:border-[var(--tertiary-border)]">
          <input
            type="text"
            placeholder="arkadaş ara..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-90 p-2 rounded-lg border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--primary-bg)]"
          />
          <button
            onClick={handleSearch}
            className="ml-2 p-2 text-white rounded-lg border-2 border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] bg-[var(--primary-bg)]"
          >
            <IoIosSearch size={20} /> {/* Arama ikonu */}
          </button>
        </div>

        <div className="relative w-110 h-110 mx-auto bg-[var(--primary-bg)] rounded-lg pt-5">
          {/* Profil Fotoğrafı ve Kullanıcı Bilgileri */}
          <div
            className="flex items-center justify-start relative w-100 h-30 bg-[var(--secondary-bg)] mx-auto pl-10 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${profileBackground2_small})` }}
          >
            {/* Profil Fotoğrafı Dönen Kart */}
            <div className="relative w-22 h-22 group">
              <div className="w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Ön Yüz (Profil Fotoğrafı) */}
                <div className="absolute w-full h-full backface-hidden">
                  <img
                    src={pfp}
                    alt="Profil"
                    className="w-full h-full rounded-full border-4 border-[var(--tertiary-border)] shadow-lg"
                  />
                </div>

                {/* Arka Yüz (Arkadaş Ekle Butonu) */}
                <div className="absolute w-full h-full flex items-center justify-center bg-[var(--secondary-bg)] rounded-full border-4 border-[var(--tertiary-border)] shadow-lg [transform:rotateY(180deg)] backface-hidden">
                  <button
                    className="text-white text-xl"
                    onClick={handleAddFriend}
                  >
                    <IoMdPersonAdd />
                  </button>
                </div>
              </div>
            </div>

            {/* Kullanıcı Bilgileri */}
            <div>
              <h2 className="mt-2 text-xl font-bold">
                {friendData?.nickName || "Bilinmeyen Kullanıcı"}
              </h2>
              <p className="text-gray-400">
                #{friendData?.friendshipID || "ID Bulunamadı"}
              </p>
              <span className="text-green-500 text-sm">● Çevrimiçi</span>
            </div>
          </div>

          {/* Biyografi Alanı */}
          <div className="p-4">
            <h3 className="text-lg font-semibold">Biyografi</h3>
            <p className="text-sm text-gray-300">
              Buraya kullanıcının biyografisi gelecek...
            </p>
          </div>

          {/* Sunucular ve Yakın Arkadaşlar */}
          <div className="grid grid-cols-2 gap-4 p-4">
            {/* Sunucular */}
            <div className="bg-[var(--secondary-bg)] p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Sunucular</h3>
              <hr className="border-t border-[var(--tertiary-border)] w-8/9 mx-auto mb-2" />
              <ul className="space-y-1 flex flex-col items-center">
                <li className="flex items-center gap-2 ">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Sunucu 1
                </li>
                <li className="flex items-center gap-2">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Sunucu 2
                </li>
                <li className="flex items-center gap-2">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Sunucu 3
                </li>
              </ul>
            </div>

            {/* Yakın Arkadaşlar */}
            <div className="bg-[var(--secondary-bg)] p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Yakın Arkadaşlar</h3>
              <hr className="border-t border-[var(--tertiary-border)] w-8/9 mx-auto mb-2" />
              <ul className="space-y-1 flex flex-col items-center">
                <li className="flex items-center gap-2">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Arkadaş 1
                </li>
                <li className="flex items-center gap-2">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Arkadaş 2
                </li>
                <li className="flex items-center gap-2">
                  <img src={pfp} className="w-6 h-6 rounded-full" alt="" />{" "}
                  Arkadaş 3
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const handleAddFriend = () => {
  // Eğer mesaj zaten varsa, tekrar ekleme
  if (document.querySelector(".friend-request-message")) return;

  const message = document.createElement("div");
  message.className = "friend-request-message"; // Mesajı tanımlamak için class ekliyoruz
  message.textContent = "İstek Gönderildi!";

  // Stilleri ayarla
  message.style.position = "fixed";
  message.style.top = "50%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%) scale(0.8)";
  message.style.opacity = "0"; // İlk başta görünmez
  message.style.backgroundColor = "#393E46";
  message.style.color = "#ffbc1f";
  message.style.padding = "1rem 2rem";
  message.style.borderRadius = "0.5rem";
  message.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  message.style.fontSize = "1.2rem";
  message.style.textAlign = "center";
  message.style.zIndex = "9999";
  message.style.transition = "transform 0.5s ease-out, opacity 0.5s ease-out"; // Animasyon

  // Body'ye ekle
  document.body.appendChild(message);

  // Kısa bir gecikmeyle animasyonu başlat
  setTimeout(() => {
    message.style.transform = "translate(-50%, -50%) scale(1)";
    message.style.opacity = "1";
  }, 10);

  // 2 saniye sonra mesajı kaybolarak sil
  setTimeout(() => {
    message.style.transform = "translate(-50%, -50%) scale(0.8)";
    message.style.opacity = "0";

    setTimeout(() => {
      message.remove(); // Mesajı DOM'dan kaldır
    }, 500); // Kaybolma animasyonunun bitmesini bekle
  }, 2000);
};

export default ArkadasEkle;
