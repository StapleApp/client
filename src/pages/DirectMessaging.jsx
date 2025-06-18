import { useState, useEffect, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Users, Send, Smile } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getGroupById } from "../../firebase"; 

const DirectMessaging = () => {
// Mock userData for demonstration
const { userData } = useAuth();

const [groupList, setGroupList] = useState([]);
const [groupDataList, setGroupDataList] = useState([]);
const [selectedGroup, setSelectedGroup] = useState(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState("");
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
        if (group) groupsData.push(group);
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
	if (selectedGroup) {
	setMessages([] || []); // burada gerçek mesajları yüklemek için API çağrısı yapılabilir
	}
}, [selectedGroup]);

useEffect(() => {
	scrollToBottom();
}, [messages]);

const scrollToBottom = () => {
	messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

const handleGroupSelect = (group) => {
	setSelectedGroup(group);
};

const handleSendMessage = (e) => {
	if (e) e.preventDefault();
	if (newMessage.trim() && selectedGroup) {
	const message = {
		id: messages.length + 1,
		sender: userData.name,
		content: newMessage.trim(),
		time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
	};
	setMessages([...messages, message]);
	setNewMessage("");
	}
};

console.log("Grup listesi:", groupList);

return (
	<div className="flex h-screen bg-[var(--primary-bg)]">
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
			{groupDataList.map((group, index) => (
			<motion.div
				key={`${group.id || index}-${index}`}
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				exit={{ opacity: 0, x: -20 }}
				className={`p-4 border-b border-[var(--primary-border)] cursor-pointer transition-colors hover:bg-[var(--secondary-bg)] ${
				selectedGroup?.id === group.id ? 'bg-[var(--secondary-bg)] border-[var(--primary-border)]' : ''
				}`}
				onClick={() => handleGroupSelect(group)}
			>
				<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
					<Users className="w-5 h-5 text-white" />
					</div>
					<div className="flex-1">
					<h3 className="font-medium text-[var(--primary-text)]">{group.groupName}</h3>
					<div className="text-xs text-[var(--secondary-text)]">
					</div>
					</div>
				</div>
				</div>
			</motion.div>
			))}
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
				<Users className="w-5 h-5 text-white" />
				</div>
				<div>
				<h3 className="font-semibold text-[var(--primary-text)]">{selectedGroup.name}</h3>
				<p className="text-sm text-[var(--secondary-text)]">Aktif</p>
				</div>
			</div>
			</div>

			{/* Mesajlar Alanı */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--secondary-bg)]">
			<AnimatePresence>
				{messages.map((message, index) => (
				<motion.div
					key={`${message.id}-${index}`} // Benzersiz bir key oluşturmak için id ve index kombinasyonu kullanılıyor
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className={`flex ${message.sender === userData.name ? 'justify-end' : 'justify-start'}`}
				>
					<div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
					message.sender === userData.name
						? 'bg-blue-500 text-white'
						: 'bg-[var(--primary-bg)] text-[var(--primary-text)] border border-[var(--primary-border)]'
					}`}>
					{message.sender !== userData.name && (
						<p className="text-xs font-medium mb-1 text-[var(--secondary-text)]">{message.sender}</p>
					)}
					<p className="text-sm">{message.content}</p>
					<p className={`text-xs mt-1 ${
						message.sender === userData.name ? 'text-blue-100' : 'text-[var(--secondary-text)]'
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
				>
					<Smile className="w-5 h-5" />
				</button>
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
);
};

export default DirectMessaging;