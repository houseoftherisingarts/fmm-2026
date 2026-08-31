import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Send, VolumeX, Volume2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import { lireFiche, suivreSalon, direAuSalon, type MotSalon, type Membre } from '../../firebase/ordre';
import {
  LONGUEUR_MAX, bloquer, debloquer, signaler, suivreBlocages, tropVite,
} from '../../firebase/moderation';
import { Portrait, versDate, quand } from './Portrait';

// ─── Le salon de l'Ordre ─────────────────────────────────────────────
// La place publique du registre (Alex, 2026-08-23). Tout le monde s'y
// parle, dans un seul fil, du plus ancien au plus récent.
//
// Le rendu suit une transcription plutôt qu'une pile de cartes : quand
// la même personne enchaîne deux mots, son portrait et son nom ne se
// répètent pas. C'est ce qui donne au fil son souffle, et c'est ce qui
// distingue une vraie salle d'une liste.
//
// Le silence et le signalement vivent sur chaque mot. Faire taire
// quelqu'un ici ne le fait taire que pour soi : personne ne retire la
// parole à un autre devant tout le monde, cela regarde l'équipe.

const SalonOrdre: React.FC = () => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const { user, openSignIn } = useAuth();

  const [mots, setMots] = useState<MotSalon[]>([]);
  const [maFiche, setMaFiche] = useState<Membre | null>(null);
  const [bloques, setBloques] = useState<string[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');
  const listeRef = useRef<HTMLDivElement>(null);
  const collePasEnBas = useRef(false);

  useEffect(() => suivreSalon(setMots), []);

  useEffect(() => {
    if (!user) { setMaFiche(null); setBloques([]); return; }
    let vivant = true;
    lireFiche(user.uid).then((f) => { if (vivant) setMaFiche(f); }).catch(() => {});
    const stop = suivreBlocages(user.uid, setBloques);
    return () => { vivant = false; stop(); };
  }, [user?.uid]);

  // Le fil descend tout seul quand un mot arrive, sauf si la personne
  // est remontée pour relire : lui arracher sa lecture serait pénible.
  const visibles = useMemo(
    () => mots.filter((m) => !bloques.includes(m.uid)),
    [mots, bloques],
  );

  useEffect(() => {
    const el = listeRef.current;
    if (!el || collePasEnBas.current) return;
    el.scrollTop = el.scrollHeight;
  }, [visibles.length]);

  const surDefilement = () => {
    const el = listeRef.current;
    if (!el) return;
    collePasEnBas.current = el.scrollHeight - el.scrollTop - el.clientHeight > 140;
  };

  const monNom = (maFiche?.nom || user?.displayName || '').trim() || t.sansNom;

  const parler = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = brouillon.trim();
    if (!user || !texte || envoi) return;
    if (tropVite(`salon:${user.uid}`)) { setAvis(t.tropVite); return; }
    setEnvoi(true);
    setAvis('');
    try {
      await direAuSalon({
        uid: user.uid,
        nom: monNom,
        avatarUrl: maFiche?.avatarUrl,
        avatarHue: maFiche?.avatarHue,
        texte,
      });
      setBrouillon('');
      collePasEnBas.current = false;
    } catch {
      setAvis(t.echec);
    } finally {
      setEnvoi(false);
    }
  };

  const faireTaire = async (m: MotSalon) => {
    if (!user) return;
    await bloquer(user.uid, m.uid);
    setAvis(t.bloque(m.nom));
  };

  const rapporter = async (m: MotSalon) => {
    if (!user || !m.id) return;
    try {
      await signaler({
        parUid: user.uid, parNom: monNom,
        contreUid: m.uid, contreNom: m.nom,
        texte: m.texte, lieu: 'salon', reference: m.id,
      });
      setAvis(t.signale);
    } catch {
      setAvis(t.echec);
    }
  };

  const reste = LONGUEUR_MAX - brouillon.length;

  return (
    <section className="mt-16 md:mt-20" aria-labelledby="titre-salon">
      <header className="mb-6">
        <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-brass/80 mb-2">
          {t.eyebrow}
        </p>
        <h2 id="titre-salon" className="font-display title-medieval text-2xl md:text-3xl text-ivory">
          {t.titre}
        </h2>
        <p className="font-editorial text-sm text-ivory-soft/80 leading-relaxed mt-2 max-w-2xl">
          {t.intro}
        </p>
      </header>

      <div className="rounded-lg-card border border-brass/25 overflow-hidden flex flex-col h-[30rem] md:h-[34rem]"
           style={{ background: 'rgba(var(--sk-deep-rgb), 0.45)' }}>

        <div
          ref={listeRef}
          onScroll={surDefilement}
          aria-live="polite"
          className="flex-1 overflow-y-auto px-5 md:px-7 py-6"
        >
          {visibles.length === 0 ? (
            <p className="font-editorial text-sm text-ivory-soft/60 text-center pt-16">
              {user ? t.vide : t.videInvite}
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {visibles.map((m, i) => {
                const precedent = visibles[i - 1];
                const enchaine = precedent?.uid === m.uid
                  && secondesEntre(precedent.ecritLe, m.ecritLe) < 300;
                return (
                  <Mot
                    key={m.id || i}
                    mot={m}
                    enchaine={enchaine}
                    moi={m.uid === user?.uid}
                    connecte={!!user}
                    lang={lang}
                    t={t}
                    surTaire={() => faireTaire(m)}
                    surSignaler={() => rapporter(m)}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {bloques.length > 0 && user && (
          <div className="px-5 md:px-7 py-2.5 flex flex-wrap items-center gap-2"
               style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb), 0.08)' }}>
            <span className="font-sans uppercase tracking-[0.18em] text-[9px] text-ivory-soft/45">
              {t.silences}
            </span>
            {bloques.map((uid) => (
              <button key={uid} type="button" onClick={() => debloquer(user.uid, uid)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card border border-ivory-soft/20 font-sans text-[10px] text-ivory-soft/70 hover:border-brass/50 hover:text-brass transition-colors">
                <Volume2 size={11} /> {nomBloque(mots, uid) || t.sansNom}
              </button>
            ))}
          </div>
        )}

        {avis && (
          <p role="status" className="px-5 md:px-7 py-2 font-sans text-[11px] text-brass/90"
             style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb), 0.08)' }}>
            {avis}
          </p>
        )}

        {user ? (
          <form onSubmit={parler}
                className="px-5 md:px-7 py-4 flex items-end gap-3"
                style={{ borderTop: '1px solid rgba(var(--sk-glow-rgb), 0.18)' }}>
            <label htmlFor="mot-salon" className="sr-only">{t.champ}</label>
            <textarea
              id="mot-salon"
              rows={1}
              value={brouillon}
              maxLength={LONGUEUR_MAX}
              onChange={(e) => { setBrouillon(e.target.value); if (avis) setAvis(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void parler(e as unknown as React.FormEvent);
                }
              }}
              placeholder={t.champ}
              className="flex-1 px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 resize-none max-h-40 focus:outline-none focus:border-brass/60 transition-colors"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}
            />
            <div className="flex flex-col items-end gap-1.5">
              {reste < 200 && (
                <span aria-live="polite"
                      className={`font-sans text-[10px] tabular-nums ${reste < 0 ? 'text-red-300' : 'text-ivory-soft/50'}`}>
                  {reste}
                </span>
              )}
              <button type="submit" disabled={envoi || !brouillon.trim()}
                      aria-label={t.envoyer}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-card bg-brass text-midnight-deep hover:bg-brass-soft transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                <Send size={15} />
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 md:px-7 py-5 flex flex-wrap items-center justify-between gap-4"
               style={{ borderTop: '1px solid rgba(var(--sk-glow-rgb), 0.18)' }}>
            <p className="font-editorial text-sm text-ivory-soft/75">{t.connectezVous}</p>
            <button type="button" onClick={openSignIn}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors">
              {t.seConnecter}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

// ── Un mot dans le fil ──────────────────────────────────────────────
const Mot: React.FC<{
  mot: MotSalon;
  enchaine: boolean;
  moi: boolean;
  connecte: boolean;
  lang: 'FR' | 'EN';
  t: typeof FR;
  surTaire: () => void;
  surSignaler: () => void;
}> = ({ mot, enchaine, moi, connecte, lang, t, surTaire, surSignaler }) => (
  <motion.article
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    className={`group relative flex gap-3.5 ${enchaine ? 'mt-1' : 'mt-5 first:mt-0'}`}
  >
    <div className="w-9 shrink-0">
      {!enchaine && <Portrait nom={mot.nom} url={mot.avatarUrl} teinte={mot.avatarHue} taille={36} />}
    </div>

    <div className="min-w-0 flex-1">
      {!enchaine && (
        <div className="flex items-baseline gap-2.5 mb-1">
          <Link to={`${addLocale('/profil', lang)}/${mot.uid}`}
                className={`font-display title-medieval text-sm hover:text-brass transition-colors ${moi ? 'text-brass' : 'text-ivory'}`}>
            {mot.nom || t.sansNom}
          </Link>
          <span className="font-sans text-[10px] tabular-nums text-ivory-soft/40">
            {quand(mot.ecritLe, lang, true)}
          </span>
        </div>
      )}
      <p className="font-editorial text-[15px] leading-relaxed text-ivory-soft whitespace-pre-wrap break-words">
        {mot.texte}
      </p>
    </div>

    {connecte && !moi && (
      <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button type="button" onClick={surSignaler} title={t.signaler} aria-label={t.signaler}
                className="p-1.5 rounded-card text-ivory-soft/50 hover:text-brass transition-colors">
          <Flag size={13} />
        </button>
        <button type="button" onClick={surTaire} title={t.taire} aria-label={t.taire}
                className="p-1.5 rounded-card text-ivory-soft/50 hover:text-brass transition-colors">
          <VolumeX size={13} />
        </button>
      </div>
    )}
  </motion.article>
);

// ── Les petites mécaniques ──────────────────────────────────────────
function secondesEntre(a: unknown, b: unknown): number {
  const da = versDate(a); const dbb = versDate(b);
  if (!da || !dbb) return 0;
  return Math.abs(dbb.getTime() - da.getTime()) / 1000;
}

function nomBloque(mots: MotSalon[], uid: string): string | undefined {
  return mots.find((m) => m.uid === uid)?.nom;
}

const FR = {
  eyebrow: 'La place commune',
  titre: 'Le salon de l’Ordre',
  intro: 'C’est ici que les gens du festival se parlent. Ce qui s’écrit dans le salon se lit par tous les membres du registre, alors gardez le ton d’une table où il y a des enfants.',
  vide: 'Personne n’a encore parlé. Vous pouvez commencer.',
  videInvite: 'Le salon s’ouvre aux membres connectés.',
  champ: 'Dites quelque chose à la salle',
  envoyer: 'Envoyer',
  connectezVous: 'Connectez-vous pour prendre la parole.',
  seConnecter: 'Se connecter',
  signaler: 'Signaler ce message à l’équipe',
  taire: 'Ne plus voir ses messages',
  silences: 'Vous n’entendez plus',
  signale: 'Signalé. L’équipe va regarder.',
  bloque: (nom: string) => `Vous ne verrez plus les messages de ${nom || 'cette personne'}.`,
  tropVite: 'Laissez passer un instant avant le prochain message.',
  echec: 'Le message n’est pas passé. Réessayez dans un moment.',
  sansNom: 'Un membre',
};

const EN: typeof FR = {
  eyebrow: 'The common floor',
  titre: 'The Order’s hall',
  intro: 'This is where the festival’s people talk to each other. What you write in the hall is read by every member on the roll, so keep the tone of a table with children at it.',
  vide: 'Nobody has spoken yet. You can start.',
  videInvite: 'The hall opens to signed-in members.',
  champ: 'Say something to the room',
  envoyer: 'Send',
  connectezVous: 'Sign in to speak.',
  seConnecter: 'Sign in',
  signaler: 'Report this message to the team',
  taire: 'Hide their messages',
  silences: 'You no longer hear',
  signale: 'Reported. The team will look at it.',
  bloque: (nom: string) => `You will no longer see messages from ${nom || 'this person'}.`,
  tropVite: 'Let a moment pass before your next message.',
  echec: 'The message did not go through. Try again in a moment.',
  sansNom: 'A member',
};

export default SalonOrdre;
