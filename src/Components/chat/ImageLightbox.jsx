import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";

// ============================================================================
// Görsel/GIF yakınlaştırma (Discord tarzı lightbox). Global tek örnek olarak
// App içine monte edilir; herhangi bir yerden openLightbox(src) ile açılır.
// Dışına tıkla / Escape ile kapanır. Görselin kendisine tıklamak kapatmaz.
// ============================================================================

export const openLightbox = (src, alt = "Görsel") => {
  if (!src) return;
  window.dispatchEvent(new CustomEvent("staple:lightbox", { detail: { src, alt } }));
};

const ImageLightbox = () => {
  const [item, setItem] = useState(null); // { src, alt }

  useEffect(() => {
    const onOpen = (e) => setItem(e.detail || null);
    window.addEventListener("staple:lightbox", onOpen);
    return () => window.removeEventListener("staple:lightbox", onOpen);
  }, []);

  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === "Escape") setItem(null);
    };
    window.addEventListener("keydown", onKey);
    // Arka plan kaymasını kilitle
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item]);

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setItem(null)}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
        >
          {/* Kapat butonu */}
          <button
            onClick={() => setItem(null)}
            title="Kapat (Esc)"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Görselin kendisi — tıklama kapatmayı tetiklemesin */}
          <motion.img
            key={item.src}
            src={item.src}
            alt={item.alt}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="max-w-[92vw] max-h-[86vh] rounded-xl object-contain shadow-2xl cursor-default select-none"
          />

          {/* Orijinali yeni sekmede aç */}
          <a
            href={item.src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            <ExternalLink size={13} /> Yeni sekmede aç
          </a>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ImageLightbox;
