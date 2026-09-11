import React, { useEffect, useRef, useState } from 'react';
import { Users, Camera, Loader2, Pencil } from 'lucide-react';
import type { Lang } from '../../content';
import { motDeLaForme, type FormeGuilde } from '../../firebase/guildes';

// ─── L'en-tête d'un groupe, posé sur sa bannière ─────────────────────
// Alex, 11 septembre 2026 : « enlève le grand cercle et le titre du
// clan, mets le titre sur la bannière, permets aux gens de changer le
// titre et le sous-titre en cliquant dessus quand c'est le Jarl ». La
// grande orbe du PageHeader est partie; le blason vit ici, petit, à
// gauche du nom. La même pièce sert à la page des membres et à la page
// publique : sans `edition`, rien ne se clique.

export const BANNIERE_PAR_DEFAUT = '/histoire/archives/lievre/2022-e9ed2ea5.webp';
/** 65 % vers la droite, où Aslak tient la proue du drakkar. */
const CADRAGE_BANNIERE = '65% center';

export interface EditionEntete {
  enregistrer: (patch: { nom?: string; description?: string }) => Promise<void>;
  choisirBanniere: () => void;
  banniereEnvoi: boolean;
  choisirBlason: () => void;
  blasonEnvoi: boolean;
}

interface Props {
  guilde: { nom: string; description?: string; forme?: FormeGuilde; blason?: string; banniereUrl?: string };
  nbMembres?: number;
  lang: Lang;
  eyebrow?: string;
  edition?: EditionEntete;
}

const NOM_MAX = 60;
const DESCRIPTION_MAX = 1000;

