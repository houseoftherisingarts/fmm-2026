// ─── La table ouverte ───────────────────────────────────────────────
// Alex, 2026-09-01 : jusqu'ici il fallait connaître quelqu'un pour
// jouer. Ce panneau ouvre la table à tout le monde. Un bouton cherche
// un adversaire, la liste montre les chambres où quelqu'un attend déjà,
// et au bout d'une minute la maison prend le siège plutôt que de
// laisser un joueur devant un sablier.
//
// Le panneau ne connaît aucun jeu en particulier : il reçoit le nom du
// jeu et le règlement courant, et firebase/salons fait le reste.

import React, { useEffect, useRef, useState } from 'react';
import { DoorOpen, Search, Loader2, X, Swords } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  chercherAdversaire, rejoindreSalon, suivreSalonsOuverts, ATTENTE_MS,
  type EtatRecherche, type JeuSalon, type Recherche, type SalonOuvert,
} from '../../firebase/salons';
import { nomDadversaire } from '../../games/noms';

interface Props {
  lang: 'FR' | 'EN';
  jeu: JeuSalon;
  /** Le règlement ou la variante courante de la page. */
  regleId: string;
  /** Le camp que je prends dans la chambre que j'ouvre. */
  monCamp?: string;
  /** Le nom lisible d'un règlement, pour les lignes de la liste. */
  nomRegle?: (id: string) => string;
  /** Une partie contre une vraie personne s'ouvre. */
  surPartie: (id: string) => void;
  /** Personne ne s'est présenté : la maison joue, sous ce nom. */
  surOrdinateur: (nom: string) => void;
}

