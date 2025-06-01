import { IoIosAddCircle } from "react-icons/io";
import pfp from "../assets/360.png";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io";
import profileBackground2_small from "../assets/profileBackground2_small.png";
import { useAuth } from "../context/AuthContext";
import { GetUserByFriendshipID } from "../../firebase";
import toast from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { div } from "framer-motion/client";
import { AddFriend } from "../../firebase";

const ArkadasEkle = () => {
  const { currentUser, userData } = useAuth();
  const [searchId, setSearchId] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [friendData, setFriendData] = useState(null);

  const handleSearch = () => {
    if (searchId) {
      // Profil ekranını kapatıyoruz, animasyon sıfırlansın
      setShowProfile(false);

      // Yeni bir arama yapıldığında 0.1 saniye sonra profil ekranını açıyoruz
      setTimeout(() => {
        setShowProfile(true);
      }, 100); // 0.1 saniye sonra animasyon başlasın

      GetUserByFriendshipID(searchId).then((friend) => {
        if (friend) {
          setFriendData(friend);
          console.log("User found:", friend);
        } else {
          setFriendData(null);
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
            placeholder="Arkadaş ara..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} // Enter tuşu ile arama yap
            className="w-90 p-2 rounded-lg border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--primary-bg)]"
          />
          <button onClick={handleSearch} className="icon ml-2 p-2">
            <IoIosSearch size={20} /> {/* Arama ikonu */}
          </button>
        </div>

        {/* Animasyon: İlk başta profil gözükmezken gösterilecek */}
        {!showProfile && !friendData && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            {addFriendAnim()}
            <span className="block text-lg font-semibold text-[var(--quaternary-text)]">
              FIND YOUR FRIENDS
            </span>
          </div>
        )}
        {/* Girilen ID ile kullanıcı bulunursa gösterilecek */}
        {showProfile && friendData && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} // Başlangıçta şeffaf ve yukarıda
            animate={{ opacity: 1, y: 0 }} // Görünür hale gelince, yukarıdan normal pozisyona gelsin
            transition={{ duration: 0.4 }} // Animasyon süresi 0.6 saniye
            className="relative w-110 h-110 mx-auto bg-[var(--primary-bg)] rounded-lg pt-5"
          >
            <div className="relative w-110 h-100 mx-auto bg-[var(--primary-bg)] rounded-lg pt-5">
              {/* Profil Fotoğrafı ve Kullanıcı Bilgileri */}
              <div
                className="flex items-center justify-start relative w-100 h-30 bg-[var(--secondary-bg)] mx-auto pl-10 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${profileBackground2_small})` }}
              >
                {/* Profil Fotoğrafı Dönen Kart */}
                <div className="relative w-22 h-22 group mt-4">
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
                        onClick={() => handleAddFriend(userData, friendData)}
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

                {/* Arkadaş Ekle Butonu  */}
                <div className="absolute bottom-2 right-2">
                  <button
                    className="p-2 bg-[var(--primary-bg)] text-white rounded-sm z-10 shadow-[0_0_5px_var(--tertiary-bg)] hover:bg-[var(--tertiary-bg)] transition-all duration-700"
                    onClick={() => handleAddFriend(userData, friendData)}
                  >
                    <IoMdPersonAdd size={24} />
                  </button>
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
        )}
        {/* Girilen ID ile kullanıcı bulunamazsa gözükecek */}
        {showProfile && friendData === null && (
          <motion.div
            className="flex items-center justify-center h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-gray-500 text-xl font-semibold">
              Kullanıcı bulunamadı
            </p>
          </motion.div>
        )}
      </motion.div>
    </>
  );
};

const handleAddFriend = (userData, friendData) => {
  AddFriend(userData.userID, friendData.userID, "Friend");
  AddFriend(friendData.userID, userData.userID, "Friend");

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

const addFriendAnim = () => {
  return (
    <DotLottieReact
      src="https://lottie.host/7ae9face-ddcd-4284-8dfe-19efef04d56b/sySXGDavLA.lottie"
      autoplay
      style={{ width: 300, height: 300 }}
    />
  );
};

export default ArkadasEkle;
