import { io } from "socket.io-client";

// Render'daki socket sunucusu. Gerekirse .env içinde VITE_SOCKET_URL ile değiştir.
const URL =
  import.meta.env.VITE_SOCKET_URL || "https://staple-socket-server.onrender.com";

// autoConnect: false → sadece sesli kanala girince bağlanır.
export const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
