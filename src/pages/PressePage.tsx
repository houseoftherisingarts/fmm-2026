import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Download, FileText, Image as ImageIcon, Mail, Phone, QrCode, Share2, X } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  CARTES_EN,
  CARTES_FR,
  CARTES_LIGNE_EN,
  CARTES_LIGNE_FR,
  CARTES_POSTALES_EN,
  CARTES_POSTALES_FR,
  LOGOS,
  PRESSE_ZIP,
  QR_BASE,
  TEXTES,
  cibleQR,
  pleineRes,
  variante,
  vignette,
  type PresseAsset,
} from '../content/presse';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import {
  ChevronButton,
  DisplayTitle,
  Eyebrow,
  GildedFrame,
  HexPanel,
} from '../components/marche/atmospherics';

// ─── PressePage ──────────────────────────────────────────────────────
// La salle de presse du festival : les faits en haut, puis les images
// à télécharger. Un journaliste, un blogueur ou un partenaire arrive
// ici, prend ce qu'il lui faut et repart sans écrire à personne.
//
// Quatre routes mènent à cette page en français (/presse, /presskit,
// /press-kit) et autant en anglais : Alex veut que le raccourci
// festivalmedieval.org/presskit tombe juste, peu importe la façon dont
// il l'écrit dans un courriel.
//
// Quatre gestes par tuile : Télécharger sert le PNG 1920 × 1080,
// Partager passe par le partage natif ou copie le lien, Version QR
// ajoute au visuel un code qui mène à la page du sujet, et Photo seule
// retire le texte pour ne laisser que l'image, le blason, l'adresse du
// site et la signature. Cliquer l'image l'ouvre en grand.
//
// La page se lit en deux temps : le festival sur place, puis le
// festival en ligne, qui vit toute l'année sur le site.
//
// Les tuiles affichent une vignette WebP de 640 px. Voir
// src/content/presse.ts et scripts/presse/build-kit.mjs.

const EASE = [0.22, 1, 0.36, 1] as const;

const PressePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const fr = lang === 'FR';
  const cartes = fr ? CARTES_FR : CARTES_EN;
  const postales = fr ? CARTES_POSTALES_FR : CARTES_POSTALES_EN;
  const enLigne = fr ? CARTES_LIGNE_FR : CARTES_LIGNE_EN;

  // Le fichier dont le lien vient d'être copié, pour l'accusé de
  // réception sous le bouton Partager.
  const [copie, setCopie] = useState<string | null>(null);
  // Les tuiles passées en version QR et celles passées en photo seule,
  // par nom de fichier de base.
  const [enQR, setEnQR] = useState<Set<string>>(() => new Set());
  const [enNu, setEnNu] = useState<Set<string>>(() => new Set());
  // La visionneuse : la série affichée et le rang de l'image ouverte.
  const [loupe, setLoupe] = useState<{ serie: PresseAsset[]; i: number } | null>(null);

  const nom = (a: PresseAsset) => (fr ? a.labelFR : a.labelEN);
  const etat = (a: PresseAsset) => ({ nu: enNu.has(a.file), qr: enQR.has(a.file) });
  const affiche = (a: PresseAsset) => variante(a, etat(a));

  const bascule = (
    poser: React.Dispatch<React.SetStateAction<Set<string>>>,
    a: PresseAsset,
  ) =>
    poser((s) => {
      const n = new Set(s);
      if (n.has(a.file)) n.delete(a.file);
      else n.add(a.file);
      return n;
    });

  const partager = async (a: PresseAsset, titre: string) => {
    const chemin = pleineRes(affiche(a));
    try {
      const reponse = await fetch(chemin);
      const blob = await reponse.blob();
      const fichier = new File([blob], chemin.split('/').pop() || 'fmm.png', {
        type: blob.type || 'image/png',
      });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre });
        return;
      }
    } catch (e) {
      // Un partage annulé du doigt lève AbortError : rien à copier,
      // la personne a déjà fait son choix.
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(new URL(chemin, window.location.origin).href);
    } catch {
      /* Navigateur sans presse-papiers : le bouton Télécharger reste. */
    }
    setCopie(a.file);
    window.setTimeout(() => setCopie((c) => (c === a.file ? null : c)), 2400);
  };

  // ── La visionneuse ────────────────────────────────────────────────
  const fermer = useCallback(() => setLoupe(null), []);
  const glisser = useCallback(
    (pas: number) =>
      setLoupe((v) => (v ? { ...v, i: (v.i + pas + v.serie.length) % v.serie.length } : v)),
    [],
  );

  useEffect(() => {
    if (!loupe) return undefined;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowLeft') glisser(-1);
      if (e.key === 'ArrowRight') glisser(1);
    };
    window.addEventListener('keydown', auClavier);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', auClavier);
      document.body.style.overflow = avant;
    };
  }, [loupe, fermer, glisser]);

  const ouvrir = (serie: PresseAsset[], i: number) => setLoupe({ serie, i });

  const boutonRond =
    'inline-flex items-center justify-center rounded-full transition-colors backdrop-blur-sm';
  const styleRond: React.CSSProperties = {
    background: 'rgba(12, 10, 8, 0.55)',
    border: '1px solid rgba(232, 177, 74, 0.34)',
    color: 'var(--color-bone)',
  };

  // ── Une tuile ─────────────────────────────────────────────────────
  const tuile = (a: PresseAsset, serie: PresseAsset[], i: number, contain = false) => {
    const label = nom(a);
    const vue = affiche(a);
    const actif = enQR.has(a.file);
    const nu = enNu.has(a.file);
    return (
      <HexPanel key={a.file} size="sm" className="h-full">
        <div className="caravan-glass h-full flex flex-col">
          <button
            type="button"
            onClick={() => ouvrir(serie, i)}
            aria-label={`${t.enlarge} · ${label || t.untitled}`}
            className="block w-full group relative overflow-hidden cursor-zoom-in"
          >
            <img
              src={vignette(vue)}
              alt={label || t.untitled}
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className={`w-full aspect-video transition-transform duration-500 group-hover:scale-[1.03] ${
                contain ? 'object-contain p-8' : 'object-cover'
              }`}
              style={a.fond === 'clair' ? { background: 'rgba(239, 233, 220, 0.92)' } : undefined}
            />
          </button>
          {/* Le nom se pose sur sa propre ligne : à trois colonnes, une
              tuile fait 230 px et un titre mis à côté des boutons se
              faisait couper au troisième mot. */}
          <div className="px-4 py-3.5 border-t" style={{ borderColor: 'rgba(216, 155, 58, 0.18)' }}>
            {label && (
              <p
                className="font-display-alt text-sm tracking-[0.06em] mb-2.5"
                style={{ color: 'var(--color-bone)' }}
              >
                {label}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={pleineRes(vue)}
                download
                title={t.download}
                aria-label={`${t.download} · ${label || t.untitled}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                style={{
                  color: 'var(--color-amber-glow)',
                  background: 'rgba(232, 177, 74, 0.09)',
                  border: '1px solid rgba(232, 177, 74, 0.3)',
                }}
              >
                <Download size={12} /> {t.download}
              </a>
              <button
                type="button"
                onClick={() => partager(a, label || t.untitled)}
                title={t.share}
                aria-label={`${t.share} · ${label || t.untitled}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                style={{
                  color: copie === a.file ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.72)',
                  background: 'rgba(244, 239, 227, 0.05)',
                  border: '1px solid rgba(244, 239, 227, 0.16)',
                }}
              >
                {copie === a.file ? <Check size={12} /> : <Share2 size={12} />}
                {copie === a.file ? t.copied : t.share}
              </button>
              {a.qr && (
                <button
                  type="button"
                  onClick={() => bascule(setEnQR, a)}
                  aria-pressed={actif}
                  title={actif ? t.qrOff : t.qrOn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                  style={{
                    color: actif ? '#0c0a08' : 'rgba(244, 239, 227, 0.72)',
                    background: actif ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.05)',
                    border: `1px solid ${actif ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.16)'}`,
                  }}
                >
                  <QrCode size={12} /> {t.qr}
                </button>
              )}
              {a.fileNu && (
                <button
                  type="button"
                  onClick={() => bascule(setEnNu, a)}
                  aria-pressed={nu}
                  title={nu ? t.texteOn : t.nuOn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                  style={{
                    color: nu ? '#0c0a08' : 'rgba(244, 239, 227, 0.72)',
                    background: nu ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.05)',
                    border: `1px solid ${nu ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.16)'}`,
                  }}
                >
                  <ImageIcon size={12} /> {nu ? t.avecTexte : t.photoSeule}
                </button>
              )}
            </div>
            {actif && cibleQR(a, etat(a)) && (
              <p
                className="mt-2 font-sans uppercase tracking-[0.16em] text-[9px] break-all"
                style={{ color: 'var(--color-amber-glow)' }}
              >
                {t.qrLeadsTo} {QR_BASE.replace('https://www.', '').replace('https://', '')}
                {cibleQR(a, etat(a)) === '/' ? '' : cibleQR(a, etat(a))}
              </p>
            )}
          </div>
        </div>
      </HexPanel>
    );
  };

  // ── Une tuile de texte : un feuillet, pas une image ───────────────
  const feuillet = (a: PresseAsset) => (
    <HexPanel key={a.file} size="sm" className="h-full">
      <div className="caravan-glass h-full flex flex-col">
        <div
          className="w-full aspect-video flex items-center justify-center px-6 text-center"
          style={{
            background:
              'radial-gradient(120% 100% at 50% 0%, rgba(232,177,74,0.10) 0%, rgba(12,10,8,0) 70%)',
          }}
        >
          <div>
            <FileText size={26} style={{ color: 'var(--color-amber-glow)' }} className="mx-auto mb-3" />
            <p
              className="font-sans uppercase tracking-[0.28em] text-[10px]"
              style={{ color: 'rgba(244, 239, 227, 0.6)' }}
            >
              {a.file.split('/').pop()}
            </p>
          </div>
        </div>
        <div className="px-4 py-3.5 border-t" style={{ borderColor: 'rgba(216, 155, 58, 0.18)' }}>
          <p
            className="font-display-alt text-sm tracking-[0.06em] mb-2.5"
            style={{ color: 'var(--color-bone)' }}
          >
            {nom(a)}
          </p>
          <a
            href={pleineRes(a)}
            download
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
            style={{
              color: 'var(--color-amber-glow)',
              background: 'rgba(232, 177, 74, 0.09)',
              border: '1px solid rgba(232, 177, 74, 0.3)',
            }}
          >
            <Download size={12} /> {t.download}
          </a>
        </div>
      </div>
    </HexPanel>
  );

  const ouverte = loupe ? affiche(loupe.serie[loupe.i]) : null;
  const ouverteBase = loupe ? loupe.serie[loupe.i] : null;

  return (
    <div>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/presse/orbe-presse.webp"
        orbImagePosition="center"
        ctas={[{ label: t.zipCta, href: PRESSE_ZIP, variant: 'primary' }]}
      />

      {/* ── En bref ─────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <GildedFrame inset={14} tone="amber">
            <div className="caravan-glass p-6 md:p-10">
              <Eyebrow tone="amber" className="mb-3">{t.brefEyebrow}</Eyebrow>
              <DisplayTitle size="lg" className="mb-8">{t.brefTitle}</DisplayTitle>

              <dl className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                {t.facts.map((f) => (
                  <div key={f.k}>
                    <dt className="font-sans uppercase tracking-[0.32em] text-[10px] mb-1.5"
                        style={{ color: 'var(--color-amber-glow)' }}>
                      {f.k}
                    </dt>
                    <dd className="font-editorial text-base md:text-lg leading-relaxed"
                        style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                      {f.v}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="font-sans uppercase tracking-[0.32em] text-[10px] mb-1.5"
                      style={{ color: 'var(--color-amber-glow)' }}>
                    {t.contactLabel}
                  </dt>
                  <dd className="font-editorial text-base md:text-lg leading-relaxed flex flex-col gap-1"
                      style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                    <a href={`mailto:${SITE.contact.email}`}
                       className="inline-flex items-center gap-2 hover:text-[var(--color-amber-glow)] transition break-all">
                      <Mail size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
                      {SITE.contact.email}
                    </a>
                    <a href={`tel:${SITE.contact.phone}`}
                       className="inline-flex items-center gap-2 hover:text-[var(--color-amber-glow)] transition">
                      <Phone size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
                      {SITE.contact.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ChevronButton href={PRESSE_ZIP} variant="gold">
                  {t.zipCta}
                </ChevronButton>
                <p className="font-editorial text-sm" style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
                  {t.zipNote}
                </p>
              </div>
            </div>
          </GildedFrame>
        </div>
      </section>

      {/* ── Le festival sur place ───────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.placeEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.placeTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-8"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.placeLead}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cartes.map((a, i) => tuile(a, cartes, i))}
          </div>

          {/* Les photographies, sous les cartes, dans la même section. */}
          <h3 className="font-display-alt mt-14 mb-3"
              style={{ color: 'var(--color-bone)', fontVariant: 'small-caps',
                       letterSpacing: '0.14em', fontSize: '1.5rem' }}>
            {t.postalesTitle}
          </h3>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-3"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.postalesLead}
          </p>
          {/* Le crédit obligatoire, dans la typo médiévale du site. */}
          <p
            className="font-display-alt mb-8"
            style={{
              color: 'rgba(244, 239, 227, 0.85)',
              fontVariant: 'small-caps',
              fontWeight: 600,
              fontSize: '1.05rem',
              letterSpacing: '0.16em',
              textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.45)',
            }}
          >
            {t.credit}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {postales.map((a, i) => tuile(a, postales, i))}
          </div>
        </div>
      </section>

      {/* ── Le festival en ligne ────────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.ligneEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.ligneTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-8"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.ligneLead}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enLigne.map((a, i) => tuile(a, enLigne, i))}
          </div>
        </div>
      </section>

      {/* ── Logos et textes ─────────────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.logosEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.logosTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-8"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.logosLead}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LOGOS.map((a, i) => tuile(a, LOGOS, i, true))}
            {TEXTES.map((a) => feuillet(a))}
          </div>
        </div>
      </section>

      {/* ── Contact presse ──────────────────────────────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <GildedFrame inset={12}>
            <div className="caravan-glass px-6 md:px-10 py-8 md:py-10">
              <DisplayTitle size="lg" className="mb-3">{t.contactTitle}</DisplayTitle>
              <p className="font-editorial text-base md:text-xl leading-relaxed max-w-3xl"
                 style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                {t.contactLeadA}
                <a href={`mailto:${SITE.contact.email}`}
                   className="hover:opacity-80 transition"
                   style={{ color: 'var(--color-amber-glow)' }}>
                  {SITE.contact.email}
                </a>
                {t.contactLeadB}
              </p>
              <p className="mt-4 font-sans uppercase tracking-[0.28em] text-[11px]"
                 style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
                {SITE.contact.phone} · {SITE.contact.address}
              </p>
            </div>
          </GildedFrame>
        </div>
      </section>

      {/* ── La visionneuse ──────────────────────────────────────── */}
      <AnimatePresence>
        {loupe && ouverte && ouverteBase && (
          <motion.div
            key="loupe"
            className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-6"
            style={{ background: 'rgba(0, 0, 0, 0.9)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            onClick={fermer}
            role="dialog"
            aria-modal="true"
            aria-label={t.viewer}
          >
            <motion.img
              key={ouverte.file}
              src={pleineRes(ouverte)}
              alt={nom(ouverteBase) || t.untitled}
              className="max-w-[92vw] max-h-[80vh] object-contain"
              style={{
                boxShadow: '0 30px 90px rgba(0, 0, 0, 0.75)',
                background: ouverteBase.fond === 'clair' ? 'rgba(239, 233, 220, 0.94)' : undefined,
                padding: ouverteBase.fond ? '2rem' : undefined,
              }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.26, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            />

            <p
              className="absolute left-0 right-0 bottom-5 text-center font-display-alt px-6"
              style={{
                color: 'rgba(244, 239, 227, 0.78)',
                fontVariant: 'small-caps',
                letterSpacing: '0.14em',
                fontSize: '0.95rem',
              }}
            >
              {nom(ouverteBase)}
              {nom(ouverteBase) && ' · '}
              {loupe.i + 1} / {loupe.serie.length}
            </p>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fermer(); }}
              aria-label={t.close}
              className={`${boutonRond} absolute top-5 right-5 w-11 h-11`}
              style={styleRond}
            >
              <X size={20} />
            </button>
            {loupe.serie.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); glisser(-1); }}
                  aria-label={t.prev}
                  className={`${boutonRond} absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12`}
                  style={styleRond}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); glisser(1); }}
                  aria-label={t.next}
                  className={`${boutonRond} absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12`}
                  style={styleRond}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FR = {
  eyebrow: 'Salle de presse',
  title: 'Kit de presse',
  intro:
    'Les visuels du festival et les logos officiels se téléchargent ici, prêts à publier. Nous vous demandons seulement de créditer Léna LeBozec pour les photographies.',
  brefEyebrow: 'En bref',
  brefTitle: 'Le festival en quelques lignes',
  facts: [
    { k: 'Quoi', v: 'Le Festival Médiéval de Montpellier, sous le titre Caravanes & Saltimbanques.' },
    { k: 'Quand', v: '25 · 26 · 27 septembre 2026. Les portes ouvrent le vendredi à 17 h.' },
    {
      k: 'Où',
      v: 'Le site se trouve au 4 rue du Bosquet à Montpellier, dans la Petite-Nation en Outaouais. À ne pas confondre avec Montpellier en France.',
    },
    {
      k: 'Billets',
      v: 'Passe journée 27 $, passe 3 jours 65 $, banquet médiéval 65 $ plus taxes. La vente se fait en ligne par Zeffy.',
    },
    { k: 'Organisation', v: 'Le festival est opéré par Le Salon des Inconnus.' },
  ],
  contactLabel: 'Contact presse',
  zipCta: 'Télécharger tout le kit',
  zipNote:
    'Un seul fichier ZIP : les vingt-neuf visuels dans leurs quatre versions, avec ou sans texte, avec ou sans code QR, plus les trois blasons et les textes de présentation.',
  placeEyebrow: 'Le festival sur place',
  placeTitle: 'Trois jours à Montpellier, en images',
  placeLead:
    'Treize cartes et douze photographies, toutes en 1920 × 1080 avec le blason du festival. Chaque tuile se décline en quatre : le bouton Version QR ajoute un code qui mène à la page du sujet, et Photo seule retire le texte pour ne garder que l’image.',
  postalesTitle: 'Les photographies',
  postalesLead:
    'Douze images des éditions 2024 et 2025, signées par la photographe, bonnes pour l’écran comme pour le papier. Chacune porte maintenant un court texte, que le bouton Photo seule retire.',
  credit: 'Crédit obligatoire : Léna LeBozec, photographe',
  ligneEyebrow: 'Le festival en ligne',
  ligneTitle: 'Le site vit toute l’année',
  ligneLead:
    'Les jeux médiévaux se jouent en ligne, le registre de l’Ordre tient les fiches de ses membres et leurs badges, la boutique s’ouvre contre des Montpellois gagnés en explorant le site, et la section Apprendre poursuit la mission éducative du festival. Ces quatre cartes montrent le site lui-même.',
  logosEyebrow: 'Logos et textes',
  logosTitle: 'Le blason et la documentation',
  logosLead:
    'Le blason existe en argenté, en blanc et en noir, chacun en pleine résolution et en 1024 pixels. Les feuillets de texte donnent la présentation du festival, les crédits et le mode d’emploi du kit.',
  contactTitle: 'Une question, un besoin précis',
  contactLeadA: 'Écrivez à ',
  contactLeadB: ' et nous vous répondons dans la journée.',
  download: 'Télécharger',
  share: 'Partager',
  copied: 'Lien copié',
  qr: 'Version QR',
  qrOn: 'Afficher la version à code QR',
  qrOff: 'Revenir à la version sans code',
  qrLeadsTo: 'Le code mène à',
  photoSeule: 'Photo seule',
  avecTexte: 'Avec texte',
  nuOn: 'Retirer le texte et garder la photo',
  texteOn: 'Remettre le texte sur l’image',
  enlarge: 'Agrandir',
  viewer: 'Image en plein écran',
  close: 'Fermer',
  prev: 'Image précédente',
  next: 'Image suivante',
  untitled: 'Photographie du festival',
};

