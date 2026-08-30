import React, { useEffect, useState } from 'react';
import { Check, Music, Palette, Disc3, Gift } from 'lucide-react';
import { definirPref, suivreFiche, type SkinMembre } from '../../firebase/ordre';
import { lireChoix, ecrireChoix } from '../../games/hnefatafl/assets';
import { CLE_DOS_TAROT, dosRoyalEquipe, FILTRE_DOS_ROYAL } from '../../games/tarot/dos';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { ecouterAvatar, type AvatarChantier } from '../../chantier/avatar';
import { listGroupes, type GroupeMusical } from '../../firebase/groupesMusicaux';
import { AMBIANCES } from '../../lib/ambiances';
import { NOMS_SKIN } from '../boutique/BoutiqueMontpellois';

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
  const gardeGagnee = (bourse?.taflPieces || []).includes('garde');
  const dosRoyalGagne = (bourse?.dosTarot || []).includes('royal');
  const chancesWJW = bourse?.chancesWJW || 0;
  const [gardeEquipee, setGardeEquipee] = useState(() => lireChoix().pieces === 'garde');
  const [dosRoyal, setDosRoyal] = useState(() => dosRoyalEquipe());
  const equiperGarde = () => { ecrireChoix(lireChoix().plateau, 'garde'); setGardeEquipee(true); };
  const basculerDosRoyal = () => {
    const suivant = !dosRoyal;
    try { if (suivant) localStorage.setItem(CLE_DOS_TAROT, 'royal'); else localStorage.removeItem(CLE_DOS_TAROT); } catch { /* navigation privée */ }
    setDosRoyal(suivant);
  };

  const carte = (actif: boolean) => ({
    background: actif ? 'rgba(216,176,90,0.14)' : 'transparent',
    border: `1px solid ${actif ? 'rgba(216,176,90,0.6)' : 'rgba(244,239,227,0.18)'}`,
  });

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center gap-4 mb-6 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Palette size={16} /></span>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skinsPossedes.map((s) => {
            const info = NOMS_SKIN[s];
            const actif = skinEquipe === s;
            return (
              <button key={s} type="button" onClick={() => definirPref(uid, 'skin', s)}
                      aria-pressed={actif}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition"
                      style={carte(actif)}>
                <span className="w-10 h-10 shrink-0 rounded-md" style={{ background: info.couleur, border: '1.5px solid rgba(244,239,227,0.25)' }} />
                <span className="min-w-0 flex-1 font-sans text-sm truncate" style={{ color: actif ? '#D8B05A' : 'var(--color-ivory-soft)' }}>
                  {fr ? info.FR : info.EN}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: '#D8B05A' }} />}
              </button>
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
                <span className="min-w-0 flex-1 font-sans text-sm truncate" style={{ color: actif ? '#D8B05A' : 'var(--color-ivory-soft)' }}>
                  {fr ? a.titreFR : a.titreEN}
                </span>
                {actif && <Check size={14} className="shrink-0" style={{ color: '#D8B05A' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Les trésors de la roue des sept jours, seulement s'il y en a */}
      {(gardeGagnee || dosRoyalGagne || chancesWJW > 0) && (
        <div className="mb-7">
          <p className="witcher-stat-label mb-3"><Gift size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Trésors de la roue des sept jours' : 'Treasures of the seven-day wheel'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gardeGagnee && (
              <button type="button" onClick={equiperGarde} aria-pressed={gardeEquipee}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition"
                      style={carte(gardeEquipee)}>
                <span className="w-10 h-10 shrink-0 rounded-md" style={{ background: 'linear-gradient(150deg, #e8dcc0 0%, #d8b05a 55%, #3a2c14 100%)', border: '1.5px solid rgba(244,239,227,0.25)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm truncate" style={{ color: gardeEquipee ? '#D8B05A' : 'var(--color-ivory-soft)' }}>
                    {fr ? 'La Garde royale' : 'The Royal Guard'}
                  </span>
                  <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(244,239,227,0.5)' }}>Hnefatafl</span>
                </span>
                {gardeEquipee && <Check size={14} className="shrink-0" style={{ color: '#D8B05A' }} />}
              </button>
            )}
            {dosRoyalGagne && (
              <button type="button" onClick={basculerDosRoyal} aria-pressed={dosRoyal}
                      className="rounded-card p-3 flex items-center gap-3 text-left transition"
                      style={carte(dosRoyal)}>
                <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden" style={{ border: '1.5px solid rgba(244,239,227,0.25)' }}>
                  <img src="/tarot/dos-v2.webp" alt="" aria-hidden className="w-full h-full object-cover"
                       style={{ filter: FILTRE_DOS_ROYAL }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm truncate" style={{ color: dosRoyal ? '#D8B05A' : 'var(--color-ivory-soft)' }}>
                    {fr ? 'Le dos royal' : 'The royal back'}
                  </span>
                  <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(244,239,227,0.5)' }}>Tarot</span>
                </span>
                {dosRoyal && <Check size={14} className="shrink-0" style={{ color: '#D8B05A' }} />}
              </button>
            )}
            {chancesWJW > 0 && (
              <div className="rounded-card p-3 flex items-center gap-3" style={carte(true)}>
                <span className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center" style={{ background: 'rgba(216,176,90,0.14)', border: '1.5px solid rgba(244,239,227,0.25)', color: '#D8B05A' }}>
                  <Gift size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm" style={{ color: '#D8B05A' }}>
                    {fr
                      ? `${chancesWJW} seconde${chancesWJW > 1 ? 's' : ''} chance${chancesWJW > 1 ? 's' : ''}`
                      : `${chancesWJW} second chance${chancesWJW > 1 ? 's' : ''}`}
                  </span>
                  <span className="block font-sans text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(244,239,227,0.5)' }}>
                    {fr ? 'Concours William J. Walter' : 'William J. Walter draw'}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <span className="min-w-0 flex-1 font-sans text-sm truncate" style={{ color: actif ? '#D8B05A' : 'var(--color-ivory-soft)' }}>
                    {g.nom}
                  </span>
                  {actif && <Check size={14} className="shrink-0" style={{ color: '#D8B05A' }} />}
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
