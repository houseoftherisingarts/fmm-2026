import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { hueFor } from '../../firebase/publicProfile';
import {
  lireFiche, publierFiche, STATS_VIDES, type Membre, type StatsMembre,
} from '../../firebase/ordre';

// ─── Ma fiche de l'Ordre ────────────────────────────────────────────
// Ce que les autres membres voient de nous dans le registre. La fiche
// se publie toute seule dès la première visite (nom + teinte), et se
// complète ici : ville, devise, et cinq aptitudes qu'on se donne
// soi-même, pour le plaisir (Alex, 2026-08-23).

const CHAMPS: Array<[keyof StatsMembre, string, string]> = [
  ['force', 'Force', 'Strength'],
  ['ruse', 'Ruse', 'Cunning'],
  ['chance', 'Chance', 'Luck'],
  ['verve', 'Verve', 'Verve'],
  ['endurance', 'Endurance', 'Endurance'],
];

const MaFiche: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const [fiche, setFiche] = useState<Membre | null>(null);
  const [etat, setEtat] = useState<'lecture' | 'idle' | 'ecrit' | 'ok'>('lecture');

  useEffect(() => {
    if (!user?.uid) return;
    let vivant = true;
    const nom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');
    lireFiche(user.uid).then(async (m) => {
      if (!vivant) return;
      if (m) { setFiche(m); setEtat('idle'); return; }
      // Première visite : la fiche entre au registre avec le strict
      // minimum. Jamais le courriel, la collection est lue par tous les
      // membres connectés.
      const neuve: Membre = {
        uid: user.uid, nom, avatarHue: hueFor(nom),
        avatarUrl: user.photoURL || undefined, stats: { ...STATS_VIDES },
      };
      await publierFiche(user.uid, neuve).catch(() => { /* hors ligne */ });
      if (vivant) { setFiche(neuve); setEtat('idle'); }
    }).catch(() => { if (vivant) setEtat('idle'); });
    return () => { vivant = false; };
  }, [user?.uid, user?.displayName, user?.photoURL, fr]);

  if (!user || !fiche) return null;

  const majStat = (cle: keyof StatsMembre, v: number) =>
    setFiche((f) => (f ? { ...f, stats: { ...(f.stats || STATS_VIDES), [cle]: v } } : f));

  const enregistrer = async () => {
    setEtat('ecrit');
    // La photo et le nom ne se règlent plus ici : ils viennent du profil,
    // au-dessus, et la fiche les reçoit de là (Alex, 2026-08-23).
    await publierFiche(user.uid, {
      ville: fiche.ville || '', devise: fiche.devise || '',
      stats: fiche.stats || STATS_VIDES,
      avatarHue: fiche.avatarHue ?? hueFor(fiche.nom || user.uid),
    }).catch(() => { /* hors ligne */ });
    setEtat('ok');
    window.setTimeout(() => setEtat('idle'), 2200);
  };

  const champ = 'w-full px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40';
  const champStyle = { background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' };

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 pb-2"
           style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-stat-label">{fr ? 'Ma fiche de l’Ordre' : 'My card in the Order'}</span>
        <Link to={addLocale('/ordre', lang)}
              className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/55 hover:text-brass transition-colors inline-flex items-center gap-1.5">
          <Users size={12} /> {fr ? 'Le registre' : 'The roll'}
        </Link>
      </div>

      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-6">
        {fr
          ? 'Voici ce que les autres membres voient de vous. Les aptitudes ne servent à rien, vous vous les donnez vous-même, pour le plaisir.'
          : 'This is what other members see of you. The stats do nothing at all, you give them to yourself, for the fun of it.'}
      </p>

      <div className="space-y-3 mb-6">
        <input className={champ} style={champStyle}
               value={fiche.ville || ''} maxLength={60}
               onChange={(e) => setFiche({ ...fiche, ville: e.target.value })}
               placeholder={fr ? 'D’où venez-vous ?' : 'Where are you from?'} />
        {/* La description : le seul texte libre que les autres membres
            lisent sur la fiche, ici comme sur la version publique. */}
        <textarea className={`${champ} min-h-[7rem] leading-relaxed`} style={champStyle}
                  value={fiche.devise || ''} maxLength={400} rows={4}
                  onChange={(e) => setFiche({ ...fiche, devise: e.target.value })}
                  placeholder={fr
                    ? 'Quelques mots sur vous, sur ce qui vous amène au festival.'
                    : 'A few words about you, and what brings you to the festival.'} />
      </div>

      <ul className="space-y-3 mb-6">
        {CHAMPS.map(([cle, nomFR, nomEN]) => (
          <li key={cle} className="flex items-center gap-3">
            <span className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/60 w-24 shrink-0">
              {fr ? nomFR : nomEN}
            </span>
            <input type="range" min={1} max={20} className="flex-1 accent-[#D8B05A]"
                   value={(fiche.stats || STATS_VIDES)[cle]}
                   onChange={(e) => majStat(cle, Number(e.target.value))} />
            <span className="font-display text-sm text-ivory w-6 text-right">
              {(fiche.stats || STATS_VIDES)[cle]}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" onClick={enregistrer} disabled={etat === 'ecrit'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors disabled:opacity-60">
        <Save size={14} />
        {etat === 'ok' ? (fr ? 'Fiche à jour' : 'Card updated') : (fr ? 'Enregistrer ma fiche' : 'Save my card')}
      </button>
    </section>
  );
};

export default MaFiche;
