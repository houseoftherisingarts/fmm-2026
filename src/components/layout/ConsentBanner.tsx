import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../contexts/AppContext';
import { CONSENT } from '../../content';
import { enableAnalytics } from '../../firebase';
import { loadMetaPixel } from '../../lib/metaPixel';

// LOI 25 (Quebec) compliant consent banner.
// On accept: enables Firebase Analytics + Meta Pixel.
// On decline: marks decision so banner doesn't reappear.
const STORAGE_KEY = 'fmm.consent.v1';

type Decision = 'accepted' | 'declined' | null;

function getDecision(): Decision {
  try { return (localStorage.getItem(STORAGE_KEY) as Decision) || null; }
  catch { return null; }
}

export function applyAcceptedDecision() {
  enableAnalytics();
  loadMetaPixel();
}

const ConsentBanner: React.FC = () => {
  const { lang } = useUI();
  const [decision, setDecision] = useState<Decision>(null);

  useEffect(() => {
    const d = getDecision();
    setDecision(d);
    if (d === 'accepted') applyAcceptedDecision();
  }, []);

  const choose = (d: 'accepted' | 'declined') => {
    try { localStorage.setItem(STORAGE_KEY, d); } catch { /* noop */ }
    setDecision(d);
    if (d === 'accepted') applyAcceptedDecision();
  };

  const t = CONSENT[lang];

  return (
    <AnimatePresence>
      {decision === null && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 200 }}
          className="fixed inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:right-6 md:max-w-md z-50"
        >
          <div className="glass-dark text-parchment p-5 md:p-6 rounded-card">
            <p className="font-editorial text-sm leading-relaxed mb-4">{t.body}</p>
            <div className="flex gap-3">
              <button
                onClick={() => choose('accepted')}
                className="flex-1 px-4 py-2 bg-brass text-night hover:bg-brass-soft transition font-sans text-xs uppercase tracking-wider font-semibold rounded-card"
              >
                {t.accept}
              </button>
              <button
                onClick={() => choose('declined')}
                className="flex-1 px-4 py-2 border border-stone-light/40 text-parchment hover:border-brass transition font-sans text-xs uppercase tracking-wider rounded-card"
              >
                {t.decline}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConsentBanner;
