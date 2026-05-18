import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Hourglass, AlertCircle, Edit3, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import { addLocale } from '../../lib/locale';
import {
  getVendorApp, upsertVendorApp, addUserFlag, CURRENT_YEAR,
  type VendorApp, type VendorKioskAppearance, type VendorElectricityNeed,
} from '../../firebase/applications';
import { JourneyPath } from './JourneyPath';
import { WaxSeal } from './WaxSeal';
import OrnateFrame from './OrnateFrame';
import TiltShell from './TiltShell';
import PhotoUpload from './PhotoUpload';

// Per-chapter accent — drives OrnateFrame stroke + card glow.
const CHAPTER_ACCENT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'var(--color-ruby)',
  2: 'var(--color-emerald-deep)',
  3: 'var(--color-mustard)',
  4: 'var(--color-plum)',
  5: 'var(--color-amber-glow)',
};

// ─── Types ────────────────────────────────────────────────────────
interface FormState {
  // I — La Caravane
  contact: string;
  companyName: string;
  hasParticipatedBefore: '' | 'yes' | 'no';
  // II — Votre Métier
  description: string;
  socials: string;
  phone: string;
  teamSize: string;
  familyVolunteerInterest: boolean;       // checkbox; deep-links to /benevole on Next
  logoUrl: string;                        // transparent PNG, used on online kiosk
  mainPhotoUrl: string;                   // hero photo for online kiosk
  // III — La Tente
  kioskAppearance: VendorKioskAppearance | '';
  kioskDimensions: string;
  electricityNeed: VendorElectricityNeed | '';
  wantsCampingSpot: '' | 'yes' | 'no';
  // IV — Le Voyage
  regionOfOrigin: string;
  firstTimeSource: string;
  otherQuestions: string;
  consent: boolean;
}

const EMPTY: FormState = {
  contact: '', companyName: '', hasParticipatedBefore: '',
  description: '', socials: '', phone: '', teamSize: '', familyVolunteerInterest: false,
  logoUrl: '', mainPhotoUrl: '',
  kioskAppearance: '', kioskDimensions: '', electricityNeed: '', wantsCampingSpot: '',
  regionOfOrigin: '', firstTimeSource: '', otherQuestions: '', consent: false,
};

type ChapterId = 1 | 2 | 3 | 4 | 5;
const CHAPTER_REQUIRED: Record<Exclude<ChapterId, 5>, (keyof FormState)[]> = {
  1: ['contact', 'companyName', 'hasParticipatedBefore'],
  2: ['description', 'socials', 'phone', 'teamSize', 'logoUrl', 'mainPhotoUrl'],
  3: ['kioskAppearance', 'kioskDimensions', 'electricityNeed', 'wantsCampingSpot'],
  4: ['regionOfOrigin', 'consent'],
};

// ─── Component ────────────────────────────────────────────────────
interface VendorQuestFormProps {
  onReopenOverture?: () => void;
  /** Year this submission targets. Defaults to the current festival year.
      Passed by VendorApplicationPage when `?year=2027` is present so the
      same form can take both an in-flight 2026 application and an early
      2027 reservation without forking. */
  year?: number;
}

