import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowUpRight } from 'lucide-react';
import { subscribeInbox, type DMThread } from '../../firebase/dms';
import { addLocale } from '../../lib/locale';

// ─── La boîte de réception, dans l'espace membre ────────────────────
// Alex, 2026-08-24 : « je devrais avoir mon profil, mes badges, mes
// jeux, mes billets, mes photos, ma collection, ma boîte de réception. »
// La liste des conversations vit donc ici, et chaque fil s'ouvre sur la
// page de messagerie.

const teinteDe = (nom: string): number => {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) % 360;
  return h;
};

const quand = (t?: { toDate?: () => Date }, fr = true): string => {
  const d = t?.toDate?.();
  if (!d) return '';
  const ecart = Date.now() - d.getTime();
  if (ecart < 60_000) return fr ? 'à l’instant' : 'just now';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
};

const BoiteReception: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [fils, setFils] = useState<DMThread[]>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const stop = subscribeInbox(uid, (liste) => { setFils(liste); setCharge(false); });
    return stop;
  }, [uid]);

  if (charge) {
    return (
      <p className="font-editorial text-[15px] text-ivory-soft/70">
        {fr ? 'Nous ouvrons votre courrier…' : 'Opening your mail…'}
      </p>
    );
  }

  if (fils.length === 0) {
    return (
      <div className="rounded-lg-card border border-brass/25 p-8 text-center"
           style={{ background: 'rgba(var(--sk-deep-rgb), 0.45)' }}>
        <MessageCircle size={22} className="text-brass/70 mx-auto mb-4" />
        <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed max-w-md mx-auto">
          {fr
            ? 'Votre boîte est encore vide. Passez par le registre de l’Ordre, ouvrez la fiche de quelqu’un et écrivez-lui : la conversation viendra se ranger ici.'
            : 'Your inbox is still empty. Go through the register of the Order, open someone’s page and write to them: the conversation will settle here.'}
        </p>
        <Link
          to={addLocale('/ordre', lang)}
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-[15px] border border-brass/45 text-ivory hover:bg-brass/15 transition-colors font-sans uppercase tracking-[0.18em] text-[10px]"
        >
          {fr ? 'Ouvrir le registre' : 'Open the register'} <ArrowUpRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {fils.map((f, i) => {
        const autre = f.participantUids.find((u) => u !== uid) || '';
        const nom = (f.participantNames?.[autre] || '').trim()
          || (fr ? 'Membre de la caravane' : 'Member of the caravan');
        const photo = f.participantPhotos?.[autre];
        const teinte = f.participantHues?.[autre] ?? teinteDe(nom);
        const neufs = f.unread?.[uid] ?? 0;
        return (
          <motion.li
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={`${addLocale('/messages', lang)}/${autre}`}
              className="flex items-center gap-4 p-3.5 rounded-[15px] border border-white/12 bg-black/35 backdrop-blur-md hover:border-brass/45 transition-colors"
            >
              <span
                className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-brass/35"
                style={{ background: `hsl(${teinte} 38% 22%)` }}
              >
                {photo && (
                  <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {!photo && (
                  <span className="absolute inset-0 flex items-center justify-center font-display text-lg text-ivory/80">
                    {nom.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-[15px] text-ivory truncate">{nom}</span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-ivory-soft/45 shrink-0">
                    {quand(f.lastMessageAt as never, fr)}
                  </span>
                </span>
                <span className="block font-editorial text-[13px] text-ivory-soft/70 truncate mt-0.5">
                  {f.lastSenderUid === uid ? (fr ? 'Vous : ' : 'You: ') : ''}
                  {f.lastMessage || (fr ? 'Conversation ouverte.' : 'Conversation opened.')}
                </span>
              </span>

              {neufs > 0 && (
                <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-brass text-midnight-deep font-sans text-[11px] font-semibold flex items-center justify-center">
                  {neufs > 9 ? '9+' : neufs}
                </span>
              )}
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
};

export default BoiteReception;