const TableOuverte: React.FC<Props> = ({
  lang, jeu, regleId, monCamp, nomRegle, surPartie, surOrdinateur,
}) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const { user } = useAuth();
  const [salons, setSalons] = useState<SalonOuvert[]>([]);
  const [etat, setEtat] = useState<EtatRecherche | null>(null);
  const [reste, setReste] = useState(Math.round(ATTENTE_MS / 1000));
  const [entree, setEntree] = useState<string | null>(null);
  const recherche = useRef<Recherche | null>(null);

  useEffect(() => suivreSalonsOuverts(jeu, setSalons), [jeu]);

  // Le sablier de la recherche. Il ne décide de rien : c'est
  // firebase/salons qui bascule sur la maison. Il montre l'attente.
  useEffect(() => {
    if (etat !== 'attente' && etat !== 'sonde') return;
    const debut = Date.now();
    const h = setInterval(() => {
      setReste(Math.max(0, Math.round((ATTENTE_MS - (Date.now() - debut)) / 1000)));
    }, 500);
    return () => clearInterval(h);
  }, [etat]);

  // Une page qu'on quitte pendant la recherche ne doit pas laisser une
  // chambre fantôme derrière elle.
  useEffect(() => () => { void recherche.current?.annuler(); }, []);

  if (!user) return null;
  const monNom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');

  const lancer = () => {
    if (recherche.current) return;
    setEtat('sonde');
    setReste(Math.round(ATTENTE_MS / 1000));
    recherche.current = chercherAdversaire({
      jeu,
      moi: { uid: user.uid, nom: monNom },
      regleId,
      monCamp,
      surEtat: setEtat,
      surPartie: (id) => { recherche.current = null; surPartie(id); },
      surOrdinateur: () => {
        recherche.current = null;
        setEtat(null);
        surOrdinateur(nomDadversaire(fr));
      },
    });
  };

  const arreter = () => {
    void recherche.current?.annuler();
    recherche.current = null;
    setEtat(null);
  };

  const prendreLeSiege = async (s: SalonOuvert) => {
    setEntree(s.id);
    try {
      const r = await rejoindreSalon(s, user.uid, monNom);
      if (r === 'ok' || r === 'moi') surPartie(s.id);
    } finally {
      setEntree(null);
    }
  };

  const ouvertes = salons.filter((s) => s.hoteUid !== user.uid);
  const enRecherche = etat === 'sonde' || etat === 'attente';

  return (
    <aside
      className="rounded-card border border-brass/25 overflow-hidden"
      style={{ background: 'rgba(10, 4, 6, 0.55)' }}
    >
      <header className="flex items-center gap-2 px-5 py-3.5 border-b border-brass/20 bg-black/30">
        <DoorOpen size={13} className="text-brass shrink-0" />
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ivory-soft">
          {t.titre}
        </span>
        <span className="ml-auto font-sans text-[11px] tracking-[0.12em] text-ivory-soft/50">
          {ouvertes.length}
        </span>
      </header>

      <div className="px-5 py-4 border-b border-brass/15">
        {enRecherche ? (
          <div>
            <p className="font-display text-sm text-ivory leading-snug inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-brass" />
              {t.enCours}
            </p>
            <p className="font-editorial text-[13px] leading-relaxed mt-2"
               style={{ color: 'rgba(var(--sk-parchment-rgb),0.66)' }}>
              {t.explication(reste)}
            </p>
            {/* Le sablier, dessiné : la barre se vide, et le joueur sait
                combien de temps il reste avant que la maison s'assoie. */}
            <div className="mt-3 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div
                className="h-full bg-brass transition-[width] duration-500 ease-linear"
                style={{ width: `${Math.round((reste / (ATTENTE_MS / 1000)) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={arreter}
              className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
            >
              <X size={12} /> {t.arreter}
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={lancer}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-card bg-brass text-[var(--sk-brown-dark)] font-sans text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors"
            >
              <Search size={13} /> {t.chercher}
            </button>
            <p className="font-editorial text-[13px] leading-relaxed mt-2.5"
               style={{ color: 'rgba(var(--sk-parchment-rgb),0.62)' }}>
              {t.promesse}
            </p>
          </div>
        )}
      </div>

      {ouvertes.length === 0 ? (
        <p className="px-5 py-4 font-editorial text-[13px] leading-relaxed"
           style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>
          {t.vide}
        </p>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto divide-y divide-brass/10">
          {ouvertes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="block font-display text-sm text-ivory truncate">
                  {s.hoteNom || (fr ? 'Un inconnu' : 'A stranger')}
                </span>
                <span className="block font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55 mt-0.5">
                  {nomRegle?.(s.regleId) ?? s.regleId}
                  {s.places > 2 ? ` · ${s.assis}/${s.places}` : ''}
                </span>
              </span>
              <button
                type="button"
                disabled={entree === s.id}
                onClick={() => { void prendreLeSiege(s); }}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
              >
                <Swords size={12} /> {entree === s.id ? t.entree : t.siege}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

const FR = {
  titre: 'La table ouverte',
  chercher: 'Chercher un adversaire',
  promesse: 'Nous cherchons quelqu’un qui attend déjà, et la partie s’ouvre aussitôt. Si personne ne se présente en une minute, la maison prend le siège et la partie commence quand même.',
  enCours: 'Nous cherchons un adversaire',
  explication: (s: number) => `Votre table est ouverte et n’importe qui peut s’y asseoir. Il reste ${s} secondes avant que la maison prenne le siège.`,
  arreter: 'Arrêter la recherche',
  vide: 'Aucune table n’est ouverte en ce moment. Ouvrez la vôtre et quelqu’un viendra s’y asseoir.',
  siege: 'Prendre le siège',
  entree: 'Un instant',
};

const EN = {
  titre: 'The open table',
  chercher: 'Find an opponent',
  promesse: 'We look for someone already waiting, and the game opens at once. If nobody turns up within a minute, the house takes the seat and the game starts anyway.',
  enCours: 'Looking for an opponent',
  explication: (s: number) => `Your table is open and anyone may sit down. The house takes the seat in ${s} seconds.`,
  arreter: 'Stop looking',
  vide: 'No table is open right now. Open yours and someone will come and sit down.',
  siege: 'Take the seat',
  entree: 'One moment',
};

export default TableOuverte;
