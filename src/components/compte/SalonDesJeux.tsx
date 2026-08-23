import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dices, ArrowUpRight, Lock } from 'lucide-react';
import { addLocale } from '../../lib/locale';

// ─── Salon des jeux ─────────────────────────────────────────────────
// Réservé aux comptes : c'est la carotte qui justifie de s'inscrire,
// avec les nouvelles et le coffre à billets. Un seul jeu pour l'instant
// (Hnefatafl, le plateau viking, déjà jouable en 3D). Les suivants
// s'ajoutent dans JEUX.
//
// ⚠️ Le jeu vit sur une route publique (/jeunesse/hnefatafl) : ce salon
// est une VITRINE réservée, pas un verrou. Verrouiller la route elle-
// même casserait le lien déjà partagé depuis la page Jeunesse.

interface Jeu {
  id: string;
  path: string;
  titreFR: string; titreEN: string;
  texteFR: string; texteEN: string;
  image: string;
  pret: boolean;
}

const JEUX: Jeu[] = [
  {
    id: 'hnefatafl',
    path: '/jeunesse/hnefatafl',
    titreFR: 'Hnefatafl',
    titreEN: 'Hnefatafl',
    texteFR: 'Le jeu de plateau des Vikings, en trois dimensions. Le roi doit fuir, ses assaillants l’encercler. Choisissez votre camp.',
    texteEN: 'The Viking board game, in three dimensions. The king must flee, his attackers must surround him. Choose your side.',
    image: '/photos/hnefatafl-card.webp',
    pret: true,
  },
  {
    id: 'tarot',
    path: '/jeux/tarot',
    titreFR: 'Tarot de Marseille',
    titreEN: 'Marseille Tarot',
    texteFR: 'Le vieux jeu des routes. Une lame, trois lames ou la croix celtique, avec la lecture de chaque carte, à l’endroit comme à l’envers.',
    texteEN: 'The old road deck. One card, three cards or the Celtic cross, with the reading of every card, upright or reversed.',
    image: '/tarot/T17.webp',
    pret: true,
  },
];

const SalonDesJeux: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(26, 5, 11, 0.55)', border: '1px solid rgba(244, 239, 227, 0.10)' }}
    >
      <header className="flex items-start gap-4 mb-5">
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
            <Dices size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1.5 inline-flex items-center gap-2">
            <Lock size={10} /> {t.eyebrow}
          </p>
          <h2
            className="font-display text-2xl md:text-3xl leading-snug"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {t.title}
          </h2>
        </div>
      </header>

      <p
        className="font-sans text-sm md:text-[15px] leading-[1.7] mb-6"
        style={{ color: 'rgba(244, 239, 227, 0.7)', fontWeight: 300 }}
      >
        {t.lead}
      </p>

      <ul className="grid sm:grid-cols-2 gap-4">
        {JEUX.map((j, i) => (
          <motion.li
            key={j.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 * i }}
          >
            <Link
              to={addLocale(j.path, lang)}
              className="group relative block overflow-hidden h-full"
              style={{ border: '1px solid rgba(216, 176, 90, 0.28)' }}
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src={j.image}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(10,2,7,0.35) 0%, rgba(10,2,7,0.92) 100%)' }}
                />
              </div>
              <div className="p-4">
                <span className="flex items-center justify-between gap-3 mb-1.5">
                  <span
                    className="font-display text-lg"
                    style={{ color: 'var(--color-bone)', fontWeight: 400 }}
                  >
                    {fr ? j.titreFR : j.titreEN}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    style={{ color: '#D8B05A' }}
                  />
                </span>
                <span
                  className="block font-sans text-[13px] leading-snug"
                  style={{ color: 'rgba(244,239,227,0.6)', fontWeight: 300 }}
                >
                  {fr ? j.texteFR : j.texteEN}
                </span>
              </div>
            </Link>
          </motion.li>
        ))}

        {/* Place tenue pour la suite : on annonce sans promettre de date. */}
        <li
          className="flex items-center justify-center p-6 text-center"
          style={{ border: '1px dashed rgba(244, 239, 227, 0.16)' }}
        >
          <span
            className="font-sans text-[13px] leading-snug"
            style={{ color: 'rgba(244,239,227,0.42)', fontWeight: 300 }}
          >
            {t.aVenir}
          </span>
        </li>
      </ul>
    </section>
  );
};

const FR = {
  eyebrow: 'Réservé aux comptes',
  title:   'Le salon des jeux',
  lead:    'Quelques jeux du festival, à jouer d’ici septembre. Ils vivent ici, dans votre espace.',
  aVenir:  'D’autres jeux viendront s’asseoir à cette table.',
};

const EN: typeof FR = {
  eyebrow: 'Account holders only',
  title:   'The games room',
  lead:    'A few festival games to play between now and September. They live here, in your space.',
  aVenir:  'More games will pull up a chair at this table.',
};

export default SalonDesJeux;