const VendorQuestForm: React.FC<VendorQuestFormProps> = ({ onReopenOverture, year }) => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const { user } = useAuth();
  const { flags } = useSiteFlags();
  const reduceMotion = useReducedMotion();
  const isWaitlist = !flags.vendorApplicationsOpen;
  const targetYear = year || CURRENT_YEAR;

  const [chapter, setChapter]   = useState<ChapterId>(1);
  const [direction, setDir]     = useState<1 | -1>(1);
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [touched, setTouched]   = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [existing, setExisting] = useState<VendorApp | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg]     = useState<string | null>(null);
  const [unitsMetric, setUnitsMetric]   = useState(false);

  const draftKey = user ? `fmm.vendorDraft.${user.uid}.${targetYear}` : null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const blur = (k: keyof FormState) => setTouched((p) => ({ ...p, [k]: true }));

  // ── Hydrate from Firestore (or localStorage draft if no record yet) ──
  useEffect(() => {
    if (!user) return;
    setHydrating(true);
    getVendorApp(user.uid, targetYear).then((v) => {
      setExisting(v);
      if (v) {
        setForm({
          contact: v.contact || '',
          companyName: v.companyName || v.kioskName || '',
          hasParticipatedBefore: v.hasParticipatedBefore === true ? 'yes' : v.hasParticipatedBefore === false ? 'no' : '',
          description: v.description || v.products || '',
          socials: v.socials || v.websiteUrl || '',
          phone: v.phone || '',
          teamSize: v.teamSize || '',
          familyVolunteerInterest: !!v.familyVolunteerInterest,
          logoUrl: v.logoUrl || '',
          mainPhotoUrl: v.mainPhotoUrl || '',
          kioskAppearance: v.kioskAppearance || '',
          kioskDimensions: v.kioskDimensions || v.spaceSize || '',
          electricityNeed: v.electricityNeed || '',
          wantsCampingSpot: v.wantsCampingSpot === true ? 'yes' : v.wantsCampingSpot === false ? 'no' : '',
          regionOfOrigin: v.regionOfOrigin || '',
          firstTimeSource: v.firstTimeSource || '',
          otherQuestions: v.otherQuestions || '',
          consent: true,
        });
      } else if (draftKey) {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) setForm((p) => ({ ...p, ...JSON.parse(raw) }));
        } catch { /* noop */ }
      }
      setHydrating(false);
    });
  }, [user]);

  // ── Persist draft (debounced) ──
  useEffect(() => {
    if (!draftKey || existing) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* noop */ }
    }, 600);
    return () => clearTimeout(id);
  }, [form, draftKey, existing]);

  // ── Validation ──
  const validate = (k: keyof FormState): string | null => {
    const v = form[k];
    if (k === 'consent' && !v) return t.errRequired;
    if (typeof v === 'string' && !v.trim() && isRequired(k)) return t.errRequired;
    return null;
  };
  const isRequired = (k: keyof FormState): boolean =>
    Object.values(CHAPTER_REQUIRED).some((arr) => arr.includes(k));

  const errorFor = (k: keyof FormState): string | null =>
    touched[k] ? validate(k) : null;

  const chapterValid = (id: Exclude<ChapterId, 5>): boolean =>
    CHAPTER_REQUIRED[id].every((k) => !validate(k));

  const goNext = () => {
    if (chapter === 5) return;
    const id = chapter as Exclude<ChapterId, 5>;
    if (!chapterValid(id)) {
      setTouched((p) => ({ ...p, ...Object.fromEntries(CHAPTER_REQUIRED[id].map((k) => [k, true])) }));
      // Surface why we didn't advance: scroll to and emphasise the first
      // missing field. Two rAFs so the touched-driven errors render first.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[data-field-error="true"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.animate?.(
            [{ opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }],
            { duration: 800, easing: 'ease-out' },
          );
        }
      }));
      return;
    }
    // When leaving chapter II with the volunteer checkbox ticked, open the
    // bénévole form in a new tab so the user can fill it in parallel.
    if (id === 2 && form.familyVolunteerInterest) {
      window.open(addLocale('/benevole', lang), '_blank', 'noopener,noreferrer');
    }
    setDir(1);
    setChapter((c) => Math.min(5, (c + 1)) as ChapterId);
  };
  const goBack = () => {
    if (chapter === 1) return;
    setDir(-1);
    setChapter((c) => Math.max(1, (c - 1)) as ChapterId);
  };
  const goTo = (id: ChapterId) => {
    setDir(id > chapter ? 1 : -1);
    setChapter(id);
  };

  // ── Submit ──
  const onSubmit = async () => {
    if (!user) return;
    if (!chapterValid(4)) { setChapter(4); return; }
    setSubmitState('submitting'); setErrMsg(null);
    try {
      const app: VendorApp = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || form.contact,
        kioskName: form.companyName,
        contact: form.contact,
        category: existing?.category || '',
        products: form.description,
        hasInsurance: !!existing?.hasInsurance,
        needsElectricity: form.electricityNeed === 'oui',
        needsWater: !!existing?.needsWater,
        spaceSize: form.kioskDimensions,
        websiteUrl: form.socials,
        companyName: form.companyName,
        description: form.description,
        socials: form.socials,
        phone: form.phone,
        hasParticipatedBefore: form.hasParticipatedBefore === 'yes',
        teamSize: form.teamSize,
        // Boolean intent stored as a short string for legacy/CSV compatibility.
        familyVolunteerInterest: form.familyVolunteerInterest ? 'Oui' : '',
        logoUrl: form.logoUrl,
        mainPhotoUrl: form.mainPhotoUrl,
        kioskAppearance: form.kioskAppearance as VendorKioskAppearance,
        kioskDimensions: form.kioskDimensions,
        electricityNeed: form.electricityNeed as VendorElectricityNeed,
        wantsCampingSpot: form.wantsCampingSpot === 'yes',
        regionOfOrigin: form.regionOfOrigin,
        firstTimeSource: form.firstTimeSource,
        otherQuestions: form.otherQuestions,
        status: existing?.status || (isWaitlist ? 'waitlist' : 'pending'),
        adminNotes: existing?.adminNotes,
        year: targetYear,
        createdAt: existing?.createdAt,
      };
      await upsertVendorApp(app);
      // Best-effort tag — failure here shouldn't block the success state.
      addUserFlag(user.uid, 'vendor').catch((e) => console.warn('[vendor] flag write failed', e));
      setExisting({ ...app });
      if (draftKey) try { localStorage.removeItem(draftKey); } catch { /* noop */ }
      setSubmitState('sent');
    } catch (err) {
      setSubmitState('error');
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // ── Animation variants ──
  // Card-flip: chapters rotate around Y axis on advance/retreat. Reduced
  // motion downgrades to a clean opacity crossfade.
  const flip = useMemo(() => ({
    initial: (d: 1 | -1) => reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: d * 65, y: 12 },
    animate: { opacity: 1, rotateY: 0, y: 0 },
    exit:    (d: 1 | -1) => reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: d * -65, y: -12 },
    transition: reduceMotion
      ? { duration: 0.15 }
      : { type: 'spring' as const, stiffness: 130, damping: 20, mass: 0.9 },
  }), [reduceMotion]);

  if (!user) return null;

  // ── Sent state — wax seal stamps over the velvet card ──
  if (submitState === 'sent') {
    return (
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="velvet-card rounded-lg-card p-10 md:p-14 text-center relative overflow-hidden"
        >
          <OrnateFrame accent="var(--color-amber-glow)" duration={1.2} />
          {/* Burst rings */}
          {!reduceMotion && [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 rounded-full border border-amber-300/40"
              initial={{ width: 80, height: 80, x: '-50%', y: '-50%', opacity: 0.7 }}
              animate={{ width: 600, height: 600, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.25 + i * 0.18, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 2.4, rotate: -45, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
            transition={reduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 160, damping: 15, delay: 0.1 }}
            className="mx-auto mb-6 relative inline-block"
            style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))' }}
          >
            <WaxSeal size={120} />
          </motion.div>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3 copper-sheen">{t.sealedTitle}</h2>
          <p className="font-editorial italic text-base md:text-lg text-ivory-soft max-w-md mx-auto">{t.sealedBody}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      {hydrating && (
        <p className="text-sm font-editorial italic text-ivory-soft text-center mb-4">{t.hydrating}</p>
      )}

      {/* ── Status & waitlist banners ─────────────────────────────── */}
      {isWaitlist && !existing && (
        <BannerCard tone="amber" icon={Hourglass} title={t.waitlistTitle} body={t.waitlistBody} />
      )}
      {existing && (
        <BannerCard
          tone={existing.status === 'accepted' ? 'emerald' : existing.status === 'rejected' ? 'blush' : existing.status === 'waitlist' ? 'amber' : 'brass'}
          icon={AlertCircle}
          title={`${t.statusPrefix}: ${t.status[existing.status]}`}
          body={t.editLead}
        />
      )}

      {onReopenOverture && (
        <div className="flex justify-center mb-3">
          <button type="button" onClick={onReopenOverture}
            className="font-editorial italic text-xs text-stone hover:text-amber-200 transition underline-offset-4 hover:underline">
            {t.rereadIntro}
          </button>
        </div>
      )}

      {/* ── Quest form card ──────────────────────────────────────── */}
      <TiltShell max={4} className="rounded-lg-card">
        <motion.div
          animate={{
            boxShadow: `0 0 0 1px ${CHAPTER_ACCENT[chapter]}33, 0 0 60px -10px ${CHAPTER_ACCENT[chapter]}66, 0 24px 60px -20px rgba(0,0,0,0.85)`,
          }}
          transition={{ duration: 0.6 }}
          className="velvet-card rounded-lg-card p-6 md:p-10 relative overflow-hidden stage-3d"
        >
          <OrnateFrame accent={CHAPTER_ACCENT[chapter]} duration={0.85} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={parchmentBg} aria-hidden />

          <div className="relative">
            <JourneyPath
              chapter={chapter}
              completed={[1, 2, 3, 4].filter((i) => chapterValid(i as Exclude<ChapterId, 5>)) as number[]}
              onJump={(id) => {
                const target = id as ChapterId;
                if (target < chapter) goTo(target);
                else if ([1, 2, 3, 4].slice(0, target - 1).every((i) => chapterValid(i as Exclude<ChapterId, 5>))) goTo(target);
              }}
              labels={t.chapterLabels}
            />
          </div>

          <p className="font-editorial italic text-xs text-stone/80 mt-6 mb-1 text-center">
            {t.signedInAs} <span className="text-ivory-soft">{user.email}</span>
          </p>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={chapter}
              custom={direction}
              variants={flip}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={flip.transition as any}
              style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
              className="mt-3"
            >
            {chapter === 1 && (
              <ChapterShell num="I" eyebrow={t.ch1Eyebrow} title={t.ch1Title} lead={t.ch1Lead}>
                <Field label={t.contact} required error={errorFor('contact')}>
                  <FancyInput value={form.contact} onChange={(v) => set('contact', v)} onBlur={() => blur('contact')} placeholder={t.contactPlaceholder} />
                </Field>
                <Field label={t.companyName} required error={errorFor('companyName')}>
                  <FancyInput value={form.companyName} onChange={(v) => set('companyName', v)} onBlur={() => blur('companyName')} />
                </Field>
                <Field label={t.hasParticipatedBefore} required error={errorFor('hasParticipatedBefore')}>
                  <ChipRadio name="hasParticipatedBefore" value={form.hasParticipatedBefore}
                    onChange={(v) => { set('hasParticipatedBefore', v as 'yes' | 'no'); blur('hasParticipatedBefore'); }}
                    options={[{ v: 'yes', l: t.yes }, { v: 'no', l: t.no }]} />
                </Field>
              </ChapterShell>
            )}

            {chapter === 2 && (
              <ChapterShell num="II" eyebrow={t.ch2Eyebrow} title={t.ch2Title} lead={t.ch2Lead}>
                <Field label={t.description} required hint={t.descriptionHint} error={errorFor('description')}>
                  <FancyTextarea value={form.description} onChange={(v) => set('description', v)} onBlur={() => blur('description')} rows={3} />
                </Field>
                <Field label={t.socials} required hint={t.socialsHint} error={errorFor('socials')}>
                  <FancyInput value={form.socials} onChange={(v) => set('socials', v)} onBlur={() => blur('socials')} placeholder="https://… / @instagram" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t.phone} required error={errorFor('phone')}>
                    <FancyInput type="tel" value={form.phone} onChange={(v) => set('phone', v)} onBlur={() => blur('phone')} />
                  </Field>
                  <Field label={t.teamSize} required hint={t.teamSizeHint} error={errorFor('teamSize')}>
                    <FancyInput value={form.teamSize} onChange={(v) => set('teamSize', v)} onBlur={() => blur('teamSize')} placeholder={t.teamSizePlaceholder} />
                  </Field>
                </div>
                <VolunteerCheckbox
                  checked={form.familyVolunteerInterest}
                  onChange={(v) => set('familyVolunteerInterest', v)}
                  label={t.familyVolunteerInterest}
                  hint={t.familyVolunteerInterestHint}
                />

                {/* ── Visual identity ── */}
                <div className="pt-2">
                  <p className="font-display title-medieval text-[10px] md:text-xs text-amber-300 uppercase tracking-[0.3em] mb-2 text-center">
                    {t.mediaEyebrow}
                  </p>
                  <p className="font-editorial italic text-xs text-stone text-center max-w-md mx-auto mb-4">{t.mediaLead}</p>
                  <div className="grid sm:grid-cols-[1fr_2fr] gap-4">
                    <PhotoUpload
                      uid={user!.uid}
                      kind="logo"
                      variant="logo"
                      label={t.logoLabel}
                      hint={t.logoHint}
                      accept="image/png,image/svg+xml"
                      value={form.logoUrl || undefined}
                      onUploaded={(url) => { set('logoUrl', url); blur('logoUrl'); }}
                      onClear={() => set('logoUrl', '')}
                    />
                    <PhotoUpload
                      uid={user!.uid}
                      kind="main"
                      variant="photo"
                      label={t.mainPhotoLabel}
                      hint={t.mainPhotoHint}
                      accept="image/jpeg,image/png,image/webp"
                      value={form.mainPhotoUrl || undefined}
                      onUploaded={(url) => { set('mainPhotoUrl', url); blur('mainPhotoUrl'); }}
                      onClear={() => set('mainPhotoUrl', '')}
                    />
                  </div>
                  {(errorFor('logoUrl') || errorFor('mainPhotoUrl')) && (
                    <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-3 text-center">
                      {t.mediaError}
                    </p>
                  )}
                </div>
              </ChapterShell>
            )}

            {chapter === 3 && (
              <ChapterShell num="III" eyebrow={t.ch3Eyebrow} title={t.ch3Title} lead={t.ch3Lead}>
                <Field label={t.kioskAppearance} required error={errorFor('kioskAppearance')}>
                  <FancySelect value={form.kioskAppearance}
                    onChange={(v) => { set('kioskAppearance', v as VendorKioskAppearance); blur('kioskAppearance'); }}
                    placeholder={t.kioskAppearancePick}
                    options={[
                      { v: 'moderne',   l: t.appearanceModerne },
                      { v: 'medievale', l: t.appearanceMedievale },
                      { v: 'decore',    l: t.appearanceDecore },
                      { v: 'incertain', l: t.appearanceIncertain },
                    ]} />
                </Field>
                <Field label={t.kioskDimensions} required error={errorFor('kioskDimensions')}>
                  <ChipRadio name="kioskDimensions" value={form.kioskDimensions}
                    onChange={(v) => { set('kioskDimensions', v); blur('kioskDimensions'); }}
                    options={[
                      { v: '10x10', l: '10 × 10 pi' },
                      { v: '10x15', l: '10 × 15 pi' },
                      { v: '10x20', l: '10 × 20 pi' },
                    ]} />
                </Field>
                <Field label={t.electricityNeed} required hint={t.electricityNeedHint} error={errorFor('electricityNeed')}>
                  <ChipColumn name="electricityNeed" value={form.electricityNeed}
                    onChange={(v) => { set('electricityNeed', v as VendorElectricityNeed); blur('electricityNeed'); }}
                    options={[
                      { v: 'oui',   l: t.electricityYes },
                      { v: 'non',   l: t.electricityNo },
                      { v: 'phone', l: t.electricityPhone },
                    ]} />
                </Field>
                <Field label={t.wantsCampingSpot} required error={errorFor('wantsCampingSpot')}>
                  <ChipRadio name="wantsCampingSpot" value={form.wantsCampingSpot}
                    onChange={(v) => { set('wantsCampingSpot', v as 'yes' | 'no'); blur('wantsCampingSpot'); }}
                    options={[{ v: 'yes', l: t.yes }, { v: 'no', l: t.no }]} />
                </Field>
              </ChapterShell>
            )}

            {chapter === 4 && (
              <ChapterShell num="IV" eyebrow={t.ch4Eyebrow} title={t.ch4Title} lead={t.ch4Lead}>
                <Field label={t.regionOfOrigin} required error={errorFor('regionOfOrigin')}>
                  <FancyInput value={form.regionOfOrigin} onChange={(v) => set('regionOfOrigin', v)} onBlur={() => blur('regionOfOrigin')} />
                </Field>
                <Field label={t.firstTimeSource}>
                  <FancyInput value={form.firstTimeSource} onChange={(v) => set('firstTimeSource', v)} />
                </Field>
                <Field label={t.otherQuestions}>
                  <FancyTextarea value={form.otherQuestions} onChange={(v) => set('otherQuestions', v)} rows={3} />
                </Field>
                <ConsentCheckbox checked={form.consent} onChange={(v) => { set('consent', v); blur('consent'); }}
                  lang={lang} t={t} error={errorFor('consent')} />
              </ChapterShell>
            )}

            {chapter === 5 && (
              <ChapterShell num="✦" eyebrow={t.ch5Eyebrow} title={t.ch5Title} lead={t.ch5Lead}>
                <SummaryScroll form={form} t={t} onEdit={(id) => goTo(id)} />
                <InvoicePanel
                  size={form.kioskDimensions}
                  camping={form.wantsCampingSpot === 'yes'}
                  metric={unitsMetric}
                  onToggleMetric={setUnitsMetric}
                  t={t}
                />
                {submitState === 'error' && (
                  <p className="text-sm font-sans text-blush mt-4">{t.error}{errMsg ? ` (${errMsg})` : ''}</p>
                )}
              </ChapterShell>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Nav buttons ─────────────────────────────────────────── */}
        <div className="mt-7 max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={goBack}
            disabled={chapter === 1}
            className="inline-flex items-center gap-2 px-4 py-2 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} /> {t.back}
          </button>

          {chapter < 5 ? (
            <motion.button
              type="button"
              onClick={goNext}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-brass-soft to-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card shadow-[0_8px_22px_-6px_rgba(216,155,58,0.55)] border border-amber-200/40"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {t.next} <ArrowRight size={14} />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={submitState === 'submitting'}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-b from-amber-300 via-brass-soft to-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card disabled:opacity-50 border border-amber-200/60 shadow-[0_0_36px_rgba(232,177,74,0.45),0_8px_24px_-4px_rgba(216,155,58,0.55)]"
            >
              {submitState === 'submitting' ? t.sealing : (existing ? t.update : t.seal)}
              {submitState !== 'submitting' && <Sparkles size={14} />}
            </motion.button>
          )}
          </div>
        </motion.div>
      </TiltShell>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────

const ChapterShell: React.FC<{
  num: string; eyebrow: string; title: string; lead: string; children: React.ReactNode;
}> = ({ num, eyebrow, title, lead, children }) => (
  <div className="space-y-5">
    <div className="text-center pb-2">
      <p className="font-display title-medieval text-[10px] md:text-xs text-brass uppercase tracking-[0.4em] mb-1">
        {`Chapitre ${num}`}
      </p>
      <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[11px] md:text-xs mb-3">{eyebrow}</p>
      <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-2">{title}</h2>
      <p className="font-editorial italic text-sm md:text-base text-ivory-soft max-w-md mx-auto">{lead}</p>
    </div>
    <motion.div
      className="space-y-4 max-w-3xl mx-auto"
      initial="hidden" animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  </div>
);

const Field: React.FC<{
  label: string; required?: boolean; hint?: string; error?: string | null; children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </span>
    {children}
    {error
      ? <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-1.5">{error}</p>
      : hint && <p className="font-editorial italic text-xs text-stone mt-1.5">{hint}</p>}
  </label>
);

const FancyInput: React.FC<{
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  placeholder?: string; type?: string;
}> = ({ value, onChange, onBlur, placeholder, type = 'text' }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        placeholder={placeholder}
        className="w-full /50 border px-3.5 py-3 text-sm font-sans text-ivory placeholder:text-stone focus:outline-none rounded-card transition-colors focus:"
      />
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformOrigin: 'left center' }}
        className="absolute left-2 right-2 bottom-0 h-px bg-brass"
      />
    </div>
  );
};

