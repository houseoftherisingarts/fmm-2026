import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import Personnage from './Personnage';
import type { AvatarChantier } from './avatar';

// ─── Le salon 2D ────────────────────────────────────────────────────
// Première brique Blablaland (voir RECHERCHE.md) : une salle qu'on
// regarde en s'y déplaçant, la conversation qui vit au-dessus des
// têtes plutôt que dans une colonne de texte. Le personnage se déplace
// au clic (framer-motion), les autres présences arrivent par
// `salon2d/{uid}`, lues par tous, écrites par leur propriétaire, et
// expirent côté client après deux minutes sans mise à jour
// (Alex, 2026-08-27).

interface Presence {
  uid: string;
  x: number; // 0–800
  y: number; // 0–500
  nom: string;
  message?: string;
  avatar: Pick<AvatarChantier, 'corps' | 'peau' | 'coiffure' | 'equipe'>;
  maj?: { toMillis?: () => number } | null;
}

const LARGEUR = 800;
const HAUTEUR = 500;
const EXPIRATION_MS = 2 * 60 * 1000;
const BULLE_MS = 8000;
const BATTEMENT_MS = 60 * 1000;

interface Props {
  lang: 'FR' | 'EN';
  uid: string;
  nom: string;
  avatar: AvatarChantier;
  /** Mode aperçu (?apercu=1, dev seulement) : aucune écriture Firestore. */
  horsLigne?: boolean;
}