const EN: typeof FR = {
  eyebrow: 'Press room',
  title: 'Press kit',
  intro:
    'The festival visuals and the official logos download here, ready to publish. All we ask is a credit to Léna LeBozec for the photographs.',
  brefEyebrow: 'At a glance',
  brefTitle: 'The festival in a few lines',
  facts: [
    { k: 'What', v: 'The Festival Médiéval de Montpellier, under the title Caravans & Players.' },
    { k: 'When', v: 'September 25 · 26 · 27, 2026. Gates open Friday at 5 p.m.' },
    {
      k: 'Where',
      v: 'The grounds sit at 4 rue du Bosquet in Montpellier, in the Petite-Nation region of Outaouais. Not to be confused with Montpellier in France.',
    },
    {
      k: 'Tickets',
      v: 'Day pass $27, three-day pass $65, medieval banquet $65 plus tax. Sold online through Zeffy.',
    },
    { k: 'Organisation', v: 'The festival is run by Le Salon des Inconnus.' },
  ],
  contactLabel: 'Press contact',
  zipCta: 'Download the whole kit',
  zipNote:
    'One ZIP file: the twenty-nine visuals in their four versions, with or without text, with or without a QR code, plus the three crests and the presentation texts.',
  placeEyebrow: 'The festival on the grounds',
  placeTitle: 'Three days in Montpellier, in pictures',
  placeLead:
    'Thirteen cards and twelve photographs, all 1920 × 1080 with the festival crest. Every tile comes in four versions: the QR button adds a code leading to the matching page, and Photo only strips the text back to the image.',
  postalesTitle: 'The photographs',
  postalesLead:
    'Twelve images from the 2024 and 2025 editions, signed by the photographer, good for screen and for paper. Each one now carries a short text that the Photo only button removes.',
  credit: 'Required credit: Léna LeBozec, photographer',
  ligneEyebrow: 'The festival online',
  ligneTitle: 'The site is alive all year',
  ligneLead:
    'The medieval games are played online, the roll of the Order keeps its members’ cards and badges, the shop opens for Montpellois earned while exploring the site, and the Learning section carries on the festival’s educational mission. These four cards show the site itself.',
  logosEyebrow: 'Logos and texts',
  logosTitle: 'The crest and the documentation',
  logosLead:
    'The crest comes in silver, in white and in black, each at full resolution and at 1024 pixels. The text sheets carry the festival presentation, the credits and the instructions for the kit.',
  contactTitle: 'A question, a specific need',
  contactLeadA: 'Write to ',
  contactLeadB: ' and we answer the same day.',
  download: 'Download',
  share: 'Share',
  copied: 'Link copied',
  qr: 'QR version',
  qrOn: 'Show the QR code version',
  qrOff: 'Back to the version without a code',
  qrLeadsTo: 'The code leads to',
  photoSeule: 'Photo only',
  avecTexte: 'With text',
  nuOn: 'Strip the text and keep the photo',
  texteOn: 'Put the text back on the image',
  enlarge: 'Enlarge',
  viewer: 'Full-screen image',
  close: 'Close',
  prev: 'Previous image',
  next: 'Next image',
  untitled: 'Festival photograph',
};

export default PressePage;