const FancyTextarea: React.FC<{
  value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number;
}> = ({ value, onChange, onBlur, rows = 3 }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        className="w-full /50 border px-3.5 py-3 text-sm font-sans text-ivory placeholder:text-stone focus:outline-none rounded-card resize-y min-h-[80px] transition-colors focus:"
      />
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.22 }}
        style={{ transformOrigin: 'left center' }}
        className="absolute left-2 right-2 bottom-0 h-px bg-brass"
      />
    </div>
  );
};

const FancySelect: React.FC<{
  value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[]; placeholder: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full /50 border px-3.5 py-3 text-sm font-sans text-ivory focus:border-brass focus:outline-none rounded-card cursor-pointer"
  >
    <option value="" disabled>{placeholder}</option>
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

const ChipRadio: React.FC<{
  name: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}> = ({ name, value, onChange, options }) => (
  <div
    className="grid gap-3"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((o) => {
      const active = value === o.v;
      return (
        <motion.label
          key={o.v}
          whileTap={{ scale: 0.97 }}
          className={`relative cursor-pointer text-center py-3.5 rounded-card border font-sans text-sm transition-all ${
            active
              ? 'bg-brass/15 border-brass text-brass shadow-[0_0_20px_rgba(196,164,90,0.18)]'
              : 'bg-midnight-deep/40 border-ivory-soft/15 text-ivory-soft hover:border-brass/50 hover:text-ivory'
          }`}
        >
          <input type="radio" name={name} value={o.v} checked={active}
            onChange={(e) => onChange(e.target.value)} className="sr-only" />
          {active && (
            <motion.span
              layoutId={`chip-glow-${name}`}
              className="absolute inset-0 rounded-card border border-brass/60 pointer-events-none"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative inline-flex items-center gap-2">
            {active && <Check size={14} />}
            {o.l}
          </span>
        </motion.label>
      );
    })}
  </div>
);

// Same affordance as ChipRadio but stacked vertically — used when option
// labels are long enough that two columns would wrap awkwardly.
const ChipColumn: React.FC<{
  name: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}> = ({ name, value, onChange, options }) => (
  <div className="flex flex-col gap-2.5">
    {options.map((o) => {
      const active = value === o.v;
      return (
        <motion.label
          key={o.v}
          whileTap={{ scale: 0.985 }}
          className={`relative cursor-pointer text-left px-4 py-3 rounded-card border font-sans text-sm transition-all flex items-center gap-3 ${
            active
              ? 'bg-brass/15 border-brass text-brass shadow-[0_0_20px_rgba(196,164,90,0.18)]'
              : 'bg-midnight-deep/40 border-ivory-soft/15 text-ivory-soft hover:border-brass/50 hover:text-ivory'
          }`}
        >
          <input type="radio" name={name} value={o.v} checked={active}
            onChange={(e) => onChange(e.target.value)} className="sr-only" />
          <span className={`shrink-0 w-4 h-4 rounded-full border-2 ${active ? 'border-brass bg-brass' : 'border-ivory-soft/35'}`}>
            {active && <span className="block w-1.5 h-1.5 rounded-full mx-auto mt-[3px]" />}
          </span>
          <span>{o.l}</span>
        </motion.label>
      );
    })}
  </div>
);

const VolunteerCheckbox: React.FC<{
  checked: boolean; onChange: (v: boolean) => void;
  label: string; hint: string;
}> = ({ checked, onChange, label, hint }) => (
  <div>
    <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer group">
      <span className="relative inline-flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only" />
        <span className={`w-5 h-5 rounded-[4px] border-2 transition-colors ${checked ? 'bg-brass border-brass' : 'bg-midnight-deep/40 border-ivory-soft/30 group-hover:border-brass/60'}`} />
        <AnimatePresence>
          {checked && (
            <motion.svg
              key="check"
              viewBox="0 0 16 16" className="absolute inset-0 w-full h-full"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.path d="M3.5 8.5 L7 12 L13 5"
                fill="none" stroke="#0E1A2A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      <span className="leading-snug">{label}</span>
    </label>
    <p className="font-editorial italic text-xs text-stone mt-1.5 ml-8">{hint}</p>
  </div>
);

const ConsentCheckbox: React.FC<{
  checked: boolean; onChange: (v: boolean) => void;
  lang: 'FR' | 'EN'; t: typeof FR; error?: string | null;
}> = ({ checked, onChange, lang, t, error }) => (
  <div>
    <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer">
      <span className="relative inline-flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only" />
        <span className={`w-5 h-5 rounded-[4px] border-2 transition-colors ${checked ? 'bg-brass border-brass' : 'bg-midnight-deep/40 border-ivory-soft/30'}`} />
        <AnimatePresence>
          {checked && (
            <motion.svg
              key="check"
              viewBox="0 0 16 16" className="absolute inset-0 w-full h-full"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.path d="M3.5 8.5 L7 12 L13 5"
                fill="none" stroke="#0E1A2A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      <span>{t.consent}{' '}
        <Link to={lang === 'FR' ? '/politique-de-confidentialite' : '/en/privacy'} className="text-brass hover:underline">
          {t.privacy}
        </Link>
      </span>
    </label>
    {error && <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-1.5">{error}</p>}
  </div>
);

const BannerCard: React.FC<{
  tone: 'amber' | 'emerald' | 'blush' | 'brass';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string; body: string;
}> = ({ tone, icon: Icon, title, body }) => {
  const cls =
    tone === 'amber'   ? 'border-amber-300/30 text-amber-300' :
    tone === 'emerald' ? 'border-emerald-400/30 text-emerald-400' :
    tone === 'blush'   ? 'border-blush/30 text-blush' :
                          'border-brass/30 text-brass';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`mb-6 glass-light rounded-card p-5 flex items-start gap-3 border ${cls}`}
    >
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-display title-medieval text-sm text-ivory">{title}</p>
        <p className="font-editorial italic text-sm text-ivory-soft">{body}</p>
      </div>
    </motion.div>
  );
};

// (Overture / preamble lives in OvertureScroll.tsx; the page renders it
//  before this form mounts, then renders the auth gate, then the form.)

const SummaryScroll: React.FC<{
  form: FormState; t: typeof FR; onEdit: (id: ChapterId) => void;
}> = ({ form, t, onEdit }) => {
  const sections: Array<{ id: ChapterId; title: string; rows: [string, string][] }> = [
    { id: 1, title: t.ch1Title, rows: [
      [t.contact, form.contact || '—'],
      [t.companyName, form.companyName || '—'],
      [t.hasParticipatedBefore, form.hasParticipatedBefore === 'yes' ? t.yes : form.hasParticipatedBefore === 'no' ? t.no : '—'],
    ]},
    { id: 2, title: t.ch2Title, rows: [
      [t.description, form.description || '—'],
      [t.socials, form.socials || '—'],
      [t.phone, form.phone || '—'],
      [t.teamSize, form.teamSize || '—'],
      [t.familyVolunteerInterest, form.familyVolunteerInterest ? t.yes : t.no],
    ]},
    { id: 3, title: t.ch3Title, rows: [
      [t.kioskAppearance, form.kioskAppearance ? t[`appearance${form.kioskAppearance.charAt(0).toUpperCase() + form.kioskAppearance.slice(1)}` as keyof typeof t] as string : '—'],
      [t.kioskDimensions, form.kioskDimensions || '—'],
      [t.electricityNeed, form.electricityNeed === 'oui' ? t.electricityYes : form.electricityNeed === 'non' ? t.electricityNo : form.electricityNeed === 'phone' ? t.electricityPhone : '—'],
      [t.wantsCampingSpot, form.wantsCampingSpot === 'yes' ? t.yes : form.wantsCampingSpot === 'no' ? t.no : '—'],
    ]},
    { id: 4, title: t.ch4Title, rows: [
      [t.regionOfOrigin, form.regionOfOrigin || '—'],
      [t.firstTimeSource, form.firstTimeSource || '—'],
      [t.otherQuestions, form.otherQuestions || '—'],
    ]},
  ];

  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.id} className="border rounded-card p-4 md:p-5 /30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display title-medieval text-base text-brass">{s.title}</h3>
            <button type="button" onClick={() => onEdit(s.id)}
              className="inline-flex items-center gap-1.5 text-xs font-sans uppercase tracking-wider text-ivory-soft hover:text-brass transition">
              <Edit3 size={12} /> {t.edit}
            </button>
          </div>
          <dl className="space-y-1.5 font-sans text-sm">
            {s.rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-3">
                <dt className="font-editorial italic text-stone truncate">{k}</dt>
                <dd className="text-ivory-soft whitespace-pre-line break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

// ─── Invoice ──────────────────────────────────────────────────────
// Live price summary shown on the final chapter. Reads the picked
// kiosk size + camping flag, computes the total, lets the user flip
// the dimension display between imperial (the canonical unit) and
// metric (information only — price is unaffected).
const KIOSK_PRICE: Record<string, number> = {
  '10x10': 110,
  '10x15': 165,
  '10x20': 220,
};
const CAMPING_FEE = 30;

const InvoicePanel: React.FC<{
  size: string;
  camping: boolean;
  metric: boolean;
  onToggleMetric: (v: boolean) => void;
  t: typeof FR;
}> = ({ size, camping, metric, onToggleMetric, t }) => {
  const kioskAmount  = KIOSK_PRICE[size] ?? 0;
  const campingAmount = camping ? CAMPING_FEE : 0;
  const total = kioskAmount + campingAmount;

  const sizeImperial = size ? size.replace('x', ' × ') + ' pi' : '—';
  // Conversion uses 1 ft = 0.305 m, rounded to 0.05 m for clean display.
  const toMetric = (s: string) => {
    if (!s) return '—';
    const [a, b] = s.split('x').map(Number);
    const round = (n: number) => Math.round(n * 0.305 * 20) / 20;
    return `${round(a)} × ${round(b)} m`;
  };
  const sizeLabel = metric ? toMetric(size) : sizeImperial;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
      className="mt-6 relative rounded-card border border-amber-300/30 /40 p-5 md:p-6 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={parchmentBg} aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-display title-medieval text-[10px] md:text-xs text-amber-300 uppercase tracking-[0.3em]">
              {t.invoiceEyebrow}
            </p>
            <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory copper-sheen leading-none mt-1">
              {t.invoiceTitle}
            </h3>
          </div>
          <UnitsSwitch metric={metric} onChange={onToggleMetric} labelImperial={t.imperial} labelMetric={t.metric} />
        </div>

        <dl className="space-y-2.5 font-sans text-sm pt-3">
          <Line label={`${t.kioskFee} — ${sizeLabel}`} amount={kioskAmount} disabled={!size} />
          {camping && <Line label={t.campingFee} amount={campingAmount} />}
          <div className="border-t border-amber-300/30 pt-3 mt-3 flex items-center justify-between">
            <span className="font-display title-medieval text-base text-ivory uppercase tracking-widest">{t.total}</span>
            <span className="font-display title-medieval text-2xl md:text-3xl copper-sheen tabular-nums">${total}</span>
          </div>
        </dl>

        <p className="font-editorial italic text-xs text-stone mt-4 leading-relaxed">
          {t.invoiceNote}
        </p>
      </div>
    </motion.div>
  );
};

const Line: React.FC<{ label: string; amount: number; disabled?: boolean }> = ({ label, amount, disabled }) => (
  <div className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-50' : ''}`}>
    <dt className="font-editorial italic text-ivory-soft truncate">{label}</dt>
    <dd className="font-sans tabular-nums text-ivory">{disabled ? '—' : `$${amount}`}</dd>
  </div>
);

const UnitsSwitch: React.FC<{
  metric: boolean; onChange: (v: boolean) => void;
  labelImperial: string; labelMetric: string;
}> = ({ metric, onChange, labelImperial, labelMetric }) => (
  <button
    type="button"
    onClick={() => onChange(!metric)}
    className="relative inline-flex items-center /60 border rounded-pill p-0.5 font-sans text-[10px] uppercase tracking-widest text-ivory-soft"
    aria-label="Units toggle"
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      className="absolute top-0.5 bottom-0.5 rounded-pill bg-brass shadow-[0_0_14px_rgba(232,177,74,0.4)]"
      style={{ left: metric ? '50%' : '0.125rem', right: metric ? '0.125rem' : '50%' }}
    />
    <span className={`relative px-3 py-1.5 transition-colors ${!metric ? 'text-midnight-deep' : ''}`}>{labelImperial}</span>
    <span className={`relative px-3 py-1.5 transition-colors ${metric ? 'text-midnight-deep' : ''}`}>{labelMetric}</span>
  </button>
);

// ─── Decorative parchment grain (inline SVG noise) ────────────────
const parchmentBg: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.77  0 0 0 0 0.64  0 0 0 0 0.35  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
};

// ─── Translations ────────────────────────────────────────────────
const FR = {
  signedInAs: 'Connecté en tant que',
  rereadIntro: 'Relire l’introduction',
  hydrating: 'Chargement de votre inscription…',
  back: 'Précédent', next: 'Suivant', edit: 'Modifier',
  seal: 'Sceller mon engagement', update: 'Mettre à jour mon inscription', sealing: 'Scellement…',
  yes: 'Oui', no: 'Non',
  error: 'Une erreur est survenue.',
  errRequired: 'Champ requis.',

  // chapter labels (journey path) — 5 entries, last is the seal step
  chapterLabels: ['La Caravane', 'Votre Métier', 'La Tente', 'Le Voyage', 'Le Sceau'],

  // I — La Caravane
  ch1Eyebrow: 'Présentez-vous, voyageur',
  ch1Title:   'La Caravane',
  ch1Lead:    'Quelques mots sur vous et votre maison.',
  contact:               'Votre nom',
  contactPlaceholder:    'Prénom et nom',
  companyName:           'Nom de votre compagnie / entreprise',
  hasParticipatedBefore: 'Avez-vous déjà tenu kiosque chez nous ?',

  // II — Votre Métier
  ch2Eyebrow: 'Quel est votre art ?',
  ch2Title:   'Votre Métier',
  ch2Lead:    'Décrivez ce que vous offrez et qui compose votre équipe.',
  description:                'Description de votre métier / artisanat / produit',
  descriptionHint:            'Style, gamme de prix, démonstrations, etc.',
  socials:                    'Site web / réseaux sociaux / Instagram',
  socialsHint:                'Pour que nous puissions vous inclure dans la section artisans de notre site web.',
  phone:                      'Numéro de téléphone',
  teamSize:                   'Combien serez-vous dans votre équipe ?',
  teamSizeHint:               'Artisans, famille, assistants — nous fournissons jusqu’à 4 bracelets d’entrée par espace de 10x10.',
  teamSizePlaceholder:        'ex. 2 personnes',
  mediaEyebrow:                'Identité visuelle',
  mediaLead:                   'Ces images servent à monter votre kiosque sur notre site. Téléversez la meilleure qualité possible.',
  logoLabel:                   'Logo',
  logoHint:                    'PNG transparent, format carré idéalement (≥ 600 px).',
  mainPhotoLabel:              'Photo principale',
  mainPhotoHint:               'JPG ou PNG haute qualité (≥ 1 600 px de large).',
  mediaError:                  'Le logo et la photo principale sont requis.',
  familyVolunteerInterest:     'Quelqu’un de votre équipe voudrait être bénévole.',
  familyVolunteerInterestHint: 'Cochez : nous ouvrirons la page bénévole en cliquant « Suivant ».',

  // III — La Tente
  ch3Eyebrow: 'Décrivez votre kiosque',
  ch3Title:   'La Tente',
  ch3Lead:    'Quelques détails sur votre installation.',
  kioskAppearance:     'Apparence du kiosque',
  kioskAppearancePick: 'Choisir une apparence',
  appearanceModerne:   'Moderne',
  appearanceMedievale: 'Médiévale / historique / reconstitution',
  appearanceDecore:    'Pas reconstitution, mais super beau et bien décoré',
  appearanceIncertain: 'Première fois en événement médiéval — je ne sais pas !',
  kioskDimensions:     'Dimensions de votre kiosque',
  electricityNeed:     'Avez-vous 100 % besoin d’électricité pour vendre ?',
  electricityNeedHint: 'L’accès à l’électricité est limité sur notre terrain.',
  electricityYes:      'Oui — j’en ai vraiment besoin',
  electricityNo:       'Non',
  electricityPhone:    'Non, mais j’aimerais charger ma téléphone des fois',
  wantsCampingSpot:    'Voulez-vous une place pour camper sur place ?',

  // IV — Le Voyage
  ch4Eyebrow: 'D’où venez-vous ?',
  ch4Title:   'Le Voyage',
  ch4Lead:    'Quelques mots sur vos racines et vos questions.',
  regionOfOrigin:  'Région / village d’origine',
  firstTimeSource: 'Si c’est votre 1re inscription, comment nous avez-vous connus ?',
  otherQuestions:  'Questions ou autres informations à partager',
  consent:         'J’ai lu et j’accepte la',
  privacy:         'politique de confidentialité',

  // V — Le Sceau
  ch5Eyebrow: 'Le pacte est prêt',
  ch5Title:   'Sceller votre engagement',
  ch5Lead:    'Relisez vos réponses, puis apposez le sceau.',

  // Invoice
  invoiceEyebrow: 'Estimation',
  invoiceTitle:   'Votre kiosque',
  imperial:       'Pieds',
  metric:         'Mètres',
  kioskFee:       'Kiosque',
  campingFee:     'Place de camping',
  total:          'Total',
  invoiceNote:    'Le paiement se fait par lien Zeffy après l’acceptation de votre candidature. Vous recevrez un courriel de confirmation.',

  // status banners
  statusPrefix: 'Statut',
  status: { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée', waitlist: 'Liste d’attente' } as Record<'pending' | 'accepted' | 'rejected' | 'waitlist', string>,
  editLead: 'Vous pouvez mettre à jour votre inscription tant qu’elle est en attente.',
  waitlistTitle: 'Inscriptions fermées — liste d’attente',
  waitlistBody:  'Les inscriptions principales sont closes. Vous pouvez tout de même soumettre votre candidature : elle sera ajoutée à la liste d’attente.',

  // sealed
  sealedTitle: 'Pacte scellé !',
  sealedBody:  'Nous étudions votre candidature et vous reviendrons sous peu via votre compte FMM.',
};

const EN: typeof FR = {
  signedInAs: 'Signed in as',
  rereadIntro: 'Re-read the introduction',
  hydrating: 'Loading your registration…',
  back: 'Back', next: 'Next', edit: 'Edit',
  seal: 'Seal my pact', update: 'Update my registration', sealing: 'Sealing…',
  yes: 'Yes', no: 'No',
  error: 'Something went wrong.',
  errRequired: 'Required field.',

  chapterLabels: ['The Caravan', 'Your Craft', 'The Tent', 'The Journey', 'The Seal'],

  ch1Eyebrow: 'Introduce yourself, traveller',
  ch1Title:   'The Caravan',
  ch1Lead:    'A few words about you and your house.',
  contact:               'Your name',
  contactPlaceholder:    'First and last name',
  companyName:           'Company / business name',
  hasParticipatedBefore: 'Have you held a kiosk with us before?',

  ch2Eyebrow: 'What is your craft?',
  ch2Title:   'Your Craft',
  ch2Lead:    'Tell us what you offer and who is on your team.',
  description:                'Description of your craft / product',
  descriptionHint:            'Style, price range, demos, etc.',
  socials:                    'Website / social media / Instagram',
  socialsHint:                'So we can include you in the artisans section of our website.',
  phone:                      'Phone number',
  teamSize:                   'How many on your team?',
  teamSizeHint:               'Artisans, family, assistants — we provide up to 4 entry wristbands per 10x10 space.',
  teamSizePlaceholder:        'e.g. 2 people',
  mediaEyebrow:                'Visual identity',
  mediaLead:                   'These images are used to build your kiosk page on our site. Upload the best quality you have.',
  logoLabel:                   'Logo',
  logoHint:                    'Transparent PNG, square format ideally (≥ 600 px).',
  mainPhotoLabel:              'Main photo',
  mainPhotoHint:               'High-quality JPG or PNG (≥ 1,600 px wide).',
  mediaError:                  'Logo and main photo are required.',
  familyVolunteerInterest:     'Someone in my team would like to volunteer.',
  familyVolunteerInterestHint: 'Tick this and we’ll open the volunteer page when you click "Next".',

  ch3Eyebrow: 'Describe your kiosk',
  ch3Title:   'The Tent',
  ch3Lead:    'A few details about your setup.',
  kioskAppearance:     'Kiosk appearance',
  kioskAppearancePick: 'Choose an appearance',
  appearanceModerne:   'Modern',
  appearanceMedievale: 'Medieval / historical / reenactment',
  appearanceDecore:    'Not reenactment, but beautifully themed',
  appearanceIncertain: 'First time at a medieval event — not sure!',
  kioskDimensions:     'Kiosk dimensions',
  electricityNeed:     'Do you 100% need electricity to sell?',
  electricityNeedHint: 'Electricity access on site is limited.',
  electricityYes:      'Yes — I really need it',
  electricityNo:       'No',
  electricityPhone:    'No, but I would like to charge my phone occasionally',
  wantsCampingSpot:    'Would you like a camping spot on site?',

  ch4Eyebrow: 'Where do you come from?',
  ch4Title:   'The Journey',
  ch4Lead:    'Tell us about your roots and any questions.',
  regionOfOrigin:  'Region / village of origin',
  firstTimeSource: 'If first registration, how did you hear about us?',
  otherQuestions:  'Questions or other info to share',
  consent:         'I have read and accept the',
  privacy:         'privacy policy',

  ch5Eyebrow: 'The pact is ready',
  ch5Title:   'Seal your pact',
  ch5Lead:    'Review your answers, then place the seal.',

  // Invoice
  invoiceEyebrow: 'Estimate',
  invoiceTitle:   'Your kiosk',
  imperial:       'Feet',
  metric:         'Metres',
  kioskFee:       'Kiosk',
  campingFee:     'Camping spot',
  total:          'Total',
  invoiceNote:    'Payment is made via a Zeffy link after your application is accepted. You will receive a confirmation email.',

  statusPrefix: 'Status',
  status: { pending: 'Pending', accepted: 'Accepted', rejected: 'Declined', waitlist: 'Wait list' },
  editLead: 'You can update your registration while it is pending.',
  waitlistTitle: 'Registrations closed — wait list',
  waitlistBody:  'Main registrations are closed. You can still submit your application: it will be added to the wait list.',

  sealedTitle: 'Pact sealed!',
  sealedBody:  'We are reviewing your application and will respond shortly via your FMM account.',
};

export default VendorQuestForm;
