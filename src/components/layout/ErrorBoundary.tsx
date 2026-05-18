import React from 'react';

interface State { hasError: boolean; error?: Error }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[FMM] Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-parchment text-ink px-6">
          <div className="max-w-md text-center">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-4">
              Erreur · Error
            </p>
            <h1 className="font-display text-3xl text-oxblood mb-4">
              Quelque chose a mal tourné.
            </h1>
            <p className="font-editorial text-ink-soft mb-6">
              Something went wrong. Please reload the page or return home.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 border border-brass text-ink hover:bg-brass/10 transition font-sans text-sm uppercase tracking-wider rounded-card"
            >
              ← Accueil
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
