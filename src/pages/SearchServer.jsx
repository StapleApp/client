import { motion } from "framer-motion";
import { useState } from "react";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io"; // Arama ikonu

const SearchServer = () => {
    const [searchId, setSearchId] = useState("");
    const handleSearch = () => {
        console.log("Aranan ID:", searchId);
    };
    
    return(
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
                            placeholder="sunucu ara..."
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
            </motion.div>
            
        </>
    );   
};
  
export default SearchServer;