// ─── Défier un ami sans quitter le plateau ──────────────────────────
// Alex, 2026-08-23 : la table de tafl ne vivait que dans l'espace
// client, et il fallait sortir du jeu pour lancer une partie. Le cercle
// d'amis vient donc s'asseoir à côté du damier, dans le registre d'une
// colonne latérale de chess.com : une ligne par ami, l'action à droite,
// les défis reçus tout en haut puisqu'ils attendent une réponse.
//
// Le panneau a quitté le dossier du tafl le même jour, quand les dés du
// menteur ont voulu les mêmes gestes. Il ne connaît plus aucun jeu en
// particulier : chaque page lui passe un adaptateur qui sait ouvrir un
// défi, y répondre et suivre les parties en cours. Tout le reste (les
// amitiés, les fiches, la recherche dans le registre) passe par
// firebase/ordre, déjà en place.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Check, X, Link2, Copy, ArrowUpRight, Search } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import {
  suivreMesAmities, listerMembres, filtrerMembres,
  type Amitie, type Membre,
} from '../../firebase/ordre';

/** Un défi ou une partie, réduits à ce que le panneau affiche. */
export interface DefiAffiche {
  id: string;
  joueurs: string[];
  noms: Record<string, string>;
  lancePar: string;
  statut: string;
  /** La ligne sous le nom, quand le jeu a des réglages : le règlement
   *  du tafl et le camp qui vous revient. Les dés n'en ont pas. */
  detail?: string;
}

export interface Personne { uid: string; nom: string }

/** Ce qu'une page de jeu doit savoir faire pour être défiable. */
export interface JeuDefiable {
  /** Le chemin de la page de jeu, sans la locale. */
  chemin: string;
  /** Ouvre un défi nommé et rend l'identifiant de la partie. */
  defier: (moi: Personne, cible: Personne) => Promise<string>;
  /** Ouvre un défi par lien, sans destinataire. */
  parLien: (moi: Personne) => Promise<string>;
  /** Accepte ou refuse un défi reçu. */
  repondre: (id: string, accepte: boolean) => Promise<void>;
  /** Mes défis et mes parties, en direct. */
  suivre: (uid: string, cb: (defis: DefiAffiche[]) => void) => () => void;
}

interface Props {
  lang: 'FR' | 'EN';
  jeu: JeuDefiable;
}

