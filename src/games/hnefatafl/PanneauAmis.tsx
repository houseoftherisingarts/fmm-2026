// ─── Défier un ami sans quitter le plateau ──────────────────────────
// Alex, 2026-08-23 : la table de tafl ne vivait que dans l'espace
// client, et il fallait sortir du jeu pour lancer une partie. Le cercle
// d'amis vient donc s'asseoir à côté du damier, dans le registre d'une
// colonne latérale de chess.com : une ligne par ami, l'action à droite,
// les défis reçus tout en haut puisqu'ils attendent une réponse.
//
// Aucune écriture nouvelle : tout passe par firebase/ordre (les
// amitiés, les fiches) et firebase/tafl (le défi, la partie), déjà en
// place. Le panneau ne s'affiche pas pour une personne non connectée.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Check, X, Link2, Copy, ArrowUpRight } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { REGLES } from './gameLogic';
import {
  suivreMesAmities, listerMembres,
  type Amitie, type Membre,
} from '../../firebase/ordre';
import {
  suivreMesParties, lancerDefi, repondreAuDefi, ouvrirDefiParLien,
  type PartieTafl, type CampTafl,
} from '../../firebase/tafl';

interface Props {
  lang: 'FR' | 'EN';
  /** Le règlement courant de la page : le défi part avec celui-là. */
  regleId: string;
  /** Le camp courant : l'ami défié prend le camp opposé. */
  camp: CampTafl;
}

const PanneauAmis: React.FC<Props> = ({ lang, regleId, camp }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const [liens, setLiens] = useState<Amitie[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [parties, setParties] = useState<PartieTafl[]>([]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [lienDefi, setLienDefi] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (!user) return;
    const a = suivreMesAmities(user.uid, setLiens);
    const b = suivreMesParties(user.uid, setParties);
    // Le registre des fiches sert seulement à mettre un nom sur un uid :
    // une lecture au montage suffit, il ne bouge pas pendant la partie.
    void listerMembres().then(setMembres);
    return () => { a(); b(); };
  }, [user]);

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

  const recus = parties.filter((p) => p.statut === 'defi' && p.lancePar !== user?.uid);
  // Un défi déjà envoyé fige le bouton : deux clics ne doivent pas
  // ouvrir deux parties avec la même personne.
  const enAttente = new Set(
    parties
      .filter((p) => p.statut === 'defi' && p.lancePar === user?.uid)
      .map((p) => p.joueurs.find((u) => u !== user?.uid) ?? ''),
  );

  if (!user) return null;

  const monNom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');
  const lienPartie = (id: string) => `${addLocale('/jeunesse/hnefatafl', lang)}?partie=${id}`;
  const nomAdverse = (p: PartieTafl) => p.noms[p.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—';

  const defier = async (uid: string, nom: string) => {
    setEnvoi(uid);
    try {
      await lancerDefi({
        moiUid: user.uid, moiNom: monNom,
        cibleUid: uid, cibleNom: nom,
        regleId, monCamp: camp,
      });
    } finally {
      setEnvoi(null);
    }
  };

  // La page lit `?partie=` une seule fois, au montage : accepter recharge
  // donc l'adresse au lieu de naviguer par le routeur, sinon le damier
  // resterait sur la partie précédente. L'écriture est attendue avant le
  // départ, pour qu'elle ne soit pas perdue au rechargement.
  const accepter = async (p: PartieTafl) => {
    setEnvoi(p.id);
    try {
      await repondreAuDefi(p.id, true);
      window.location.assign(lienPartie(p.id));
    } finally {
      setEnvoi(null);
    }
  };

  const creerLeLien = async () => {
    setEnvoi('lien');
    try {
      const id = await ouvrirDefiParLien({
        moiUid: user.uid, moiNom: monNom, regleId, monCamp: camp,
      });
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

  const nomRegle = (id: string) => REGLES.find((r) => r.id === id)?.[fr ? 'nomFR' : 'nomEN'] ?? id;

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
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/70 mt-1.5 mb-3">
                {nomRegle(p.regleId)}
                {' · '}
                {p.camps.attacker === user.uid
                  ? (fr ? 'vous menez les assaillants' : 'you lead the raiders')
                  : (fr ? 'vous défendez le roi' : 'you defend the king')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={envoi === p.id}
                  onClick={() => { void accepter(p); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-brass text-[#1A0A05] font-sans text-[10px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors disabled:opacity-50"
                >
                  <Check size={12} /> {fr ? 'Accepter' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => { void repondreAuDefi(p.id, false); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
                >
                  <X size={12} /> {fr ? 'Refuser' : 'Decline'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Le cercle : une ligne par ami, l'action à droite. */}
      {amis.length === 0 ? (
        <div className="px-5 py-5">
          <p className="font-editorial text-sm leading-relaxed" style={{ color: 'rgba(244,239,227,0.62)' }}>
            {fr
              ? 'Votre cercle est encore vide. Le registre de l’Ordre vous présentera des joueurs à ajouter.'
              : 'Your circle is still empty. The Order’s register will introduce you to other players.'}
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
              {enAttente.has(a.uid) ? (
                <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
                  {fr ? 'Défi envoyé' : 'Challenge sent'}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={envoi === a.uid}
                  onClick={() => { void defier(a.uid, a.nom); }}
                  className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-[#1A0A05] transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {envoi === a.uid ? (fr ? 'Envoi…' : 'Sending…') : (fr ? 'Défier' : 'Challenge')}
                </button>
              )}
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
              style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(244,239,227,0.8)' }}
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
