import { useState, useEffect, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Users, Send, Smile } from "lucide-react";
import { useLocation } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";

import { useAuth } from "../context/AuthContext";
import { getGroupById, sendMessageToGroup, listenGroupMessages, getUser } from "../../firebase"; 

async function fetchFriendData(userID) {
    try {
        const user = await getUser(userID);
        if (user) {
            return {
                userID: user.userID,
                nickName: user.nickName,
                photoURL: user.photoURL || "/1.png"
            };
        } else {
            console.error("Kullanıcı bulunamadı:", userID);
            return null;
        }
    } catch (error) {
        console.error("Kullanıcı verisi alınırken hata oluştu:", error);
        return null;
    }
}

const DirectMessaging = () => {
    const location = useLocation();
    const selectedUserID = location.state?.userID;

    const { userData } = useAuth();
    const [groupList, setGroupList] = useState([]);
    const [groupDataList, setGroupDataList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [friendData, setFriendData] = useState(null);
    const [allFriendsData, setAllFriendsData] = useState({});
    const messagesEndRef = useRef(null);

    useEffect(() => {
        console.log("Kullanıcı verisi yüklendi:", userData);

        if (userData && userData.groups) {
        setGroupList(userData.groups);
        console.log("Kullanıcının grup listesi yüklendi:", userData.groups);
        } else {
        console.warn("Kullanıcı verisi veya grup listesi bulunamadı.");
        }
    }, []);

    useEffect(() => {
    if (userData && Array.isArray(userData.groups)) {
        setGroupList(userData.groups);
    }
    }, [userData]);

    useEffect(() => {
    const fetchGroups = async () => {
        if (Array.isArray(groupList) && groupList.length > 0) {
        const groupsData = [];
        for (const groupID of groupList) {
            const group = await getGroupById(groupID);
            if (group) groupsData.push({id: groupID, group});
        }
        setGroupDataList(groupsData);
        } else {
        setGroupDataList([]);
        }
    };
    fetchGroups();
    }, [groupList]);

    useEffect(() => {
        console.log("Grup verilerinin listesi:", groupDataList)
    }, [groupDataList]);

    useEffect(() => {
        if (selectedUserID && groupDataList.length > 0) {
            // Kullanıcıyı içeren ilk grubu bul
            const found = groupDataList.find(
            (g) => g.group.users && g.group.users.includes(selectedUserID)
            );
            if (found) {
                setSelectedGroup(found.group);
                fetchFriendData(selectedUserID)
                    .then(data => {
                        if (data) {
                            setFriendData(data);
                        } else {
                            console.warn("Arkadaş verisi bulunamadı:", selectedUserID);
                        }
                    })
                    .catch(error => {
                        console.error("Arkadaş verisi alınırken hata oluştu:", error);
                    });
            }
        }
    }, [selectedUserID, groupDataList]);

    useEffect(() => {
        if (selectedGroup) {
        setMessages([] || []); // burada gerçek mesajları yüklemek için API çağrısı yapılabilir
        }
    }, [selectedGroup]);

    useEffect(() => {
        console.log("araba", friendData);
    }, [friendData]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        let unsubscribe;
        if (selectedGroup && selectedGroup.id) {
            unsubscribe = listenGroupMessages(selectedGroup.id, (msgs) => {
                setMessages(msgs);
            });
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [selectedGroup]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleGroupSelect = (group) => {
        setSelectedGroup(group);
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (newMessage.trim() && selectedGroup) {
            const message = {
                id: Date.now().toString(),
                sender: userData.nickName,
                senderId: userData.userID,
                content: newMessage.trim(),
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                createdAt: Date.now()
            };
            await sendMessageToGroup(selectedGroup.id, message);
            console.log("Mesaj gönderildi:", message, "Grup ID:", selectedGroup.id);
            setNewMessage("");
        }
    };

    // Mesaj içeriğini işleyen yardımcı fonksiyon
    const renderMessageContent = (content) => {
        // Sadece emoji ise büyük göster
        const onlyEmoji = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u;
        if (onlyEmoji.test(content.trim())) {
            return <span style={{ fontSize: "2.2rem", lineHeight: "2.5rem" }}>{content}</span>;
        }
        // Youtube linki
        const youtubeMatch = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch) {
            return (
                <div>
                    <a href={content} target="_blank" rel="noopener noreferrer" className="underline text-blue-200">{content}</a>
                    <div className="mt-2">
                        <iframe
                            width="300"
                            height="170"
                            src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                            title="YouTube video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            );
        }
        // Görsel linki
        if (content.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            return (
                <a href={content} target="_blank" rel="noopener noreferrer">
                    <img src={content} alt="img" className="max-w-xs max-h-48 rounded-lg mt-2" />
                </a>
            );
        }
        // Genel link
        if (content.match(/^https?:\/\/[^\s]+$/)) {
            return (
                <a href={content} target="_blank" rel="noopener noreferrer" className="underline text-blue-200">{content}</a>
            );
        }
        // Normal metin
        return <span>{content}</span>;
    };

    console.log("Grup listesi:", groupList);

    const handleEmojiClick = (emojiData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    useEffect(() => {
        const fetchAllFriends = async () => {
            if (groupDataList.length > 0) {
                // Tüm kullanıcı ID'lerini tek bir dizide topla (tekrarsız)
                const userIDs = [
                    ...new Set(
                        groupDataList.flatMap(g => g.group.users || [])
                            .filter(id => id !== userData?.userID) // kendi ID'ni çıkarabilirsin
                    )
                ];
                // Her kullanıcı için veriyi çek
                const friendDataArr = await Promise.all(userIDs.map(id => fetchFriendData(id)));
                // Objeye çevir
                const friendDataObj = {};
                friendDataArr.forEach(fd => {
                    if (fd) friendDataObj[fd.userID] = fd;
                });
                setAllFriendsData(friendDataObj);
            }
        };
        fetchAllFriends();
    }, [groupDataList, userData]);

    return (
        <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.1 }}
        className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
        >
            <div className="background fixed inset-0 flex items-center justify-center min-h-screen bg-[var(--primary-bg)] z-0">
                <div className="w-full my-auto max-w-5xl h-[90vh] flex bg-[var(--primary-bg)] rounded-xl shadow-lg overflow-hidden border border-[var(--primary-border)]">
                    {/* Sol Sidebar - Grup Listesi */}
                    <div className="w-80 bg-[var(--primary-bg)] border-r border-[var(--primary-border)] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--primary-border)]">
                        <h2 className="text-xl font-semibold text-[var(--primary-text)] flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            Mesajlar
                        </h2>
                        </div>

                        {/* Grup Listesi */}
                        <div className="flex-1 overflow-y-auto">
                        <AnimatePresence>
                            {groupDataList.map((group, index) => {
                                // Kendi ID'ni hariç tut, ilk kullanıcıyı al
                                const otherUserId = (group.group.users || []).find(id => id !== userData?.userID);
                                const otherUser = allFriendsData[otherUserId];
                                return (
                                    <motion.div
                                        key={`${group.id || index}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={`p-4 border-b border-[var(--primary-border)] cursor-pointer transition-colors hover:bg-[var(--secondary-bg)] ${
                                            selectedGroup?.id === group.group.id ? 'bg-[var(--secondary-bg)] border-l-4 border-blue-500' : ''
                                        }`}
                                        onClick={() => handleGroupSelect(group.group)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                    <img
                                                        src={otherUser?.photoURL || "/1.png"}
                                                        alt="Avatar"
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-[var(--primary-text)]">{group.group.groupName}</h3>
                                                    <div className="text-xs text-[var(--secondary-text)]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        </div>
                    </div>

                    {/* Ana Mesajlaşma Alanı */}
                    <div className="flex-1 flex flex-col">
                        {selectedGroup ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 bg-[var(--primary-bg)] border-b border-[var(--primary-border)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                        {(() => {
                                            const otherUserId = (selectedGroup.users || []).find(id => id !== userData?.userID);
                                            const otherUser = allFriendsData[otherUserId];
                                            return (
                                                <img
                                                    src={otherUser?.photoURL || "/1.png"}
                                                    alt="Avatar"
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--primary-text)]">{selectedGroup.groupName}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Mesajlar Alanı */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--secondary-bg)]">
                            <AnimatePresence>
                                {messages.map((message, index) => (
                                <motion.div
                                    key={`${message.id}-${index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${message.senderId === userData.userID ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        message.senderId === userData.userID
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-[var(--primary-bg)] text-[var(--primary-text)] border border-[var(--primary-border)]'
                                    }`}>
                                    {message.senderId !== userData.userID && (
                                        <p className="text-xs font-medium mb-1 text-[var(--secondary-text)]">{message.sender}</p>
                                    )}
                                    <div className="text-sm">{renderMessageContent(message.content)}</div>
                                    <p className={`text-xs mt-1 ${
                                        message.senderId === userData.userID ? 'text-blue-100' : 'text-[var(--secondary-text)]'
                                    }`}>
                                        {message.time}
                                    </p>
                                    </div>
                                </motion.div>
                                ))}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                            </div>

                            {/* Mesaj Gönderme Alanı */}
                            <div className="p-4 bg-[var(--primary-bg)] border-t border-[var(--primary-border)]">
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                    placeholder="Mesajınızı yazın..."
                                    className="w-full px-4 py-3 pr-12 border border-[var(--primary-border)] rounded-lg 
                                            bg-[var(--secondary-bg)] text-[var(--primary-text)] 
                                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                            placeholder:text-[var(--secondary-text)]"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
                                    onClick={() => setShowEmojiPicker((v) => !v)}
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                {showEmojiPicker && (
                                    <div style={{ position: "absolute", bottom: "50px", right: "0", zIndex: 10 }}>
                                        <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                                    </div>
                                )}
                                </div>
                                <motion.button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors 
                                        flex items-center gap-2"
                                >
                                <Send className="w-4 h-4" />
                                Gönder
                                </motion.button>
                            </div>
                            </div>
                        </>
                        ) : (
                        // Grup Seçilmediğinde Gösterilecek Alan
                        <div className="flex-1 flex items-center justify-center bg-[var(--secondary-bg)]">
                            <div className="text-center">
                            <div className="w-16 h-16 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle className="w-8 h-8 text-[var(--secondary-text)]" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--primary-text)] mb-2">Mesajlaşmaya Başla</h3>
                            <p className="text-[var(--secondary-text)]">Konuşmaya başlamak için sol taraftan bir grup seçin</p>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DirectMessaging;