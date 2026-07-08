import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Tauri expects a fixed dev-server port and needs to see its own env vars.
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      output: {
        // Büyük bağımlılıkları ayrı chunk'lara böl — tarayıcı önbelleği
        // uygulama kodu değişse bile vendor chunk'ları yeniden indirmez.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'emoji-picker': ['emoji-picker-react'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-icons'],
        },
      },
    },
  },
})
