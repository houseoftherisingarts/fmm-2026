import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, Copy, RefreshCw, Link2, Loader2, UserPlus, UserMinus, Crown, ShieldCheck,
} from 'lucide-react';
import { addLocale } from '../../lib/locale';
import {
  accepterMembre, refuserMembre, retirerMembre, nommerChef, retirerChef, motDuChef, type Guilde,
} from '../../firebase/guildes';
import { guildeNouveauCode, guildeRattacherFondateur } from '../../firebase/guildeMonnaie';
import type { Membre } from '../../firebase/ordre';
import type { Lang } from '../../content';

// ─── Le monde du groupe ──────────────────────────────────────────────
// L'intendance d'abord, pour les chefs et l'équipe du festival : les
// demandes, la liste des membres avec les gestes de gestion, le code
// d'invitation et les fondateurs à rattacher. Puis le monde tel que
// tout membre le voit : les chefs sous le titre que leur donne la forme
// du groupe, le fondateur avec son étiquette, et les membres en cartes
// de deux à quatre colonnes (addendum du 6 septembre 2026, ordres 5, 6
// et 7).

const HOTE = 'https://festivalmedievaldemontpellier.org';

const ROUILLE = '#E08A6E';

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number; pale?: boolean; taille?: number }> = ({
  nom, url, hue, pale, taille = 36,
}) => (
  <span
    className="rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-ivory/85"
    style={{ width: taille, height: taille, fontSize: taille * 0.4, background: `hsl(${hue ?? 30} 40% 22%)`, opacity: pale ? 0.45 : 1 }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const Ligne: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`flex items-center gap-2.5 px-3 py-2 rounded-card ${className}`}
    style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}
  >
    {children}
  </div>
);

const Etiquette: React.FC<{ children: React.ReactNode; or?: boolean }> = ({ children, or }) => (
  <span
    className="inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
    style={{
      color: or ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.6)',
      border: `1px solid ${or ? 'rgba(var(--sk-gilt-rgb),0.45)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`,
      background: or ? 'rgba(var(--sk-gilt-rgb),0.1)' : 'transparent',
    }}
  >
    {children}
  </span>
);

const Membres: React.FC<{
  guilde: Guilde;
  uid: string;
  /** Un chef du groupe, dans admins[]. */
  estChef: boolean;
  /** Un chef, ou l'équipe du festival (Intendance). */
  peutGerer: boolean;
  lang: Lang;
  fiches: Record<string, Membre | null>;
}> = ({ guilde, uid, estChef, peutGerer, lang, fiches }) => {
  const fr = lang === 'FR';
  const titreChef = motDuChef(guilde.forme, lang);

  const chefs = guilde.membres.filter((m) => guilde.admins.includes(m));
  const autres = guilde.membres.filter((m) => !guilde.admins.includes(m));
  const attendus = (guilde.membresFondateurs || []).filter((f) => !f.uid);

  const nomDe = (u: string) => fiches[u]?.nom || (fr ? 'Un inconnu' : 'A stranger');

  // Une carte par personne, qui mène à son profil.
  const Carte: React.FC<{ m: string; chef?: boolean }> = ({ m, chef }) => (
    <Link
      to={`${addLocale('/profil', lang)}/${m}`}
      className="flex flex-col items-center text-center gap-3 px-4 py-5 rounded-lg-card hover:bg-brass/5 transition"
      style={{ border: `1px solid ${chef ? 'rgba(var(--sk-gilt-rgb),0.32)' : 'rgba(var(--sk-parchment-rgb),0.1)'}`, background: 'rgba(var(--sk-deep-rgb),0.35)' }}
    >
      <Medaillon nom={nomDe(m)} url={fiches[m]?.avatarUrl} hue={fiches[m]?.avatarHue} taille={64} />
      <span className="min-w-0 w-full">
        <span className="block font-display text-base text-ivory truncate">{nomDe(m)}</span>
        {fiches[m]?.ville && (
          <span className="block font-sans text-[11px] truncate mt-0.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
            {fiches[m]?.ville}
          </span>
        )}
      </span>
      {(chef || m === guilde.creePar) && (
        <span className="flex flex-wrap justify-center gap-1.5">
          {chef && <Etiquette or><Crown size={10} /> {titreChef}</Etiquette>}
          {m === guilde.creePar && <Etiquette>{fr ? 'Fondateur' : 'Founder'}</Etiquette>}
        </span>
      )}
    </Link>
  );

  return (
    <div className="space-y-5">

      {peutGerer && (
        <Intendance guilde={guilde} uid={uid} estChef={estChef} lang={lang} fiches={fiches} />
      )}

      {/* ── Les chefs ───────────────────────────────────────────── */}
      {chefs.length > 0 && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label mb-4">
            {chefs.length > 1 ? `${titreChef}s` : titreChef}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {chefs.map((m) => <Carte key={m} m={m} chef />)}
          </div>
        </section>
      )}

      {/* ── Les membres ─────────────────────────────────────────── */}
      <section className="glass-light rounded-lg-card p-5 md:p-6">
        <p className="witcher-stat-label mb-4">
          {fr ? 'Membres' : 'Members'} ({guilde.nbMembres})
        </p>
        {autres.length === 0 ? (
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr ? 'Personne d’autre pour l’instant. Le code d’invitation ouvre la porte.'
                : 'Nobody else yet. The invitation code opens the door.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {autres.map((m) => <Carte key={m} m={m} />)}
          </div>
        )}
      </section>

      {/* ── Les fondateurs attendus, tels que tout membre les voit ── */}
      {attendus.length > 0 && !peutGerer && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label mb-1.5">{fr ? 'Fondateurs attendus' : 'Expected founders'}</p>
          <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
            {fr
              ? 'Ces noms ont été annoncés à la fondation. Leur place les attend le jour où ils ouvrent un compte.'
              : 'These names were announced at the founding. Their seat waits until they open an account.'}
          </p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {attendus.map((f) => (
              <FondateurLigne key={f.nom} guilde={guilde} nom={f.nom} chef={f.chef} peutGerer={false} lang={lang} fiches={fiches} />
            ))}
          </div>
        </section>
      )}

      {/* ── Le code d'invitation, pour un membre sans gestion ─────── */}
      {guilde.codeInvitation && guilde.membres.includes(uid) && !peutGerer && (
        <CodeInvitation guilde={guilde} peutGerer={false} lang={lang} />
      )}
    </div>
  );
};

