import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { FAITS, CATEGORIES, type CategorieFait } from '../../content/saviezVous';
import {
  IconScroll, IconTable, IconCuisine, IconWagon, IconDrakkar, IconJester,
  IconCastle, IconHourglass, IconWorld,
  type GameIconProps,
} from '../icons/GameIcons';

// ─── Estage de Culture ──────────────────────────────────────────────
// La rubrique du festival, née sur notre page en août 2023. Les faits
// se découvrent un à un, comme une carte tirée d'un paquet dont les
// tranches dépassent encore. La pile en arrière-plan dit qu'il en
// reste, et c'est elle qui donne envie d'appuyer encore.
//
// Le paquet a doublé de taille : les rangées de filtres servent à
// entrer par un sujet plutôt que de tout parcourir à la file.
//
// Le composant ne connaît aucun fait par son nom : tout vient du
// tableau FAITS de src/content/saviezVous.ts. Ajouter un fait suffit,
// qu'il vienne de la recherche ou d'une ancienne publication.

const ICONES: Record<CategorieFait, React.FC<GameIconProps>> = {
  mots: IconScroll,
  table: IconTable,
  taverne: IconCuisine,
  marche: IconWagon,
  camp: IconDrakkar,
  jeu: IconJester,
  croyance: IconHourglass,
  roi: IconCastle,
  festival: IconWorld,
};

// Courbe maison du projet : sortie douce, sans rebond.
const DOUX = [0.16, 1, 0.3, 1] as const;

// Une catégorie vide ne mérite pas son bouton. La liste se calcule une
// seule fois, au chargement du module, puisque FAITS ne bouge jamais.
const FILTRES = (Object.keys(CATEGORIES) as CategorieFait[])
  .filter((c) => FAITS.some((f) => f.categorie === c));

/**
 * Les dates de parution sont stockées en AAAA-MM-JJ. Midi UTC est
 * imposé pour que la date affichée ne recule pas d'un jour une fois
 * rendue à Montréal.
 */
const dateLisible = (iso: string, fr: boolean) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

// Les textes du festival portent leurs propres alinéas. Un fait long
// respire mieux en corps réduit qu'en corps de titre.
const LONG = 640;