const PanneauAmis: React.FC<Props> = ({ lang, jeu }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const [liens, setLiens] = useState<Amitie[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [defis, setDefis] = useState<DefiAffiche[]>([]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [lienDefi, setLienDefi] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    if (!user) return;
    const a = suivreMesAmities(user.uid, setLiens);
    const b = jeu.suivre(user.uid, setDefis);
    // Le registre des fiches sert à mettre un nom sur un uid et à
    // chercher quelqu'un qui n'est pas encore un ami : une lecture au
    // montage suffit, il ne bouge pas pendant la partie.
    void listerMembres().then(setMembres);
    return () => { a(); b(); };
  }, [user, jeu]);

  const amis = useMemo(() => {
    if (!user) return [];
    const noms = new Map(membres.map((m) => [m.uid, m.nom]));
    return liens
      .filter((l) => l.statut === 'amis')
      .map((l) => l.paire.find((u) => u !== user.uid) ?? '')
      .filter((uid) => uid.length > 0)
      .map((uid) => ({ uid, nom: noms.get(uid) || (fr ? 'Un inconnu' : 'A stranger') }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [liens, membres, user, fr]);

  // La recherche va chercher au-delà du cercle : le registre entier de
  // l'Ordre, moins soi-même et moins les amis déjà listés en dessous.
  const trouves = useMemo(() => {
    if (!user || recherche.trim().length < 2) return [];
    const dejaLa = new Set([user.uid, ...amis.map((a) => a.uid)]);
    return filtrerMembres(membres, recherche)
      .filter((m) => !dejaLa.has(m.uid))
      .slice(0, 8)
      .map((m) => ({ uid: m.uid, nom: m.nom || (fr ? 'Un inconnu' : 'A stranger') }));
  }, [membres, recherche, amis, user, fr]);

  const recus = defis.filter((p) => p.statut === 'defi' && p.lancePar !== user?.uid);
  // Un défi déjà envoyé fige le bouton : deux clics ne doivent pas
  // ouvrir deux parties avec la même personne.
  const enAttente = new Set(
    defis
      .filter((p) => p.statut === 'defi' && p.lancePar === user?.uid)
      .map((p) => p.joueurs.find((u) => u !== user?.uid) ?? ''),
  );

  if (!user) return null;

  const monNom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');
  const lienPartie = (id: string) => `${addLocale(jeu.chemin, lang)}?partie=${id}`;
  const nomAdverse = (p: DefiAffiche) => p.noms[p.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—';

  const defier = async (uid: string, nom: string) => {
    setEnvoi(uid);
    try {
      await jeu.defier({ uid: user.uid, nom: monNom }, { uid, nom });
    } finally {
      setEnvoi(null);
    }
  };

  // La page lit `?partie=` une seule fois, au montage : accepter recharge
  // donc l'adresse au lieu de naviguer par le routeur, sinon la table
  // resterait sur la partie précédente. L'écriture est attendue avant le
  // départ, pour qu'elle ne soit pas perdue au rechargement.
  const accepter = async (p: DefiAffiche) => {
    setEnvoi(p.id);
    try {
      await jeu.repondre(p.id, true);
      window.location.assign(lienPartie(p.id));
    } finally {
      setEnvoi(null);
    }
  };

  const creerLeLien = async () => {
    setEnvoi('lien');
    try {
      const id = await jeu.parLien({ uid: user.uid, nom: monNom });
      setLienDefi(`${window.location.origin}${addLocale('/defi', lang)}/${id}`);
      setCopie(false);
    } finally {
      setEnvoi(null);
    }
  };

  const copierLeLien = async () => {
    if (!lienDefi) return;
    try { await navigator.clipboard.writeText(lienDefi); setCopie(true); } catch { /* rien */ }
  };

  const boutonDefier = (a: Personne) => (
    enAttente.has(a.uid) ? (
      <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
        {fr ? 'Défi envoyé' : 'Challenge sent'}
      </span>
    ) : (
      <button
        type="button"
        disabled={envoi === a.uid}
        onClick={() => { void defier(a.uid, a.nom); }}
        className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
      >
        {envoi === a.uid ? (fr ? 'Envoi…' : 'Sending…') : (fr ? 'Défier' : 'Challenge')}
      </button>
    )
  );

  return (
    <aside
      className="rounded-card border border-brass/25 overflow-hidden"
      style={{ background: 'rgba(10, 4, 6, 0.55)' }}
    >
      <header className="flex items-center gap-2 px-5 py-3.5 border-b border-brass/20 bg-black/30">
        <Users size={13} className="text-brass shrink-0" />
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ivory-soft">
          {fr ? 'Mes amis' : 'My friends'}
        </span>
        <span className="ml-auto font-sans text-[11px] tracking-[0.12em] text-ivory-soft/50">
          {amis.length}
        </span>
      </header>

      {/* Les défis reçus passent devant : quelqu'un attend une réponse. */}
      {recus.length > 0 && (
        <div className="px-5 py-4 border-b border-brass/15 space-y-2.5">
          {recus.map((p) => (
            <div key={p.id} className="px-4 py-3 rounded-card border border-brass/35 bg-brass/[0.06]">
              <p className="font-display text-sm text-ivory leading-snug">
                {nomAdverse(p)} {fr ? 'vous défie' : 'challenges you'}
              </p>
              {p.detail && (
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/70 mt-1.5">
                  {p.detail}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={envoi === p.id}
                  onClick={() => { void accepter(p); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-brass text-[var(--sk-brown-dark)] font-sans text-[10px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors disabled:opacity-50"
                >
                  <Check size={12} /> {fr ? 'Accepter' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => { void jeu.repondre(p.id, false); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
                >
                  <X size={12} /> {fr ? 'Refuser' : 'Decline'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chercher quelqu'un dans le registre de l'Ordre. */}
      <div className="px-5 py-3.5 border-b border-brass/15">
        <label className="flex items-center gap-2 px-3 py-2 rounded-card border border-brass/25 bg-black/40 focus-within:border-brass/60 transition-colors">
          <Search size={13} className="text-brass shrink-0" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={fr ? 'Chercher dans le registre' : 'Search the register'}
            aria-label={fr ? 'Chercher un membre de l’Ordre' : 'Search a member of the Order'}
            className="w-full bg-transparent border-0 outline-none font-sans text-[12px] text-ivory placeholder:text-ivory-soft/45"
          />
        </label>
        {recherche.trim().length >= 2 && (
          trouves.length === 0 ? (
            <p className="mt-2.5 font-editorial text-[13px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>
              {fr
                ? 'Personne de ce nom dans le registre.'
                : 'Nobody by that name in the register.'}
            </p>
          ) : (
            <ul className="mt-2.5 divide-y divide-brass/10">
              {trouves.map((m) => (
                <li key={m.uid} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-display text-sm text-ivory truncate">{m.nom}</span>
                  {boutonDefier(m)}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* Le cercle : une ligne par ami, l'action à droite. */}
      {amis.length === 0 ? (
        <div className="px-5 py-5">
          <p className="font-editorial text-sm leading-relaxed" style={{ color: 'rgba(var(--sk-parchment-rgb),0.62)' }}>
            {fr
              ? 'Votre cercle est encore vide. Les autres joueurs vous attendent dans le registre de l’Ordre.'
              : 'Your circle is still empty. The other players are waiting in the Order’s register.'}
          </p>
          <Link
            to={addLocale('/ordre', lang)}
            className="mt-3.5 inline-flex items-center gap-2 px-4 py-2.5 rounded-card border border-brass/40 text-ivory hover:bg-brass/15 transition-colors font-sans text-[10px] uppercase tracking-[0.16em]"
          >
            {fr ? 'Le registre de l’Ordre' : 'The Order’s register'} <ArrowUpRight size={12} />
          </Link>
        </div>
      ) : (
        <ul className="max-h-[420px] overflow-y-auto divide-y divide-brass/10">
          {amis.map((a) => (
            <li key={a.uid} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="font-display text-sm text-ivory truncate">{a.nom}</span>
              {boutonDefier(a)}
            </li>
          ))}
        </ul>
      )}

      {/* Pour un ami qui n'a pas encore de compte : un lien à coller. */}
      <div className="px-5 py-4 border-t border-brass/15">
        {lienDefi ? (
          <div className="space-y-2.5">
            <p
              className="font-sans text-[11px] break-all px-3 py-2.5 rounded-card"
              style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(var(--sk-parchment-rgb),0.8)' }}
            >
              {lienDefi}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { void copierLeLien(); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card border border-brass/40 text-ivory hover:bg-brass/15 transition-colors font-sans text-[10px] uppercase tracking-[0.16em]"
              >
                <Copy size={12} /> {copie ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le lien' : 'Copy the link')}
              </button>
              <a
                href={`https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(lienDefi)}&redirect_uri=${encodeURIComponent(lienDefi)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card border border-brass/40 text-ivory hover:bg-brass/15 transition-colors font-sans text-[10px] uppercase tracking-[0.16em]"
              >
                <ArrowUpRight size={12} /> Messenger
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={envoi === 'lien'}
            onClick={() => { void creerLeLien(); }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-card border border-brass/35 text-ivory-soft hover:text-ivory hover:border-brass/70 transition-colors font-sans text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"
          >
            <Link2 size={12} /> {fr ? 'Défier par lien' : 'Challenge by link'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default PanneauAmis;
