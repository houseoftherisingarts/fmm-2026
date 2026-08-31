import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Shield, ArrowUpRight, Check, X, Link2, Copy, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { REGLES, REGLE_DEFAUT } from '../../games/hnefatafl/gameLogic';
import {
  suivreMesParties, suivreLaTable, rejoindreLaTable, quitterLaTable,
  lancerDefi, repondreAuDefi, ouvrirDefiParLien,
  type PartieTafl, type JoueurTafl, type CampTafl,
} from '../../firebase/tafl';

// ─── Les défis de tafl ──────────────────────────────────────────────
// Le joueur contre joueur du Hnefatafl vit ici : on se rend visible à
// la table, on défie quelqu'un, le défi tombe dans son espace, il
// accepte, et la partie s'ouvre en direct des deux côtés (Alex,
// 2026-08-23).
//
// Le répertoire des membres reste privé : seuls ceux qui ont accepté
// d'être visibles apparaissent (voir taflJoueurs dans firebase/tafl).

const DefisTafl: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const [parties, setParties] = useState<PartieTafl[]>([]);
  const [table, setTable] = useState<JoueurTafl[]>([]);
  const [regleId, setRegleId] = useState(REGLE_DEFAUT);
  const [camp, setCamp] = useState<CampTafl>('defender');
  const [envoi, setEnvoi] = useState<string | null>(null);

  // Jamais le courriel, même tronqué : cette collection est lue par
  // tous les membres connectés (vérification du 23 août).
  const monNom = user?.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');

  useEffect(() => {
    if (!user) return;
    const a = suivreMesParties(user.uid, setParties);
    const b = suivreLaTable(setTable);
    return () => { a(); b(); };
  }, [user]);

  const visible = useMemo(
    () => !!user && table.some((j) => j.uid === user.uid),
    [table, user],
  );
  const autres = useMemo(
    () => table.filter((j) => j.uid !== user?.uid),
    [table, user],
  );

  const defisRecus = parties.filter((p) => p.statut === 'defi' && p.lancePar !== user?.uid);
  const defisEnvoyes = parties.filter((p) => p.statut === 'defi' && p.lancePar === user?.uid);
  const enCours = parties.filter((p) => p.statut === 'encours');
  const finies = parties.filter((p) => p.statut === 'fini').slice(0, 3);

  if (!user) return null;

  const nomAdverse = (p: PartieTafl) =>
    p.noms[p.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—';

  const defier = async (cible: JoueurTafl) => {
    setEnvoi(cible.uid);
    try {
      await lancerDefi({
        moiUid: user.uid, moiNom: monNom,
        cibleUid: cible.uid, cibleNom: cible.nom,
        regleId, monCamp: camp,
      });
    } finally {
      setEnvoi(null);
    }
  };

  const lienPartie = (id: string) => `${addLocale('/jeunesse/hnefatafl', lang)}?partie=${id}`;

  // ── Défier quelqu'un qui n'est pas encore ici ────────────────────
  // Le lien se colle dans Messenger ou dans un courriel. L'ami tombe
  // sur le lobby, se crée un compte, et la partie commence (Alex,
  // 2026-08-23). C'est notre porte d'entrée.
  const [lienDefi, setLienDefi] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
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

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(var(--sk-deep-rgb), 0.55)', border: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
    >
      <header className="mb-5">
        <p className="witcher-stat-label mb-1.5 inline-flex items-center gap-2">
          <Swords size={11} /> {fr ? 'La table de tafl' : 'The tafl table'}
        </p>
        <h2 className="font-display text-2xl md:text-3xl leading-snug" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
          {fr ? 'Défier quelqu’un' : 'Challenge someone'}
        </h2>
        <p className="font-editorial text-sm md:text-base mt-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.72)' }}>
          {fr
            ? 'Rendez-vous visible, choisissez un règlement et votre camp, puis lancez un défi. La partie s’ouvre dès que l’autre accepte.'
            : 'Make yourself visible, pick a rule set and a side, then send a challenge. The game opens as soon as they accept.'}
        </p>
      </header>

      {/* Se rendre visible */}
      <button
        type="button"
        onClick={() => (visible ? quitterLaTable(user.uid) : rejoindreLaTable(user.uid, monNom))}
        className="fmm-glass-btn w-full px-5 py-4 mb-5"
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        <span className="text-left">
          <span className="fmm-glass-btn-label block">
            {visible
              ? (fr ? 'Vous êtes à la table' : 'You are at the table')
              : (fr ? 'S’asseoir à la table' : 'Sit at the table')}
          </span>
          <span className="fmm-glass-btn-note block mt-1.5">
            {visible
              ? (fr ? 'Les autres membres peuvent vous défier' : 'Other members can challenge you')
              : (fr ? 'Seul votre nom d’affichage sera visible' : 'Only your display name will show')}
          </span>
        </span>
        {visible ? <Check size={18} className="text-brass shrink-0" /> : <ArrowUpRight size={18} className="text-brass shrink-0" />}
      </button>

      {/* Le lien de défi : pour quelqu'un qui n'est pas encore membre */}
      <div className="mb-5 p-5 rounded-card" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}>
        <p className="witcher-stat-label mb-2 inline-flex items-center gap-2">
          <Link2 size={11} /> {fr ? 'Défier un ami de l’extérieur' : 'Challenge a friend from outside'}
        </p>
        <p className="font-editorial text-sm mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.72)' }}>
          {fr
            ? 'Créez un lien, collez-le dans Messenger ou dans un courriel. Votre ami arrive dans le lobby, se crée un compte, et la partie commence.'
            : 'Create a link, paste it into Messenger or an email. Your friend lands in the lobby, makes an account, and the game begins.'}
        </p>
        {lienDefi ? (
          <div className="space-y-3">
            <p className="font-sans text-[12px] break-all px-3 py-2.5 rounded-card"
               style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(var(--sk-parchment-rgb),0.8)' }}>
              {lienDefi}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copierLeLien}
                      className="px-4 py-2.5 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2">
                <Copy size={12} /> {copie ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le lien' : 'Copy the link')}
              </button>
              <a href={`https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(lienDefi)}&redirect_uri=${encodeURIComponent(lienDefi)}`}
                 target="_blank" rel="noopener noreferrer"
                 className="px-4 py-2.5 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2">
                <ArrowUpRight size={12} /> Messenger
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(fr ? 'Je vous défie au tafl' : 'I challenge you at tafl')}&body=${encodeURIComponent(lienDefi)}`}
                 className="px-4 py-2.5 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2">
                <Mail size={12} /> {fr ? 'Courriel' : 'Email'}
              </a>
            </div>
          </div>
        ) : (
          <button type="button" onClick={creerLeLien} disabled={envoi === 'lien'}
                  className="px-5 py-3 rounded-card border border-brass/45 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
            <Link2 size={12} /> {fr ? 'Créer un lien de défi' : 'Create a challenge link'}
          </button>
        )}
      </div>

      {/* Réglages du défi */}
      <div className="mb-5">
        <p className="witcher-stat-label mb-2">{fr ? 'Règlement' : 'Rule set'}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {REGLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRegleId(r.id)}
              aria-pressed={regleId === r.id}
              className={`px-3.5 py-2 rounded-card border font-sans text-[10px] uppercase tracking-[0.16em] transition-colors ${
                regleId === r.id
                  ? 'bg-brass text-[var(--sk-brown-dark)] border-brass'
                  : 'bg-black/30 text-ivory-soft border-brass/30 hover:border-brass/70'
              }`}
            >
              {fr ? r.nomFR : r.nomEN}
            </button>
          ))}
        </div>
        <p className="witcher-stat-label mb-2">{fr ? 'Mon camp' : 'My side'}</p>
        <div className="flex flex-wrap gap-2">
          {(['defender', 'attacker'] as CampTafl[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCamp(c)}
              aria-pressed={camp === c}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-card border font-sans text-[10px] uppercase tracking-[0.16em] transition-colors ${
                camp === c
                  ? 'bg-brass text-[var(--sk-brown-dark)] border-brass'
                  : 'bg-black/30 text-ivory-soft border-brass/30 hover:border-brass/70'
              }`}
            >
              {c === 'defender' ? <Shield size={12} /> : <Swords size={12} />}
              {c === 'defender'
                ? (fr ? 'Défenseurs' : 'Defenders')
                : (fr ? 'Assaillants' : 'Raiders')}
            </button>
          ))}
        </div>
      </div>

      {/* Qui est à la table */}
      <div className="mb-5">
        <p className="witcher-stat-label mb-2">{fr ? 'À la table' : 'At the table'}</p>
        {autres.length === 0 ? (
          <p className="font-editorial italic text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
            {fr ? 'Personne d’autre pour l’instant. Revenez tantôt.' : 'Nobody else yet. Come back later.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {autres.map((j) => (
              <li key={j.uid} className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-brass/20 bg-black/25">
                <span className="font-display text-sm text-ivory truncate">{j.nom}</span>
                <button
                  type="button"
                  disabled={envoi === j.uid}
                  onClick={() => defier(j)}
                  className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-midnight-deep transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {envoi === j.uid ? (fr ? 'Envoi…' : 'Sending…') : (fr ? 'Défier' : 'Challenge')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Défis reçus */}
      {defisRecus.length > 0 && (
        <div className="mb-5">
          <p className="witcher-stat-label mb-2">{fr ? 'Défis reçus' : 'Challenges received'}</p>
          <ul className="space-y-2">
            {defisRecus.map((p) => (
              <li key={p.id} className="px-4 py-3 rounded-card border border-brass/35 bg-brass/[0.06]">
                <p className="font-display text-sm text-ivory mb-1">
                  {nomAdverse(p)} {fr ? 'vous défie' : 'challenges you'}
                </p>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-ivory-soft/70 mb-3">
                  {REGLES.find((r) => r.id === p.regleId)?.[fr ? 'nomFR' : 'nomEN'] ?? p.regleId}
                  {' · '}
                  {p.camps.attacker === user.uid
                    ? (fr ? 'vous menez les assaillants' : 'you lead the raiders')
                    : (fr ? 'vous défendez le roi' : 'you defend the king')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={lienPartie(p.id)}
                    onClick={() => { void repondreAuDefi(p.id, true, p.delaiMs); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-brass text-midnight-deep font-sans text-[10px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors"
                  >
                    <Check size={12} /> {fr ? 'Accepter et jouer' : 'Accept and play'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { void repondreAuDefi(p.id, false); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
                  >
                    <X size={12} /> {fr ? 'Décliner' : 'Decline'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parties en cours et défis envoyés */}
      {(enCours.length > 0 || defisEnvoyes.length > 0) && (
        <div className="mb-2">
          <p className="witcher-stat-label mb-2">{fr ? 'Vos parties' : 'Your games'}</p>
          <ul className="space-y-2">
            {enCours.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-brass/20 bg-black/25">
                <span className="min-w-0">
                  <span className="block font-display text-sm text-ivory truncate">{fr ? 'Contre' : 'Against'} {nomAdverse(p)}</span>
                  <span className="block font-sans text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 mt-1">
                    {p.camps[p.tour] === user.uid
                      ? (fr ? 'À vous de jouer' : 'Your move')
                      : (fr ? 'En attente de l’autre' : 'Waiting for them')}
                  </span>
                </span>
                <Link
                  to={lienPartie(p.id)}
                  className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-midnight-deep transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
                >
                  {fr ? 'Reprendre' : 'Resume'} <ArrowUpRight size={12} />
                </Link>
              </li>
            ))}
            {defisEnvoyes.map((p) => (
              <li key={p.id} className="px-4 py-3 rounded-card border border-brass/15 bg-black/20 font-editorial italic text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>
                {fr ? 'Défi envoyé à' : 'Challenge sent to'} {nomAdverse(p)} · {fr ? 'en attente de sa réponse' : 'waiting for their answer'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dernières parties finies */}
      {finies.length > 0 && (
        <div>
          <p className="witcher-stat-label mb-2">{fr ? 'Dernières parties' : 'Last games'}</p>
          <ul className="space-y-1.5">
            {finies.map((p) => {
              const monCamp: CampTafl | null =
                p.camps.attacker === user.uid ? 'attacker'
                : p.camps.defender === user.uid ? 'defender' : null;
              const gagne = monCamp && p.gagnant === monCamp;
              return (
                <li key={p.id} className="font-editorial text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>
                  {gagne ? (fr ? 'Victoire' : 'Win') : (fr ? 'Défaite' : 'Loss')} · {nomAdverse(p)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default DefisTafl;
