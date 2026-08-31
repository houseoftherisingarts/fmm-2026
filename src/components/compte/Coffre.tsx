import React, { useEffect, useState } from 'react';
import { Check, Music, Palette, Disc3, Gift, Lock, Swords } from 'lucide-react';
import { definirPref, suivreFiche, type SkinMembre } from '../../firebase/ordre';
import { BOARD_SETS, PIECE_SETS, lireChoix, ecrireChoix } from '../../games/hnefatafl/assets';
import { DOS_CARTES, dosEquipe, equiperDos } from '../../games/tarot/dos';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { ecouterAvatar, type AvatarChantier } from '../../chantier/avatar';
import { listGroupes, type GroupeMusical } from '../../firebase/groupesMusicaux';
import { AMBIANCES } from '../../lib/ambiances';
import { NOMS_SKIN, IMAGE_SKIN } from '../boutique/BoutiqueMontpellois';
import InterrupteurAnimationsFond from './InterrupteurAnimationsFond';

// ─── Le coffre : ce que la personne possède, équipé d'un clic ────────
// Alex, 2026-08-28 : « quand on achète les skins, il faudrait un
// endroit pour les changer ». Un skin acheté à la boutique s'écrit
// dans avatars/{uid}.skinsDebloques, une ambiance ou un album dans
// bourses/{uid}. Ce coffre lit les trois en direct (onSnapshot) : un
// achat à la boutique y paraît sans recharger la page. Cliquer sur un
// objet possédé l'équipe tout de suite (definirPref → prefs.skin ou
// prefs.musique), qui change le site sur-le-champ.

interface Props { uid: string; lang: 'FR' | 'EN' }

