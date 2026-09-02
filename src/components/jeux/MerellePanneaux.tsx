// ─── Les panneaux posés sur la table de mérelle ─────────────────────
// Alex, 2026-09-01 : un jeu garde cent pour cent de la largeur. La
// recherche d'adversaire et le clavardage ne prennent donc aucune
// colonne à côté du plateau. Ils dorment derrière deux boutons et ils
// s'ouvrent PAR-DESSUS le bois, exactement comme le panneau des amis du
// hnefatafl, dont ce fichier reprend le patron et les boutons.
//
// Ce fichier ne connaît rien de la règle du jeu. Il ouvre un panneau, il
// le ferme, et il rend la main à la page dès qu'une partie commence.

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DoorOpen, MessageSquare, X } from 'lucide-react';

import TableOuverte from './TableOuverte';
import Clavardage from './Clavardage';

interface Props {
  lang: 'FR' | 'EN';
  moi: { uid: string; nom: string };
  /** Le règlement courant de la page : « vol » ou « sans-vol ». */
  regleId: string;
  /** Le nom lisible d'un règlement, pour les lignes de la liste. */
  nomRegle: (id: string) => string;
  /** La partie en ligne en cours. Absente : la maison tient le siège. */
  partieId: string | null;
  /** Le nom affiché en face, dans le clavardage. */
  adversaire?: string;
  /** Le clavardage ne s'offre qu'une fois le plateau dressé. */
  enPartie: boolean;
  surPartie: (id: string) => void;
  surOrdinateur: (nom: string) => void;
}

type Panneau = 'table' | 'clavardage';

/** La place des deux panneaux : sous le bandeau du haut, à droite, là où
 *  ni le décompte des pions ni la boîte d'aide ne passent.
 *
 *  Une partie en ligne pose sa propre carte au même endroit, et cette
 *  carte porte le bouton d'abandon à son bout droit. Sur un téléphone
 *  elle occupe toute la largeur : les boutons descendent donc d'un cran,
 *  sinon « La parole » se pose exactement dessus et l'abandon devient
 *  inatteignable. Les deux classes s'écrivent en entier parce que
 *  Tailwind lit le fichier au texte et ne génère jamais une classe
 *  recollée par interpolation. */
const HAUT = 'absolute top-16 right-3 md:right-6';
const HAUT_DECALE = 'absolute top-32 right-3 md:right-6';

const BOUTON = 'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/50 transition-colors font-sans text-[10px] uppercase tracking-[0.2em]';

const CADRE = 'z-30 w-[min(21rem,calc(100%-1.5rem))] overflow-y-auto rounded-[15px] border border-white/15 bg-black/55 backdrop-blur-xl p-3';

const MerellePanneaux: React.FC<Props> = ({
  lang, moi, regleId, nomRegle, partieId, adversaire, enPartie,
  surPartie, surOrdinateur,
}) => {
  const t = lang === 'FR' ? FR : EN;
  const [ouvert, setOuvert] = useState<Panneau | null>(null);
  const bascule = (quoi: Panneau) => setOuvert((v) => (v === quoi ? null : quoi));

  const place = partieId ? HAUT_DECALE : HAUT;
  const cadre = `${place} ${CADRE} ${partieId ? 'max-h-[calc(100%-9rem)]' : 'max-h-[calc(100%-8rem)]'}`;

  const fermeture = (
    <button
      type="button"
      onClick={() => setOuvert(null)}
      aria-label={t.fermer}
      className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
    >
      <X size={15} />
    </button>
  );

  return (
    <>
      <div className={`${place} z-20 flex flex-col items-end gap-2`}>
        {/* Chercher un adversaire n'a plus de sens quand une vraie
            personne est déjà assise en face. */}
        {!partieId && (
          <button
            type="button"
            onClick={() => bascule('table')}
            aria-expanded={ouvert === 'table'}
            className={BOUTON}
          >
            <DoorOpen size={13} className="text-brass" />
            {t.table}
          </button>
        )}
        {enPartie && (
          <button
            type="button"
            onClick={() => bascule('clavardage')}
            aria-expanded={ouvert === 'clavardage'}
            className={BOUTON}
          >
            <MessageSquare size={13} className="text-brass" />
            {t.parole}
          </button>
        )}
      </div>

      <AnimatePresence>
        {ouvert === 'table' && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cadre}
          >
            {fermeture}
            <TableOuverte
              lang={lang}
              jeu="merelle"
              regleId={regleId}
              nomRegle={nomRegle}
              surPartie={(id) => { setOuvert(null); surPartie(id); }}
              surOrdinateur={(nom) => { setOuvert(null); surOrdinateur(nom); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Le clavardage, lui, ne se démonte jamais tant que la partie
          dure. Contre la maison le fil vit dans la page et rien n'est
          écrit nulle part : le replier le ferait disparaître. Il
          s'efface donc à l'œil, et les clics le traversent. */}
      {enPartie && (
        <motion.div
          initial={false}
          animate={ouvert === 'clavardage' ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ pointerEvents: ouvert === 'clavardage' ? 'auto' : 'none' }}
          aria-hidden={ouvert !== 'clavardage'}
          inert={ouvert !== 'clavardage'}
          className={cadre}
        >
          {fermeture}
          <Clavardage
            lang={lang}
            salle={partieId ? { collection: 'taflParties', partieId } : null}
            moi={moi}
            adversaire={adversaire}
          />
        </motion.div>
      )}
    </>
  );
};

const FR = {
  table: 'La table ouverte',
  parole: 'La parole',
  fermer: 'Fermer',
};

const EN = {
  table: 'The open table',
  parole: 'Talk',
  fermer: 'Close',
};

export default MerellePanneaux;
