import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="background fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--secondary-bg)] text-[var(--secondary-text)]">
      <h1 className="text-7xl font-extrabold text-[var(--quaternary-text)]">404</h1>
      <p className="text-lg">Aradığın sayfa bulunamadı.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
      >
        Ana Sayfaya Dön
      </button>
    </div>
  );
};

export default NotFound;