const Coffre: React.FC<Props> = ({ uid, lang }) => {
  const fr = lang === 'FR';

  const [avatar, setAvatar] = useState<AvatarChantier | null>(null);
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [skin, setSkin] = useState<SkinMembre | undefined>();
  const [musique, setMusique] = useState<string | undefined>();
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);

  useEffect(() => ecouterAvatar(uid, setAvatar), [uid]);
  useEffect(() => suivreMaBourse(uid, setBourse), [uid]);
  useEffect(() => suivreFiche(uid, (m) => { setSkin(m?.prefs?.skin); setMusique(m?.prefs?.musique); }), [uid]);
  useEffect(() => { listGroupes().then(setGroupes); }, []);

  const skinsPossedes: SkinMembre[] = ['rouge', ...(avatar?.skinsDebloques as SkinMembre[] || [])];
  const skinEquipe = skin || 'rouge';

  const ambiancesPossedees = AMBIANCES.filter((a) => a.gratuite || (bourse?.ambiances || []).includes(a.id));
  const musiqueEquipee = musique || 'festin';

  const albumsPossedes = groupes.filter((g) => (bourse?.albums || []).includes(g.id));

  // Les trésors de la roue des sept jours. Leur « équipement » vit dans
  // le navigateur, comme le reste des choix des jeux (lireChoix du
  // hnefatafl, CLE_DOS_TAROT du tarot).
  const chancesWJW = bourse?.chancesWJW || 0;
  const [choixJeu, setChoixJeu] = useState(() => lireChoix());
  const equiperPlateau = (id: string) => { ecrireChoix(id, choixJeu.pieces); setChoixJeu({ plateau: id, pieces: choixJeu.pieces }); };
  const equiperPieces = (id: string) => { ecrireChoix(choixJeu.plateau, id); setChoixJeu({ plateau: choixJeu.plateau, pieces: id }); };
  // Un jeu 'recompense' se joue seulement s'il est gagné; un jeu
  // 'bientot' s'annonce sans se choisir; un jeu 'disponible' est à tous.
  const jeuOuvert = (statut: string, id: string, gagnes: string[]) =>
    statut === 'disponible' || (statut === 'recompense' && gagnes.includes(id));
  const dosPossedes = ['festival', ...(bourse?.dosTarot || [])];
  const [dosActuel, setDosActuel] = useState<string | null>(() => dosEquipe());
  const equiperUnDos = (id: string) => { equiperDos(id === 'festival' ? null : id); setDosActuel(id === 'festival' ? null : id); };

  const carte = (actif: boolean) => ({
    background: actif ? 'rgba(var(--sk-gilt-rgb),0.14)' : 'transparent',
    border: `1px solid ${actif ? 'rgba(var(--sk-gilt-rgb),0.6)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`,
  });

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center gap-4 mb-6 pb-2" style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}>
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><Palette size={16} /></span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1">{fr ? 'Le coffre' : 'The vault'}</p>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr ? 'Ce que vous avez acheté. Un clic pour l’équiper.' : 'What you have bought. One click to equip it.'}
          </p>
        </div>
      </div>

      {/* Skins */}
      <div className="mb-7">
        <p className="witcher-stat-label mb-3"><Palette size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Vos skins' : 'Your skins'}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {skinsPossedes.map((s) => {
            const info = NOMS_SKIN[s];
            const actif = skinEquipe === s;
            return (
              <div key={s} className="rounded-card overflow-hidden flex flex-col transition" style={carte(actif)}>
                <button type="button" onClick={() => definirPref(uid, 'skin', s)} aria-pressed={actif}
                        className="block w-full text-left p-3 pb-2">
                  {/* La photo du skin en vignette carrée, le nom dessous (Alex, 2026-08-31). */}
                  {IMAGE_SKIN[s]
                    ? <img src={IMAGE_SKIN[s]} alt="" aria-hidden loading="lazy" className="block w-full aspect-square object-cover rounded-md" style={{ opacity: actif ? 1 : 0.85 }} />
                    : <span className="block w-full aspect-square rounded-md" style={{ background: info.couleur }} />}
                  <span className="flex items-center justify-center gap-1.5 mt-2 font-sans text-sm leading-tight text-center" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>
                    {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
                    <span>{fr ? info.FR : info.EN}</span>
                  </span>
                </button>
                <InterrupteurAnimationsFond lang={lang} className="px-3 pb-3 pt-2" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Ambiances */}
      <div className="mb-7">
        <p className="witcher-stat-label mb-3"><Music size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Vos ambiances' : 'Your ambiences'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ambiancesPossedees.map((a) => {
            const actif = musiqueEquipee === a.id;
            return (
              <button key={a.id} type="button" onClick={() => definirPref(uid, 'musique', a.id)}
                      aria-pressed={actif}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition"
                      style={carte(actif)}>
                <span className="min-w-0 flex-1 font-sans text-sm truncate" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>
                  {fr ? a.titreFR : a.titreEN}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Les récompenses quotidiennes : le compte des secondes chances au
          concours. Les skins gagnés se rangent avec les autres, dans
          « Vos jeux » (Alex, 2026-08-30). */}
      {chancesWJW > 0 && (
        <div className="mb-7">
          <p className="witcher-stat-label mb-3"><Gift size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Récompenses quotidiennes' : 'Daily rewards'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-card p-3 flex items-center gap-3" style={carte(true)}>
              <span className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center" style={{ background: 'rgba(var(--sk-gilt-rgb),0.14)', border: '1.5px solid rgba(var(--sk-parchment-rgb),0.25)', color: 'var(--sk-gilt)' }}>
                <Gift size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-sm" style={{ color: 'var(--sk-gilt)' }}>
                  {fr
                    ? `${chancesWJW} seconde${chancesWJW > 1 ? 's' : ''} chance${chancesWJW > 1 ? 's' : ''}`
                    : `${chancesWJW} second chance${chancesWJW > 1 ? 's' : ''}`}
                </span>
                <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                  {fr ? 'Concours William J. Walter' : 'William J. Walter draw'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vos jeux : tout ce qui habille les jeux, offert, gagné ou à
          venir, équipé d'un clic (Alex, 2026-08-30). Les choix vivent
          dans le navigateur, comme dans le lobby du hnefatafl. */}
      <div className="mb-7">
        <p className="witcher-stat-label mb-1"><Swords size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Vos jeux' : 'Your games'}</p>
        <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
          {fr ? 'Plateaux et pièces du hnefatafl, dos de carte du tarot. Ce qui est verrouillé se gagne ou s’en vient.' : 'Hnefatafl boards and pieces, tarot card backs. What is locked is earned or on its way.'}
        </p>

        <p className="font-sans uppercase tracking-[0.18em] text-[10px] mb-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>{fr ? 'Plateaux du hnefatafl' : 'Hnefatafl boards'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {BOARD_SETS.map((b) => {
            const ouvert = jeuOuvert(b.statut, b.id, bourse?.taflPlateaux || []);
            const actif = choixJeu.plateau === b.id;
            return (
              <button key={b.id} type="button" disabled={!ouvert} onClick={() => equiperPlateau(b.id)} aria-pressed={actif}
                      title={fr ? b.texteFR : b.texteEN}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={carte(actif)}>
                <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ border: '1.5px solid rgba(var(--sk-parchment-rgb),0.25)', background: 'rgba(0,0,0,0.4)' }}>
                  {ouvert && b.vignette ? <img src={b.vignette} alt="" aria-hidden className="w-full h-full object-cover" /> : <Lock size={14} style={{ color: 'rgba(var(--sk-gilt-rgb),0.6)' }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm truncate" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>{fr ? b.nomFR : b.nomEN}</span>
                  {!ouvert && (
                    <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                      {b.statut === 'recompense' ? (fr ? 'Récompense quotidienne · jour 3' : 'Daily reward · day 3') : (fr ? 'Bientôt' : 'Soon')}
                    </span>
                  )}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
              </button>
            );
          })}
        </div>

        <p className="font-sans uppercase tracking-[0.18em] text-[10px] mb-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>{fr ? 'Pièces du hnefatafl' : 'Hnefatafl pieces'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {PIECE_SETS.map((b) => {
            const ouvert = jeuOuvert(b.statut, b.id, bourse?.taflPieces || []);
            const actif = choixJeu.pieces === b.id;
            return (
              <button key={b.id} type="button" disabled={!ouvert} onClick={() => equiperPieces(b.id)} aria-pressed={actif}
                      title={fr ? b.texteFR : b.texteEN}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={carte(actif)}>
                <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden flex items-center justify-center"
                      style={{ border: '1.5px solid rgba(var(--sk-parchment-rgb),0.25)', background: 'rgba(0,0,0,0.4)' }}>
                  {ouvert && b.vignette ? <img src={b.vignette} alt="" aria-hidden className="w-full h-full object-cover" /> : (!ouvert && <Lock size={14} style={{ color: 'rgba(var(--sk-gilt-rgb),0.6)' }} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm truncate" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>{fr ? b.nomFR : b.nomEN}</span>
                  {!ouvert && (
                    <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                      {b.statut === 'recompense' ? (fr ? 'Récompense quotidienne · jour 8' : 'Daily reward · day 8') : (fr ? 'Bientôt' : 'Soon')}
                    </span>
                  )}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
              </button>
            );
          })}
        </div>

        <p className="font-sans uppercase tracking-[0.18em] text-[10px] mb-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>{fr ? 'Dos de carte du tarot' : 'Tarot card backs'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DOS_CARTES.map((d) => {
            const possede = dosPossedes.includes(d.id);
            const actif = (dosActuel || 'festival') === d.id;
            return (
              <button key={d.id} type="button" disabled={!possede} onClick={() => equiperUnDos(d.id)} aria-pressed={actif}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed" style={carte(actif)}>
                <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ border: '1.5px solid rgba(var(--sk-parchment-rgb),0.25)', background: 'rgba(0,0,0,0.4)' }}>
                  {possede ? <img src={d.image} alt="" aria-hidden className="w-full h-full object-cover" /> : <Lock size={14} style={{ color: 'rgba(var(--sk-gilt-rgb),0.6)' }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm truncate" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>{fr ? d.nomFR : d.nomEN}</span>
                  {!possede && <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>{fr ? d.origineFR : d.origineEN}</span>}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Albums, seulement s'il y en a */}
      {albumsPossedes.length > 0 && (
        <div>
          <p className="witcher-stat-label mb-3"><Disc3 size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Vos albums' : 'Your albums'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {albumsPossedes.map((g) => {
              const actif = musiqueEquipee === g.id;
              return (
                <button key={g.id} type="button" onClick={() => definirPref(uid, 'musique', g.id)}
                        aria-pressed={actif}
                        className="rounded-card p-3 flex items-center gap-3 text-left transition"
                        style={carte(actif)}>
                  <span className="min-w-0 flex-1 font-sans text-sm truncate" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>
                    {g.nom}
                  </span>
                  {actif && <Check size={14} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default Coffre;
