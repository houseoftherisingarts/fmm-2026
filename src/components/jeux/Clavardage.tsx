// ─── Le clavardage de la partie ─────────────────────────────────────
// Alex, 2026-09-01 : « ajoutez un petit chatroom pour que les gens
// soient capables de se parler pendant qu'ils jouent. »
//
// Le panneau sert les deux sortes de parties. Contre une vraie
// personne, il suit la sous-collection Firestore de la partie. Contre
// la maison, il garde le fil dans la page : rien n'est écrit, rien
// n'est gardé, et l'adversaire répond de temps en temps une phrase
// courte, comme le ferait quelqu'un qui joue en même temps.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

import {
  envoyerMessage, suivreMessages, LONGUEUR_MAX,
  type MessageJeu, type Salle,
} from '../../firebase/clavardage';

interface Props {
  lang: 'FR' | 'EN';
  /** La partie en ligne. Absente : la partie se joue contre la maison. */
  salle?: Salle | null;
  moi: { uid: string; nom: string };
  /** Le nom affiché en face, pour une partie contre la maison. */
  adversaire?: string;
  /** Replie le panneau au chargement (utile sur un téléphone). */
  replieParDefaut?: boolean;
}

/** Ce que répond la maison quand personne d'autre n'est à la table. Les
 *  phrases restent courtes et neutres : le clavardage accompagne la
 *  partie, il ne la commente pas. */
const REPONSES_FR = [
  'Bien joué.', 'À vous de jouer.', 'Je réfléchis.', 'Belle défense.',
  'Voilà un coup que je n’avais pas vu.', 'La partie est serrée.',
  'Prenez votre temps.', 'Bonne partie à vous.',
];
const REPONSES_EN = [
  'Well played.', 'Your move.', 'Let me think.', 'Fine defence.',
  'That one I did not see coming.', 'This is a close game.',
  'Take your time.', 'Good game to you.',
];

const Clavardage: React.FC<Props> = ({ lang, salle, moi, adversaire, replieParDefaut }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const [messages, setMessages] = useState<MessageJeu[]>([]);
  const [texte, setTexte] = useState('');
  const [refus, setRefus] = useState<string | null>(null);
  const [replie, setReplie] = useState(!!replieParDefaut);
  const fond = useRef<HTMLDivElement | null>(null);
  const compteur = useRef(0);
  // La réponse de la maison arrive après quelques secondes. Le panneau
  // peut se refermer entretemps : le minuteur se garde donc pour être
  // enterré au démontage, sans quoi React reçoit un état pour un
  // composant qui n'est plus là.
  const minuteurReponse = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (minuteurReponse.current) clearTimeout(minuteurReponse.current);
  }, []);

  useEffect(() => {
    if (!salle) { setMessages([]); return; }
    return suivreMessages(salle, setMessages);
  }, [salle?.collection, salle?.partieId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fond.current?.scrollTo({ top: fond.current.scrollHeight, behavior: 'smooth' });
  }, [messages, replie]);

  const nomEnFace = adversaire || (fr ? 'Votre adversaire' : 'Your opponent');
  const reponses = useMemo(() => (fr ? REPONSES_FR : REPONSES_EN), [fr]);

  const envoyer = async () => {
    const propre = texte.trim();
    if (propre.length === 0) return;
    setTexte('');
    setRefus(null);

    if (!salle) {
      // Partie contre la maison : le fil vit dans la page.
      compteur.current += 1;
      const mien: MessageJeu = {
        id: `local-${compteur.current}`, uid: moi.uid, nom: moi.nom, texte: propre,
      };
      setMessages((m) => [...m, mien]);
      // La maison ne répond pas à tout, et jamais tout de suite.
      if (Math.random() < 0.45) {
        const phrase = reponses[Math.floor(Math.random() * reponses.length)];
        const attente = 1800 + Math.floor(Math.random() * 2600);
        if (minuteurReponse.current) clearTimeout(minuteurReponse.current);
        minuteurReponse.current = setTimeout(() => {
          compteur.current += 1;
          setMessages((m) => [...m, {
            id: `local-${compteur.current}`, uid: 'maison', nom: nomEnFace, texte: phrase,
          }]);
        }, attente);
      }
      return;
    }

    const r = await envoyerMessage(salle, moi.uid, moi.nom, propre);
    if (r === 'trop-vite') setRefus(t.tropVite);
    else if (r === 'trop-long') setRefus(t.tropLong);
    else if (r === 'ferme') setRefus(t.ferme);
  };

  return (
    <aside
      className="rounded-card border border-brass/25 overflow-hidden"
      style={{ background: 'rgba(10, 4, 6, 0.55)' }}
    >
      <button
        type="button"
        onClick={() => setReplie((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-3.5 border-b border-brass/20 bg-black/30 text-left"
        aria-expanded={!replie}
      >
        <MessageSquare size={13} className="text-brass shrink-0" />
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ivory-soft">
          {t.titre}
        </span>
        <span className="ml-auto font-sans text-[11px] tracking-[0.12em] text-ivory-soft/50">
          {replie ? t.ouvrir : t.fermer}
        </span>
      </button>

      {!replie && (
        <>
          <div ref={fond} className="h-[220px] overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 ? (
              <p className="font-editorial text-[13px] leading-relaxed"
                 style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>
                {t.vide}
              </p>
            ) : messages.map((m) => {
              const mien = m.uid === moi.uid;
              return (
                <div key={m.id} className={mien ? 'text-right' : 'text-left'}>
                  <span className="block font-sans text-[9px] uppercase tracking-[0.18em] text-ivory-soft/45 mb-1">
                    {mien ? t.vous : (m.nom || nomEnFace)}
                  </span>
                  <span
                    className={`inline-block max-w-[85%] px-3.5 py-2 rounded-card font-editorial text-[13px] leading-relaxed text-left ${
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
              );
            })}
          </div>

          <div className="px-5 py-3.5 border-t border-brass/15">
            <form
              onSubmit={(e) => { e.preventDefault(); void envoyer(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-card border border-brass/25 bg-black/40 focus-within:border-brass/60 transition-colors"
            >
              <input
                type="text"
                value={texte}
                maxLength={LONGUEUR_MAX}
                onChange={(e) => setTexte(e.target.value)}
                placeholder={t.champ}
                aria-label={t.champ}
                className="w-full bg-transparent border-0 outline-none font-sans text-[12px] text-ivory placeholder:text-ivory-soft/45"
              />
              <button
                type="submit"
                disabled={texte.trim().length === 0}
                aria-label={t.envoyer}
                className="shrink-0 text-brass hover:text-ivory transition-colors disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
            {refus && (
              <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.16em] text-brass">{refus}</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

const FR = {
  titre: 'La parole à la table',
  ouvrir: 'Ouvrir',
  fermer: 'Replier',
  vide: 'Rien n’a encore été dit. Saluez votre adversaire, la partie se joue mieux à deux voix.',
  champ: 'Dire quelque chose',
  envoyer: 'Envoyer',
  vous: 'Vous',
  tropVite: 'Laissez passer deux secondes.',
  tropLong: 'Le message est trop long.',
  ferme: 'La table est fermée pour le moment.',
};

const EN = {
  titre: 'Talk at the table',
  ouvrir: 'Open',
  fermer: 'Collapse',
  vide: 'Nothing has been said yet. Greet your opponent, a game goes better with two voices.',
  champ: 'Say something',
  envoyer: 'Send',
  vous: 'You',
  tropVite: 'Let two seconds go by.',
  tropLong: 'That message is too long.',
  ferme: 'The table is closed for now.',
};

export default Clavardage;
