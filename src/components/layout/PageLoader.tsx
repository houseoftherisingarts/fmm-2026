import React, { useEffect, useState } from 'react';

// ─── L'attente entre deux pages ─────────────────────────────────────
// Un mot de chargement s'affichait le temps d'un battement de cil à
// chaque changement de page, et se lisait comme un bug (Alex,
// 2026-08-23). Rien n'apparaît plus avant 420 ms : une page qui arrive
// vite arrive en silence, et seule une vraie attente montre la roue.

const PageLoader: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 420);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight">
      <div
        aria-hidden={!visible}
        className="w-9 h-9 rounded-full border-2 border-t-transparent border-brass animate-spin transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
    </div>
  );
};

export default PageLoader;
