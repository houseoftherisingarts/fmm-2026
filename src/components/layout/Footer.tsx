import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin, Lock, Ticket, Bug } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import { useAuth } from '../../contexts/AuthContext';
import { FOOTER, PILLARS, SITE, SPONSORS } from '../../content';
import { isPillarVisible } from '../../firebase/siteFlags';
import { addSub } from '../../firebase/newsletter';
import { ouvrirBilletterie } from '../../lib/billetterie';
import { isFirebaseReady } from '../../firebase';
import { HexPanel, ChevronButton, HexMark, Eyebrow } from '../marche/atmospherics';
import { BubbleCanvas } from '../marche/effects';
import { useCountdown } from '../../lib/useCountdown';
import BugReportModal from './BugReportModal';

// Local dev previews every pillar; production shows only published ones.
const PREVIEW_ALL = (import.meta.env.VITE_SITE_MODE || 'live') === 'live';

// ─── Infolettre · l'inscription qui ouvre le compte ──────────────────
// Alex, 2026-08-24 : « ce n'est pas seulement une inscription à
// l'infolettre, c'est carrément leur compte ». La personne donne son
// adresse une fois et repart avec les deux : son nom entre au registre
// des envois, puis un lien de connexion sans mot de passe
// (sendSignInLinkToEmail, déjà câblé dans AuthContext) lui ouvre son
// compte au retour. Sa fiche de l'Ordre se pose toute seule à la
// première connexion réussie, dans AuthContext.
//
// Quatre états, et pas un de plus. « attente » montre le formulaire,
// « envoi » le verrouille le temps des deux écritures, « lien » dit
// qu'un courriel est parti, « inscrit » sert aux deux cas où rien ne
// part : la personne était déjà connectée, ou le lien sans mot de
// passe dort dans la console Firebase.
type EtatInfolettre = 'attente' | 'envoi' | 'lien' | 'inscrit';

// La même forme que la règle Firestore attend sur /newsletter : ce qui
// passe ici passe là-bas, et la personne apprend la faute de frappe
// avant l'aller-retour plutôt qu'après.
const COURRIEL_VALIDE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Le code d'erreur de Firebase Auth, qu'il arrive par la propriété
 *  `code` ou noyé dans le message. */
function codeAuth(e: unknown): string {
  const brut = e as { code?: string; message?: string } | null;
  return brut?.code || brut?.message?.match(/auth\/[a-z-]+/)?.[0] || '';
}

