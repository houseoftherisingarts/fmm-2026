// ─── Le cadre commun des trois jeux ─────────────────────────────────
// Alex, 2026-08-23 : les jeux du festival se présentent tous de la même
// façon. En haut, l'orbe du hero porte l'image, le titre et la
// description. Juste en dessous, l'aire de jeu prend tout ce qui reste
// de l'écran, et tout ce qui accompagne la partie se pose dessus en
// verre sombre : les règles, les réglages, les boutons, le panneau des
// amis, la musique et la signature de l'atelier. Plus aucune section
// détachée ne vit sous le jeu.
//
// La mesure a son importance. L'aire fait exactement la hauteur de
// l'écran moins la barre du haut, et rien ne la suit dans le document.
// Le défilement s'arrête donc pile quand elle se loge sous la barre :
// le bouton de fermeture et les bandeaux du jeu restent atteignables
// en tout temps, sans jamais passer derrière la navigation.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import PageHeader from '../layout/PageHeader';
import CreditJeux from './CreditJeux';
import { addLocale } from '../../lib/locale';

interface Props {
  eyebrow: string;
  /** Le titre du hero. Deux lignes au maximum, jamais trois. */
  titre: string;
  intro: string;
  /** L'image du grand rond, sous /public/. */
  orbImage: string;
  orbImagePosition?: string;
  lang: 'FR' | 'EN';
  /** L'aire de jeu. Ses calques se positionnent en absolu par rapport
   *  à elle : elle porte déjà `relative` et `overflow-hidden`. */
  children: React.ReactNode;
}

const CadreJeu: React.FC<Props> = ({
  eyebrow, titre, intro, orbImage, orbImagePosition, lang, children,
}) => {
  const navigate = useNavigate();
  const fr = lang === 'FR';
  const fermerLabel = fr ? 'Fermer le jeu' : 'Close the game';

  // Le X ramène d'où l'on vient. Une adresse ouverte directement n'a
  // rien derrière elle : elle retombe alors sur la salle des jeux.
  const fermer = () => {
    const idx = (window.history.state?.idx ?? 0) as number;
    if (idx > 0) navigate(-1);
    else navigate(addLocale('/jeux', lang));
  };

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        titleA={titre}
        titleB=""
        intro={intro}
        orbImage={orbImage}
        orbImagePosition={orbImagePosition}
      />

      <section className="relative w-full" style={{ background: '#0a0506' }}>
        <div
          className="relative w-full flex flex-col border-t border-brass/20"
          style={{ height: 'calc(100dvh - 5rem)', minHeight: '34rem' }}
        >
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {children}

            {/* La porte de sortie, toujours au même endroit sur les
                trois jeux. */}
            <button
              type="button"
              onClick={fermer}
              aria-label={fermerLabel}
              title={fermerLabel}
              className="absolute top-3 right-3 md:top-4 md:right-4 z-40 grid place-items-center w-10 h-10 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 hover:bg-black/60 transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* La signature de l'atelier, dans le cadre du jeu et non
              dans une section qui suivrait la page. */}
          <div className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <CreditJeux lang={fr ? 'fr' : 'en'} dense />
          </div>
        </div>
      </section>
    </>
  );
};

export default CadreJeu;
