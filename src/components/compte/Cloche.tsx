import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, MessageCircle, Award, Users, Sparkles, User as UserIcon } from 'lucide-react';
import { suivreNotifications, marquerNotifsVues, type EtatNotifs, type GenreNotif } from '../../firebase/notifications';
import { addLocale } from '../../lib/locale';

// ─── La cloche et le raccourci Messages ──────────────────────────────
// En haut de l'espace membre (Alex, 2026-08-27) : un compteur sur la
// cloche pour tout ce qui attend (messages, avis de l'équipe, demandes
// d'amitié, badges gagnés, pages mises en ligne), et le bouton Messages
// à côté, avec son propre compteur, pour aller droit à la boîte.

const ICONE: Record<GenreNotif, React.ComponentType<{ size?: number }>> = {
  message: MessageCircle, amitie: Users, badge: Award, page: Sparkles,
};

const TEMOIN: EtatNotifs = {
  messagesNonLus: 2,
  notifs: [
    { id: 'dm-x', genre: 'message', quand: 3, titre: { FR: '2 messages de Le Festival Médiéval de Montpellier', EN: '2 messages from the Festival' }, lien: { FR: '/messages', EN: '/en/messages' } },
    { id: 'amitie-x', genre: 'amitie', quand: 2, titre: { FR: 'Quelqu’un vous demande en ami', EN: 'Someone sent you a friend request' }, lien: { FR: '/ordre', EN: '/en/order' } },
    { id: 'badge-x', genre: 'badge', quand: 1, titre: { FR: 'Nouveau badge : Photographe', EN: 'New badge: Photographer' }, lien: { FR: '/compte?onglet=badges', EN: '/en/account?onglet=badges' } },
    { id: 'page-x', genre: 'page', quand: 0, titre: { FR: 'Nouvelle page en ligne : Programmation', EN: 'New page online: Program' }, lien: { FR: '/activites', EN: '/en/activities' } },
  ],
};

const Pastille: React.FC<{ n: number }> = ({ n }) => (n > 0 ? (
  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-sans text-[10px] font-semibold"
        style={{ background: '#D8B05A', color: '#1a050b', boxShadow: '0 0 0 2px rgba(10,2,7,0.9)' }}>
    {n > 9 ? '9+' : n}
  </span>
) : null);