// ─── Footer · Caravan Edition ────────────────────────────────────────
// Hex-cut blocks on a velvet-deep base. Top edge fades up from the
// page so the footer emerges instead of cutting in. Three vertical
// blocks: BILLETS (HexPanel CTA card), 4-column nav, newsletter
// (HexPanel form). Sponsor row sits on the velvet stage as a quiet
// strip. Rights line + admin link at the very bottom.
const Footer: React.FC = () => {
  const { lang } = useUI();
  const t = FOOTER[lang];
  const { user, sendMagicLink, openSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<EtatInfolettre>('attente');
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteAPart, setCompteAPart] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const cd = useCountdown(`${SITE.dates.start}T10:00:00-04:00`);

  // Une seule adresse ouvre les deux portes : la lettre du festival et
  // le compte. L'ordre des gestes compte. Le consentement s'écrit en
  // premier, pour qu'une inscription reste inscrite même si le lien de
  // connexion se perd en route; le lien part ensuite.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etat === 'envoi') return;
    const adresse = email.trim().toLowerCase();
    if (!COURRIEL_VALIDE.test(adresse)) { setErreur(t.newsletterErrAddress); return; }
    setErreur(null); setCompteAPart(false); setEtat('envoi');

    // Sans configuration Firebase (développement local), le formulaire
    // reste utilisable : la console reçoit l'adresse et l'écran répond.
    if (!isFirebaseReady) {
      console.info('[FMM] Infolettre hors ligne :', adresse);
      setEtat('inscrit');
      return;
    }

    try {
      await addSub({ email: adresse, lang, source: 'footer' });
    } catch (err) {
      console.warn('[FMM] Infolettre, inscription refusée :', err);
      setErreur(t.newsletterErrNetwork); setEtat('attente');
      return;
    }

    // Déjà connectée, la personne a son compte : rien à lui envoyer.
    if (user) { setEtat('inscrit'); return; }

    try {
      await sendMagicLink(adresse);
      setEtat('lien');
    } catch (err) {
      console.warn('[FMM] Infolettre, lien de connexion :', err);
      const code = codeAuth(err);
      if (code === 'auth/operation-not-allowed' || code === 'auth/unauthorized-continue-uri') {
        // Le lien sans mot de passe dort dans la console Firebase.
        // L'inscription tient quand même, et le compte s'ouvre par la
        // porte habituelle, celle de la fenêtre de connexion.
        setCompteAPart(true); setEtat('inscrit');
      } else if (code === 'auth/invalid-email') {
        setErreur(t.newsletterErrAddress); setEtat('attente');
      } else if (code === 'auth/too-many-requests') {
        setErreur(t.newsletterErrTooMany); setEtat('attente');
      } else {
        setErreur(t.newsletterErrNetwork); setEtat('attente');
      }
    }
  };

  const { flags } = useSiteFlags();
  const quickLinks    = ['activites', 'nourriture', 'musique', 'marche', 'benevole'] as const;
  const resourceLinks = ['hebergement', 'mariages', 'groupes', 'partenaires', 'histoire'] as const;
  // Only surface a pillar link once its page is published (unpublished routes
  // bounce home via PillarGate). Absorbed keys aren't in PILLARS → undefined.
  const findPillar = (k: string) => {
    const p = PILLARS.find((pp) => pp.key === k);
    return p && isPillarVisible(flags, p.key, PREVIEW_ALL) ? p : undefined;
  };

  return (
    <footer className="relative caravan-stage text-[var(--color-bone)]">
      <BubbleCanvas className="opacity-30" count={10} />

      {/* Free-standing forged ornament marking the footer entry: a
          bounded object, not a full-width rail, so it can never read
          as a cropped edge. */}
      <div aria-hidden className="relative z-10 pt-12 md:pt-16">
        <div className="fmm-chapter-mark">
          <span className="fmm-cm-flourish fmm-cm-left" />
          <span className="fmm-cm-pip" />
          <span className="fmm-cm-diamond" />
          <span className="fmm-cm-pip" />
          <span className="fmm-cm-flourish fmm-cm-right" />
        </div>
      </div>

      {/* ── BILLETS · primary CTA card ─────────────────────────── */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-10 md:pb-14">
        <HexPanel size="lg" className="fmm-shimmer">
          <div className="caravan-glass fmm-beam relative overflow-hidden px-6 md:px-10 lg:px-14 py-10 md:py-14 grid md:grid-cols-12 gap-x-10 gap-y-6 items-center">
            <div className="md:col-span-7">
              <Eyebrow tone="amber" className="mb-4 inline-flex items-center gap-3">
                <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
                {lang === 'FR' ? 'Billetterie · Édition 2026' : 'Tickets · 2026 edition'}
                <HexMark className="opacity-80" />
              </Eyebrow>
              <h3
                className="font-display leading-[1.02] tracking-[-0.005em] text-3xl md:text-4xl lg:text-5xl mb-3"
                style={{
                  color: 'var(--color-bone)',
                  fontWeight: 400,
                  textShadow: '0 0 32px rgba(232, 177, 74, 0.22)',
                }}
              >
                {lang === 'FR'
                  ? 'Vos billets pour le festival'
                  : 'Your tickets to the festival'}
              </h3>
              <p className="font-editorial italic text-base md:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--color-bone)', opacity: 0.78 }}>
                {lang === 'FR'
                  ? 'Migrez vers notre portail Zeffy. 3 jours · 13 piliers · 1 festival.'
                  : 'Head to our Zeffy portal. 3 days · 13 pillars · 1 festival.'}
              </p>
            </div>
            <div className="md:col-span-5 md:justify-self-end flex flex-col items-start md:items-end gap-5">
              {/* Countdown: D · H · M · S */}
              {!cd.isPast && (
                <div className="flex items-baseline gap-3 md:gap-4">
                  <CountUnit n={cd.days}    label={lang === 'FR' ? 'jours' : 'days'} />
                  <span className="font-display title-medieval text-2xl md:text-3xl text-[var(--color-brass-soft)]/60">·</span>
                  <CountUnit n={cd.hours}   label="h" small />
                  <CountUnit n={cd.minutes} label="m" small />
                  <CountUnit n={cd.seconds} label="s" small />
                </div>
              )}
              {cd.isPast && (
                <p
                  className="font-display title-medieval uppercase text-[10px] tracking-[0.5em]"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  {lang === 'FR' ? 'Le festival est commencé' : 'The festival has begun'}
                </p>
              )}
              <ChevronButton
                onClick={() => ouvrirBilletterie(Boolean(user))}
                variant="gold"
              >
                <Ticket size={13} className="inline mr-1 -mt-0.5" />
                {lang === 'FR' ? 'Acheter mes billets' : 'Get my tickets'}
              </ChevronButton>
            </div>
          </div>
        </HexPanel>
      </div>

      {/* ── Sponsor row ─────────────────────────────────────────── */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 pb-10 md:pb-14">
        <Eyebrow className="mb-6 text-center inline-flex w-full items-center justify-center gap-3">
          <span aria-hidden className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, var(--color-copper))' }} />
          {t.sponsorsTitle}
          <span aria-hidden className="h-px w-12" style={{ background: 'linear-gradient(90deg, var(--color-copper), transparent)' }} />
        </Eyebrow>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14 opacity-85">
          {SPONSORS.map((s) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.name}
              title={s.name}
              className="fmm-no-grade h-9 md:h-12 w-auto object-contain transition-all hover:opacity-100"
              style={{ filter: 'brightness(0.95) saturate(0.9)' }}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      {/* ── 4-column nav ────────────────────────────────────────── */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
        {/* About */}
        <div>
          <ColumnHeader>{t.aboutTitle}</ColumnHeader>
          <p className="font-editorial text-sm leading-relaxed mb-6" style={{ color: 'var(--color-bone)', opacity: 0.7 }}>
            {t.aboutBody}
          </p>
          <div className="flex gap-3">
            <SocialButton href={SITE.social.facebook} label="Facebook"><Facebook size={15} /></SocialButton>
            <SocialButton href={SITE.social.instagram} label="Instagram"><Instagram size={15} /></SocialButton>
          </div>
        </div>

        {/* Contact */}
        <div>
          <ColumnHeader>{t.contactTitle}</ColumnHeader>
          <ul className="space-y-3 font-sans text-sm" style={{ color: 'var(--color-bone)', opacity: 0.78 }}>
            <li className="flex items-start gap-2.5">
              <MapPin size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
              {SITE.contact.address}
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
              <a href={`mailto:${SITE.contact.email}`} className="hover:text-[var(--color-amber-glow)] transition break-all">{SITE.contact.email}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
              <a href={`tel:${SITE.contact.phone}`} className="hover:text-[var(--color-amber-glow)] transition">{SITE.contact.phone}</a>
            </li>
          </ul>
        </div>

        {/* Quick links */}
        <FooterColumn title={t.quickTitle} keys={quickLinks as readonly string[]} lang={lang} findPillar={findPillar} />

        {/* Resources */}
        <FooterColumn title={t.resourcesTitle} keys={resourceLinks as readonly string[]} lang={lang} findPillar={findPillar}>
          <li>
            <FooterLink to={lang === 'FR' ? '/contact' : '/en/contact'}>
              {lang === 'FR' ? 'Nous joindre' : 'Contact us'}
            </FooterLink>
          </li>
          <li>
            <FooterLink to={lang === 'FR' ? '/politique-de-confidentialite' : '/en/privacy'}>{t.privacy}</FooterLink>
          </li>
          <li>
            <a
              href={SITE.operatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm hover:text-[var(--color-amber-glow)] transition"
              style={{ color: 'var(--color-bone)', opacity: 0.7 }}
            >
              {SITE.operator}
            </a>
          </li>
        </FooterColumn>
      </div>

      {/* ── Infolettre · l'inscription qui ouvre le compte ─────── */}
      {/* Même carcasse que la carte BILLETS plus haut : panneau hexagoné,
          verre de caravane, colonne de gauche qui parle et colonne de
          droite qui agit. La hiérarchie manquait ici, le bloc n'avait
          qu'un sourcil en petites capitales et pas de titre; le titre
          d'affichage la rétablit sans sortir du canon du pied de page. */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 pb-12 md:pb-16">
        <HexPanel size="md">
          <div className="caravan-glass relative overflow-hidden px-6 md:px-10 py-8 md:py-11 grid md:grid-cols-12 gap-x-10 gap-y-7 items-center">
            <div className="md:col-span-6">
              <Eyebrow className="mb-3 inline-flex items-center gap-2">
                <HexMark className="opacity-80" />
                {t.newsletterEyebrow}
              </Eyebrow>
              <h3
                className="font-display leading-[1.06] tracking-[-0.005em] text-2xl md:text-3xl lg:text-[2.1rem] mb-3"
                style={{
                  color: 'var(--color-bone)',
                  fontWeight: 400,
                  textShadow: '0 0 28px rgba(232, 177, 74, 0.18)',
                }}
              >
                {t.newsletterTitle}
              </h3>
              <p
                className="font-editorial text-base leading-relaxed max-w-md"
                style={{ color: 'var(--color-bone)', opacity: 0.78 }}
              >
                {t.newsletterBody}
              </p>
            </div>

            <div className="md:col-span-6">
              {etat === 'lien' || etat === 'inscrit' ? (
                <div role="status">
                  <p
                    className="font-editorial text-base leading-relaxed flex items-start gap-2.5"
                    style={{ color: 'var(--color-amber-glow)' }}
                  >
                    <HexMark className="mt-2 shrink-0" />
                    <span>{etat === 'lien' ? t.newsletterLinkSent : t.newsletterDone}</span>
                  </p>
                  {etat === 'lien' && (
                    <p
                      className="font-sans text-sm mt-2 pl-[22px] break-all"
                      style={{ color: 'var(--color-bone)', opacity: 0.7 }}
                    >
                      {email.trim().toLowerCase()}
                    </p>
                  )}
                  {compteAPart && (
                    <div className="mt-5 pl-[22px]">
                      <p
                        className="font-editorial text-sm leading-relaxed mb-4 max-w-sm"
                        style={{ color: 'var(--color-bone)', opacity: 0.72 }}
                      >
                        {t.newsletterAccountAside}
                      </p>
                      <ChevronButton type="button" variant="ghost" onClick={openSignIn}>
                        {t.newsletterAccountCta}
                      </ChevronButton>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2.5" noValidate>
                    <label htmlFor="fmm-infolettre" className="sr-only">
                      {t.newsletterLabel}
                    </label>
                    <input
                      id="fmm-infolettre"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      disabled={etat === 'envoi'}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (erreur) setErreur(null); }}
                      placeholder={t.newsletterPlaceholder}
                      aria-invalid={erreur ? true : undefined}
                      aria-describedby={erreur
                        ? 'fmm-infolettre-erreur fmm-infolettre-consentement'
                        : 'fmm-infolettre-consentement'}
                      className="flex-1 min-w-0 bg-[rgba(10,2,7,0.6)] px-4 py-3 text-sm font-sans transition-colors focus:outline-none disabled:opacity-60 placeholder:text-[rgba(232,221,193,0.45)]"
                      style={{
                        color: 'var(--color-bone)',
                        border: `1px solid ${erreur ? 'rgba(224, 138, 122, 0.55)' : 'rgba(232, 177, 74, 0.35)'}`,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-amber-glow)'; }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = erreur
                          ? 'rgba(224, 138, 122, 0.55)'
                          : 'rgba(232, 177, 74, 0.35)';
                      }}
                    />
                    <ChevronButton type="submit" variant="gold" disabled={etat === 'envoi'}>
                      {etat === 'envoi' ? t.newsletterBusy : t.newsletterCta}
                    </ChevronButton>
                  </form>

                  {erreur && (
                    <p
                      id="fmm-infolettre-erreur"
                      role="alert"
                      className="font-editorial text-sm leading-relaxed mt-3"
                      style={{ color: '#e08a7a' }}
                    >
                      {erreur}
                    </p>
                  )}
                  <p
                    id="fmm-infolettre-consentement"
                    className="font-sans text-[12px] leading-relaxed mt-3.5 max-w-sm"
                    style={{ color: 'var(--color-bone)', opacity: 0.62 }}
                  >
                    {t.newsletterConsent}
                  </p>
                </>
              )}
            </div>
          </div>
        </HexPanel>
      </div>

      {/* ── Rights line ─────────────────────────────────────────── */}
      <div className="relative z-10">
        <div
          className="max-w-screen-xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-sans"
          style={{ color: 'var(--color-bone)', opacity: 0.45 }}
        >
          <span className="inline-flex items-center gap-3">
            {t.rights}
          </span>
          <div className="inline-flex items-center gap-5">
            <button
              type="button"
              onClick={() => setBugOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-[var(--color-amber-glow)] transition uppercase tracking-[0.4em] text-[10px]"
            >
              <Bug size={11} /> {lang === 'FR' ? 'Signaler un bug' : 'Report a bug'}
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 hover:text-[var(--color-amber-glow)] transition uppercase tracking-[0.4em] text-[10px]"
            >
              <Lock size={11} /> {lang === 'FR' ? 'Admin' : 'Admin'}
            </Link>
          </div>
        </div>

        {/* ── Signature de l'atelier ────────────────────────────── */}
        {/* Sa propre ligne, sous les droits : la ligne de droits nomme
            déjà Le Salon des Inconnus comme titulaire, et coller les
            deux mentions côte à côte donnait une répétition maladroite.
            Demandée par Alex le 2026-08-03. */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-6 flex justify-center">
          <a
            href="https://vexel-webstudio.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 text-[11px] font-sans transition-colors"
            style={{ color: 'var(--color-bone)' }}
          >
            <img
              src="/salon/salon-logo.webp"
              alt=""
              aria-hidden
              width={12}
              height={34}
              className="h-[34px] w-auto opacity-65 group-hover:opacity-100 transition-opacity"
            />
            <span className="opacity-45 group-hover:opacity-80 transition-opacity uppercase tracking-[0.28em]">
              {lang === 'FR'
                ? 'Site développé par Vexel Webstudio, un projet du Salon des Inconnus'
                : 'Website built by Vexel Webstudio, a project of Le Salon des Inconnus'}
            </span>
          </a>
        </div>
      </div>

      <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />
    </footer>
  );
};

// ─── CountUnit ────────────────────────────────────────────────────
// Single countdown segment: big serif number stacked over a tiny
// brass caps label. Pattern lifted from OrbHomePage so the footer's
// countdown reads identically to the orb's.
const CountUnit: React.FC<{ n: number; label: string; small?: boolean }> = ({ n, label, small }) => (
  <span className="flex flex-col items-center leading-none">
    <span
      className="font-display title-medieval"
      style={{
        color: 'var(--color-bone)',
        fontSize: small ? 'clamp(1.4rem, 2.4vw, 2rem)' : 'clamp(2.2rem, 4vw, 3.2rem)',
        textShadow: '0 0 24px rgba(232, 177, 74, 0.2)',
      }}
    >
      {n.toString().padStart(2, '0')}
    </span>
    <span
      className="font-display title-medieval text-[8px] md:text-[9px] uppercase tracking-[0.4em] mt-1"
      style={{ color: 'var(--color-copper)' }}
    >
      {label}
    </span>
  </span>
);

// ─── ColumnHeader ────────────────────────────────────────────────
const ColumnHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    className="font-editorial italic uppercase tracking-[0.4em] text-[11px] mb-4 inline-flex items-center gap-2"
    style={{ color: 'var(--color-amber-glow)' }}
  >
    {children}
  </p>
);

// ─── FooterLink ──────────────────────────────────────────────────
const FooterLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="group inline-flex items-center gap-2 font-sans text-sm hover:text-[var(--color-amber-glow)] transition"
    style={{ color: 'var(--color-bone)', opacity: 0.7 }}
  >
    <span aria-hidden className="inline-block w-2 h-px bg-[var(--color-copper)]/50 group-hover:bg-[var(--color-amber-glow)] group-hover:w-4 transition-all" />
    {children}
  </Link>
);

// ─── SocialButton ────────────────────────────────────────────────
const SocialButton: React.FC<{ href: string; label: string; children: React.ReactNode }> = ({
  href,
  label,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-10 h-10 flex items-center justify-center transition-all hover:scale-[1.06]"
    style={{
      color: 'var(--color-amber-glow)',
      background: 'rgba(232, 177, 74, 0.08)',
      border: '1px solid rgba(232, 177, 74, 0.35)',
      borderRadius: 12,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232, 177, 74, 0.18)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232, 177, 74, 0.08)'; }}
  >
    {children}
  </a>
);

interface ColProps {
  title: string;
  keys: readonly string[];
  lang: 'FR' | 'EN';
  findPillar: (k: string) => ReturnType<typeof PILLARS.find>;
  children?: React.ReactNode;
}

const FooterColumn: React.FC<ColProps> = ({ title, keys, lang, findPillar, children }) => (
  <div>
    <ColumnHeader>{title}</ColumnHeader>
    <ul className="space-y-2.5">
      {keys.map((k) => {
        const p = findPillar(k);
        if (!p) return null;
        return (
          <li key={k}>
            <FooterLink to={p.slug[lang]}>{p.label[lang]}</FooterLink>
          </li>
        );
      })}
      {children}
    </ul>
  </div>
);

export default Footer;
