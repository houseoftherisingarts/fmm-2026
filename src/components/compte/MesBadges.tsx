import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgesContext';
import {
  COLLECTIONS, TOUS_LES_BADGES, MAX_EXPOSES, avancement, sceauDe, suivreExposes, definirExposes,
} from '../../firebase/badges';

// ─── Le livre de collection ──────────────────────────────────────────
// « Mes badges » (Alex, 2026-08-23). Chaque collection complétée vaut un
// prix, et le site entier vaut le gros lot. Les prix ne sont pas encore
// choisis : le livre annonce leur taille, jamais leur contenu.

const PRIX_FR = { petit: 'Petit prix', moyen: 'Prix moyen', grand: 'Grand prix' };
const PRIX_EN = { petit: 'Small prize', moyen: 'Middling prize', grand: 'Great prize' };

// Le livre sert aussi sur la fiche publique d'un autre membre : on lui
// passe alors les badges de cette personne et le titre qui va avec
// (Alex, 2026-08-23).
const MesBadges: React.FC<{
  lang: 'FR' | 'EN';
  obtenus?: string[];
  titre?: string;
}> = ({ lang, obtenus: obtenusVus, titre }) => {
  const fr = lang === 'FR';
  const { obtenus: mesBadges } = useBadges();
  const obtenus = obtenusVus ?? mesBadges;
  const etat = avancement(obtenus);

  // La vitrine : sur son propre livre, chaque badge gagné porte une
  // épingle; cinq au plus tiennent en tête de la fiche (Alex, 2026-08-27).
  const { user } = useAuth();
  const mien = !obtenusVus && Boolean(user?.uid);
  const [exposes, setExposes] = useState<string[]>([]);
  useEffect(() => {
    if (!mien || !user?.uid) return;
    return suivreExposes(user.uid, setExposes);
  }, [mien, user?.uid]);
  const [avis, setAvis] = useState<string | null>(null);
  // Le sceau d'un badge tout neuf n'a pas encore été gravé (Alex,
  // 2026-08-28) : l'image 404 bascule sur le glyphe, plutôt qu'un
  // cadre cassé.
  const [sceauxCasses, setSceauxCasses] = useState<Set<string>>(new Set());
  const epingler = (id: string) => {
    if (!user?.uid) return;
    const deja = exposes.includes(id);
    if (!deja && exposes.length >= MAX_EXPOSES) {
      setAvis(fr ? `Cinq badges au plus. Retirez-en un pour en épingler un autre.` : `Five badges at most. Unpin one to pin another.`);
      window.setTimeout(() => setAvis(null), 2600);
      return;
    }
    const suite = deja ? exposes.filter((x) => x !== id) : [...exposes, id];
    setExposes(suite);
    void definirExposes(user.uid, suite).catch(() => { /* hors ligne */ });
  };

  return (
    <section aria-labelledby="badges-title" className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 pb-2"
           style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span id="badges-title" className="witcher-stat-label">
          {titre || (fr ? 'Mes badges' : 'My badges')}
        </span>
        <span className="font-sans text-sm tracking-[0.2em]" style={{ color: '#D8B05A', fontWeight: 300 }}>
          {etat.obtenus} / {etat.total}
        </span>
      </div>

      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-7">
        {fr
          ? 'Le site se collectionne. Chaque collection complète vaut un prix, et celui qui les réunit toutes repart avec le plus gros. Les prix se dévoilent avant le festival.'
          : 'The site can be collected. Each complete collection earns a prize, and whoever gathers them all takes the biggest one. Prizes are revealed before the festival.'}
      </p>

      {mien && (
        <div className="mb-7 p-4 flex flex-wrap items-center justify-between gap-3"
             style={{ background: 'rgba(216,176,90,0.06)', border: '1px solid rgba(216,176,90,0.3)' }}>
          <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(244,239,227,0.85)', fontWeight: 300 }}>
            <Pin size={13} className="inline mr-1.5 -mt-0.5" style={{ color: '#D8B05A' }} />
            {fr
              ? 'Épinglez jusqu’à cinq badges : ils paraissent en tête de votre fiche, pour tous.'
              : 'Pin up to five badges: they show at the top of your card, for everyone.'}
          </p>
          <span className="font-sans text-sm tracking-[0.2em]" style={{ color: avis ? '#E08A6E' : '#D8B05A', fontWeight: 300 }}>
            {avis || `${exposes.length} / ${MAX_EXPOSES}`}
          </span>
        </div>
      )}

      <div className="space-y-7">
        {COLLECTIONS.map((c) => {
          const ligne = etat.parCollection.find((x) => x.collection.id === c.id)!;
          return (
            <div key={c.id}>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="font-display title-medieval text-lg text-ivory">
                  {fr ? c.nomFR : c.nomEN}
                </h3>
                <span className="font-sans uppercase tracking-[0.2em] text-[10px] whitespace-nowrap"
                      style={{ color: ligne.complete ? 'var(--color-amber-glow)' : 'rgba(244,239,227,0.45)' }}>
                  {(fr ? PRIX_FR : PRIX_EN)[c.prix]} · {ligne.obtenus}/{ligne.total}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {c.badges.map((b) => {
                  const eu = obtenus.includes(b.id);
                  const expose = exposes.includes(b.id);
                  return (
                    <motion.div
                      key={b.id}
                      title={`${fr ? b.nomFR : b.nomEN} · ${fr ? b.texteFR : b.texteEN}`}
                      whileHover={{ y: -2 }}
                      className="relative w-[104px] text-center"
                    >
                      {mien && eu && (
                        <button
                          type="button"
                          onClick={() => epingler(b.id)}
                          aria-pressed={expose}
                          aria-label={`${expose ? (fr ? 'Retirer de la vitrine' : 'Unpin') : (fr ? 'Épingler' : 'Pin')} · ${fr ? b.nomFR : b.nomEN}`}
                          className="absolute -top-1 right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
                          style={{
                            background: expose ? '#D8B05A' : 'rgba(10,2,7,0.8)',
                            border: `1px solid ${expose ? '#D8B05A' : 'rgba(244,239,227,0.3)'}`,
                            color: expose ? '#1a050b' : 'rgba(244,239,227,0.6)',
                          }}
                        >
                          <Pin size={11} />
                        </button>
                      )}
                      <img
                        src={sceauDe(b.id)} alt="" aria-hidden loading="lazy"
                        className="mx-auto mb-2 w-16 h-16 object-contain"
                        style={eu
                          ? { filter: 'drop-shadow(0 0 14px rgba(232,177,74,0.28))' }
                          : { filter: 'grayscale(1) brightness(0.42)', opacity: 0.75 }}
                      />
                      <span className="block font-sans text-[10px] leading-tight"
                            style={{ color: eu ? 'rgba(244,239,227,0.8)' : 'rgba(244,239,227,0.35)' }}>
                        {fr ? b.nomFR : b.nomEN}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {etat.obtenus === TOUS_LES_BADGES.length && (
        <p className="mt-7 font-editorial text-sm leading-relaxed" style={{ color: 'var(--color-amber-glow)' }}>
          {fr
            ? 'Tous les badges sont à vous. Écrivez-nous, le très grand prix vous attend au festival.'
            : 'Every badge is yours. Write to us, the greatest prize is waiting at the festival.'}
        </p>
      )}
    </section>
  );
};

export default MesBadges;