// Deux visages (Alex, 2026-08-27) : dans l'espace, la cloche et le
// bouton Messages côte à côte; dans le header, UN seul bouton « Mon
// espace » qui porte le compteur et ouvre tout : l'espace, les
// messages, puis la liste de ce qui attend.
const Cloche: React.FC<{ uid: string; lang: 'FR' | 'EN'; variante?: 'espace' | 'header' }> = ({ uid, lang, variante = 'espace' }) => {
  const fr = lang === 'FR';
  const header = variante === 'header';
  const temoin = import.meta.env.DEV && uid === 'apercu';
  const [etat, setEtat] = useState<EtatNotifs>(temoin ? TEMOIN : { notifs: [], messagesNonLus: 0 });
  const [ouverte, setOuverte] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (temoin || !uid) return;
    return suivreNotifications(uid, setEtat);
  }, [uid, temoin]);

  // Un clic ailleurs referme la liste.
  useEffect(() => {
    if (!ouverte) return;
    const fermer = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuverte(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouverte]);

  const pagesEnCours = useMemo(
    () => etat.notifs.filter((n) => n.genre === 'page').map((n) => n.id.replace(/^page-/, '')),
    [etat.notifs],
  );

  const ouvrir = () => {
    const suite = !ouverte;
    setOuverte(suite);
    // Ouvrir la cloche, c'est avoir vu : les badges et les pages
    // s'effacent au prochain passage, les messages restent jusqu'à
    // lecture, les demandes jusqu'à réponse.
    if (suite && !temoin && uid && etat.notifs.some((n) => n.genre === 'badge' || n.genre === 'page')) {
      const dejaVues = etat.notifs.filter((n) => n.genre === 'page').length ? pagesEnCours : [];
      void marquerNotifsVues(uid, dejaVues).catch(() => { /* hors ligne */ });
    }
  };

  const total = etat.notifs.length;
  const bouton = 'relative inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors';
  const style = { background: 'rgba(26,5,11,0.55)', border: '1px solid rgba(244,239,227,0.14)', color: 'rgba(244,239,227,0.85)' };

  return (
    <div ref={boite} className="relative flex items-center gap-2">
      {header ? (
        <button
          type="button"
          onClick={ouvrir}
          aria-haspopup="true" aria-expanded={ouverte}
          className="relative inline-flex items-center gap-2 h-9 px-3.5 rounded-full transition-all font-sans uppercase tracking-[0.18em] text-[10px]"
          style={{
            background: 'rgba(10, 2, 7, 0.5)',
            border: `1px solid ${ouverte ? 'var(--color-amber-glow)' : 'rgba(232, 177, 74, 0.35)'}`,
            color: 'var(--color-amber-glow)',
            boxShadow: ouverte ? '0 0 14px -4px rgba(232, 177, 74, 0.55)' : undefined,
          }}
          aria-label={fr ? `Mon espace membre${total ? `, ${total} nouveautés` : ''}` : `My member space${total ? `, ${total} new` : ''}`}
          title={fr ? 'Mon espace membre' : 'My member space'}
        >
          <UserIcon size={14} />
          {fr ? 'Mon espace' : 'My space'}
          <motion.span animate={total ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
                       transition={{ duration: 0.7, ease: 'easeOut' }} className="inline-flex">
            <Bell size={13} />
          </motion.span>
          <Pastille n={total} />
        </button>
      ) : (<>
      <Link to={addLocale('/messages', lang)} className={bouton} style={style}
            aria-label={fr ? `Messages${etat.messagesNonLus ? `, ${etat.messagesNonLus} non lus` : ''}` : `Messages${etat.messagesNonLus ? `, ${etat.messagesNonLus} unread` : ''}`}
            title={fr ? 'Mes messages' : 'My messages'}>
        <MessageCircle size={18} />
        <Pastille n={etat.messagesNonLus} />
      </Link>
      <button type="button" onClick={ouvrir} className={bouton} style={style}
              aria-haspopup="true" aria-expanded={ouverte}
              aria-label={fr ? `Notifications${total ? `, ${total}` : ''}` : `Notifications${total ? `, ${total}` : ''}`}>
        <motion.span animate={total ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
                     transition={{ duration: 0.7, ease: 'easeOut' }} className="inline-flex">
          <Bell size={18} />
        </motion.span>
        <Pastille n={total} />
      </button>
      </>)}

      <AnimatePresence>
        {ouverte && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-card overflow-hidden"
            style={{ background: 'rgba(16,4,8,0.96)', border: '1px solid rgba(216,176,90,0.3)', backdropFilter: 'blur(12px)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            role="menu"
          >
            {header && (
              <div className="grid grid-cols-2" style={{ borderBottom: '1px solid rgba(244,239,227,0.08)' }}>
                <Link to={addLocale('/compte', lang)} onClick={() => setOuverte(false)}
                      className="flex items-center justify-center gap-2 px-3 py-3 font-sans uppercase tracking-[0.18em] text-[10px] text-brass hover:bg-white/5 transition-colors">
                  <UserIcon size={13} /> {fr ? 'Mon espace' : 'My space'}
                </Link>
                <Link to={addLocale('/messages', lang)} onClick={() => setOuverte(false)}
                      className="relative flex items-center justify-center gap-2 px-3 py-3 font-sans uppercase tracking-[0.18em] text-[10px] text-brass hover:bg-white/5 transition-colors"
                      style={{ borderLeft: '1px solid rgba(244,239,227,0.08)' }}>
                  <MessageCircle size={13} /> {fr ? 'Messages' : 'Messages'}
                  {etat.messagesNonLus > 0 && (
                    <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center font-sans text-[10px] font-semibold"
                          style={{ background: '#D8B05A', color: '#1a050b' }}>{etat.messagesNonLus}</span>
                  )}
                </Link>
              </div>
            )}
            <p className="px-4 pt-3.5 pb-2 witcher-stat-label" style={{ borderBottom: '1px solid rgba(244,239,227,0.08)' }}>
              {fr ? 'Ce qui vous attend' : 'What awaits you'}
            </p>
            {total === 0 ? (
              <p className="px-4 py-5 font-editorial text-sm text-ivory-soft leading-relaxed">
                {fr ? 'Rien de neuf pour le moment. Tout est à jour.' : 'Nothing new for now. You are all caught up.'}
              </p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto py-1">
                {etat.notifs.map((n) => {
                  const Icone = ICONE[n.genre];
                  return (
                    <li key={n.id}>
                      <Link to={addLocale(n.lien[lang], lang)} role="menuitem" onClick={() => setOuverte(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                        <span className="witcher-tile shrink-0" style={{ width: 34, height: 34 }}>
                          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Icone size={13} /></span>
                        </span>
                        <span className="font-sans text-sm leading-snug" style={{ color: 'rgba(244,239,227,0.88)', fontWeight: 300 }}>
                          {n.titre[lang]}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {!header && (
              <Link to={addLocale('/messages', lang)} onClick={() => setOuverte(false)}
                    className="block px-4 py-3 font-sans uppercase tracking-[0.2em] text-[10px] text-brass hover:bg-white/5 transition-colors"
                    style={{ borderTop: '1px solid rgba(244,239,227,0.08)' }}>
                {fr ? 'Ouvrir ma boîte de réception' : 'Open my inbox'}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cloche;
