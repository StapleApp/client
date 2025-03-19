import logo from "../assets/logoDark.svg"
import { motion } from "framer-motion";

const Ayarlar = () => {
    return(
        <>
            <motion.div
                initial={{ opacity: 0, x: -100 }}  // Sayfa sağdan giriyor
                animate={{ opacity: 1, x: 0 }}   // Görünür hale geliyor
                exit={{ opacity: 0, x: 100 }}   // Soldan kayboluyor
                transition={{ duration: 0.2 }}   // 0.2 saniyede geçiş yapıyor
                className="fixed top-0 left-0 w-full h-screen"
                >
                <div className="fixed grid grid-cols-3 bg-[#B3C8CF] text-[#E5E1DA] h-screen w-screen left-16 top-0 z-0">
                    <div className="w-auto h-auto col-start-2 mt-auto mb-auto text-5xl font-bold">
                        <img src={logo} className="rounded-full opacity-30" />
                        AYARLAR
                    </div>
                </div>
            </motion.div>
        </>
    );   
};
  
export default Ayarlar;