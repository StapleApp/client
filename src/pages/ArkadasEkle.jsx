import { IoIosAddCircle } from "react-icons/io"; // FaFire ikonunu import ediyoruz
import pfp from "../assets/360.png";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; // navigate için gerekli hook

const ArkadasEkle = () => {
  const navigate = useNavigate(); // navigate fonksiyonunu tanımlıyoruz
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.1 }}
        className="fixed top-0 left-0 w-full h-screen"
      >
        {/* Arka Plan */}
        <div className="background fixed grid grid-cols-3 bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-screen left-16 top-0 z-0">
          {/* Arama Çubuğu */}
          <div className="col-span-3 text-center pt-4">
            <input
              type="text"
              placeholder="Arkadaş Ara..."
              className="w-1/4 sm:w-full md:w-3/4 p-2 rounded-lg border-3 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)]"
            />
          </div>

          {/* Kaydırılabilir Arkadaş Listesi */}
          <div className="col-span-3 mt-6 overflow-y-auto mx-4 text-[var(--primary-text)] rounded-md max-h-[calc(100vh-150px)]">
            <div className="flex justify-center items-center gap-4 p-2">
              {Array(1)
                .fill("Chiramii")
                .map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center w-1/2 h-16 bg-[var(--primary-bg)] rounded-md p-3 transition-all duration-100  ease-in-out"
                  >
                    <div className="flex items-center w-full justify-between">
                      <div className="flex items-center">
                        <img
                          src={pfp}
                          alt="Profil"
                          className="w-12 h-12 rounded-full object-cover mr-4"
                        />
                        <span className="font-bold text-[var(--secondary-text)]">
                          {name}
                        </span>
                      </div>

                      <div className="relative">
                        <ApplyButton />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const ApplyButton = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className="icon group hover:scale-105 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <IoIosAddCircle size="20" />
        <span className="sidebar-tooltip group-hover:scale-100">
          Arkadaş Ekle
        </span>
      </div>
    </>
  );
};

export default ArkadasEkle;
