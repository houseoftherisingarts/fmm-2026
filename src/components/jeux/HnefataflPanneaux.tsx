// ─── Hnefatafl : les panneaux posés sur la table ────────────────────
// Alex, 2026-09-01 : un jeu ne se rétrécit jamais pour loger un
// panneau. La table ouverte et le clavardage arrivent donc par-dessus
// le plateau, dans le même patron de verre sombre que le panneau des
// amis, et le damier garde toute la largeur qu'il avait.
//
// Le fichier vit à part de `src/games/hnefatafl/index.tsx` parce que la
// page a déjà mille sept cents lignes. Il ne contient que l'habillage :
// les deux boutons, le tiroir qui s'ouvre par-dessus la table, et la
// carte qui nomme l'adversaire quand la maison a pris le siège. Toute
// la mécanique reste dans `TableOuverte` et `Clavardage`.

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, DoorOpen, MessageSquare, X } from 'lucide-react';

import TableOuverte from './TableOuverte';
import Clavardage from './Clavardage';
import type { Salle } from '../../firebase/clavardage';

interface Props {
  lang: 'FR' | 'EN';
  /** Le règlement courant : c'est lui que porte la chambre qu'on ouvre. */
  regleId: string;
  /** Le camp que je prends dans ma propre chambre. */
  monCamp: string;
  /** Le nom lisible d'un règlement, pour les lignes de la liste. */
  nomRegle: (id: string) => string;
  /** Une partie contre une vraie personne s'ouvre sous cet identifiant. */
  surPartie: (id: string) => void;
  /** Personne ne s'est présenté : la maison joue, sous ce nom. */
  surOrdinateur: (nom: string) => void;
  /** La salle Firestore d'une partie en ligne. Nulle contre la maison. */
  salle: Salle | null;
  moi: { uid: string; nom: string };
  /** Vrai quand la table ouverte a lieu d'être : la personne a un
   *  compte, et aucune partie en ligne ne l'attend déjà ailleurs. Une
   *  recherche lancée pendant une partie en ligne finissait par asseoir
   *  la maison à une table déjà prise, et l'ordinateur se mettait alors
   *  à écrire les coups de la personne dans Firestore. */
  connecte: boolean;
  /** Le nom affiché en face, dans le clavardage. */
  adversaire: string;
  /** Le nom tiré au sort quand la maison a pris le siège, sinon null. */
  maison: string | null;
}

type Tiroir = 'table' | 'parole';

const BOUTON =
  'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[15px] border border-white/15 '
  + 'bg-black/45 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/50 '
  + 'transition-colors font-sans text-[10px] uppercase tracking-[0.2em]';

const HnefataflPanneaux: React.FC<Props> = ({
  lang, regleId, monCamp, nomRegle, surPartie, surOrdinateur,
  salle, moi, connecte, adversaire, maison,
}) => {
  const t = lang === 'FR' ? FR : EN;
  const [ouvert, setOuvert] = useState<Tiroir | null>(null);
  const fermer = () => setOuvert(null);
  const basculer = (q: Tiroir) => setOuvert((o) => (o === q ? null : q));

  return (
    <>
      {/* Qui est assis en face, quand c'est la maison qui a pris le
          siège. La carte occupe la place que garde la partie en ligne,
          et les deux ne peuvent jamais s'afficher ensemble. */}
      {maison && (
        <div className="absolute left-3 md:left-6 top-16 z-20 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md px-4 py-3">
          <span className="block font-display text-[13px] text-ivory truncate">
            {t.contre} {maison}
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.16em] text-ivory-soft/60">
            <Cpu size={11} className="text-brass" />
            {t.maison}
          </span>
        </div>
      )}

      <div className="absolute top-28 right-3 md:right-6 z-20 flex flex-col items-end gap-2">
        {connecte && (
          <button
            type="button"
            onClick={() => basculer('table')}
            aria-expanded={ouvert === 'table'}
            className={BOUTON}
          >
            <DoorOpen size={13} className="text-brass" />
            {t.table}
          </button>
        )}
        <button
          type="button"
          onClick={() => basculer('parole')}
          aria-expanded={ouvert === 'parole'}
          className={BOUTON}
        >
          <MessageSquare size={13} className="text-brass" />
          {t.parole}
        </button>
      </div>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            key={ouvert}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 right-3 md:right-6 z-30 w-[min(22rem,calc(100%-1.5rem))] max-h-[calc(100%-8rem)] overflow-y-auto rounded-[15px] border border-white/15 bg-black/55 backdrop-blur-xl p-3"
          >
            <button
              type="button"
              onClick={fermer}
              aria-label={t.fermer}
              className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
            {ouvert === 'table' ? (
              <TableOuverte
                lang={lang}
                jeu="hnefatafl"
                regleId={regleId}
                monCamp={monCamp}
                nomRegle={nomRegle}
                surPartie={(id) => { fermer(); surPartie(id); }}
                surOrdinateur={(nom) => { fermer(); surOrdinateur(nom); }}
              />
            ) : (
              <Clavardage lang={lang} salle={salle} moi={moi} adversaire={adversaire} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const FR = {
  table: 'La table ouverte',
  parole: 'La parole',
  fermer: 'Fermer',
  contre: 'Contre',
  maison: 'La maison a pris le siège',
};

const EN = {
  table: 'The open table',
  parole: 'Talk',
  fermer: 'Close',
  contre: 'Against',
  maison: 'The house took the seat',
};

export default HnefataflPanneaux;
