import React, { useMemo, useState } from 'react';
import { STATS_VIDES, type StatsMembre } from '../firebase/ordre';
import Personnage from './Personnage';
import {
  CATALOGUE, COIFFURES, CORPS, COULEUR_RARETE, COULEURS_COIFFURE,
  EMPLACEMENTS, LIBELLE_EMPLACEMENT, TEINTES_PEAU,
  objetParId, type CorpsId, type Emplacement,
} from './objets';
import type { AvatarChantier } from './avatar';

// ─── L'inventaire ──────────────────────────────────────────────────
// Disposition Witcher/Diablo : le mannequin au centre en grand, les
// cases d'équipement en deux colonnes qui l'encadrent, le sac en
// grille 5×4 à droite, les aptitudes à gauche. Glisser-déposer HTML5
// natif entre le sac et les cases (Alex, 2026-08-27).

interface Props {
  lang: 'FR' | 'EN';
  avatar: AvatarChantier;
  onChange: (a: AvatarChantier) => void;
}

const APTITUDES: Array<[keyof StatsMembre, string, string]> = [
  ['force', 'Force', 'Strength'],
  ['ruse', 'Ruse', 'Cunning'],
  ['chance', 'Chance', 'Luck'],
  ['verve', 'Verve', 'Verve'],
  ['endurance', 'Endurance', 'Endurance'],
];

function statsCalculees(equipe: Partial<Record<Emplacement, string | null>>): StatsMembre {
  const s: StatsMembre = { ...STATS_VIDES };
  Object.values(equipe).forEach((id) => {
    const o = objetParId(id ?? undefined);
    if (!o) return;
    (Object.keys(o.bonus) as Array<keyof StatsMembre>).forEach((k) => {
      s[k] = s[k] + (o.bonus[k] ?? 0);
    });
  });
  return s;
}

interface DragPayload { id: string; from: 'sac' | Emplacement }

const SAC_TAILLE = 20; // grille 5×4