const Salon2D: React.FC<Props> = ({ lang, uid, nom, avatar, horsLigne }) => {
  const fr = lang === 'FR';
  const [pos, setPos] = useState({ x: LARGEUR / 2, y: HAUTEUR / 2 });
  const [message, setMessage] = useState('');
  const [bulle, setBulle] = useState<string | null>(null);
  const [autres, setAutres] = useState<Presence[]>([]);
  const scene = useRef<HTMLDivElement>(null);
  const bulleTimer = useRef<number | undefined>(undefined);

  const avatarLeger = useMemo(
    () => ({ corps: avatar.corps, peau: avatar.peau, coiffure: avatar.coiffure, equipe: avatar.equipe }),
    [avatar.corps, avatar.peau, avatar.coiffure, avatar.equipe],
  );

  // Écoute les autres présences, filtre celles trop vieilles.
  useEffect(() => {
    if (horsLigne || !db) return;
    const arret = onSnapshot(collection(db, 'salon2d'), (snap) => {
      const maintenant = Date.now();
      const liste: Presence[] = [];
      snap.forEach((d) => {
        if (d.id === uid) return;
        const p = d.data() as Presence;
        const majMs = p.maj?.toMillis?.() ?? 0;
        if (maintenant - majMs < EXPIRATION_MS) liste.push({ ...p, uid: d.id });
      });
      setAutres(liste);
    });
    return arret;
  }, [uid, horsLigne]);

  // Battement : garde la présence vivante même sans mouvement.
  useEffect(() => {
    if (horsLigne || !db) return;
    ecrirePresence(pos.x, pos.y, message);
    const t = window.setInterval(() => ecrirePresence(pos.x, pos.y, message), BATTEMENT_MS);
    return () => {
      window.clearInterval(t);
      if (db) void deleteDoc(doc(db, 'salon2d', uid));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horsLigne]);

  function ecrirePresence(x: number, y: number, msg: string) {
    if (horsLigne || !db) return;
    void setDoc(doc(db, 'salon2d', uid), {
      x, y, nom, message: msg, avatar: avatarLeger, maj: serverTimestamp(),
    }, { merge: true });
  }

  function seDeplacer(e: React.MouseEvent<HTMLDivElement>) {
    if (!scene.current) return;
    const r = scene.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(LARGEUR - 20, ((e.clientX - r.left) / r.width) * LARGEUR));
    const y = Math.max(90, Math.min(HAUTEUR - 20, ((e.clientY - r.top) / r.height) * HAUTEUR));
    setPos({ x, y });
    ecrirePresence(x, y, message);
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const texte = message.trim();
    if (!texte) return;
    setBulle(texte);
    ecrirePresence(pos.x, pos.y, texte);
    setMessage('');
    window.clearTimeout(bulleTimer.current);
    bulleTimer.current = window.setTimeout(() => setBulle(null), BULLE_MS);
  }

  const bulleAutreRecente = (p: Presence) => {
    if (!p.message) return null;
    const majMs = p.maj?.toMillis?.() ?? 0;
    return Date.now() - majMs < BULLE_MS ? p.message : null;
  };

  return (
    <div className="rounded-lg-card border border-brass/20 overflow-hidden" style={{ background: 'rgba(8,20,36,0.4)' }}>
      <div
        ref={scene}
        onClick={seDeplacer}
        className="relative w-full aspect-[8/5] cursor-crosshair select-none overflow-hidden"
      >
        <SceneSVG />

        {autres.map((p) => (
          <div key={p.uid}
               className="absolute -translate-x-1/2 -translate-y-full transition-[left,top] duration-700 ease-in-out pointer-events-none"
               style={{ left: `${(p.x / LARGEUR) * 100}%`, top: `${(p.y / HAUTEUR) * 100}%` }}>
            <Bulle texte={bulleAutreRecente(p)} />
            <Personnage {...p.avatar} size={64} />
            <span className="block text-center witcher-stat-label text-[8px] mt-0.5">{p.nom}</span>
          </div>
        ))}

        <motion.div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
          animate={{ left: `${(pos.x / LARGEUR) * 100}%`, top: `${(pos.y / HAUTEUR) * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <Bulle texte={bulle} soi />
          <Personnage {...avatarLeger} size={64} />
          <span className="block text-center witcher-stat-label text-[8px] mt-0.5">{nom}</span>
        </motion.div>
      </div>

      <form onSubmit={envoyer} className="flex items-center gap-2 p-3 border-t border-brass/15">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={140}
          placeholder={fr ? 'Dites quelque chose…' : 'Say something…'}
          className="flex-1 bg-transparent border border-brass/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass"
        />
        <button type="submit" className="p-2.5 rounded-card bg-brass text-midnight-deep hover:bg-brass-soft transition" aria-label={fr ? 'Envoyer' : 'Send'}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

const Bulle: React.FC<{ texte: string | null; soi?: boolean }> = ({ texte, soi }) => {
  if (!texte) return null;
  return (
    <div className="mb-1.5 max-w-[160px] px-3 py-1.5 rounded-2xl text-[11px] leading-snug text-center font-sans"
         style={{
           background: soi ? 'rgba(216,176,90,0.95)' : 'rgba(244,239,227,0.95)',
           color: '#1A050B',
         }}>
      {texte}
    </div>
  );
};

/** Le décor : sol de dalles, mur de pierre, torches. Dessiné une fois,
 *  jamais reconstruit au déplacement du personnage. */
const SceneSVG: React.FC = () => (
  <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="dalles" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="#2B1D14" />
        <rect width="48" height="48" x="1" y="1" fill="#33251A" />
      </pattern>
      <pattern id="pierre" width="60" height="30" patternUnits="userSpaceOnUse">
        <rect width="60" height="30" fill="#1A1210" />
        <rect width="28" height="13" x="1" y="1" fill="#241A15" />
        <rect width="28" height="13" x="31" y="1" fill="#241A15" />
        <rect width="28" height="13" x="16" y="16" fill="#241A15" />
      </pattern>
      <radialGradient id="lueur" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(232,177,74,0.55)" />
        <stop offset="100%" stopColor="rgba(232,177,74,0)" />
      </radialGradient>
    </defs>
    <rect width={LARGEUR} height="140" fill="url(#pierre)" />
    <rect y="140" width={LARGEUR} height={HAUTEUR - 140} fill="url(#dalles)" />
    <rect y="138" width={LARGEUR} height="4" fill="#0A0705" />
    {[110, LARGEUR / 2, LARGEUR - 110].map((x) => (
      <g key={x}>
        <circle cx={x} cy="70" r="46" fill="url(#lueur)" />
        <rect x={x - 3} y="52" width="6" height="26" fill="#4A3420" />
        <ellipse cx={x} cy="48" rx="7" ry="11" fill="#E8B14A" />
      </g>
    ))}
  </svg>
);

export default Salon2D;
