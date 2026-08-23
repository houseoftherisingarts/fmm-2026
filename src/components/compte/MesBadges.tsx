import React from 'react';
import { motion } from 'framer-motion';
import { useBadges } from '../../contexts/BadgesContext';
import { COLLECTIONS, TOUS_LES_BADGES, avancement, sceauDe } from '../../firebase/badges';

// ─── Le livre de collection ──────────────────────────────────────────
// « Mes badges » (Alex, 2026-08-23). Chaque collection complétée vaut un
// prix, et le site entier vaut le gros lot. Les prix ne sont pas encore
// choisis : le livre annonce leur taille, jamais leur contenu.

const PRIX_FR = { petit: 'Petit prix', moyen: 'Prix moyen', grand: 'Grand prix' };
const PRIX_EN = { petit: 'Small prize', moyen: 'Middling prize', grand: 'Great prize' };

const MesBadges: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { obtenus } = useBadges();
  const etat = avancement(obtenus);

  return (
    <section aria-labelledby="badges-title" className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 pb-2"
           style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span id="badges-title" className="witcher-stat-label">
          {fr ? 'Mes badges' : 'My badges'}
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
                  return (
                    <motion.div
                      key={b.id}
                      title={`${fr ? b.nomFR : b.nomEN} · ${fr ? b.texteFR : b.texteEN}`}
                      whileHover={{ y: -2 }}
                      className="w-[104px] text-center"
                    >
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
