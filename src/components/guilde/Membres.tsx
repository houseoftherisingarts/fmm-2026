import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Copy, RefreshCw, Link2, Loader2, UserPlus } from 'lucide-react';
import { addLocale } from '../../lib/locale';
import { accepterMembre, refuserMembre, motDuChef, type Guilde } from '../../firebase/guildes';
import { guildeNouveauCode, guildeRattacherFondateur } from '../../firebase/guildeMonnaie';
import type { Membre } from '../../firebase/ordre';
import type { Lang } from '../../content';

// ─── Le monde du groupe ──────────────────────────────────────────────
// Les chefs en tête, sous le titre que leur donne la forme du groupe,
// puis les membres, puis les fondateurs annoncés qui n'ont pas encore
// de compte. Le code d'invitation et la file des demandes ferment le
// panneau (contrat CLAN-MONNAIE-CONTRAT.md).

const HOTE = 'https://festivalmedievaldemontpellier.org';

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number; pale?: boolean }> = ({
  nom, url, hue, pale,
}) => (
  <span
    className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-sm text-ivory/85"
    style={{ background: `hsl(${hue ?? 30} 40% 22%)`, opacity: pale ? 0.45 : 1 }}
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

const Membres: React.FC<{
  guilde: Guilde;
  uid: string;
  estChef: boolean;
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

  return (
    <div className="space-y-5">

      {/* ── Les chefs ───────────────────────────────────────────── */}
      {chefs.length > 0 && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label mb-4">
            {chefs.length > 1 ? `${titreChef}s` : titreChef}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {chefs.map((m) => (
              <Link
                key={m} to={`${addLocale('/profil', lang)}/${m}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-card hover:bg-brass/5 transition"
                style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.28)' }}
              >
                <Medaillon nom={nomDe(m)} url={fiches[m]?.avatarUrl} hue={fiches[m]?.avatarHue} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm text-ivory truncate">{nomDe(m)}</span>
                  <span className="block font-sans text-[10px] uppercase tracking-widest" style={{ color: 'var(--sk-gilt)' }}>
                    {titreChef}
                  </span>
                </span>
              </Link>
            ))}
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
            {fr ? 'Personne d’autre pour l’instant. Le code d’invitation plus bas ouvre la porte.'
                : 'Nobody else yet. The invitation code below opens the door.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {autres.map((m) => (
              <Link
                key={m} to={`${addLocale('/profil', lang)}/${m}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-card hover:bg-brass/5 transition"
                style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}
              >
                <Medaillon nom={nomDe(m)} url={fiches[m]?.avatarUrl} hue={fiches[m]?.avatarHue} />
                <span className="font-sans text-sm text-ivory truncate">{nomDe(m)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Les fondateurs attendus ─────────────────────────────── */}
      {attendus.length > 0 && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label mb-1.5">{fr ? 'Fondateurs attendus' : 'Expected founders'}</p>
          <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
            {fr
              ? 'Ces noms ont été annoncés à la fondation. Leur place les attend le jour où ils ouvrent un compte.'
              : 'These names were announced at the founding. Their seat waits until they open an account.'}
          </p>
          <div className="space-y-2">
            {attendus.map((f) => (
              <FondateurLigne
                key={f.nom} guilde={guilde} nom={f.nom} chef={f.chef}
                estChef={estChef} lang={lang} fiches={fiches}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Le code d'invitation ────────────────────────────────── */}
      {guilde.codeInvitation && guilde.membres.includes(uid) && (
        <CodeInvitation guilde={guilde} estChef={estChef} lang={lang} />
      )}

      {/* ── Les demandes en attente ─────────────────────────────── */}
      {peutGerer && guilde.demandes.length > 0 && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label mb-3">
            {fr ? 'Demandes en attente' : 'Pending requests'} ({guilde.demandes.length})
          </p>
          <div className="space-y-2">
            {guilde.demandes.map((d) => (
              <DemandeLigne
                key={d} uid={d} fiche={fiches[d]} lang={lang}
                onAccepter={() => accepterMembre(guilde.id, d)}
                onRefuser={() => refuserMembre(guilde.id, d)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ─── Un fondateur annoncé, et le geste qui lui donne son compte ──────
const FondateurLigne: React.FC<{
  guilde: Guilde; nom: string; chef: boolean; estChef: boolean;
  lang: Lang; fiches: Record<string, Membre | null>;
}> = ({ guilde, nom, chef, estChef, lang, fiches }) => {
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
      {estChef && libres.length > 0 && (
        <span className="flex items-center gap-1.5 shrink-0">
          <select
            value={choix} onChange={(e) => setChoix(e.target.value)}
            aria-label={fr ? `Rattacher un compte à ${nom}` : `Attach an account to ${nom}`}
            className="px-2.5 py-1.5 rounded-card font-sans text-xs text-ivory"
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
      {erreur && <p role="alert" className="w-full font-sans text-xs mt-1" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </Ligne>
  );
};

// ─── Le code d'invitation ────────────────────────────────────────────
const CodeInvitation: React.FC<{ guilde: Guilde; estChef: boolean; lang: Lang }> = ({
  guilde, estChef, lang,
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

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
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
        {estChef && (
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
      {erreur && <p role="alert" className="mt-3 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </section>
  );
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
        <Medaillon nom={nom} url={fiche?.avatarUrl} hue={fiche?.avatarHue} />
        <span className="font-sans text-sm text-ivory truncate">{nom}</span>
      </Link>
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          type="button" disabled={busy} onClick={() => agir(onAccepter)} aria-label={fr ? 'Accepter' : 'Accept'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/70 hover:text-emerald-400 hover:bg-emerald-400/10 transition disabled:opacity-50"
        >
          <Check size={14} />
        </button>
        <button
          type="button" disabled={busy} onClick={() => agir(onRefuser)} aria-label={fr ? 'Refuser' : 'Decline'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/70 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>
    </Ligne>
  );
};

export default Membres;
