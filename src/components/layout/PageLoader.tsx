import React from 'react';
import { useUI } from '../../contexts/AppContext';
import { UI } from '../../content';

const PageLoader: React.FC = () => {
  const { lang } = useUI();
  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        <p className="text-xs uppercase tracking-[0.3em] text-ivory-soft font-sans">
          {UI[lang].loading}
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
