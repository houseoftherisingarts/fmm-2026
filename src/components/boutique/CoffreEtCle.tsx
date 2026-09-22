import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, KeyRound, Palette, Layers, Shield, Swords, Music, BookOpen, Moon, Loader2, X } from 'lucide-react';
import {
  acheterCoffre, acheterCle, ouvrirCoffre, joursAvantLaProchaineCle,
  PRIX_COFFRE, PRIX_CLE, type Bourse, type PriseCoffre } from '../../firebase/montpellois';
import { sonnerBadge } from '../../lib/fanfare';
import PieceMontpellois from './PieceMontpellois';

// ─── Le coffre et la clé (Alex, 2026-09-21) ─────────────────────────
// « Un coffre qu'on ouvre avec une clé, qu'on peut acheter un par
// semaine et qui nous donne trois objets au hasard. » Le coffre coûte
// 100 Montpellois et s'achète autant de fois qu'on veut, la clé en
// coûte 50 et ne se vend qu'une fois par semaine. Tout se décide côté
// serveur (functions/coffre.js et la fonction ouvrirCoffre) : ce
// composant demande, montre ce qui sort, et rien d'autre. Le solde et
// les compteurs arrivent par suivreMaBourse, donc la tuile se remet à
// jour toute seule dès que le serveur a écrit.

/** L'icône qui tient lieu de vignette : le serveur rend un identifiant
 *  et un nom, jamais une image. */
const ICONE: Record<PriseCoffre['type'], React.ComponentType<{ size?: number; className?: string }>> = {
  skin: Palette,
  dos: Layers,
  tafl: Shield,
  objet: Swords,
  trouvaille: Swords,
  ambiance: Music,
  montpellois: Package,
  livre: BookOpen,
  'nuit-salon': Moon,
};

