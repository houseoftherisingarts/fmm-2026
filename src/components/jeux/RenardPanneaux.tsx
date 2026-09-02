// ─── Le Renard et les Oies : la table ouverte et la parole ──────────
// Alex, 2026-09-01 : un jeu garde cent pour cent de la largeur. La
// recherche d'adversaire et le clavardage se posent donc SUR la
// planche, dans un panneau qui glisse depuis la droite, et la planche
// ne rétrécit jamais d'un pixel pour leur faire de la place. C'est le
// patron du panneau des amis du hnefatafl, avec deux volets au lieu
// d'un.
//
// Le panneau ne connaît rien du jeu. Il porte les deux boutons, ouvre
// l'un ou l'autre volet, et laisse `TableOuverte` et `Clavardage` faire
// leur travail. Son nom est préfixé par celui du jeu parce que ce
// dossier est partagé par les cinq plateaux du festival : un
// « Panneaux.tsx » tout court y entrerait en collision le jour où la
// mérelle voudra le sien.

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DoorOpen, MessageSquare, X } from 'lucide-react';

import TableOuverte from './TableOuverte';
import Clavardage from './Clavardage';
import type { Salle } from '../../firebase/clavardage';

type Volet = 'table' | 'parole';

interface Props {
  lang: 'FR' | 'EN';
  /** La variante courante : c'est le règlement de la chambre que j'ouvre. */
  regleId: string;
  /** Le camp que je garde pour moi dans cette chambre. */
  monCamp: string;
  /** Le nom lisible d'un règlement, pour les lignes de la liste. */
  nomRegle: (id: string) => string;
  /** La table ouverte ne se propose plus une fois la partie en ligne prise. */
  table: boolean;
  /** La parole s'ouvre dès que la planche est dressée. */
  parole: boolean;
  /** Descend les boutons d'un cran, sous la carte de la partie à deux
   *  qui occupe déjà le haut de la planche sur un téléphone. */
  decale?: boolean;
  /** La salle Firestore, ou null quand la partie se joue contre la maison. */
  salle: Salle | null;
  moi: { uid: string; nom: string };
  /** Le nom affiché en face, la maison comprise. */
  adversaire?: string;
  surPartie: (id: string) => void;
  surOrdinateur: (nom: string) => void;
}

const Bouton: React.FC<{
  actif: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  children: React.ReactNode;
}> = ({ actif, onClick, icone, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={actif}
    className={`inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[40px] rounded-[15px] border backdrop-blur-md transition-colors duration-200 font-sans text-[10px] uppercase tracking-[0.2em] ${
      actif
        ? 'border-brass bg-brass/20 text-ivory'
        : 'border-white/15 bg-black/45 text-ivory-soft hover:text-ivory hover:border-brass/50'
    }`}
  >
    {icone}
    <span className="hidden sm:inline">{children}</span>
  </button>
);

const RenardPanneaux: React.FC<Props> = ({
  lang, regleId, monCamp, nomRegle, table, parole, decale, salle, moi, adversaire,
  surPartie, surOrdinateur,
}) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const [ouvert, setOuvert] = useState<Volet | null>(null);
  const basculer = (v: Volet) => setOuvert((o) => (o === v ? null : v));

  // Un volet dont le bouton vient de disparaître se referme tout seul :
  // la table ouverte n'a plus rien à chercher une fois la partie prise.
  const volet = ouvert === 'table' && table ? 'table' : ouvert === 'parole' && parole ? 'parole' : null;

  // Les deux classes s'écrivent en entier : Tailwind lit le fichier au
  // texte, et une valeur arbitraire recollée par interpolation ne serait
  // jamais générée.
  const place = decale
    ? 'absolute top-32 right-3 md:right-6'
    : 'absolute top-16 right-3 md:right-6';
  const cadre = `${place} z-40 w-[min(21rem,calc(100%-1.5rem))] overflow-y-auto `
    + (decale ? 'max-h-[calc(100%-9rem)]' : 'max-h-[calc(100%-7rem)]');

  const fermeture = (
    <div className="flex justify-end mb-1.5">
      <button
        type="button"
        onClick={() => setOuvert(null)}
        aria-label={t.fermer}
        className="p-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-ivory-soft/80 hover:text-ivory hover:border-brass/50 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <>
      <div className={`${place} z-20 flex flex-col items-end gap-2`}>
        {table && (
          <Bouton
            actif={volet === 'table'}
            onClick={() => basculer('table')}
            icone={<DoorOpen size={13} className="text-brass" />}
          >
            {t.table}
          </Bouton>
        )}
        {parole && (
          <Bouton
            actif={volet === 'parole'}
            onClick={() => basculer('parole')}
            icone={<MessageSquare size={13} className="text-brass" />}
          >
            {t.parole}
          </Bouton>
        )}
      </div>

      <AnimatePresence>
        {volet === 'table' && (
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
              jeu="renard"
              regleId={regleId}
              monCamp={monCamp}
              nomRegle={nomRegle}
              surPartie={(id) => { setOuvert(null); surPartie(id); }}
              surOrdinateur={(nom) => { setOuvert(null); surOrdinateur(nom); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* La parole ne se démonte jamais tant que la planche est dressée.
          Contre la maison le fil vit dans la page et n'est écrit nulle
          part : le replier l'effaçait pour de bon. Il s'efface donc à
          l'œil seulement, et les clics le traversent. */}
      {parole && (
        <motion.div
          initial={false}
          animate={volet === 'parole' ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ pointerEvents: volet === 'parole' ? 'auto' : 'none' }}
          aria-hidden={volet !== 'parole'}
          className={cadre}
        >
          {fermeture}
          <Clavardage lang={lang} salle={salle} moi={moi} adversaire={adversaire} />
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

export default RenardPanneaux;
