import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { accepterAvis, suivreMesAvis } from '../../firebase/avis';
import { CARTE_AVIS_ID } from '../../content/carte';
import CarteDuSite from './CarteDuSite';

// ─── La carte qui vous accueille, une seule fois ─────────────────────
// Alex, 2026-09-10 : « un pop-up, la carte est sortie et montrez la
// carte. Ensuite, une fois qu'ils la ferment, ça se rajoute à leur
// collection d'avis collectés. Et ça ne revient plus jamais. »
//
// Le pop-up et le parchemin du babillard écrivent le MÊME document
// Firestore (avisAcceptes/{uid}__carte-2026). Décrocher la carte au
// babillard éteint donc le pop-up, et fermer le pop-up décroche la
// carte du babillard. Un seul geste, dans un sens comme dans l'autre.
//
// Fermer, ici, veut dire prendre : le bouton, la croix, la touche Échap
// et le clic sur le fond font tous la même chose.

/** Garde de même appareil : le pop-up ne repasse pas pendant que
 *  Firestore rattrape son retard, ni en l'absence de base. */
const CLE_LOCALE = 'fmm.carte2026.prise';

/** Là où un pop-up n'a rien à faire : l'accueil cinématique, les jeux
 *  plein écran, l'admin et les tunnels de signature. */
const PAGES_SANS_POPUP = ['/admin', '/jeux', '/signer', '/labo-titre'];

const PopupCarte: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useUI();
  const { pathname } = useLocation();
  const fr = lang === 'FR';

  const [aPrise, setAPrise] = useState<boolean | null>(null);
  const [ouvert, setOuvert] = useState(false);

  // L'accueil cinématique se reconnaît à son chemin nu : la carte ne
  // vient pas se planter par-dessus l'orbe et l'intro.
  const chemin = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const pageMuette = chemin === '/'
    || PAGES_SANS_POPUP.some((p) => chemin.startsWith(p));

  useEffect(() => {
    if (!user?.uid) { setAPrise(null); return; }
    try {
      if (localStorage.getItem(CLE_LOCALE) === user.uid) { setAPrise(true); return; }
    } catch { /* navigation privée */ }
    return suivreMesAvis(user.uid, (ids) => setAPrise(ids.includes(CARTE_AVIS_ID)));
  }, [user?.uid]);

  // Un battement avant d'ouvrir : la page finit d'arriver, et la carte
  // se déplie ensuite plutôt que de sauter à la figure.
  useEffect(() => {
    if (aPrise !== false || pageMuette) { setOuvert(false); return; }
    const t = window.setTimeout(() => setOuvert(true), 900);
    return () => window.clearTimeout(t);
  }, [aPrise, pageMuette]);

  const prendre = () => {
    setOuvert(false);
    setAPrise(true);
    if (!user?.uid) return;
    try { localStorage.setItem(CLE_LOCALE, user.uid); } catch { /* navigation privée */ }
    void accepterAvis(
      user.uid, CARTE_AVIS_ID,
      user.displayName || '', user.email || '',
    );
  };

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') prendre(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, user?.uid]);

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[104] flex items-center justify-center p-3 md:p-8 overflow-y-auto"
          style={{ background: 'rgba(6,3,4,0.88)', backdropFilter: 'blur(7px)' }}
          onClick={prendre}
          role="dialog" aria-modal="true"
          aria-label={fr ? 'La carte du site 2026' : 'The 2026 site map'}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-6xl my-auto rounded-lg-card overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,10,8,0.98), rgba(10,5,4,0.98))',
              border: '1px solid rgba(var(--sk-gilt-rgb),0.4)',
              boxShadow: '0 36px 90px rgba(0,0,0,0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button" onClick={prendre}
              aria-label={fr ? 'Fermer et garder la carte' : 'Close and keep the map'}
              className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-midnight-deep/80 border border-brass/35 text-ivory-soft/70 hover:text-brass hover:border-brass transition-colors"
            >
              <X size={17} />
            </button>

            <div className="px-6 pt-7 pb-5 md:px-10 md:pt-9 md:pb-6 text-center">
              <p className="font-editorial uppercase tracking-[0.3em] text-[11px] md:text-xs text-brass mb-3">
                {fr ? 'Un avis vous attend' : 'A notice is waiting for you'}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">
                {fr ? 'La carte du site' : 'The site map'}
              </h2>
              <div className="divider-brass w-20 mx-auto mb-4" />
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed max-w-2xl mx-auto">
                {fr
                  ? 'Voici le terrain tel qu’il sera en septembre, de la porte jusqu’au camp viking, avec la foire, l’arène, les kiosques et la scène. Gardez-la : elle vous suit dans votre espace, sous « Ma carte », et vous pouvez l’emporter en un clic.'
                  : 'Here are the grounds as they will be in September, from the gate to the Viking camp, with the fair, the arena, the kiosks and the stage. Keep it: it follows you into your space, under “My map”, and you can take it with you in one click.'}
              </p>
            </div>

            <div className="px-3 md:px-6">
              <CarteDuSite
                lang={lang}
                prioritaire
                sizes="(max-width: 768px) 100vw, 1100px"
                className="rounded-card overflow-hidden border border-brass/25"
              />
            </div>

            <div className="px-6 py-7 md:px-10 md:py-8 text-center">
              <button
                type="button" onClick={prendre}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-[0.2em] text-xs font-semibold hover:bg-brass-soft transition rounded-card"
              >
                <MapPin size={15} />
                {fr ? 'Prendre la carte' : 'Take the map'}
              </button>
              <p className="font-sans text-[11px] text-ivory-soft/55 mt-4">
                {fr
                  ? 'Elle rejoint vos avis décrochés et ne reviendra plus vous déranger.'
                  : 'It joins the notices you have taken and will not come back to bother you.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopupCarte;