const SaviezVous: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const reduire = useReducedMotion();

  // `sens` retient le dernier geste pour que la carte sortante parte
  // du bon côté : en avant elle monte, en arrière elle descend.
  const [index, setIndex] = useState(0);
  const [sens, setSens] = useState<1 | -1>(1);
  const [filtre, setFiltre] = useState<CategorieFait | null>(null);

  const paquet = useMemo(
    () => (filtre ? FAITS.filter((f) => f.categorie === filtre) : FAITS),
    [filtre],
  );
  const total = paquet.length;

  const avancer = useCallback(() => {
    setSens(1);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const reculer = useCallback(() => {
    setSens(-1);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  // Changer de rayon remet le paquet sur sa première carte, sinon
  // l'index d'hier pointerait dans le vide.
  const changerFiltre = useCallback((c: CategorieFait | null) => {
    setFiltre((actuel) => (actuel === c ? null : c));
    setSens(1);
    setIndex(0);
  }, []);

  const auClavier = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); avancer(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); reculer(); }
  }, [avancer, reculer]);

  const fait = paquet[index];
  const Icone = ICONES[fait.categorie];
  const categorie = CATEGORIES[fait.categorie];
  const sources = fait.sources ?? [];
  const decalage = reduire ? 0 : 18 * sens;
  const texte = fr ? fait.texteFR : fait.texteEN;
  const dense = texte.length > LONG;

  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden"
      aria-labelledby="estage-de-culture-titre"
    >
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <div
          className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-x-14 lg:gap-y-9 lg:items-start"
          onKeyDown={auClavier}
        >

          {/* ── Colonne de gauche : l'entrée en matière ──────────── */}
          <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
            <p
              className="font-sans uppercase tracking-[0.3em] text-[10px] mb-4 inline-flex items-center gap-2"
              style={{ color: 'var(--color-amber-glow)' }}
            >
              <IconScroll size={13} /> {fr ? 'Le carnet du festival' : 'The festival notebook'}
            </p>
            <h2
              id="estage-de-culture-titre"
              className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-tight mb-5"
            >
              Estage de Culture
            </h2>
            <div className="divider-brass w-20 mb-6" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
              {fr
                ? 'La rubrique est née sur notre page en août 2023, à raison d’un parchemin par jour ou presque, et elle reprend ici son nom. Vous y retrouverez les parutions d’origine avec leur date, et des faits que nous sommes allés vérifier depuis dans un dictionnaire, une archive ou un musée. Chacun porte son adresse pour que vous alliez voir de vos yeux, et les belles histoires qui se défont à la vérification sont restées dehors, même celles qui nous plaisaient. Tirez-en une, puis une autre.'
                : 'The column was born on our page in August 2023, a parchment a day or close to it, and it keeps its French name here. You will find the original posts with their dates, and facts we have gone and checked since against a dictionary, an archive or a museum. Each one carries its address so you can go and see for yourself, and the fine stories that come apart under checking stayed outside, even the ones we liked. Draw one, then another.'}
            </p>

            {/* Les rayons du carnet : une porte d'entrée par sujet. */}
            <div
              className="flex flex-wrap gap-2 mt-7"
              role="group"
              aria-label={fr ? 'Choisir un sujet' : 'Choose a subject'}
            >
              <button
                type="button"
                onClick={() => changerFiltre(null)}
                aria-pressed={filtre === null}
                className="font-sans uppercase tracking-[0.14em] text-[10px] h-8 px-3.5 rounded-full border transition-colors"
                style={filtre === null
                  ? { borderColor: 'var(--color-amber-glow)', background: 'rgba(232,177,74,0.14)', color: 'var(--color-ivory)' }
                  : { borderColor: 'rgba(232,177,74,0.22)', color: 'rgba(240,232,218,0.7)' }}
              >
                {fr ? 'Tout' : 'All'}
              </button>
              {FILTRES.map((c) => {
                const actif = filtre === c;
                const IconeFiltre = ICONES[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => changerFiltre(c)}
                    aria-pressed={actif}
                    className="font-sans uppercase tracking-[0.14em] text-[10px] h-8 px-3.5 rounded-full border inline-flex items-center gap-1.5 transition-colors"
                    style={actif
                      ? { borderColor: 'var(--color-amber-glow)', background: 'rgba(232,177,74,0.14)', color: 'var(--color-ivory)' }
                      : { borderColor: 'rgba(232,177,74,0.22)', color: 'rgba(240,232,218,0.7)' }}
                  >
                    <IconeFiltre size={12} />
                    {fr ? CATEGORIES[c].FR : CATEGORIES[c].EN}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Colonne de droite : le paquet ────────────────────── */}
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2">

            {/* Conteneur du seul paquet : les cartes fantômes se
                calent dessus, jamais sur les commandes. */}
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-x-5 top-8 -bottom-3 rounded-[15px] border pointer-events-none"
                style={{ borderColor: 'rgba(232,177,74,0.10)', background: 'rgba(232,177,74,0.025)' }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-2.5 top-4 -bottom-1.5 rounded-[15px] border pointer-events-none"
                style={{ borderColor: 'rgba(232,177,74,0.17)', background: 'rgba(232,177,74,0.05)' }}
              />

              <div
                className="relative glass-light rounded-[15px] overflow-hidden"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={fait.id}
                    initial={reduire ? { opacity: 0 } : { opacity: 0, y: decalage }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduire ? { opacity: 0 } : { opacity: 0, y: -decalage }}
                    transition={{ duration: reduire ? 0.2 : 0.42, ease: DOUX }}
                    aria-live="polite"
                    className="flex flex-col gap-6 p-6 sm:p-8 md:p-9 min-h-[27rem] sm:min-h-[25rem]"
                  >
                    {/* Bandeau : la catégorie à gauche, le rang à droite. */}
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className="font-sans uppercase tracking-[0.22em] text-[10px] inline-flex items-center gap-2"
                        style={{ color: 'var(--color-amber-glow)' }}
                      >
                        <Icone size={14} /> {fr ? categorie.FR : categorie.EN}
                      </span>
                      <span
                        className="font-display title-medieval text-xs shrink-0 tabular-nums tracking-[0.12em]"
                        style={{ color: 'rgba(232,177,74,0.55)' }}
                      >
                        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory leading-snug mb-4">
                        {fr ? fait.titreFR : fait.titreEN}
                      </h3>
                      <div
                        className={`font-editorial text-ivory-soft leading-relaxed max-w-[70ch] space-y-3 ${
                          dense ? 'text-base md:text-lg' : 'text-lg md:text-xl'
                        }`}
                      >
                        {texte.split('\n\n').map((alinea, i) => (
                          <p key={i}>{alinea}</p>
                        ))}
                      </div>
                    </div>

                    {/* La provenance, discrète mais toujours consultable. */}
                    <div className="pt-5 border-t" style={{ borderColor: 'rgba(232,177,74,0.16)' }}>
                      {fait.origine === 'festival' && (
                        <p className="font-sans text-[11px] text-ivory-soft/60 mb-2">
                          {fr ? 'Publié par le festival le ' : 'Published by the festival on '}
                          <a
                            href={fait.publication.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-ivory transition-colors"
                          >
                            {dateLisible(fait.publication.date, fr)}
                          </a>
                        </p>
                      )}
                      {sources.length > 0 && (
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 font-sans text-[11px] text-ivory-soft/60">
                          <span className="uppercase tracking-[0.18em] shrink-0">
                            {fr ? 'Source' : 'Source'}
                          </span>
                          {sources.map((s) => (
                            <a
                              key={s.url}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 underline underline-offset-2 decoration-dotted hover:text-ivory transition-colors"
                            >
                              {s.nom}
                              <ArrowUpRight size={11} className="opacity-70 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.article>
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* ── Commandes ───────────────────────────────────────── */}
          <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={avancer}
                className="inline-flex items-center gap-2.5 h-12 px-6 rounded-full border font-sans uppercase tracking-[0.16em] text-[11px] text-ivory transition-colors"
                style={{ borderColor: 'var(--color-amber-glow)', background: 'rgba(232,177,74,0.12)' }}
              >
                {fr ? 'Encore un' : 'One more'}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={reculer}
                aria-label={fr ? 'Revenir au fait précédent' : 'Back to the previous fact'}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-brass/30 text-ivory-soft hover:border-brass hover:text-ivory transition-colors"
              >
                <ArrowLeft size={16} />
              </button>

              {/* Le fil qui se remplit : où vous en êtes dans le paquet. */}
              <div
                className="hidden sm:block flex-1 h-px ml-3"
                style={{ background: 'rgba(232,177,74,0.16)' }}
                aria-hidden="true"
              >
                <motion.div
                  className="h-px w-full"
                  style={{ background: 'var(--color-amber-glow)', transformOrigin: 'left' }}
                  animate={{ scaleX: (index + 1) / total }}
                  initial={false}
                  transition={{ duration: reduire ? 0 : 0.5, ease: DOUX }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SaviezVous;
