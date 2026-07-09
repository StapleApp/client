import { Component } from "react";

/**
 * Uygulama genelinde render hatalarını yakalar.
 * Bir bileşen çökerse boş ekran yerine hata mesajı + yenile butonu gösterir.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--primary-bg)] text-[var(--secondary-text)] p-8 text-center"
        >
          <h1 className="text-xl font-bold">Bir şeyler ters gitti 😵</h1>
          <pre className="max-w-xl max-h-40 overflow-auto text-left text-xs text-red-400 bg-[var(--secondary-bg)] rounded-lg p-3 border border-[var(--primary-border)]">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
