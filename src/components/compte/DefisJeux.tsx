// ─── Défier quelqu'un depuis sa fiche ───────────────────────────────
// Alex, 2026-08-31 : « Lorsqu'on visite le profil de quelqu'un d'autre,
// sur son onglet Jeux, il faut qu'on voie les trois jeux et que ce soit
// le bouton Défier à ce jeu. »
//
// Deux morceaux vivent ici, parce qu'ils lisent la même collection :
//
//   • DefierAuxJeux : les trois plateaux sur la fiche PUBLIQUE, un
//     bouton par jeu, et l'état du défi déjà lancé à cette personne.
//   • MesDefis      : sur sa propre fiche, ce qui attend une réponse,
//     ce qui est en cours, et ce qui a été refusé.
//
// Rien de neuf côté Firestore : le défi est le même document que celui
// du tafl (voir firebase/tafl.ts), avec un champ `jeu` en plus.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Check, X, ArrowUpRight, Hourglass } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  suivreMesParties, defierAuJeu, repondreAuDefi, jeuDe,
  JEUX_DEFIABLES, type JeuDefi, type PartieTafl,
} from '../../firebase/tafl';

/** Les trois plateaux, dans l'ordre où ils se lisent sur la table de
 *  jeux : la mérelle du Seigneur, le renard de la Révolte, le tafl des
 *  Vikings. La vignette est celle de la console. */
const PLATEAUX: Array<{ jeu: JeuDefi; image: string; texteFR: string; texteEN: string }> = [
  {
    jeu: 'merelle',
    image: '/jeux/tuile-merelle.webp',
    texteFR: 'Neuf pions chacun sur trois carrés emboîtés. Chaque alignement de trois enlève une pièce à l’autre.',
    texteEN: 'Nine men each on three nested squares. Every line of three takes a piece from the other side.',
  },
  {
    jeu: 'renard',
    image: '/jeux/tuile-renard.webp',
    texteFR: 'Les oies montent en bloc vers la tanière et cherchent à y coincer le renard, qui saute par-dessus elles pour éclaircir le troupeau.',
    texteEN: 'The geese climb together toward the den to pin the fox, who leaps over them to thin the flock.',
  },
  {
    jeu: 'hnefatafl',
    image: '/jeux/tuile-tafl-v2.webp',
    texteFR: 'Un roi cerné cherche la sortie par un des quatre coins, et ses assaillants resserrent l’étau.',
    texteEN: 'A ringed king looks for the way out through one of the four corners, while his attackers close in.',
  },
];

const lien = (jeu: JeuDefi, id: string, lang: 'FR' | 'EN'): string =>
  `${lang === 'FR' ? JEUX_DEFIABLES[jeu].cheminFR : JEUX_DEFIABLES[jeu].cheminEN}?partie=${id}`;

const nomDuJeu = (jeu: JeuDefi, lang: 'FR' | 'EN'): string =>
  lang === 'FR' ? JEUX_DEFIABLES[jeu].nomFR : JEUX_DEFIABLES[jeu].nomEN;

/** Le prénom seul : « Défier Marguerite » se lit mieux que le nom au long. */
const prenomDe = (nom: string): string => (nom || '').trim().split(/\s+/)[0] || '';

/** Une partie encore vivante : elle interdit d'en rouvrir une deuxième
 *  au même jeu avec la même personne. Un défi refusé, lui, ne bloque
 *  rien : la porte se rouvre par un nouveau défi. */
const vivante = (p: PartieTafl): boolean =>
  p.statut === 'defi' || p.statut === 'encours';

// ─── Les trois plateaux, sur la fiche de quelqu'un d'autre ──────────

