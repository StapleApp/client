import { useState, useRef } from "react";
import '../App.css';
import { FaUserFriends } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import ProfilePanel from '../Components/ProfilePanel'
import icon from "../assets/360.png";

const users = [
  { id: 1, name: "Ali", image: "https://via.placeholder.com/50", info: "Ali bilgileri" },
  { id: 2, name: "Ayşe", image: "https://via.placeholder.com/50", info: "Ayşe bilgileri" },
  { id: 3, name: "Mehmet", image: "https://via.placeholder.com/50", info: "Mehmet bilgileri" },
];

export default function FriendsBar() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const userRefs = useRef({}); // Her kullanıcı için ref saklamak için obje

  const handleUserClick = (user, id) => {
    if (userRefs.current[id]) {
      const rect = userRefs.current[id].getBoundingClientRect();
      
      // Sayfanın genişliğini alıp, pencerenin ekran dışına taşmasını önleyebilirsin
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      let top = rect.top;
      let left = rect.right + 10; // Resmin sağına 10px mesafe bırak

      // Eğer pencere ekranın dışına taşıyorsa, yukarı veya sola al
      if (top + 150 > windowHeight) top = windowHeight - 150;
      if (left + 200 > windowWidth) left = rect.left - 210;

      setPosition({ top, left });
      setSelectedUser(user);
    }
  };

  return (
    <div className="relative flex flex-col items-start p-4">
      {users.map((user) => (
        <div
          key={user.id}
          ref={(el) => (userRefs.current[user.id] = el)}
          onClick={() => handleUserClick(user, user.id)}
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-200 rounded-md"
        >
          <img src={user.image} alt={user.name} className="w-12 h-12 rounded-full" />
          <span>{user.name}</span>
        </div>
      ))}

      {selectedUser && (
        <div
          className="absolute bg-white shadow-lg p-4 border rounded-md w-52"
          style={{ top: position.top, left: position.left }}
        >
          <strong>{selectedUser.name}</strong>
          <p className="text-sm">{selectedUser.info}</p>
        </div>
      )}
    </div>
  );
}
