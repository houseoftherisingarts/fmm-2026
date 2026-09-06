import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, Send, Trash2, Crown } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import { lireFiche, type Membre } from '../../firebase/ordre';
import { motDeLaForme, motDuChef, type Guilde } from '../../firebase/guildes';
import {
  envoyer, suivre, supprimer, LONGUEUR_MAX,
  type MessageSalon,
} from '../../firebase/guildeClavardage';

// ─── Le salon ────────────────────────────────────────────────────────
// Le fil de parole du groupe. Ce qui s'y dit se lit entre membres, ne
// se corrige pas, et se retire par son auteur, par un chef ou par
// l'équipe (contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026). Le
// composeur reste au bas du panneau, et le fil descend tout seul sur un
// nouveau message, sauf quand la personne est remontée lire plus haut.
// Sur un grand écran, la liste des membres tient la colonne de droite;
// chaque nom mène au profil (addendum, ordres 1 et 6).

/** Assez près du bas pour que le fil suive sans arracher la lecture. */
const MARGE_BAS = 80;

function ilYA(ms: number | undefined, fr: boolean): string {
  if (!ms) return fr ? 'à l’instant' : 'just now';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return fr ? 'à l’instant' : 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return fr ? `il y a ${m} min` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return fr ? `il y a ${h} h` : `${h} h ago`;
  const j = Math.round(h / 24);
  if (j < 7) return fr ? `il y a ${j} j` : `${j} d ago`;
  return new Date(ms).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
}

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number }> = ({ nom, url, hue }) => (
  <span
    className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-[12px] text-ivory/85"
    style={{ background: `hsl(${hue ?? 30} 40% 22%)` }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const Salon: React.FC<{
  guilde: Guilde;
  uid: string | null;
  estChef: boolean;
  /** Un chef, ou l'équipe du festival : retire n'importe quel message. */
  peutGerer: boolean;
  fiches: Record<string, Membre | null>;
}> = ({ guilde, uid, peutGerer, fiches }) => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const estMembre = Boolean(uid && guilde.membres.includes(uid));
  const profil = (u: string) => `${addLocale('/profil', lang)}/${u}`;

  const [messages, setMessages] = useState<MessageSalon[]>([]);
  const [texte, setTexte] = useState('');
  const [refus, setRefus] = useState<string | null>(null);
  const [moi, setMoi] = useState<{ nom: string; avatarUrl?: string } | null>(null);

  const fond = useRef<HTMLDivElement | null>(null);
  const collerAuBas = useRef(true);

  useEffect(() => {
    if (!estMembre) return;
    return suivre(guilde.id, setMessages);
  }, [guilde.id, estMembre]);

  useEffect(() => {
    if (!uid) return;
    void lireFiche(uid)
      .then((f) => setMoi({ nom: f?.nom || (fr ? 'Un inconnu' : 'A stranger'), avatarUrl: f?.avatarUrl }))
      .catch(() => setMoi({ nom: fr ? 'Un inconnu' : 'A stranger' }));
  }, [uid, fr]);

  // Le fil ne descend que si la personne y était déjà : sinon on lui
  // arracherait des yeux le message qu'elle est remontée relire.
  useEffect(() => {
    if (!collerAuBas.current) return;
    const el = fond.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!estMembre) {
    return (
      <section className="glass-light rounded-lg-card p-6 md:p-8 flex items-center gap-5 flex-wrap">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0"
          style={{
            background: 'rgba(var(--sk-gilt-rgb),0.12)',
            border: '1px solid rgba(var(--sk-gilt-rgb),0.35)',
            color: 'var(--sk-gilt)',
          }}
        >
          <MessagesSquare size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ivory mb-1">{fr ? 'Le salon' : 'The chat'}</p>
          <p className="font-editorial text-base text-ivory-soft leading-relaxed">
            {fr
              ? `Ce fil se lit entre membres. Entrez dans ${motDeLaForme(guilde.forme, lang).toLowerCase()} et vous verrez ce qui s’y dit.`
              : 'This thread is read among members. Join the group and you will see what is said here.'}
          </p>
        </div>
      </section>
    );
  }

  const parler = async () => {
    if (!uid) return;
    const propre = texte.trim();
    if (!propre) return;
    setTexte('');
    setRefus(null);
    collerAuBas.current = true;
    const r = await envoyer(guilde.id, {
      uid,
      nom: moi?.nom || (fr ? 'Un inconnu' : 'A stranger'),
      avatarUrl: moi?.avatarUrl,
    }, propre).catch(() => 'ferme' as const);
    if (r === 'trop-vite') setRefus(fr ? 'Laissez passer deux secondes.' : 'Let two seconds go by.');
    else if (r === 'trop-long') setRefus(fr ? 'Ce message est trop long.' : 'That message is too long.');
    else if (r === 'ferme') setRefus(fr ? 'Le salon est fermé pour le moment.' : 'The room is closed for now.');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section className="lg:col-span-9 glass-light rounded-lg-card overflow-hidden">
        <p className="witcher-stat-label inline-flex items-center gap-2 px-5 md:px-6 pt-5 pb-4">
          <MessagesSquare size={12} /> {fr ? 'Le salon' : 'The chat'}
        </p>

        <div
          ref={fond}
          onScroll={(e) => {
            const el = e.currentTarget;
            collerAuBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < MARGE_BAS;
          }}
          className="h-[58vh] min-h-[300px] max-h-[620px] overflow-y-auto px-4 md:px-6 pb-4 space-y-3"
        >
          {messages.length === 0 ? (
            <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
              {fr
                ? 'Personne n’a encore rien dit. Ouvrez la veillée par un mot, les autres suivront.'
                : 'Nobody has said anything yet. Open the evening with a word, the others will follow.'}
            </p>
          ) : messages.map((m) => {
            const mien = m.uid === uid;
            const peutRetirer = mien || peutGerer;
            return (
              <div key={m.id} className={`flex items-start gap-2.5 ${mien ? 'flex-row-reverse' : ''}`}>
                <Link to={profil(m.uid)} aria-label={m.nom}>
                  <Medaillon nom={m.nom} url={m.avatarUrl} hue={fiches[m.uid]?.avatarHue} />
                </Link>
                <div className={`min-w-0 max-w-[80%] ${mien ? 'text-right' : ''}`}>
                  <p className="font-sans text-[9px] uppercase tracking-[0.18em] mb-1 truncate"
                     style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>
                    <Link to={profil(m.uid)} className="hover:text-brass transition-colors">
                      {mien ? (fr ? 'Vous' : 'You') : m.nom}
                    </Link>
                    <span className="mx-1.5">·</span>
                    {ilYA(m.creeLe?.toMillis?.(), fr)}
                  </p>
                  <span
                    className={`inline-block px-3.5 py-2 rounded-card font-editorial text-[13px] leading-relaxed text-left ${
                      mien ? 'text-[var(--sk-brown-dark)]' : 'text-ivory'
                    }`}
                    style={{
                      background: mien ? 'rgba(var(--sk-glow-rgb),0.85)' : 'rgba(0,0,0,0.45)',
                      border: mien ? 'none' : '1px solid rgba(var(--sk-glow-rgb),0.18)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.texte}
                  </span>
                </div>
                {peutRetirer && (
                  <button
                    type="button"
                    onClick={() => { void supprimer(guilde.id, m.id); }}
                    aria-label={fr ? 'Retirer ce message' : 'Remove this message'}
                    className="shrink-0 mt-6 w-7 h-7 rounded-full flex items-center justify-center text-ivory-soft/40 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 md:px-6 py-3.5" style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); void parler(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-card focus-within:border-brass/60 transition-colors"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}
          >
            <input
              type="text"
              value={texte}
              maxLength={LONGUEUR_MAX}
              onChange={(e) => { setTexte(e.target.value); setRefus(null); }}
              placeholder={fr ? 'Dire quelque chose' : 'Say something'}
              aria-label={fr ? 'Dire quelque chose' : 'Say something'}
              className="w-full bg-transparent border-0 outline-none font-sans text-[13px] text-ivory placeholder:text-ivory-soft/45"
            />
            <span className="shrink-0 font-sans text-[10px] tabular-nums"
                  style={{ color: `rgba(var(--sk-parchment-rgb),${texte.length > LONGUEUR_MAX - 50 ? 0.8 : 0.35})` }}>
              {texte.length}/{LONGUEUR_MAX}
            </span>
            <button
              type="submit"
              disabled={texte.trim().length === 0}
              aria-label={fr ? 'Envoyer' : 'Send'}
              className="shrink-0 text-brass hover:text-ivory transition-colors disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
          {refus && (
            <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{refus}</p>
          )}
        </div>
      </section>

      {/* ── Qui est là : la colonne de droite sur un grand écran ── */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="glass-light rounded-lg-card p-5 lg:sticky lg:top-24">
          <p className="witcher-stat-label mb-3">
            {fr ? 'Autour du feu' : 'Around the fire'} ({guilde.membres.length})
          </p>
          <ul className="space-y-1 max-h-[560px] overflow-y-auto pr-1">
            {guilde.membres.map((m) => {
              const f = fiches[m];
              const nom = f?.nom || (fr ? 'Un inconnu' : 'A stranger');
              const chef = guilde.admins.includes(m);
              return (
                <li key={m}>
                  <Link to={profil(m)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-card hover:bg-brass/5 transition">
                    <Medaillon nom={nom} url={f?.avatarUrl} hue={f?.avatarHue} />
                    <span className="min-w-0">
                      <span className="block font-sans text-[13px] text-ivory truncate">{nom}{m === uid ? (fr ? ' (vous)' : ' (you)') : ''}</span>
                      {chef && (
                        <span className="inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-widest" style={{ color: 'var(--sk-gilt)' }}>
                          <Crown size={9} /> {motDuChef(guilde.forme, lang)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default Salon;