// ─── L'intendance ────────────────────────────────────────────────────
// Tout ce qu'un chef fait sur le monde du groupe, en tête du panneau.
// L'équipe du festival y voit la même chose, sous l'étiquette
// « Intendance » (addendum, ordre 5).
const Intendance: React.FC<{
  guilde: Guilde; uid: string; estChef: boolean; lang: Lang;
  fiches: Record<string, Membre | null>;
}> = ({ guilde, uid, estChef, lang, fiches }) => {
  const fr = lang === 'FR';
  const titreChef = motDuChef(guilde.forme, lang);
  const attendus = (guilde.membresFondateurs || []).filter((f) => !f.uid);
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6" style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.28)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <p className="witcher-stat-label inline-flex items-center gap-2">
          <ShieldCheck size={12} /> {fr ? 'Intendance' : 'Stewardship'}
        </p>
        <Etiquette or>
          {estChef ? <><Crown size={10} /> {titreChef}</> : (fr ? 'Équipe du festival' : 'Festival team')}
        </Etiquette>
      </div>

      {erreur && <p role="alert" className="mb-4 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}

      <div className="grid gap-6 lg:grid-cols-12">

        {/* ── Gauche : les demandes, puis la liste des membres ── */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <p className="witcher-stat-label mb-3">
              {fr ? 'Demandes en attente' : 'Pending requests'} ({guilde.demandes.length})
            </p>
            {guilde.demandes.length === 0 ? (
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                {fr ? 'Personne ne frappe à la porte pour le moment.' : 'Nobody is knocking at the door right now.'}
              </p>
            ) : (
              <div className="space-y-2">
                {guilde.demandes.map((d) => (
                  <DemandeLigne
                    key={d} uid={d} fiche={fiches[d]} lang={lang}
                    onAccepter={() => accepterMembre(guilde.id, d)}
                    onRefuser={() => refuserMembre(guilde.id, d)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="witcher-stat-label mb-3">
              {fr ? 'Les membres' : 'The members'} ({guilde.membres.length})
            </p>
            <div className="space-y-2">
              {guilde.membres.map((m) => (
                <LigneMembre key={m} guilde={guilde} m={m} moi={uid} lang={lang} fiches={fiches} onErreur={setErreur} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Droite : le code d'invitation et les fondateurs ── */}
        <div className="lg:col-span-5 space-y-6">
          {guilde.codeInvitation && <CodeInvitation guilde={guilde} peutGerer lang={lang} nu />}

          {attendus.length > 0 && (
            <div>
              <p className="witcher-stat-label mb-1.5">{fr ? 'Fondateurs à rattacher' : 'Founders to attach'}</p>
              <p className="font-sans text-[11px] mb-3" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                {fr
                  ? 'Ces noms ont été annoncés à la fondation. Quand la personne a son compte, rattachez-le ici.'
                  : 'These names were announced at the founding. Once the person has an account, attach it here.'}
              </p>
              <div className="space-y-2">
                {attendus.map((f) => (
                  <FondateurLigne key={f.nom} guilde={guilde} nom={f.nom} chef={f.chef} peutGerer lang={lang} fiches={fiches} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Un membre dans l'intendance : son titre, son renvoi ─────────────
// Retirer demande deux clics : le premier ouvre la question, le second
// tranche. Jamais soi-même, jamais le fondateur.
const LigneMembre: React.FC<{
  guilde: Guilde; m: string; moi: string; lang: Lang;
  fiches: Record<string, Membre | null>;
  onErreur: (m: string | null) => void;
}> = ({ guilde, m, moi, lang, fiches, onErreur }) => {
  const fr = lang === 'FR';
  const titreChef = motDuChef(guilde.forme, lang);
  const nom = fiches[m]?.nom || (fr ? 'Un inconnu' : 'A stranger');
  const chef = guilde.admins.includes(m);
  const fondateur = m === guilde.creePar;
  const cestMoi = m === moi;
  const [busy, setBusy] = useState(false);
  const [confirme, setConfirme] = useState(false);

  const agir = async (fn: () => Promise<void>) => {
    setBusy(true); onErreur(null);
    try { await fn(); }
    catch (e) { onErreur(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); setConfirme(false); }
  };

  const bouton = 'inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider transition rounded-card disabled:opacity-40';

  return (
    <Ligne className="flex-wrap">
      <Link to={`${addLocale('/profil', lang)}/${m}`} className="flex items-center gap-2.5 min-w-0 flex-1 hover:text-brass transition-colors">
        <Medaillon nom={nom} url={fiches[m]?.avatarUrl} hue={fiches[m]?.avatarHue} taille={32} />
        <span className="min-w-0">
          <span className="block font-sans text-sm text-ivory truncate">{nom}{cestMoi ? (fr ? ' (vous)' : ' (you)') : ''}</span>
          <span className="flex flex-wrap gap-1 mt-0.5">
            {chef && <Etiquette or>{titreChef}</Etiquette>}
            {fondateur && <Etiquette>{fr ? 'Fondateur' : 'Founder'}</Etiquette>}
          </span>
        </span>
      </Link>

      <span className="shrink-0 flex items-center gap-1.5">
        {confirme ? (
          <>
            <span className="font-sans text-[11px]" style={{ color: ROUILLE }}>{fr ? 'Renvoyer ?' : 'Remove?'}</span>
            <button type="button" disabled={busy} onClick={() => agir(() => retirerMembre(guilde, m, moi))}
                    className={`${bouton} bg-[#E08A6E] text-midnight-deep hover:opacity-90`}>
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {fr ? 'Oui' : 'Yes'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirme(false)}
                    className={`${bouton} text-ivory-soft hover:text-ivory`} style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
              {fr ? 'Non' : 'No'}
            </button>
          </>
        ) : (
          <>
            {chef ? (
              !cestMoi && (
                <button type="button" disabled={busy} onClick={() => agir(() => retirerChef(guilde.id, m))}
                        className={`${bouton} text-ivory-soft hover:text-brass`} style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
                  {fr ? 'Retirer le titre' : 'Remove the title'}
                </button>
              )
            ) : (
              <button type="button" disabled={busy} onClick={() => agir(() => nommerChef(guilde.id, m))}
                      className={`${bouton} border border-brass/40 text-brass hover:bg-brass/10`}>
                <Crown size={11} /> {fr ? `Nommer ${titreChef}` : `Name ${titreChef}`}
              </button>
            )}
            {!cestMoi && !fondateur && (
              <button type="button" disabled={busy} onClick={() => setConfirme(true)} aria-label={fr ? 'Retirer du groupe' : 'Remove from the group'}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition disabled:opacity-40">
                <UserMinus size={14} />
              </button>
            )}
          </>
        )}
      </span>
    </Ligne>
  );
};

// ─── Un fondateur annoncé, et le geste qui lui donne son compte ──────
const FondateurLigne: React.FC<{
  guilde: Guilde; nom: string; chef: boolean; peutGerer: boolean;
  lang: Lang; fiches: Record<string, Membre | null>;
}> = ({ guilde, nom, chef, peutGerer, lang, fiches }) => {
  const fr = lang === 'FR';
  const [choix, setChoix] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const libres = guilde.membres.filter(
    (m) => !(guilde.membresFondateurs || []).some((f) => f.uid === m),
  );

  const rattacher = async () => {
    if (!choix) return;
    setBusy(true); setErreur(null);
    try { await guildeRattacherFondateur({ guildeId: guilde.id, nom, uid: choix }); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Ligne className="flex-wrap">
      <Medaillon nom={nom} pale />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm truncate" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>{nom}</span>
        <span className="block font-sans text-[10px] uppercase tracking-widest" style={{ color: 'rgba(var(--sk-parchment-rgb),0.38)' }}>
          {fr ? 'En attente' : 'Awaiting'}{chef ? ` · ${motDuChef(guilde.forme, lang)}` : ''}
        </span>
      </span>
      {peutGerer && libres.length > 0 && (
        <span className="flex items-center gap-1.5 shrink-0">
          <select
            value={choix} onChange={(e) => setChoix(e.target.value)}
            aria-label={fr ? `Rattacher un compte à ${nom}` : `Attach an account to ${nom}`}
            className="px-2.5 py-1.5 rounded-card font-sans text-xs text-ivory max-w-[160px]"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}
          >
            <option value="">{fr ? 'Rattacher à…' : 'Attach to…'}</option>
            {libres.map((m) => (
              <option key={m} value={m}>{fiches[m]?.nom || (fr ? 'Un inconnu' : 'A stranger')}</option>
            ))}
          </select>
          <button
            type="button" onClick={rattacher} disabled={busy || !choix}
            aria-label={fr ? 'Rattacher' : 'Attach'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/70 hover:text-brass hover:bg-brass/10 transition disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          </button>
        </span>
      )}
      {erreur && <p role="alert" className="w-full font-sans text-xs mt-1" style={{ color: ROUILLE }}>{erreur}</p>}
    </Ligne>
  );
};

// ─── Le code d'invitation ────────────────────────────────────────────
// `nu` : sans sa carte, quand il vit déjà dans celle de l'intendance.
const CodeInvitation: React.FC<{ guilde: Guilde; peutGerer: boolean; lang: Lang; nu?: boolean }> = ({
  guilde, peutGerer, lang, nu,
}) => {
  const fr = lang === 'FR';
  const lien = `${HOTE}/${guilde.slug || `guildes/${guilde.id}`}?code=${guilde.codeInvitation}`;
  const [copie, setCopie] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2200);
    } catch {
      setErreur(fr ? 'Le presse-papiers a refusé. Copiez le lien à la main.' : 'The clipboard refused. Copy the link by hand.');
    }
  };

  const regenerer = async () => {
    setBusy(true); setErreur(null);
    try { await guildeNouveauCode({ guildeId: guilde.id }); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const corps = (
    <>
      <p className="witcher-stat-label inline-flex items-center gap-2 mb-1.5">
        <Link2 size={12} /> {fr ? 'Le lien d’invitation' : 'The invitation link'}
      </p>
      <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
        {fr
          ? 'Qui ouvre ce lien entre sans passer par la file d’attente.'
          : 'Anyone who opens this link walks in without queuing.'}
      </p>

      <p
        className="font-display text-2xl md:text-3xl tracking-[0.28em] mb-4 break-all"
        style={{ color: 'var(--sk-gilt)' }}
      >
        {guilde.codeInvitation}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button" onClick={copier}
          className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-[11px] uppercase tracking-wider transition rounded-card"
        >
          <Copy size={12} /> {copie ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le lien' : 'Copy the link')}
        </button>
        {peutGerer && (
          <button
            type="button" onClick={regenerer} disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 font-sans text-[11px] uppercase tracking-wider text-ivory-soft hover:text-brass transition rounded-card disabled:opacity-50"
            style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {fr ? 'Nouveau code' : 'New code'}
          </button>
        )}
      </div>
      {erreur && <p role="alert" className="mt-3 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}
    </>
  );

  if (nu) return <div>{corps}</div>;
  return <section className="glass-light rounded-lg-card p-5 md:p-6">{corps}</section>;
};

// ─── Une demande d'entrée ────────────────────────────────────────────
const DemandeLigne: React.FC<{
  uid: string; fiche: Membre | null | undefined; lang: Lang;
  onAccepter: () => void; onRefuser: () => void;
}> = ({ uid, fiche, lang, onAccepter, onRefuser }) => {
  const fr = lang === 'FR';
  const nom = fiche?.nom || (fr ? 'Un inconnu' : 'A stranger');
  const [busy, setBusy] = useState(false);
  const agir = async (fn: () => void) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <Ligne>
      <Link to={`${addLocale('/profil', lang)}/${uid}`} className="flex items-center gap-2.5 min-w-0 flex-1">
        <Medaillon nom={nom} url={fiche?.avatarUrl} hue={fiche?.avatarHue} taille={32} />
        <span className="font-sans text-sm text-ivory truncate">{nom}</span>
      </Link>
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          type="button" disabled={busy} onClick={() => agir(onAccepter)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider transition rounded-card border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
        >
          <Check size={12} /> {fr ? 'Accepter' : 'Accept'}
        </button>
        <button
          type="button" disabled={busy} onClick={() => agir(onRefuser)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider transition rounded-card text-ivory-soft hover:text-[#E08A6E] disabled:opacity-50"
          style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}
        >
          <X size={12} /> {fr ? 'Refuser' : 'Decline'}
        </button>
      </div>
    </Ligne>
  );
};

export default Membres;
