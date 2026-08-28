import React, { useEffect, useState } from 'react';
import { Check, Music, Palette, Disc3 } from 'lucide-react';
import { definirPref, suivreFiche, type SkinMembre } from '../../firebase/ordre';
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