export const DefierAuxJeux: React.FC<{
  /** La personne dont on regarde la fiche. */
  uid: string;
  nom: string;
  lang: 'FR' | 'EN';
}> = ({ uid, nom, lang }) => {
  const fr = lang === 'FR';
  const { user, openSignIn } = useAuth();
  const [parties, setParties] = useState<PartieTafl[]>([]);
  const [envoi, setEnvoi] = useState<JeuDefi | null>(null);

  useEffect(() => {
    if (!user) { setParties([]); return; }
    return suivreMesParties(user.uid, setParties);
  }, [user]);

  /** Ce qui nous lie déjà, jeu par jeu. */
  const encours = useMemo(() => {
    const carte = new Map<JeuDefi, PartieTafl>();
    for (const p of parties) {
      if (!vivante(p) || !p.joueurs.includes(uid)) continue;
      const j = jeuDe(p);
      if (!carte.has(j)) carte.set(j, p);
    }
    return carte;
  }, [parties, uid]);

  const prenom = prenomDe(nom);
  const monNom = user?.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');

  const defier = async (jeu: JeuDefi) => {
    if (!user) { openSignIn(); return; }
    setEnvoi(jeu);
    try {
      await defierAuJeu(jeu, { uid: user.uid, nom: monNom }, { uid, nom: nom || prenom });
    } finally {
      setEnvoi(null);
    }
  };

  // Sa propre fiche vue par l'adresse publique : on ne se défie pas.
  if (user && user.uid === uid) return null;

  return (
    <section className="fmm-console rounded-lg-card overflow-hidden">
      <div
        className="flex items-center justify-between gap-4 px-5 md:px-7 py-3.5 border-b border-brass/20"
        style={{ background: 'linear-gradient(180deg, rgba(var(--sk-glow-rgb),0.07), rgba(10,4,6,0))' }}
      >
        <span
          className="inline-flex items-center gap-3 font-display title-medieval uppercase tracking-[0.32em] text-[11px] md:text-xs"
          style={{ color: 'var(--color-amber-glow)' }}
        >
          <Swords size={13} className="text-brass" />
          {fr ? 'Lancer un défi' : 'Send a challenge'}
        </span>
      </div>

      <div className="p-4 md:p-7">
        <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-5 max-w-2xl">
          {fr
            ? `Trois plateaux se jouent à deux, chacun de son fauteuil. Le défi tombe dans les notifications de ${prenom || 'cette personne'}, et la partie s’ouvre dès que le défi est accepté.`
            : `Three boards are played by two, each from their own chair. The challenge lands in ${prenom || 'their'} notifications, and the game opens as soon as it is accepted.`}
        </p>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {PLATEAUX.map((pl) => {
            const partie = encours.get(pl.jeu);
            return (
              <li key={pl.jeu} className="h-full">
                <div className="fmm-annee-carte relative h-full flex flex-col overflow-hidden rounded-lg-card border border-brass/35">
                  <div className="relative h-40 overflow-hidden" style={{ background: 'rgba(8,3,5,0.85)' }}>
                    <img
                      src={pl.image}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(10,4,6,0.15) 0%, rgba(10,4,6,0.55) 55%, rgba(10,4,6,0.95) 100%)',
                      }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col p-5 md:p-6">
                    <h3 className="font-display title-medieval text-lg md:text-xl text-ivory mb-2">
                      {nomDuJeu(pl.jeu, lang)}
                    </h3>
                    <div className="divider-brass w-12 mb-3" />
                    <p className="font-editorial text-[13px] md:text-sm text-ivory-soft leading-relaxed mb-5">
                      {fr ? pl.texteFR : pl.texteEN}
                    </p>

                    <div className="mt-auto">
                      {partie?.statut === 'encours' ? (
                        <Link
                          to={lien(pl.jeu, partie.id, lang)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brass/45 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
                        >
                          {fr ? 'Reprendre la partie' : 'Resume the game'} <ArrowUpRight size={12} />
                        </Link>
                      ) : partie?.statut === 'defi' && partie.lancePar === user?.uid ? (
                        <span className="inline-flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
                          <Hourglass size={12} /> {fr ? 'Défi envoyé' : 'Challenge sent'}
                        </span>
                      ) : partie?.statut === 'defi' ? (
                        <Link
                          to={lien(pl.jeu, partie.id, lang)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brass text-[var(--sk-brown-dark)] font-sans text-[10px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors"
                        >
                          <Check size={12} /> {fr ? 'Répondre au défi' : 'Answer the challenge'}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={envoi === pl.jeu}
                          onClick={() => { void defier(pl.jeu); }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brass/45 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                        >
                          <Swords size={12} />
                          {envoi === pl.jeu
                            ? (fr ? 'Envoi…' : 'Sending…')
                            : !user
                              ? (fr ? 'Se connecter pour défier' : 'Sign in to challenge')
                              : (fr ? `Défier ${prenom}` : `Challenge ${prenom}`)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

// ─── Mes défis, sur ma propre fiche ─────────────────────────────────

export const MesDefis: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [parties, setParties] = useState<PartieTafl[]>([]);
  const [reponse, setReponse] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    return suivreMesParties(uid, setParties);
  }, [uid]);

  const recus   = parties.filter((p) => p.statut === 'defi' && p.lancePar !== uid);
  const envoyes = parties.filter((p) => p.statut === 'defi' && p.lancePar === uid);
  const enCours = parties.filter((p) => p.statut === 'encours');
  const refuses = parties.filter((p) => p.statut === 'refuse').slice(0, 3);

  if (recus.length + envoyes.length + enCours.length + refuses.length === 0) return null;

  const adverse = (p: PartieTafl) => p.noms[p.joueurs.find((u) => u !== uid) ?? ''] ?? '—';
  const titre = (p: PartieTafl) => nomDuJeu(jeuDe(p), lang);

  const repondre = async (id: string, oui: boolean) => {
    setReponse(id);
    try { await repondreAuDefi(id, oui); } finally { setReponse(null); }
  };

  const etiquette = 'font-sans text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60';

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden rounded-lg-card"
      style={{
        background: 'rgba(var(--sk-deep-rgb), 0.55)',
        border: '1px solid rgba(var(--sk-parchment-rgb), 0.10)',
      }}
    >
      <p className="witcher-stat-label mb-1.5 inline-flex items-center gap-2">
        <Swords size={11} /> {fr ? 'Vos défis' : 'Your challenges'}
      </p>
      <h2
        className="font-display text-2xl md:text-3xl leading-snug mb-5"
        style={{ color: 'var(--color-bone)', fontWeight: 400 }}
      >
        {fr ? 'Les parties en cours' : 'Games under way'}
      </h2>

      {recus.length > 0 && (
        <ul className="space-y-2 mb-5">
          {recus.map((p) => (
            <li key={p.id} className="px-4 py-3 rounded-card border border-brass/35 bg-brass/[0.06]">
              <p className="font-display text-sm text-ivory mb-1">
                {adverse(p)} {fr ? 'vous défie' : 'challenges you'}
              </p>
              <p className={`${etiquette} mb-3`}>{titre(p)}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={lien(jeuDe(p), p.id, lang)}
                  onClick={() => { void repondreAuDefi(p.id, true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brass text-[var(--sk-brown-dark)] font-sans text-[10px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors"
                >
                  <Check size={12} /> {fr ? 'Accepter et jouer' : 'Accept and play'}
                </Link>
                <button
                  type="button"
                  disabled={reponse === p.id}
                  onClick={() => { void repondre(p.id, false); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  <X size={12} /> {fr ? 'Refuser' : 'Decline'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(enCours.length > 0 || envoyes.length > 0) && (
        <ul className="space-y-2">
          {enCours.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-brass/20 bg-black/25"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm text-ivory truncate">
                  {fr ? 'Contre' : 'Against'} {adverse(p)} · {titre(p)}
                </span>
                <span className={`block ${etiquette} mt-1`}>
                  {p.camps[p.tour] === uid
                    ? (fr ? 'À vous de jouer' : 'Your move')
                    : (fr ? 'En attente de l’autre' : 'Waiting for them')}
                </span>
              </span>
              <Link
                to={lien(jeuDe(p), p.id, lang)}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brass/40 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
              >
                {fr ? 'Reprendre' : 'Resume'} <ArrowUpRight size={12} />
              </Link>
            </li>
          ))}
          {envoyes.map((p) => (
            <li
              key={p.id}
              className="px-4 py-3 rounded-card border border-brass/15 bg-black/20 font-editorial text-sm"
              style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}
            >
              {fr ? 'Défi envoyé à' : 'Challenge sent to'} {adverse(p)} · {titre(p)} ·{' '}
              {fr ? 'en attente de sa réponse' : 'waiting for their answer'}
            </li>
          ))}
        </ul>
      )}

      {refuses.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {refuses.map((p) => (
            <li key={p.id} className="font-editorial text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
              {fr ? 'Défi refusé' : 'Challenge declined'} · {adverse(p)} · {titre(p)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