const Inventaire: React.FC<Props> = ({ lang, avatar, onChange }) => {
  const fr = lang === 'FR';
  const [survole, setSurvole] = useState<string | null>(null);
  const stats = useMemo(() => statsCalculees(avatar.equipe), [avatar.equipe]);

  function ecrire(payload: DragPayload, e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  }

  function lire(e: React.DragEvent): DragPayload | null {
    try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; }
  }

  function equiper(emplacement: Emplacement, payload: DragPayload) {
    const objet = objetParId(payload.id);
    if (!objet || objet.emplacement !== emplacement) return;
    const equipe = { ...avatar.equipe };
    let sac = [...avatar.sac];
    const occupant = equipe[emplacement];
    if (payload.from === 'sac') {
      sac = sac.filter((id) => id !== payload.id);
    } else {
      equipe[payload.from] = null;
    }
    if (occupant) sac.push(occupant);
    equipe[emplacement] = payload.id;
    onChange({ ...avatar, equipe, sac });
  }

  function versSac(payload: DragPayload) {
    if (payload.from === 'sac') return;
    const equipe = { ...avatar.equipe, [payload.from]: null };
    onChange({ ...avatar, equipe, sac: [...avatar.sac, payload.id] });
  }

  const colonneGauche: Emplacement[] = EMPLACEMENTS.slice(0, 5);
  const colonneDroite: Emplacement[] = EMPLACEMENTS.slice(5, 10);

  // Deux rendus pour la même case : le losange Witcher (desktop, où il
  // y a la place d'encadrer le mannequin) et un carré compact (mobile,
  // en grille sous le personnage — un losange de 88px ne tient pas cinq
  // fois sur un écran de téléphone). Même logique de dépose des deux
  // côtés (Alex, 2026-08-27, correctif d'affichage mobile).
  const Case: React.FC<{ emplacement: Emplacement; compact?: boolean }> = ({ emplacement, compact }) => {
    const id = avatar.equipe[emplacement];
    const objet = objetParId(id);
    const dragProps = {
      draggable: !!objet,
      onDragStart: (e: React.DragEvent) => objet && ecrire({ id: objet.id, from: emplacement }, e),
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setSurvole(emplacement); },
      onDragLeave: () => setSurvole((s) => (s === emplacement ? null : s)),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); setSurvole(null); const p = lire(e); if (p) equiper(emplacement, p); },
      title: objet ? (fr ? objet.nom.FR : objet.nom.EN) : LIBELLE_EMPLACEMENT[emplacement][lang],
    };
    if (compact) {
      return (
        <div className="flex flex-col items-center gap-1">
          <div {...dragProps} className="w-12 h-12 rounded-md flex items-center justify-center cursor-pointer transition"
               style={{
                 background: survole === emplacement ? 'rgba(var(--sk-gilt-rgb),0.22)' : 'rgba(var(--sk-parchment-rgb),0.05)',
                 border: `1px solid ${objet ? COULEUR_RARETE[objet.rarete] : 'rgba(var(--sk-parchment-rgb),0.14)'}`,
               }}>
            {objet && <span style={{ width: 20, height: 20, borderRadius: 4, background: objet.couleur }} />}
          </div>
          <span className="witcher-stat-label text-[7px] text-center leading-tight">{LIBELLE_EMPLACEMENT[emplacement][lang]}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span {...dragProps} className="witcher-tile cursor-pointer" data-active={!!objet}
              style={survole === emplacement ? { background: 'rgba(var(--sk-gilt-rgb),0.22)', borderColor: 'var(--sk-gilt)' } : undefined}>
          <span className="witcher-tile-inner">
            {objet ? (
              <span style={{ width: 22, height: 22, borderRadius: 5, background: objet.couleur, border: `1.5px solid ${COULEUR_RARETE[objet.rarete]}` }} />
            ) : (
              <span style={{ width: 18, height: 18, borderRadius: 3, border: '1px dashed rgba(var(--sk-parchment-rgb),0.25)' }} />
            )}
          </span>
        </span>
        <span className="witcher-stat-label text-[9px]">{LIBELLE_EMPLACEMENT[emplacement][lang]}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr_300px] items-start">
      {/* ── Aptitudes, à gauche ── */}
      <section className="rounded-lg-card border border-brass/25 p-6" style={{ background: 'rgba(var(--sk-deep-rgb),0.45)' }}>
        <p className="witcher-stat-label mb-4">{fr ? 'Aptitudes' : 'Abilities'}</p>
        <ul className="space-y-3">
          {APTITUDES.map(([cle, nomFR, nomEN]) => (
            <li key={cle} className="flex items-center gap-3">
              <span className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/60 w-20 shrink-0">
                {fr ? nomFR : nomEN}
              </span>
              <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--sk-parchment-rgb),0.1)' }}>
                <span className="block h-full" style={{
                  width: `${Math.max(0, Math.min(20, stats[cle])) * 5}%`,
                  background: 'linear-gradient(90deg, rgba(var(--sk-glow-rgb),0.5), var(--color-amber-glow))',
                }} />
              </span>
              <span className="font-display text-sm text-ivory w-6 text-right">{stats[cle]}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-5">
          <div>
            <p className="witcher-stat-label mb-2">{fr ? 'Silhouette' : 'Body'}</p>
            <div className="flex gap-2">
              {CORPS.map((c) => (
                <button key={c} type="button"
                        onClick={() => onChange({ ...avatar, corps: c as CorpsId })}
                        className="px-3 py-1.5 font-sans text-xs uppercase tracking-wider rounded-card border transition"
                        style={{ borderColor: avatar.corps === c ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)', color: avatar.corps === c ? 'var(--sk-gilt)' : undefined }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="witcher-stat-label mb-2">{fr ? 'Peau' : 'Skin'}</p>
            <div className="flex gap-2">
              {TEINTES_PEAU.map((couleur, i) => (
                <button key={couleur} type="button" onClick={() => onChange({ ...avatar, peau: i })}
                        aria-label={`peau ${i}`}
                        className="w-7 h-7 rounded-full border-2 transition"
                        style={{ background: couleur, borderColor: avatar.peau === i ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)' }} />
              ))}
            </div>
          </div>
          <div>
            <p className="witcher-stat-label mb-2">{fr ? 'Coiffure' : 'Hair'}</p>
            <div className="flex gap-2">
              {COIFFURES.map((c) => (
                <button key={c} type="button" onClick={() => onChange({ ...avatar, coiffure: c })}
                        aria-label={`coiffure ${c}`}
                        className="w-7 h-7 rounded-full border-2 transition"
                        style={{ background: COULEURS_COIFFURE[c], borderColor: avatar.coiffure === c ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Le mannequin, encadré des cases ──
          Desktop : les deux colonnes de losanges flanquent le
          personnage, comme Witcher/Diablo. Mobile : un losange de 88px
          ne tient pas cinq fois sur un écran de téléphone, donc le
          personnage passe en premier (`order-1`) et les dix cases se
          rangent dessous en grille compacte (`order-2`), les colonnes
          flanquantes ne s'affichant qu'à partir de `lg`
          (Alex, 2026-08-27, correctif d'affichage mobile). */}
      <section className="rounded-lg-card border border-brass/20 py-8 px-4" style={{ background: 'rgba(8,20,36,0.4)' }}>
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-center lg:gap-8">
          <div className="hidden lg:flex flex-col gap-6 shrink-0 lg:order-1">
            {colonneGauche.map((e) => <Case key={e} emplacement={e} />)}
          </div>
          <div
            className="order-1 lg:order-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const p = lire(e); if (p) versSac(p); }}
          >
            <Personnage corps={avatar.corps} peau={avatar.peau} coiffure={avatar.coiffure} equipe={avatar.equipe} size={220} />
          </div>
          <div className="hidden lg:flex flex-col gap-6 shrink-0 lg:order-3">
            {colonneDroite.map((e) => <Case key={e} emplacement={e} />)}
          </div>
          <div className="grid grid-cols-5 gap-2.5 order-2 lg:hidden max-w-xs">
            {EMPLACEMENTS.map((e) => <Case key={e} emplacement={e} compact />)}
          </div>
        </div>
      </section>

      {/* ── Le sac, à droite ── */}
      <section className="rounded-lg-card border border-brass/20 p-6" style={{ background: 'rgba(8,20,36,0.4)' }}>
        <p className="witcher-stat-label mb-4">{fr ? 'Le sac' : 'The bag'}</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: SAC_TAILLE }).map((_, i) => {
            const id = avatar.sac[i];
            const objet = objetParId(id);
            return (
              <div key={i}
                   className="aspect-square rounded-md flex items-center justify-center cursor-pointer transition"
                   style={{
                     background: survole === `sac-${i}` ? 'rgba(var(--sk-gilt-rgb),0.18)' : 'rgba(var(--sk-parchment-rgb),0.05)',
                     border: `1px solid ${objet ? COULEUR_RARETE[objet.rarete] : 'rgba(var(--sk-parchment-rgb),0.12)'}`,
                   }}
                   draggable={!!objet}
                   onDragStart={(e) => objet && ecrire({ id: objet.id, from: 'sac' }, e)}
                   onDragOver={(e) => { e.preventDefault(); setSurvole(`sac-${i}`); }}
                   onDragLeave={() => setSurvole((s) => (s === `sac-${i}` ? null : s))}
                   onDrop={(e) => { e.preventDefault(); setSurvole(null); const p = lire(e); if (p) versSac(p); }}
                   title={objet ? (fr ? objet.nom.FR : objet.nom.EN) : undefined}
              >
                {objet && <span style={{ width: 24, height: 24, borderRadius: 5, background: objet.couleur }} />}
              </div>
            );
          })}
        </div>
        <p className="font-editorial text-xs text-ivory-soft/60 mt-4 leading-relaxed">
          {fr ? 'Glissez un objet vers une case du mannequin pour l’équiper, ou vers le sac pour le ranger.'
              : 'Drag an item onto a mannequin slot to equip it, or back into the bag to store it.'}
        </p>
        <p className="font-editorial text-xs text-ivory-soft/40 mt-3">
          {fr ? `${CATALOGUE.length} objets au catalogue` : `${CATALOGUE.length} items in the catalogue`}
        </p>
      </section>
    </div>
  );
};

export default Inventaire;