const CoffreEtCle: React.FC<{ lang: 'FR' | 'EN'; bourse: Bourse | null; actif: boolean }> = ({ lang, bourse, actif }) => {
  const fr = lang === 'FR';
  const [enCours, setEnCours] = useState<'coffre' | 'cle' | 'ouvrir' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prises, setPrises] = useState<PriseCoffre[] | null>(null);

  const coffres = bourse?.coffres ?? 0;
  const cles = bourse?.cles ?? 0;

  // La semaine de la clé se compte depuis la dernière achetée. Le
  // serveur reste le seul juge; ce compte n'étiquette que le bouton.
  const joursAvantLaCle = useMemo(() => {
    const d = bourse?.dernierCle;
    const ms = d && typeof (d as { toMillis?: () => number }).toMillis === 'function'
      ? (d as { toMillis: () => number }).toMillis()
      : 0;
    return joursAvantLaProchaineCle(ms);
  }, [bourse]);

  async function demander(quoi: 'coffre' | 'cle' | 'ouvrir') {
    if (!actif || enCours) return;
    setErreur(null); setEnCours(quoi);
    try {
      if (quoi === 'coffre') await acheterCoffre();
      else if (quoi === 'cle') await acheterCle();
      else {
        const r = await ouvrirCoffre();
        setPrises(r.objets);
        sonnerBadge();
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(null);
    }
  }

  const gainTotal = (prises || []).reduce((somme, p) => somme + p.montpellois, 0);

  return (
    <section>
      <p className="witcher-stat-label mb-4">
        <Package size={12} className="inline mr-1.5 -mt-0.5" />
        {fr ? 'Le coffre et la clé' : 'The chest and the key'}
      </p>

      <div className="glass-light rounded-lg-card p-5 flex flex-col gap-5">
        <p className="font-editorial text-[13px] md:text-sm leading-relaxed text-ivory-soft">
          {fr
            ? 'Le coffre s’achète aussi souvent que vous voulez, la clé une seule fois par semaine, et les deux ensemble vous rendent trois prises tirées au hasard dans tout ce que la boutique et les trouvailles peuvent donner.'
            : 'You may buy the chest as often as you like, the key only once a week, and the two together give you three items drawn at random from everything the shop and the finds can hold.'}
        </p>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-2.5">
            <Package size={22} style={{ color: 'var(--sk-gilt)' }} />
            <div>
              <p className="witcher-stat-label">{fr ? 'Vos coffres' : 'Your chests'}</p>
              <p className="font-display title-medieval text-xl text-ivory leading-none mt-0.5">{coffres}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <KeyRound size={22} style={{ color: 'var(--sk-gilt)' }} />
            <div>
              <p className="witcher-stat-label">{fr ? 'Vos clés' : 'Your keys'}</p>
              <p className="font-display title-medieval text-xl text-ivory leading-none mt-0.5">{cles}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!actif || enCours !== null} onClick={() => demander('coffre')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
            {enCours === 'coffre' ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
            {fr ? 'Acheter un coffre' : 'Buy a chest'} · {PRIX_COFFRE}
          </button>

          <button type="button" disabled={!actif || enCours !== null || joursAvantLaCle > 0} onClick={() => demander('cle')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
            {enCours === 'cle' ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
            {joursAvantLaCle > 0
              ? (fr
                ? `Prochaine clé dans ${joursAvantLaCle} jour${joursAvantLaCle > 1 ? 's' : ''}`
                : `Next key in ${joursAvantLaCle} day${joursAvantLaCle > 1 ? 's' : ''}`)
              : `${fr ? 'Acheter une clé' : 'Buy a key'} · ${PRIX_CLE}`}
          </button>

          <button type="button" disabled={!actif || enCours !== null || coffres < 1 || cles < 1} onClick={() => demander('ouvrir')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 font-sans uppercase tracking-wider text-[10px] font-semibold rounded-card transition disabled:opacity-40"
                  style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.6)', color: 'var(--sk-gilt)' }}>
            {enCours === 'ouvrir' ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
            {fr ? 'Ouvrir le coffre' : 'Open the chest'}
          </button>
        </div>

        {(coffres < 1 || cles < 1) && (
          <p className="font-sans text-[11px] text-ivory-soft/60">
            {fr ? 'Il vous faut un coffre et une clé pour ouvrir.' : 'You need a chest and a key to open one.'}
          </p>
        )}

        <div className="divider-brass w-16" />

        <p className="font-editorial text-[12px] leading-relaxed text-ivory-soft/75">
          {fr
            ? 'Une fois sur cent, le livre de recettes sort du coffre, et il part alors vers votre courriel dans la minute. Le Salon des Inconnus y glisse une nuit gratuite, à la même chance d’une sur cent, et le festival vous écrit ensuite pour la fixer avec vous. Le reste vient du catalogue de la boutique et des trouvailles, où un objet que vous avez déjà se change en Montpellois, à la moitié de son prix.'
            : 'One opening in a hundred brings out the recipe book, and it leaves for your inbox within the minute. Le Salon des Inconnus slips a free night in at the same odds of one in a hundred, and the festival writes to you afterwards to set the date. The rest comes from the shop catalogue and the finds, where an item you already own turns into Montpellois, at half its price.'}
        </p>

        {erreur && <p className="font-editorial text-xs text-blush">{erreur}</p>}
      </div>

      {/* La révélation : le coffre s'ouvre, puis les trois prises se
          retournent l'une après l'autre, quatre dixièmes de seconde
          d'écart. Rien de lourd, framer-motion était déjà là. */}
      <AnimatePresence>
        {prises && (
          <motion.div
            className="fixed inset-0 z-[125] flex items-center justify-center px-4"
            style={{ background: 'rgba(4,2,6,0.82)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPrises(null)}
          >
            <motion.div
              role="status" aria-live="polite"
              className="relative w-full max-w-2xl rounded-lg-card px-6 py-9 md:px-10 text-center"
              style={{
                background: 'linear-gradient(165deg, rgba(24,12,8,0.94), rgba(8,3,5,0.97))',
                border: '1px solid rgba(var(--sk-gilt-rgb),0.45)',
                boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(var(--sk-glow-rgb),0.12) inset',
              }}
              initial={{ scale: 0.88, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => setPrises(null)} aria-label={fr ? 'Fermer' : 'Close'}
                      className="absolute top-3 right-3 p-2 rounded-full text-ivory-soft/50 hover:text-ivory transition-colors">
                <X size={16} />
              </button>

              <motion.div
                className="mx-auto mb-5 w-16 h-16 flex items-center justify-center"
                initial={{ rotate: -14, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 12 }}
              >
                <Package size={54} style={{ color: 'var(--sk-gilt)' }} />
              </motion.div>

              <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-5">
                {fr ? 'Le coffre s’ouvre' : 'The chest opens'}
              </h2>

              <div className="grid sm:grid-cols-3 gap-4">
                {prises.map((p, i) => {
                  const Icone = ICONE[p.type] || Swords;
                  const rare = p.type === 'livre' || p.type === 'nuit-salon';
                  return (
                    <motion.div
                      key={`${p.id}-${i}`}
                      className="rounded-[15px] px-4 py-5 flex flex-col items-center gap-2.5"
                      style={{
                        background: rare ? 'rgba(var(--sk-gilt-rgb),0.14)' : 'rgba(var(--sk-parchment-rgb),0.05)',
                        border: `1px solid rgba(var(--sk-gilt-rgb),${rare ? 0.75 : 0.28})`,
                        boxShadow: rare ? '0 0 34px rgba(var(--sk-glow-rgb),0.45)' : 'none',
                      }}
                      initial={{ rotateY: 96, opacity: 0, y: 12 }}
                      animate={{ rotateY: 0, opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + i * 0.4, duration: 0.5, ease: 'easeOut' }}
                    >
                      {p.type === 'montpellois'
                        ? <PieceMontpellois size={30} />
                        : <Icone size={30} className={rare ? '' : 'opacity-85'} />}
                      <p className="font-display title-medieval text-[15px] leading-tight text-ivory">
                        {fr ? p.nomFR : p.nomEN}
                      </p>
                      {p.doublon && (
                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--sk-gilt)' }}>
                          {fr ? `Déjà à vous · +${p.montpellois}` : `Already yours · +${p.montpellois}`}
                        </p>
                      )}
                      {p.type === 'livre' && (
                        <p className="font-sans text-[10px] text-ivory-soft/70">
                          {fr ? 'Il part vers votre courriel.' : 'It is on its way to your inbox.'}
                        </p>
                      )}
                      {p.type === 'nuit-salon' && (
                        <p className="font-sans text-[10px] text-ivory-soft/70">
                          {fr ? 'Le festival vous écrit pour la fixer.' : 'The festival will write to set the date.'}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {gainTotal > 0 && (
                <p className="font-editorial text-sm text-ivory-soft mt-6">
                  {fr
                    ? `Votre bourse monte de ${gainTotal} Montpellois.`
                    : `Your purse goes up by ${gainTotal} Montpellois.`}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CoffreEtCle;
