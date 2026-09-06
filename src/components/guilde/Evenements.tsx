import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CalendarPlus, Loader2, MapPin, Pencil, Plus, Trash2, X, Copy, Rss,
} from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { motDeLaForme, type Guilde } from '../../firebase/guildes';
import { guildeRsvpPayant } from '../../firebase/guildeMonnaie';
import {
  suivreEvenements, creerEvenement, modifierEvenement, supprimerEvenement, repondre,
  lienGoogleAgenda, lienWebcal, lienIcsHttps,
  type Evenement, type Reponse,
} from '../../firebase/guildeEvenements';
import type { Lang } from '../../content';

// ─── Les événements ──────────────────────────────────────────────────
// L'agenda du groupe. Les chefs l'écrivent, les membres répondent
// présent, et la place payante se règle en pièces avant d'être
// confirmée (contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026). Chaque
// date part vers Google Agenda d'un clic, et le calendrier entier
// s'abonne une fois pour toutes au bas du panneau.

const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};

const MOIS = {
  FR: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
  EN: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const millis = (t: { toMillis?: () => number } | undefined): number => t?.toMillis?.() ?? 0;

const heure = (ms: number, lang: Lang): string =>
  new Date(ms).toLocaleTimeString(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' });

/** Le format qu'attend <input type="datetime-local">, en heure locale. */
function pourChamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function messageErreur(e: unknown, fr: boolean): string {
  const code = (e as { code?: string })?.code || '';
  if (/(not-found|internal|unavailable)$/.test(code)) {
    return fr
      ? 'Le service de la monnaie n’est pas encore en ligne. Réessayez un peu plus tard.'
      : 'The currency service is not online yet. Try again a little later.';
  }
  if (code.endsWith('failed-precondition') || code.endsWith('resource-exhausted')) {
    return fr ? 'Votre bourse ne contient pas assez de pièces.' : 'Your purse does not hold enough coins.';
  }
  return e instanceof Error ? e.message : String(e);
}

const Evenements: React.FC<{ guilde: Guilde; uid: string | null; estChef: boolean }> = ({
  guilde, uid, estChef,
}) => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const estMembre = Boolean(uid && guilde.membres.includes(uid));

  const [evenements, setEvenements] = useState<Evenement[]>([]);
  useEffect(() => {
    if (!estMembre) return;
    return suivreEvenements(guilde.id, setEvenements);
  }, [guilde.id, estMembre]);

  const [edite, setEdite] = useState<Evenement | 'neuf' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { aVenir, passes } = useMemo(() => {
    const now = Date.now();
    const a: Evenement[] = [];
    const p: Evenement[] = [];
    for (const e of evenements) {
      ((millis(e.fin) || millis(e.debut)) >= now ? a : p).push(e);
    }
    return { aVenir: a, passes: p.reverse() };
  }, [evenements]);

  if (!estMembre) {
    return (
      <section className="glass-light rounded-lg-card p-6 md:p-8 text-center">
        <span aria-hidden className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{ background: 'rgba(var(--sk-gilt-rgb),0.12)', border: '1px solid rgba(var(--sk-gilt-rgb),0.35)', color: 'var(--sk-gilt)' }}>
          <CalendarDays size={20} />
        </span>
        <p className="font-display text-xl text-ivory mb-2">{fr ? 'Les événements' : 'The events'}</p>
        <p className="font-editorial text-base text-ivory-soft leading-relaxed max-w-md mx-auto">
          {fr
            ? `L’agenda se lit entre membres. Entrez dans ${motDeLaForme(guilde.forme, lang).toLowerCase()} pour savoir quand tout le monde se réunit.`
            : 'The calendar is read among members. Join the group to know when everyone gathers.'}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {estChef && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setEdite(edite === 'neuf' ? null : 'neuf'); setErreur(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
          >
            {edite === 'neuf' ? <X size={13} /> : <Plus size={13} />}
            {edite === 'neuf' ? (fr ? 'Fermer' : 'Close') : (fr ? 'Annoncer une date' : 'Announce a date')}
          </button>
        </div>
      )}

      {estChef && edite && (
        <Formulaire
          guilde={guilde} uid={uid!} lang={lang}
          evenement={edite === 'neuf' ? null : edite}
          onFini={() => setEdite(null)}
        />
      )}

      {erreur && <p role="alert" className="font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}

      {aVenir.length === 0 ? (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="witcher-stat-label inline-flex items-center gap-2 mb-3">
            <CalendarDays size={12} /> {fr ? 'À venir' : 'Coming up'}
          </p>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr
              ? 'Aucune date au calendrier. Les chefs du groupe en posent une dès qu’ils savent quand vous vous retrouvez.'
              : 'No date on the calendar. The leaders will post one as soon as they know when you meet.'}
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {aVenir.map((ev) => (
            <Carte
              key={ev.id} ev={ev} guilde={guilde} uid={uid!} estChef={estChef} lang={lang}
              onModifier={() => { setEdite(ev); setErreur(null); }}
              onErreur={setErreur}
            />
          ))}
        </div>
      )}

      {passes.length > 0 && (
        <details className="glass-light rounded-lg-card p-5 md:p-6">
          <summary className="witcher-stat-label cursor-pointer select-none">
            {fr ? `Ce qui est passé (${passes.length})` : `What has passed (${passes.length})`}
          </summary>
          <div className="space-y-3 mt-4">
            {passes.map((ev) => (
              <Carte
                key={ev.id} ev={ev} guilde={guilde} uid={uid!} estChef={estChef} lang={lang}
                passe onModifier={() => { setEdite(ev); setErreur(null); }} onErreur={setErreur}
              />
            ))}
          </div>
        </details>
      )}

      {guilde.codeInvitation && <Abonnement guilde={guilde} lang={lang} />}
    </div>
  );
};

// ─── Une date ────────────────────────────────────────────────────────
const Carte: React.FC<{
  ev: Evenement; guilde: Guilde; uid: string; estChef: boolean; lang: Lang;
  passe?: boolean;
  onModifier: () => void;
  onErreur: (m: string | null) => void;
}> = ({ ev, guilde, uid, estChef, lang, passe, onModifier, onErreur }) => {
  const fr = lang === 'FR';
  const [busy, setBusy] = useState(false);
  const debut = millis(ev.debut) || Date.now();
  const d = new Date(debut);
  const sigle = guilde.monnaie?.sigle || 'PCE';
  const prix = ev.prixPieces || 0;
  const mien = ev.rsvp?.[uid];

  const compte = Object.values(ev.rsvp || {});
  const oui = compte.filter((r) => r === 'oui').length;
  const peutEtre = compte.filter((r) => r === 'peut-etre').length;

  const dire = async (r: Reponse) => {
    setBusy(true); onErreur(null);
    try {
      if (r === 'oui' && prix > 0) await guildeRsvpPayant({ guildeId: guilde.id, evId: ev.id });
      else await repondre(guilde.id, ev.id, uid, r);
    } catch (e) { onErreur(messageErreur(e, fr)); }
    finally { setBusy(false); }
  };

  const retirer = async () => {
    if (!confirm(fr ? 'Effacer cette date ?' : 'Delete this date?')) return;
    try { await supprimerEvenement(guilde.id, ev.id); }
    catch (e) { onErreur(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <section className="glass-light rounded-lg-card p-4 md:p-5" style={{ opacity: passe ? 0.65 : 1 }}>
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="shrink-0 w-14 rounded-card text-center py-2"
          style={{ background: 'rgba(var(--sk-gilt-rgb),0.12)', border: '1px solid rgba(var(--sk-gilt-rgb),0.35)' }}
        >
          <span className="block font-display text-2xl text-ivory leading-none tabular-nums">{d.getDate()}</span>
          <span className="block font-sans uppercase tracking-[0.18em] text-[9px] mt-1" style={{ color: 'var(--sk-gilt)' }}>
            {MOIS[fr ? 'FR' : 'EN'][d.getMonth()]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-lg md:text-xl text-ivory leading-snug line-clamp-2">{ev.titre}</p>
          <p className="font-sans text-[11px] mt-1.5 flex items-center gap-3 flex-wrap"
             style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
            <span className="tabular-nums">{heure(debut, lang)}</span>
            {ev.lieu && <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={11} /> <span className="truncate">{ev.lieu}</span></span>}
            <span>{fr ? `${oui} présents` : `${oui} coming`}{peutEtre > 0 && (fr ? ` · ${peutEtre} peut-être` : ` · ${peutEtre} maybe`)}</span>
          </p>
          {ev.description && (
            <p className="font-editorial text-sm text-ivory-soft leading-relaxed mt-2">{ev.description}</p>
          )}
          {prix > 0 && (
            <p className="font-sans text-[11px] mt-2" style={{ color: 'var(--sk-gilt)' }}>
              {fr ? `La place coûte ${prix} ${sigle} et va au trésor commun.` : `A seat costs ${prix} ${sigle} and goes to the common treasury.`}
            </p>
          )}
        </div>

        {estChef && (
          <div className="shrink-0 flex items-center gap-1">
            <button type="button" onClick={onModifier} aria-label={fr ? 'Modifier' : 'Edit'}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-brass hover:bg-brass/10 transition">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={retirer} aria-label={fr ? 'Effacer' : 'Delete'}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {!passe && (
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          {(['oui', 'peut-etre', 'non'] as Reponse[]).map((r) => {
            const actif = mien === r;
            const paie = r === 'oui' && prix > 0 && mien !== 'oui';
            return (
              <button
                key={r} type="button" disabled={busy}
                aria-pressed={actif}
                onClick={() => { void dire(r); }}
                className="px-4 py-2 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors disabled:opacity-50"
                style={{
                  border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`,
                  background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent',
                  color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)',
                }}
              >
                {busy && r === 'oui' && <Loader2 size={11} className="animate-spin inline mr-1.5" />}
                {paie
                  ? (fr ? `Payer ${prix} ${sigle} et confirmer` : `Pay ${prix} ${sigle} and confirm`)
                  : r === 'oui' ? (fr ? 'J’y serai' : 'I am in')
                  : r === 'peut-etre' ? (fr ? 'Peut-être' : 'Maybe')
                  : (fr ? 'Je passe mon tour' : 'I pass')}
              </button>
            );
          })}
          <a
            href={lienGoogleAgenda(ev)} target="_blank" rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 font-sans text-[10px] uppercase tracking-wider text-ivory-soft hover:text-brass transition rounded-card"
            style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}
          >
            <CalendarPlus size={12} /> {fr ? 'Google Agenda' : 'Google Calendar'}
          </a>
        </div>
      )}
    </section>
  );
};

// ─── Le formulaire du chef ───────────────────────────────────────────
const Formulaire: React.FC<{
  guilde: Guilde; uid: string; lang: Lang;
  evenement: Evenement | null;
  onFini: () => void;
}> = ({ guilde, uid, lang, evenement, onFini }) => {
  const fr = lang === 'FR';
  const sigle = guilde.monnaie?.sigle || 'PCE';
  const depart = millis(evenement?.debut) || Date.now() + 86400000;

  const [titre, setTitre] = useState(evenement?.titre || '');
  const [description, setDescription] = useState(evenement?.description || '');
  const [lieu, setLieu] = useState(evenement?.lieu || '');
  const [debut, setDebut] = useState(pourChamp(depart));
  const [fin, setFin] = useState(pourChamp(millis(evenement?.fin) || depart + 7200000));
  const [prixPieces, setPrixPieces] = useState(String(evenement?.prixPieces || ''));
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const dDebut = new Date(debut);
  const dFin = new Date(fin);
  const bloque = titre.trim().length < 2 || Number.isNaN(dDebut.getTime()) || Number.isNaN(dFin.getTime()) || dFin < dDebut;

  const enregistrer = async () => {
    setBusy(true); setErreur(null);
    try {
      const brouillon = {
        titre, description, lieu, debut: dDebut, fin: dFin,
        prixPieces: Math.max(0, Math.floor(Number(prixPieces) || 0)),
      };
      if (evenement) await modifierEvenement(guilde.id, evenement.id, brouillon);
      else await creerEvenement(guilde.id, uid, brouillon);
      onFini();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
      <p className="witcher-stat-label mb-4">
        {evenement ? (fr ? 'Modifier la date' : 'Edit the date') : (fr ? 'Une nouvelle date' : 'A new date')}
      </p>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Le titre' : 'The title'}</span>
        <input value={titre} onChange={(e) => setTitre(e.target.value.slice(0, 120))}
               placeholder={fr ? 'La veillée du solstice' : 'The solstice gathering'}
               className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40" style={champ} />
      </label>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Le lieu' : 'The place'}</span>
        <input value={lieu} onChange={(e) => setLieu(e.target.value.slice(0, 160))}
               placeholder={fr ? '4 rue du Bosquet, Montpellier' : '4 rue du Bosquet, Montpellier'}
               className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40" style={champ} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Début' : 'Start'}</span>
          <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)}
                 className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ} />
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Fin' : 'End'}</span>
          <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)}
                 className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ} />
        </label>
      </div>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">
          {fr ? `Le prix de la place, en ${sigle}` : `The price of a seat, in ${sigle}`}
        </span>
        <input type="number" min={0} inputMode="numeric" value={prixPieces}
               onChange={(e) => setPrixPieces(e.target.value)} placeholder="0"
               className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory tabular-nums placeholder:text-ivory-soft/40" style={champ} />
        <span className="block font-sans text-[11px] mt-1.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
          {fr ? 'Laissez à zéro pour une soirée gratuite.' : 'Leave at zero for a free evening.'}
        </span>
      </label>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Ce qu’il faut savoir' : 'What to know'}</span>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory resize-y" style={champ} />
      </label>

      {erreur && <p role="alert" className="mb-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onFini}
                className="px-4 py-2 font-sans uppercase tracking-wider text-xs text-ivory-soft hover:text-brass transition">
          {fr ? 'Annuler' : 'Cancel'}
        </button>
        <button type="button" onClick={enregistrer} disabled={busy || bloque}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={13} />}
          {fr ? 'Poser la date' : 'Post the date'}
        </button>
      </div>
    </section>
  );
};

// ─── S'abonner au calendrier ─────────────────────────────────────────
const Abonnement: React.FC<{ guilde: Guilde; lang: Lang }> = ({ guilde, lang }) => {
  const fr = lang === 'FR';
  const code = guilde.codeInvitation!;
  const webcal = lienWebcal(guilde.id, code);
  const https = lienIcsHttps(guilde.id, code);
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(https);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2200);
    } catch { /* le lien reste lisible juste au-dessus */ }
  };

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
      <p className="witcher-stat-label inline-flex items-center gap-2 mb-1.5">
        <Rss size={12} /> {fr ? 'S’abonner au calendrier' : 'Subscribe to the calendar'}
      </p>
      <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
        {fr
          ? 'Une fois abonné, chaque date posée par un chef arrive toute seule dans votre agenda.'
          : 'Once subscribed, every date a leader posts lands in your calendar on its own.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a href={webcal}
           className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans text-[11px] uppercase tracking-wider font-semibold hover:bg-brass-soft transition rounded-card">
          <CalendarPlus size={12} /> {fr ? 'Ajouter à mon agenda' : 'Add to my calendar'}
        </a>
        <button type="button" onClick={copier}
                className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-[11px] uppercase tracking-wider transition rounded-card">
          <Copy size={12} /> {copie ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le lien' : 'Copy the link')}
        </button>
        <a href={https} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 px-4 py-2 font-sans text-[11px] uppercase tracking-wider text-ivory-soft hover:text-brass transition rounded-card"
           style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
          {fr ? 'Le fichier .ics' : 'The .ics file'}
        </a>
      </div>
    </section>
  );
};

export default Evenements;