const EnteteGuilde: React.FC<Props> = ({ guilde, nbMembres, lang, eyebrow, edition }) => {
  const fr = lang === 'FR';
  const mot = motDeLaForme(guilde.forme, lang);
  const [champ, setChamp] = useState<'nom' | 'description' | null>(null);
  const [valeur, setValeur] = useState('');
  const [busy, setBusy] = useState(false);
  const zone = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => { if (champ) zone.current?.focus(); }, [champ]);

  const ouvrir = (c: 'nom' | 'description') => {
    if (!edition || busy) return;
    setValeur(c === 'nom' ? guilde.nom : (guilde.description || ''));
    setChamp(c);
  };

  const fermer = () => setChamp(null);

  const enregistrer = async () => {
    if (!edition || !champ) return;
    const propre = valeur.trim();
    const actuel = champ === 'nom' ? guilde.nom : (guilde.description || '');
    if (propre === actuel || (champ === 'nom' && propre.length < 2)) { fermer(); return; }
    setBusy(true);
    try { await edition.enregistrer(champ === 'nom' ? { nom: propre } : { description: propre }); }
    finally { setBusy(false); fermer(); }
  };

  const toucheClavier = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); fermer(); }
    if (e.key === 'Enter' && (champ === 'nom' || e.metaKey || e.ctrlKey)) { e.preventDefault(); void enregistrer(); }
  };

  const styleChamp: React.CSSProperties = {
    background: 'rgba(var(--sk-ink-rgb),0.55)',
    border: '1px solid rgba(var(--sk-gilt-rgb),0.55)',
    outline: 'none',
  };

  const cliquable = edition
    ? 'cursor-text rounded-card transition-colors hover:bg-[rgba(var(--sk-gilt-rgb),0.08)] -mx-2 px-2'
    : '';

  return (
    <div className="relative w-full overflow-hidden aspect-[4/3] sm:aspect-video md:aspect-[21/9] xl:aspect-[5/2]">
      <img
        src={guilde.banniereUrl || BANNIERE_PAR_DEFAUT} alt=""
        className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: CADRAGE_BANNIERE }}
      />
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, rgba(var(--sk-ink-rgb),0.55), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'linear-gradient(to top, rgba(var(--sk-ink-rgb),0.97) 0%, rgba(var(--sk-ink-rgb),0.6) 42%, rgba(var(--sk-ink-rgb),0.1) 100%)' }} />

      {edition && (
        <button type="button" onClick={edition.choisirBanniere} disabled={edition.banniereEnvoi}
                className="absolute top-4 right-5 md:right-10 xl:right-16 z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px]"
                style={{ background: 'rgba(var(--sk-ink-rgb),0.75)', border: '1px solid rgba(var(--sk-parchment-rgb),0.25)', color: 'rgba(var(--sk-parchment-rgb),0.9)' }}>
          {edition.banniereEnvoi ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          {guilde.banniereUrl ? (fr ? 'Changer la bannière' : 'Change the banner') : (fr ? 'Ajouter une bannière' : 'Add a banner')}
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 px-5 md:px-10 xl:px-16 pb-6 md:pb-10 flex items-end gap-4 md:gap-6">
        {/* ── Le blason, petit, à gauche du nom ── */}
        <span className="relative w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden shrink-0 border border-brass/40 flex items-center justify-center group"
              style={{ background: 'rgba(var(--sk-deep-rgb),0.7)', boxShadow: '0 0 34px -8px rgba(var(--sk-gilt-rgb),0.6)' }}>
          {guilde.blason ? <img src={guilde.blason} alt="" className="w-full h-full object-cover" /> : <Users size={26} className="text-brass" />}
          {edition && (
            <button type="button" onClick={edition.choisirBlason} disabled={edition.blasonEnvoi}
                    aria-label={guilde.blason ? (fr ? 'Changer le blason' : 'Change the coat of arms') : (fr ? 'Ajouter un blason' : 'Add a coat of arms')}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
                    style={{ background: 'rgba(var(--sk-ink-rgb),0.6)', color: 'var(--sk-parchment)' }}>
              {edition.blasonEnvoi ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-sans uppercase tracking-[0.22em] text-[10px] md:text-[11px]" style={{ color: 'var(--sk-gilt)' }}>
            {eyebrow || mot}
          </p>

          {/* ── Le titre, qui s'écrit en cliquant dessus quand on est chef ── */}
          {champ === 'nom' ? (
            <input
              ref={(el) => { zone.current = el; }}
              value={valeur} maxLength={NOM_MAX}
              onChange={(e) => setValeur(e.target.value)}
              onBlur={() => void enregistrer()} onKeyDown={toucheClavier}
              aria-label={fr ? 'Le nom du groupe' : 'The group name'}
              className="w-full font-display text-3xl md:text-5xl xl:text-6xl leading-[1.02] mt-1 text-ivory rounded-card px-2 -mx-2"
              style={styleChamp}
            />
          ) : (
            <h1
              className={`font-display text-3xl md:text-5xl xl:text-6xl leading-[1.02] mt-1 text-ivory ${cliquable}`}
              onClick={() => ouvrir('nom')}
              title={edition ? (fr ? 'Cliquez pour changer le nom' : 'Click to change the name') : undefined}
            >
              {guilde.nom}
              {edition && <Pencil size={14} className="inline-block ml-3 align-middle opacity-40" aria-hidden />}
            </h1>
          )}

          {/* ── Le sous-titre ── */}
          {champ === 'description' ? (
            <textarea
              ref={(el) => { zone.current = el; }}
              value={valeur} maxLength={DESCRIPTION_MAX} rows={3}
              onChange={(e) => setValeur(e.target.value)}
              onBlur={() => void enregistrer()} onKeyDown={toucheClavier}
              aria-label={fr ? 'La description du groupe' : 'The group description'}
              className="w-full mt-2 font-editorial text-base md:text-lg text-ivory-soft leading-relaxed rounded-card px-2 -mx-2 resize-y"
              style={styleChamp}
            />
          ) : (
            <p
              className={`mt-2 font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-3xl ${cliquable}`}
              onClick={() => ouvrir('description')}
              title={edition ? (fr ? 'Cliquez pour changer le sous-titre' : 'Click to change the subtitle') : undefined}
            >
              {guilde.description || (edition
                ? (fr ? 'Ajoutez un sous-titre : qui vous êtes, qui vous accueillez.' : 'Add a subtitle: who you are, who you welcome.')
                : (fr ? `${['clan', 'ordre'].includes(guilde.forme || 'guilde') ? 'Un' : 'Une'} ${mot.toLowerCase()} de l’Ordre.` : `A ${mot.toLowerCase()} of the Order.`))}
            </p>
          )}

          {typeof nbMembres === 'number' && (
            <p className="font-sans text-sm text-ivory-soft mt-2 inline-flex items-center gap-1.5">
              <Users size={12} /> {nbMembres} {fr ? (nbMembres > 1 ? 'membres' : 'membre') : (nbMembres > 1 ? 'members' : 'member')}
            </p>
          )}
          {busy && <Loader2 size={14} className="animate-spin text-brass mt-2" />}
        </div>
      </div>
    </div>
  );
};

export default EnteteGuilde;
