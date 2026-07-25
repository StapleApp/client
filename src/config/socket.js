import { io } from "socket.io-client";
import { supabase } from "./supabase";

// Render'daki socket sunucusu. Gerekirse .env içinde VITE_SOCKET_URL ile değiştir.
const URL =
  import.meta.env.VITE_SOCKET_URL || "https://staple-socket-server.onrender.com";

// autoConnect: false → sadece sesli kanala girince bağlanır.
export const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

/**
 * Socket bağlantısını başlatmadan önce çağrılmalı.
 * Supabase oturumundan JWT token'ı alıp socket.auth'a enjekte eder.
 * Server tarafındaki auth middleware bu token'ı doğrulayarak
 * kullanıcı kimliğini güvenilir şekilde belirler.
 */
export async function attachSocketAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      socket.auth = { token: session.access_token };
    }
  } catch (err) {
    console.warn("Socket auth token alınamadı:", err.message);
  }
}
