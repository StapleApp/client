import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "../Dm.css";

const DirectMessaging = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [activeUsers, setActiveUsers] = useState(1); 
  const [typing, setTyping] = useState({}); 
  const [isTyping, setIsTyping] = useState(false); 
  const [hasFocus, setHasFocus] = useState(true); 
  const [hasNewMessage, setHasNewMessage] = useState(false); 
  const [typingTimeout, setTypingTimeout] = useState(null); 
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null); 
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { userData } = useAuth();
  const originalTitle = useRef(document.title);

  const groupInfo = {
    name: "Free Eren",
    image: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXZxc2kxMHAwaXl4dHZhczBlNHRpNjY2enpuYTVyOHQ4c241YWRudiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/92q3uPI2qBNMC0OCMH/giphy.gif"
  };

  const exampleGifs = [
    "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
    "https://media.giphy.com/media/j5QcmXoFWm4Di/giphy.gif",
    "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
    "https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif",
    "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif"
  ];

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isPageVisible = document.visibilityState === "visible";
      setHasFocus(isPageVisible);
      
      if (isPageVisible && hasNewMessage) {
        document.title = originalTitle.current;
        setHasNewMessage(false);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    originalTitle.current = document.title;
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasNewMessage]);

  useEffect(() => {
    console.log("Socket bağlantısı kuruluyor...");
    
    socketRef.current = io("http://13.60.96.194:443", {
      path: "/socket.io", 
      transports: ["websocket", "polling"],
      secure: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: false // Otomatik bağlantıyı kapatıyoruz, manuel bağlanacağız
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket.io bağlantısı kuruldu, ID:", socket.id);
      setIsConnected(true);
      setConnectionError("");
      
      if (userData && userData.nickName) {
        setUsername(userData.nickName);
      } else {
        setUsername("Misafir_" + Math.floor(Math.random() * 1000));
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket.io bağlantısı kesildi");
      setIsConnected(false);
    });
    
    socket.on("connect_error", (error) => {
      console.error("Bağlantı hatası:", error);
      setIsConnected(false);
      setConnectionError("Sunucuya bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      
      setTimeout(() => {
        if (socket && !socket.connected) {
          console.log("Yeniden bağlanmayı deniyorum...");
          socket.connect();
        }
      }, 3000);
    });

    socket.on("connect_timeout", () => {
      console.error("Bağlantı zaman aşımına uğradı");
      setIsConnected(false);
      setConnectionError("Sunucu bağlantısı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.");
    });

    socket.on("receiveMessage", (data) => {
      if (data.senderId !== socket.id) {
        setMessages((prev) => [...prev, { 
          ...data, 
          position: "left" 
        }]);
        
        if (!hasFocus) {
          document.title = "🔔 Yeni Mesaj | " + originalTitle.current;
          setHasNewMessage(true);
        }
      }
    });

    socket.on("userCount", (count) => {
      setActiveUsers(count);
    });

    socket.on("userTyping", (data) => {
      setTyping(prev => ({ 
        ...prev, 
        [data.userId]: {
          username: data.username,
          isTyping: data.isTyping
        }
      }));
    });

    socket.connect();
    console.log("Socket bağlantısı başlatıldı");

    return () => {
      console.log("Component unmount, socket bağlantısı temizleniyor");
      if (socket) {
        socket.disconnect();
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("connect_timeout");
        socket.off("receiveMessage");
        socket.off("userCount");
        socket.off("userTyping");
      }
    };
  }, []); 


  useEffect(() => {
    const typingUsers = Object.values(typing).filter(user => user.isTyping);
    setIsTyping(typingUsers.length > 0);
  }, [typing]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMediaMenu && !event.target.closest(".media-menu-container")) {
        setShowMediaMenu(false);
      }
      if (showGifPicker && !event.target.closest(".gif-picker-container")) {
        setShowGifPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMediaMenu, showGifPicker]);

  const sendMessage = (msg) => {
    if (!msg.trim() || !isConnected || !socketRef.current) return;
    
    const messageData = {
      message: msg,
      username: userData?.nickName || username || "Misafir",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId: socketRef.current.id
    };
    
    setMessages((prev) => [...prev, { ...messageData, position: "right" }]);
    
    socketRef.current.emit("sendMessage", messageData, (ack) => {
      if (!ack || ack.error) {
        console.error("Mesaj gönderilemedi:", ack?.error || "Bilinmeyen hata");
      }
    });
    
    sendTypingStatus(false);
    
    setMessage("");
    setShowGifPicker(false);
    setShowMediaMenu(false);
  };

  const sendTypingStatus = (isTyping) => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    if (isConnected && socketRef.current) {
      socketRef.current.emit("userTyping", {
        isTyping: isTyping,
        username: userData?.nickName || username || "Misafir",
        userId: socketRef.current.id
      });
      
      
      if (isTyping) {
        const timeout = setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.emit("userTyping", {
              isTyping: false,
              username: userData?.nickName || username || "Misafir",
              userId: socketRef.current.id
            });
          }
        }, 2000);
        
        setTypingTimeout(timeout);
      }
    }
  };

  // Klavye olayları
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage(message);
    }
  };

  // Input değişikliği
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    sendTypingStatus(e.target.value.length > 0);
  };

  // Resim mesajı mı kontrol et
  const isImageMessage = (msg) => {
    return msg.includes(".gif") || msg.includes(".jpg") || msg.includes(".png") ||
      msg.includes(".jpeg") || msg.includes(".webp") || msg.includes(".svg");
  };

  // Resim yükleme işlemi
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const imageUrl = URL.createObjectURL(file);
    sendMessage(imageUrl);
    
    e.target.value = null;
  };

  // Dosya input'unu tetikle
  const triggerFileInput = () => {
    fileInputRef.current.click();
    setShowMediaMenu(false);
  };

  // Medya menüsünü göster/gizle
  const toggleMediaMenu = () => {
    setShowMediaMenu(!showMediaMenu);
    if (showGifPicker) setShowGifPicker(false);
  };

  // GIF seçiciyi göster/gizle
  const toggleGifPicker = (show) => {
    setShowGifPicker(show);
    if (show && showMediaMenu) setShowMediaMenu(false);
  };

  // Yazıyor göstergesini render et - daha görünür ve animasyonlu
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    const typingUsers = Object.values(typing).filter(user => user.isTyping);
    
    return (
      <motion.div 
        className="flex items-center text-xs text-light italic ml-4 mb-2 bg-secondary-light p-2 rounded-lg border border-secondary-light bg-opacity-60"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.3 }}
      >
        {typingUsers.length === 1 ? (
          <div className="flex items-center">
            <span className="mr-2 font-medium">{typingUsers[0].username}</span> 
            <span>yazıyor</span>
            <span className="typing-animation ml-1">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="mr-2 font-medium">{typingUsers.length} kişi</span> 
            <span>yazıyor</span>
            <span className="typing-animation ml-1">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  // Animasyon değişkenleri
  const mediaMenuVariants = {
    hidden: { opacity: 0, scale: 0.95, originY: 1, originX: 0 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 300 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { 
        duration: 0.2,
        ease: "easeOut" 
      }
    }
  };

  const gifPickerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 300 
      }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      transition: { 
        duration: 0.2,
        ease: "easeOut" 
      }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 300 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.5, 
      transition: { 
        duration: 0.2,
        ease: "easeOut" 
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.2,
        ease: "easeOut" 
      }
    },
    exit: { 
      opacity: 0, 
      transition: { 
        duration: 0.2,
        ease: "easeOut" 
      }
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 300 
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 100 }}   
      transition={{ duration: 0.1 }}   
      className="fixed top-0 left-0 w-full h-screen"
    >
      <div className="background fixed grid grid-cols-1 md:grid-cols-3 
          bg-[var(--secondary-bg)] text-[var(--secondary-text)] h-screen w-screen top-0 z-0">
        <div className="col-start-1 md:col-start-2 col-span-1 flex justify-center items-center w-full h-full">
          {/* Chat App Container */}
          <div className="w-full max-w-5xl bg-secondary p-6 rounded-xl shadow-lg flex flex-col border border-secondary-light h-[90vh] relative">
            {/* Header */}
            <div className="text-xl font-bold mb-4 border-b border-secondary-light pb-2 flex justify-between items-center h-20">
              {/* Grup bilgisi ve profil fotoğrafı */}
              <div className="flex items-center">
                <motion.div 
                  className="h-16 w-16 rounded-full bg-secondary-light overflow-hidden mr-4 mb-4 border border-secondary-light flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src={groupInfo.image}
                    alt="Group"
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => setShowProfileModal(true)}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif";
                    }}
                  />
                </motion.div>
                <div className="flex flex-col justify-center">
                  <span className="text-lg font-semibold mb-1 mr-2">{groupInfo.name}</span>
                  <span className="text-xs text-light">{activeUsers} aktif kullanıcı</span>
                </div>
              </div>
              {/* Bağlantı durumu */}
              <span className="text-sm text-light flex items-center">
                <span className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} mr-2`}></span>
                {isConnected ? "Bağlı" : "Bağlantı Kesik"}
              </span>
            </div>

            {/* Bağlantı Hatası Mesajı */}
            {connectionError && (
              <div className="bg-red-500 bg-opacity-20 text-red-300 p-2 rounded-lg mb-2 text-sm border border-red-500">
                <span>⚠️ {connectionError}</span>
              </div>
            )}

            {/* Mesajlar Alanı */}
            <div
              ref={messagesContainerRef}
              className="flex-grow overflow-y-auto bg-secondary-light p-4 rounded-lg space-y-3 flex flex-col border border-secondary-light min-h-[40vh]"
              style={{ flexBasis: 0 }} 
            >
              {messages.length === 0 && (
                <div className="text-center text-light py-8">
                  Henüz mesaj yok. Sohbete başlamak için bir mesaj gönderin.
                </div>
              )}
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`flex flex-col ${msg.position === "right" ? "self-end items-end" : "self-start items-start"} max-w-[70%]`}
                  initial="hidden"
                  animate="visible"
                  variants={messageVariants}
                >
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-light">{msg.username || "Kullanıcı"}</span>
                    {msg.timestamp && (
                      <span className="text-xs text-light ml-2">{msg.timestamp}</span>
                    )}
                  </div>
                  <motion.div
                    className={`p-3 rounded-lg text-sm shadow-md font-medium ${
                      msg.position === "right" ? "bg-accent border border-accent text-black" : "bg-primary border border-secondary-light"
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    {isImageMessage(msg.message) ? (
                      <div className="flex justify-center items-center">
                        <img
                          src={msg.message}
                          alt="Media"
                          className="rounded-lg max-h-60 w-auto object-contain"
                          onLoad={() => {
                            if (messagesEndRef.current) {
                              messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = "none";
                            e.target.parentNode.innerHTML += `<div class="text-red-300 text-xs">[Görsel yüklenemedi]</div>`;
                          }}
                        />
                      </div>
                    ) : (
                      <span className="break-words">{msg.message}</span>
                    )}
                  </motion.div>
                </motion.div>
              ))}
              
              {/* Yazıyor göstergesi - AnimatePresence ile düzgün geçişler */}
              <AnimatePresence>
                {isTyping && renderTypingIndicator()}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj Gönderme Alanı */}
            <div className="mt-4 flex items-center border border-secondary-light rounded-lg overflow-hidden h-14 min-h-[56px]">
              <motion.button
                onClick={toggleMediaMenu}
                className="bg-accent px-4 mr-1 h-full hover:bg-accent-dark transition flex items-center justify-center min-w-[56px] text-black"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Medya Ekle"
                disabled={!isConnected}
              >
                Medya
              </motion.button>
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder={isConnected ? "Mesajınızı yazın..." : "Sunucuya bağlanılıyor..."}
                className="flex-1 h-full p-3 bg-secondary-light text-white focus:outline-none border-l border-secondary-light rounded-xl font-medium"
                disabled={!isConnected}
              />
              <motion.button
                onClick={() => sendMessage(message)}
                disabled={!message.trim() || !isConnected}
                className={`px-5 ml-1 h-full transition min-w-[90px] font-medium ${
                  !message.trim() || !isConnected
                    ? "bg-secondary-light cursor-not-allowed"
                    : "bg-secondary hover:bg-primary"
                }`}
                whileHover={message.trim() && isConnected ? { scale: 1.05 } : {}}
                whileTap={message.trim() && isConnected ? { scale: 0.95 } : {}}
              >
                Gönder
              </motion.button>
            </div>

            {/* Medya Menüsü */}
            <AnimatePresence>
              {showMediaMenu && (
                <motion.div 
                  className="absolute bottom-20 left-0 mx-6 bg-secondary p-2 rounded-lg border border-secondary-light z-50 shadow-lg media-menu-container"
                  variants={mediaMenuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex flex-col gap-1">
                    <motion.button
                      onClick={triggerFileInput}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-secondary rounded text-left font-medium"
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.span whileHover={{ rotate: 9 }}>📷</motion.span> Görsel-Video
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        toggleGifPicker(true);
                        setShowMediaMenu(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-secondary rounded text-left font-medium"
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.span whileHover={{ rotate: 9 }}>🎭</motion.span> GIF
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Görsel Yükleme Input'u */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* GIF Seçici */}
            <AnimatePresence>
              {showGifPicker && (
                <motion.div 
                  className="absolute bottom-20 left-0 right-0 mx-6 bg-secondary p-3 rounded-lg border border-secondary z-50 shadow-lg gif-picker-container"
                  variants={gifPickerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex justify-between items-center mb-2 border-b border-secondary-light pb-1">
                    <span className="text-sm font-medium">GIF Seç</span>
                    <motion.button
                      className="text-light hover:text-white"
                      onClick={() => toggleGifPicker(false)}
                      whileHover={{ scale: 1.2}}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {exampleGifs.map((gif, index) => (
                      <motion.img
                        key={index}
                        src={gif}
                        alt="GIF"
                        className="h-40 w-full object-cover rounded-lg cursor-pointer border border-secondary-light"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          sendMessage(gif);
                          toggleGifPicker(false);
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Profil Görsel Modalı */}
            <AnimatePresence>
              {showProfileModal && (
                <motion.div 
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
                  onClick={() => setShowProfileModal(false)}
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div 
                    className="max-w-2xl max-h-[90vh] relative"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.button
                      className="absolute top-1 right-2 text-white text-xl hover:text-black opacity-65 bg-black/40 rounded-md px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileModal(false);
                      }}
                      whileHover={{ scale: 1.2}}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                    <img
                      src={groupInfo.image}
                      alt="Group Profile"
                      className="max-h-[80vh] max-w-full rounded-lg object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif";
                      }}
                    />
                    <div className="mt-2 text-white font-semibold">
                      {groupInfo.name}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DirectMessaging;