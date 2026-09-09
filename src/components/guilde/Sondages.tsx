import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Vote, Check, Loader2, Lock, Plus, Send, Trash2, X } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import { lireFiche, nomAffiche, type Membre } from '../../firebase/ordre';
import type { Guilde } from '../../firebase/guildes';
import {
  suivreSondages, creer, voter, clore, supprimer, depouiller,
  LONGUEUR_MAX_QUESTION, LONGUEUR_MAX_OPTION, OPTIONS_MIN, OPTIONS_MAX, type Sondage,
} from '../../firebase/guildeSondages';

// ─── Les sondages du groupe ──────────────────────────────────────────
// Addendum 2 du 6 septembre 2026, ordre 15a. Un membre pose une question
// avec deux à six réponses. Les résultats se lisent en barres qui
// prennent toute la largeur de la carte, la réponse que j'ai choisie en
// or. Tant que la question est ouverte, chaque barre est un bouton de
// vote; l'auteur, un chef ou l'équipe la ferment ou la retirent.

export interface SondagesProps { guilde: Guilde; uid: string | null; estChef: boolean; peutGerer?: boolean }

const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};
const ROUILLE = '#E08A6E';

const quand = (s: Sondage, fr: boolean): string => {
  const ms = s.creeLe?.toMillis?.();
  if (!ms) return fr ? 'à l’instant' : 'just now';
  return new Date(ms).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long' });
};

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number }> = ({ nom, url, hue }) => (
  <span
    className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-[11px] text-ivory/85"
    style={{ background: `hsl(${hue ?? 30} 40% 22%)` }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const Sondages: React.FC<SondagesProps> = ({ guilde, uid, estChef, peutGerer = estChef }) => {
  const { lang } = useUI();
  const fr = lang === 'FR';

  const [sondages, setSondages] = useState<Sondage[]>([]);
  useEffect(() => suivreSondages(guilde.id, setSondages), [guilde.id]);

  // Les fiches des auteurs, lues une fois chacune.
  const [fiches, setFiches] = useState<Record<string, Membre | null>>({});
  useEffect(() => {
    const manquants = Array.from(new Set(sondages.map((s) => s.creePar))).filter((u) => !(u in fiches));
    if (!manquants.length) return;
    let vivant = true;
    void Promise.all(manquants.map(async (u) => [u, await lireFiche(u)] as const)).then((paires) => {
      if (vivant) setFiches((f) => ({ ...f, ...Object.fromEntries(paires) }));
    });
    return () => { vivant = false; };
  }, [sondages, fiches]);

  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {uid && <Composeur guildeId={guilde.id} uid={uid} fr={fr} />}

      {erreur && <p role="alert" className="font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}

      {sondages.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {fr ? 'Aucune question posée pour le moment. La première est à vous.' : 'No question asked yet. The first one is yours.'}
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sondages.map((s) => (
            <Carte
              key={s.id} sondage={s} uid={uid} fr={fr} lang={lang} guildeId={guilde.id}
              auteur={fiches[s.creePar]}
              gere={!!uid && (s.creePar === uid || peutGerer)}
              onErreur={setErreur}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Une question et ses barres ──────────────────────────────────────
const Carte: React.FC<{
  sondage: Sondage; uid: string | null; fr: boolean; lang: 'FR' | 'EN'; guildeId: string;
  auteur: Membre | null | undefined; gere: boolean; onErreur: (m: string | null) => void;
}> = ({ sondage: s, uid, fr, lang, guildeId, auteur, gere, onErreur }) => {
  const { comptes, total, parts } = depouiller(s);
  const mien = uid ? s.votes[uid] : undefined;
  const ouvert = !s.clos;
  const [busy, setBusy] = useState(false);
  const [confirme, setConfirme] = useState(false);

  const agir = async (fn: () => Promise<void>) => {
    setBusy(true); onErreur(null);
    try { await fn(); }
    catch (e) { onErreur(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setConfirme(false); }
  };

  const bouton = 'inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider transition rounded-card disabled:opacity-40';
  const nomAuteur = nomAffiche(auteur) || (fr ? 'Un membre' : 'A member');

  return (
    <article className="glass-light rounded-lg-card p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="witcher-stat-label inline-flex items-center gap-1.5">
          {ouvert ? <Vote size={11} /> : <Lock size={11} />}
          {ouvert ? (fr ? 'Ouvert' : 'Open') : (fr ? 'Clos' : 'Closed')}
        </span>
        <span className="font-sans text-[11px] tabular-nums" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
          {total} {fr ? 'voix' : (total === 1 ? 'vote' : 'votes')}
        </span>
        {gere && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            {confirme ? (
              <>
                <span className="font-sans text-[11px]" style={{ color: ROUILLE }}>{fr ? 'Retirer ?' : 'Remove?'}</span>
                <button type="button" disabled={busy} onClick={() => agir(() => supprimer(guildeId, s.id))}
                        className={`${bouton} bg-[#E08A6E] text-midnight-deep hover:opacity-90`}>
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {fr ? 'Oui' : 'Yes'}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirme(false)}
                        className={`${bouton} text-ivory-soft hover:text-ivory`} style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
                  {fr ? 'Non' : 'No'}
                </button>
              </>
            ) : (
              <>
                {ouvert && (
                  <button type="button" disabled={busy} onClick={() => agir(() => clore(guildeId, s.id))}
                          className={`${bouton} text-ivory-soft hover:text-brass`} style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
                    <Lock size={11} /> {fr ? 'Clore' : 'Close'}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => setConfirme(true)} aria-label={fr ? 'Retirer le sondage' : 'Remove the poll'}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </span>
        )}
      </div>

      <h3 className="font-display text-lg md:text-xl text-ivory leading-snug">{s.question}</h3>

      <ul className="space-y-2" role={ouvert && uid ? 'radiogroup' : undefined} aria-label={s.question}>
        {s.options.map((o, i) => {
          const choisi = mien === i;
          const pct = parts[i];
          const cadre = { border: `1px solid ${choisi ? 'rgba(var(--sk-gilt-rgb),0.7)' : 'rgba(var(--sk-parchment-rgb),0.12)'}` };
          const contenu = (
            <>
              {/* La barre : la part des voix, d'un bord à l'autre de la carte. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, background: choisi ? 'rgba(var(--sk-gilt-rgb),0.26)' : 'rgba(var(--sk-gilt-rgb),0.1)' }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="font-sans text-sm text-ivory inline-flex items-center gap-2 min-w-0">
                  {choisi && <Check size={13} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
                  <span className="truncate">{o}</span>
                </span>
                <span className="font-sans text-[11px] tabular-nums shrink-0"
                      style={{ color: choisi ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.6)' }}>
                  {pct} % · {comptes[i]}
                </span>
              </span>
            </>
          );
          return (
            <li key={i}>
              {ouvert && uid ? (
                <button
                  type="button" role="radio" aria-checked={choisi} disabled={busy}
                  onClick={() => { if (!choisi) void agir(() => voter(guildeId, s.id, uid, i)); }}
                  className="relative w-full text-left px-4 py-3 rounded-card overflow-hidden transition hover:bg-brass/5 disabled:opacity-60"
                  style={cadre}
                >
                  {contenu}
                </button>
              ) : (
                <div className="relative w-full px-4 py-3 rounded-card overflow-hidden" style={cadre}>{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>

      <Link to={`${addLocale('/profil', lang)}/${s.creePar}`} className="mt-auto pt-1 flex items-center gap-2 group">
        <Medaillon nom={nomAuteur} url={auteur?.avatarUrl} hue={auteur?.avatarHue} />
        <span className="min-w-0">
          <span className="block font-sans text-[12px] text-ivory truncate group-hover:text-brass transition-colors">{nomAuteur}</span>
          <span className="block font-sans text-[10px] text-ivory-soft/45">{quand(s, fr)}</span>
        </span>
      </Link>
    </article>
  );
};

// ─── Poser une question ──────────────────────────────────────────────
const Composeur: React.FC<{ guildeId: string; uid: string; fr: boolean }> = ({ guildeId, uid, fr }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const pret = question.trim().length > 0 && options.filter((o) => o.trim()).length >= OPTIONS_MIN;

  const majOption = (i: number, v: string) =>
    setOptions((o) => o.map((x, k) => (k === i ? v.slice(0, LONGUEUR_MAX_OPTION) : x)));
  const retirer = (i: number) =>
    setOptions((o) => (o.length > OPTIONS_MIN ? o.filter((_, k) => k !== i) : o));

  const poser = async () => {
    setEnvoi(true); setErreur(null);
    try {
      await creer(guildeId, uid, question, options);
      setQuestion(''); setOptions(['', '']);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
      <p className="witcher-stat-label inline-flex items-center gap-2 mb-4">
        <Vote size={12} /> {fr ? 'Poser une question' : 'Ask a question'}
      </p>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <textarea
            value={question} onChange={(e) => setQuestion(e.target.value.slice(0, LONGUEUR_MAX_QUESTION))}
            rows={3}
            placeholder={fr ? 'La question que vous posez au groupe.' : 'The question you put to the group.'}
            className="w-full px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 leading-relaxed"
            style={champ}
          />
          <span className="block mt-1 font-sans text-[10px] text-ivory-soft/45 text-right">{question.length}/{LONGUEUR_MAX_QUESTION}</span>
        </div>

        <div className="lg:col-span-7 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-display text-sm text-center" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>{i + 1}</span>
              <input
                value={o} onChange={(e) => majOption(i, e.target.value)} maxLength={LONGUEUR_MAX_OPTION}
                placeholder={fr ? `Réponse ${i + 1}` : `Answer ${i + 1}`}
                aria-label={fr ? `Réponse ${i + 1}` : `Answer ${i + 1}`}
                className="min-w-0 flex-1 px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
                style={champ}
              />
              <button type="button" onClick={() => retirer(i)} disabled={options.length <= OPTIONS_MIN}
                      aria-label={fr ? 'Retirer cette réponse' : 'Remove this answer'}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/50 hover:text-[#E08A6E] transition disabled:opacity-30">
                <X size={13} />
              </button>
            </div>
          ))}
          {options.length < OPTIONS_MAX && (
            <button type="button" onClick={() => setOptions((o) => [...o, ''])}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                    style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
              <Plus size={12} /> {fr ? 'Une réponse de plus' : 'One more answer'}
            </button>
          )}
        </div>
      </div>

      {erreur && <p role="alert" className="mt-3 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
          {fr
            ? 'Deux à six réponses. Chacun vote une fois et peut changer d’avis tant que la question reste ouverte.'
            : 'Two to six answers. Everyone votes once and may change their mind while the question stays open.'}
        </span>
        <button type="button" onClick={poser} disabled={envoi || !pret}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
          {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {fr ? 'Poser' : 'Ask'}
        </button>
      </div>
    </section>
  );
};

export default Sondages;
