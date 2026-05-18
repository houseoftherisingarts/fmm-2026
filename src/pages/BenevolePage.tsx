import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {ArrowUpRight, Check, LogIn, AlertCircle, BadgeCheck, Lock, ChevronLeft, ChevronRight, } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  getBenevoleApp, upsertBenevoleApp,
  type BenevoleApp,
  type BenevoleDay, type BenevoleStation, type BenevoleStationPref,
  type BenevoleHeardFrom, type BenevolePronouns, type BenevoleAgeRange,
  type BenevoleYesNoMaybe, type BenevolePriorFMM, type BenevoleTShirt,
} from '../firebase/applications';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// Two-page bénévole application form, mirrors Maïté's Google Form
// ("Recrutement des bénévoles - FMM 2026"). Page 1 captures preferences,
// page 2 captures personal info. State is hydrated from any existing
// Firestore record so the form doubles as an editor for returning
// bénévoles. Submits to /benevoles/{uid}.

const SHOWCASE_IN_DEV = import.meta.env.DEV;

const STATIONS: { id: BenevoleStation; fr: string; en: string; emoji: string }[] = [
  { id: 'bar',           fr: 'Bar / Taverne',     en: 'Bar / Tavern',         emoji: '🍺' },
  { id: 'accueil',       fr: 'Accueil',           en: 'Welcome / Box-office', emoji: '🎟️' },
  { id: 'securite',      fr: 'Sécurité',          en: 'Security',             emoji: '🛡️' },
  { id: 'camping',       fr: 'Camping',           en: 'Camping',              emoji: '⛺' },
  { id: 'entretien',     fr: 'Entretien du site', en: 'Site upkeep',          emoji: '🧹' },
  { id: 'stationnement', fr: 'Stationnement',     en: 'Parking',              emoji: '🅿️' },
];
const DAYS: { id: BenevoleDay; fr: string; en: string }[] = [
  { id: 'vendredi',  fr: 'Vendredi 25 sept.', en: 'Friday 25 Sept' },
  { id: 'samedi',    fr: 'Samedi 26 sept.',   en: 'Saturday 26 Sept' },
  { id: 'dimanche',  fr: 'Dimanche 27 sept.', en: 'Sunday 27 Sept' },
  { id: 'incertain', fr: 'Je ne sais pas encore', en: "I'm not sure yet" },
];
const STATION_PREF_LABELS: Record<BenevoleStationPref | 'unset', { fr: string; en: string; tone: string }> = {
  1:            { fr: '1 — Mon préféré',       en: '1 — My pick',         tone: 'bg-brass text-midnight-deep border-brass' },
  2:            { fr: '2 — Si besoin',          en: '2 — If needed',       tone: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' },
  3:            { fr: '3 — Pas pour moi',       en: '3 — Not for me',      tone: 'bg-blush/15 border-blush/40 text-blush' },
  'learn-more': { fr: '? — En apprendre plus', en: '? — Tell me more',    tone: 'bg-blue-300/15 border-blue-300/40 text-blue-300' },
  unset:        { fr: '—',                      en: '—',                   tone: 'border-ivory-soft/20 text-ivory-soft/60' },
};
const HEARD_FROM: { id: BenevoleHeardFrom; fr: string; en: string }[] = [
  { id: 'reseaux',          fr: 'Réseaux sociaux (Facebook, Instagram…)', en: 'Social networks (Facebook, Instagram…)' },
  { id: 'site',             fr: 'Site web',                                 en: 'Website' },
  { id: 'bouche-a-oreille', fr: 'Bouche-à-oreille',                         en: 'Word of mouth' },
  { id: 'affiche',          fr: 'Affiche dans un magasin',                  en: 'Poster in a store' },
  { id: 'autre',            fr: 'Autre (précisez)',                         en: 'Other (specify)' },
];
const PRONOUNS: { id: BenevolePronouns; fr: string; en: string }[] = [
  { id: 'il',          fr: 'Il',                       en: 'He/Him' },
  { id: 'elle',        fr: 'Elle',                     en: 'She/Her' },
  { id: 'iel',         fr: 'Iel',                      en: 'They/Them' },
  { id: 'prefer-not',  fr: 'Je préfère ne pas répondre', en: 'Prefer not to say' },
  { id: 'autre',       fr: 'Autre (précisez)',           en: 'Other (specify)' },
];
const AGE_RANGES: { id: BenevoleAgeRange; fr: string; en: string }[] = [
  { id: 'lt18',  fr: 'Moins de 18 ans', en: 'Under 18' },
  { id: '18-25', fr: '18 – 25 ans',     en: '18 – 25' },
  { id: '25-40', fr: '25 – 40 ans',     en: '25 – 40' },
  { id: '40-60', fr: '40 – 60 ans',     en: '40 – 60' },
  { id: '60+',   fr: '60 ans et plus',  en: '60+' },
];
const TSHIRT: BenevoleTShirt[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'autre'];
const PRIOR_FMM: { id: BenevolePriorFMM; fr: string; en: string }[] = [
  { id: 'one',      fr: 'Oui, 1 fois',           en: 'Yes, 1 time' },
  { id: 'multiple', fr: 'Oui, plusieurs années', en: 'Yes, several years' },
  { id: 'never',    fr: 'Non jamais',            en: 'No, never' },
];

interface FormState {
  // page 1
  daysAvailable: BenevoleDay[];
  stationPreferences: Partial<Record<BenevoleStation, BenevoleStationPref>>;
  heardFrom?: BenevoleHeardFrom;
  heardFromOther: string;
  message: string;            // why volunteer
  // page 2
  prenom: string;
  nom: string;
  pronouns?: BenevolePronouns;
  pronounsOther: string;
  ageRange?: BenevoleAgeRange;
  minorGuardianPresent?: BenevoleYesNoMaybe;
  telephone: string;
  tShirtSize?: BenevoleTShirt;
  tShirtSizeOther: string;
  allergies: string;
  dietaryNotes: string;
  needsCamping?: BenevoleYesNoMaybe;
  priorVolunteerFMM?: BenevolePriorFMM;
  priorVolunteerOther?: boolean;
  otherComments: string;
  consent: boolean;
}
const EMPTY: FormState = {
  daysAvailable: [],
  stationPreferences: {},
  heardFromOther: '',
  message: '',
  prenom: '', nom: '',
  pronounsOther: '',
  telephone: '',
  tShirtSizeOther: '',
  allergies: '',
  dietaryNotes: '',
  otherComments: '',
  consent: false,
};

const BenevolePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const { user, openSignIn } = useAuth();
  const navigate = useNavigate();
  const spaceUrl = lang === 'FR' ? '/espace-benevole' : '/en/volunteer-space';

  const onApprovedClick = () => {
    if (!user) { openSignIn(); return; }
    navigate(spaceUrl);
  };

  const [page, setPage]   = useState<1 | 2>(1);
  const [form, setForm]   = useState<FormState>(EMPTY);
  const [existing, setExisting] = useState<BenevoleApp | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);

  // Hydrate from existing record
  useEffect(() => {
    if (!user) { setExisting(null); return; }
    setHydrating(true);
    getBenevoleApp(user.uid).then((b) => {
      setExisting(b);
      if (b) {
        setForm({
          daysAvailable:     b.daysAvailable      || [],
          stationPreferences: b.stationPreferences || {},
          heardFrom:         b.heardFrom,
          heardFromOther:    b.heardFromOther     || '',
          message:           b.message             || '',
          prenom:            b.prenom              || '',
          nom:               b.nom                 || '',
          pronouns:          b.pronouns,
          pronounsOther:     b.pronounsOther      || '',
          ageRange:          b.ageRange,
          minorGuardianPresent: b.minorGuardianPresent,
          telephone:         b.telephone           || '',
          tShirtSize:        b.tShirtSize,
          tShirtSizeOther:   b.tShirtSizeOther    || '',
          allergies:         b.allergies           || '',
          dietaryNotes:      b.dietaryNotes        || '',
          needsCamping:      b.needsCamping,
          priorVolunteerFMM: b.priorVolunteerFMM,
          priorVolunteerOther: b.priorVolunteerOther,
          otherComments:     b.otherComments      || '',
          consent: true,
        });
      }
      setHydrating(false);
    });
  }, [user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Page 1 validation: at least one day picked + at least one station preference + heard-from + message.
  const page1Valid = useMemo(() => {
    return form.daysAvailable.length > 0
        && Object.keys(form.stationPreferences).length >= 1
        && !!form.heardFrom
        && (form.heardFrom !== 'autre' || form.heardFromOther.trim().length >= 2)
        && form.message.trim().length >= 10;
  }, [form]);

  const page2Valid = useMemo(() => {
    const baseOk =
      form.prenom.trim().length > 0 &&
      form.nom.trim().length > 0 &&
      !!form.ageRange &&
      form.telephone.trim().length >= 7 &&
      !!form.tShirtSize &&
      form.allergies.trim().length > 0 &&
      !!form.needsCamping &&
      !!form.priorVolunteerFMM &&
      typeof form.priorVolunteerOther === 'boolean' &&
      form.consent;
    if (form.ageRange === 'lt18' && !form.minorGuardianPresent) return false;
    if (form.tShirtSize === 'autre' && form.tShirtSizeOther.trim().length < 1) return false;
    if (form.pronouns === 'autre' && form.pronounsOther.trim().length < 1) return false;
    return baseOk;
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !page2Valid) return;
    setStatus('submitting'); setErrMsg(null);
    console.info('[benevole-form] submitting', { uid: user.uid, email: user.email });
    try {
      const app: BenevoleApp = {
        uid:         user.uid,
        email:       user.email || '',
        displayName: user.displayName || `${form.prenom} ${form.nom}`,
        prenom:      form.prenom,
        nom:         form.nom,
        telephone:   form.telephone,
        message:     form.message,
        status:      existing?.status || 'pending',
        adminNotes:  existing?.adminNotes,
        year:        2026,
        createdAt:   existing?.createdAt,
        // Page 1
        daysAvailable:      form.daysAvailable,
        stationPreferences: form.stationPreferences,
        heardFrom:          form.heardFrom,
        heardFromOther:     form.heardFrom === 'autre' ? form.heardFromOther.trim() : undefined,
        // Page 2
        pronouns:      form.pronouns,
        pronounsOther: form.pronouns === 'autre' ? form.pronounsOther.trim() : undefined,
        ageRange:      form.ageRange,
        minorGuardianPresent: form.ageRange === 'lt18' ? form.minorGuardianPresent : undefined,
        tShirtSize:    form.tShirtSize,
        tShirtSizeOther: form.tShirtSize === 'autre' ? form.tShirtSizeOther.trim() : undefined,
        allergies:     form.allergies.trim(),
        dietaryNotes:  form.dietaryNotes.trim() || undefined,
        needsCamping:  form.needsCamping,
        priorVolunteerFMM:   form.priorVolunteerFMM,
        priorVolunteerOther: form.priorVolunteerOther,
        otherComments: form.otherComments.trim() || undefined,
      };
      await upsertBenevoleApp(app);
      console.info('[benevole-form] write OK');
      setExisting(app);
      setStatus('sent');
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err) ? `[${(err as { code: string }).code}] ` : '';
      const msg  = err instanceof Error ? err.message : String(err);
      console.error('[benevole-form] write FAILED', err);
      setStatus('error');
      setErrMsg(`${code}${msg}`);
    }
  };

  return (
    <>
      <SEO title={t.title} description={t.intro1} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro1}
        orbImage="/wix/benevole/4fc431fd.jpg"
        orbImagePosition="left center"
      />

      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-6 md:gap-8">

          {/* ── Form ── */}
          <div className="lg:col-span-8">
            {!user ? (
              <div className="glass-light rounded-lg-card p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                  <LogIn size={26} className="text-brass" />
                </div>
                <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.authTitle}</h2>
                <p className="font-editorial text-base md:text-lg text-ivory-soft mb-7 max-w-md mx-auto">{t.authBody}</p>
                <button onClick={openSignIn}
                  className="inline-flex items-center gap-2 px-7 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition rounded-card">
                  {t.signInCta} <ArrowUpRight size={16} />
                </button>
              </div>
            ) : status === 'sent' ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="glass-light rounded-lg-card p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                  <Check size={26} className="text-brass" />
                </div>
                <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.thanksTitle}</h2>
                <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-md mx-auto mb-6">{t.thanksBody}</p>
                <Link to={addLocale('/compte', lang)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                  {t.toAccount} <ArrowUpRight size={14} />
                </Link>
              </motion.div>
            ) : (
              <>
                {/* Status banner */}
                {existing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="mb-6 glass-light rounded-card p-5 flex items-center gap-3"
                  >
                    <AlertCircle size={20} className={existing.status === 'accepted' ? 'text-emerald-400' : existing.status === 'rejected' ? 'text-blush' : 'text-brass'} />
                    <div>
                      <p className="font-display title-medieval text-sm text-ivory">
                        {t.statusPrefix}: <span className={existing.status === 'accepted' ? 'text-emerald-400' : existing.status === 'rejected' ? 'text-blush' : 'text-brass'}>{t.status[existing.status]}</span>
                      </p>
                      <p className="font-editorial italic text-sm text-ivory-soft">{t.editLead}</p>
                    </div>
                  </motion.div>
                )}

                {/* Submission error banner — top-of-form, hard to miss */}
                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-5 rounded-card border border-blush/40 bg-blush/10 px-5 py-4 flex items-start gap-3"
                  >
                    <AlertCircle size={18} className="text-blush shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display title-medieval text-sm text-blush mb-1">
                        {lang === 'FR' ? 'Échec de l’envoi' : 'Submission failed'}
                      </p>
                      <p className="font-editorial italic text-xs text-ivory-soft break-words">
                        {errMsg || t.error}
                      </p>
                      <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-1.5">
                        {lang === 'FR'
                          ? 'Vérifiez votre connexion, puis réessayez. Les détails sont dans la console du navigateur.'
                          : 'Check your connection and try again. Details in the browser console.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-5">
                  <Step n={1} active={page === 1} done={page === 2} label={t.step1} />
                  <div className="flex-1 h-px bg-ivory-soft/15" />
                  <Step n={2} active={page === 2} done={false} label={t.step2} />
                </div>

                <form onSubmit={onSubmit} className="glass-light rounded-lg-card p-7 md:p-10 space-y-7">
                  {hydrating && <p className="text-sm font-editorial italic text-ivory-soft text-center">{t.hydrating}</p>}

                  <AnimatePresence mode="wait">
                    {page === 1 ? (
                      <motion.div key="p1"
                        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-7"
                      >
                        {/* Q1 — days */}
                        <Question label={t.q1Label} sub={t.q1Sub} required>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {DAYS.map((d) => {
                              const checked = form.daysAvailable.includes(d.id);
                              return (
                                <label key={d.id} className={`cursor-pointer select-none flex items-center gap-2.5 px-3 py-2.5 rounded-card border transition ${
                                  checked ? 'border-brass bg-brass/10' : 'border-ivory-soft/20 hover:border-brass/50'
                                }`}>
                                  <input type="checkbox" checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...form.daysAvailable, d.id]
                                        : form.daysAvailable.filter((x) => x !== d.id);
                                      set('daysAvailable', next);
                                    }}
                                    className="w-4 h-4 accent-brass" />
                                  <span className="font-sans text-sm text-ivory">{lang === 'FR' ? d.fr : d.en}</span>
                                </label>
                              );
                            })}
                          </div>
                        </Question>

                        {/* Q2 — station preferences (1/2/3/learn-more) */}
                        <Question label={t.q2Label} sub={t.q2Sub} required>
                          <div className="space-y-2">
                            {STATIONS.map((s) => {
                              const cur = form.stationPreferences[s.id];
                              return (
                                <div key={s.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-card border /30">
                                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2 min-w-0">
                                    <span className="text-base shrink-0">{s.emoji}</span>
                                    <span className="font-display title-medieval text-sm text-ivory truncate">{lang === 'FR' ? s.fr : s.en}</span>
                                  </div>
                                  <div className="col-span-12 sm:col-span-8 flex flex-wrap gap-1.5">
                                    {([1, 2, 3, 'learn-more'] as BenevoleStationPref[]).map((p) => {
                                      const active = cur === p;
                                      const meta = STATION_PREF_LABELS[p];
                                      return (
                                        <button key={String(p)} type="button"
                                          onClick={() => {
                                            const next = { ...form.stationPreferences };
                                            if (active) delete next[s.id];
                                            else        next[s.id] = p;
                                            set('stationPreferences', next);
                                          }}
                                          className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-card border font-sans uppercase tracking-wider text-[11px] sm:text-[10px] transition ${
                                            active ? meta.tone : 'border-ivory-soft/15 text-ivory-soft/70 hover:border-brass/50 hover:text-ivory'
                                          }`}
                                        >
                                          {lang === 'FR' ? meta.fr : meta.en}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Question>

                        {/* Q3 — heard from */}
                        <Question label={t.q3Label} required>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {HEARD_FROM.map((h) => {
                              const checked = form.heardFrom === h.id;
                              return (
                                <label key={h.id} className={`cursor-pointer select-none flex items-center gap-2.5 px-3 py-2.5 rounded-card border transition ${
                                  checked ? 'border-brass bg-brass/10' : 'border-ivory-soft/20 hover:border-brass/50'
                                }`}>
                                  <input type="radio" name="heardFrom" checked={checked}
                                    onChange={() => set('heardFrom', h.id)}
                                    className="w-4 h-4 accent-brass" />
                                  <span className="font-sans text-sm text-ivory">{lang === 'FR' ? h.fr : h.en}</span>
                                </label>
                              );
                            })}
                          </div>
                          {form.heardFrom === 'autre' && (
                            <input value={form.heardFromOther} onChange={(e) => set('heardFromOther', e.target.value)}
                              placeholder={t.heardFromOtherPlaceholder}
                              className={`${inputCls} mt-2`} required />
                          )}
                        </Question>

                        {/* Q4 — why volunteer */}
                        <Question label={t.q4Label} required>
                          <textarea rows={4} value={form.message} onChange={(e) => set('message', e.target.value)}
                            placeholder={t.q4Placeholder}
                            className={`${inputCls} resize-y min-h-[120px]`} />
                        </Question>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button type="button"
                            disabled={!page1Valid}
                            onClick={() => setPage(2)}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40 disabled:cursor-not-allowed">
                            {t.next} <ChevronRight size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="p2"
                        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-7"
                      >
                        {/* Identity */}
                        <Question label={t.q5Label} required>
                          <div className="grid sm:grid-cols-2 gap-2">
                            <input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} placeholder={t.prenom} required className={inputCls} />
                            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder={t.nom} required className={inputCls} />
                          </div>
                        </Question>

                        {/* Pronouns */}
                        <Question label={t.q6Label}>
                          <div className="flex flex-wrap gap-1.5">
                            {PRONOUNS.map((p) => {
                              const active = form.pronouns === p.id;
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => set('pronouns', p.id)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{lang === 'FR' ? p.fr : p.en}</button>
                              );
                            })}
                          </div>
                          {form.pronouns === 'autre' && (
                            <input value={form.pronounsOther} onChange={(e) => set('pronounsOther', e.target.value)}
                              placeholder={t.pronounsOtherPlaceholder}
                              className={`${inputCls} mt-2`} />
                          )}
                        </Question>

                        {/* Age range */}
                        <Question label={t.q7Label} required>
                          <div className="flex flex-wrap gap-1.5">
                            {AGE_RANGES.map((a) => {
                              const active = form.ageRange === a.id;
                              return (
                                <button key={a.id} type="button"
                                  onClick={() => set('ageRange', a.id)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{lang === 'FR' ? a.fr : a.en}</button>
                              );
                            })}
                          </div>
                        </Question>

                        {/* If <18, guardian present */}
                        {form.ageRange === 'lt18' && (
                          <Question label={t.q8Label} sub={t.q8Sub} required>
                            <div className="flex flex-wrap gap-1.5">
                              {(['oui', 'non', 'incertain'] as BenevoleYesNoMaybe[]).map((y) => {
                                const active = form.minorGuardianPresent === y;
                                return (
                                  <button key={y} type="button"
                                    onClick={() => set('minorGuardianPresent', y)}
                                    className={`px-3 py-1.5 rounded-card border font-sans text-xs transition capitalize ${
                                      active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                    }`}
                                  >{y === 'incertain' ? (lang === 'FR' ? 'Je ne sais pas encore' : "Not sure yet") : (y === 'oui' ? (lang === 'FR' ? 'Oui' : 'Yes') : (lang === 'FR' ? 'Non' : 'No'))}</button>
                                );
                              })}
                            </div>
                          </Question>
                        )}

                        {/* Phone */}
                        <Question label={t.q9Label} required>
                          <input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} required className={inputCls} placeholder="819-555-0107" />
                        </Question>

                        {/* T-shirt */}
                        <Question label={t.q10Label} required>
                          <div className="flex flex-wrap gap-1.5">
                            {TSHIRT.map((s) => {
                              const active = form.tShirtSize === s;
                              return (
                                <button key={s} type="button"
                                  onClick={() => set('tShirtSize', s)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition uppercase tracking-wider ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{s === 'autre' ? (lang === 'FR' ? 'Autre' : 'Other') : s}</button>
                              );
                            })}
                          </div>
                          {form.tShirtSize === 'autre' && (
                            <input value={form.tShirtSizeOther} onChange={(e) => set('tShirtSizeOther', e.target.value)}
                              placeholder={t.tShirtOtherPlaceholder}
                              className={`${inputCls} mt-2`} />
                          )}
                        </Question>

                        {/* Allergies */}
                        <Question label={t.q11Label} required>
                          <input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} required className={inputCls}
                            placeholder={lang === 'FR' ? 'Aucune / liste précise' : 'None / specific list'} />
                        </Question>

                        {/* Dietary */}
                        <Question label={t.q12Label}>
                          <input value={form.dietaryNotes} onChange={(e) => set('dietaryNotes', e.target.value)} className={inputCls}
                            placeholder={lang === 'FR' ? 'Végétarien, sans gluten, etc.' : 'Vegetarian, gluten-free, etc.'} />
                        </Question>

                        {/* Camping */}
                        <Question label={t.q13Label} sub={t.q13Sub} required>
                          <div className="flex flex-wrap gap-1.5">
                            {(['oui', 'non', 'incertain'] as BenevoleYesNoMaybe[]).map((y) => {
                              const active = form.needsCamping === y;
                              return (
                                <button key={y} type="button"
                                  onClick={() => set('needsCamping', y)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{y === 'incertain'
                                  ? (lang === 'FR' ? 'Peut-être' : 'Maybe')
                                  : (y === 'oui' ? (lang === 'FR' ? 'Oui' : 'Yes') : (lang === 'FR' ? 'Non' : 'No'))
                                }</button>
                              );
                            })}
                          </div>
                        </Question>

                        {/* Prior FMM */}
                        <Question label={t.q14Label} required>
                          <div className="flex flex-wrap gap-1.5">
                            {PRIOR_FMM.map((p) => {
                              const active = form.priorVolunteerFMM === p.id;
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => set('priorVolunteerFMM', p.id)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{lang === 'FR' ? p.fr : p.en}</button>
                              );
                            })}
                          </div>
                        </Question>

                        {/* Prior other festivals */}
                        <Question label={t.q15Label} required>
                          <div className="flex flex-wrap gap-1.5">
                            {[true, false].map((b) => {
                              const active = form.priorVolunteerOther === b;
                              return (
                                <button key={String(b)} type="button"
                                  onClick={() => set('priorVolunteerOther', b)}
                                  className={`px-3 py-1.5 rounded-card border font-sans text-xs transition ${
                                    active ? 'border-brass bg-brass/15 text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50'
                                  }`}
                                >{b ? (lang === 'FR' ? 'Oui' : 'Yes') : (lang === 'FR' ? 'Non' : 'No')}</button>
                              );
                            })}
                          </div>
                        </Question>

                        {/* Other comments */}
                        <Question label={t.q16Label} sub={t.q16Sub}>
                          <textarea rows={3} value={form.otherComments} onChange={(e) => set('otherComments', e.target.value)}
                            className={`${inputCls} resize-y min-h-[88px]`} />
                        </Question>

                        {/* Consent */}
                        <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer pt-2">
                          <input type="checkbox" required checked={form.consent} onChange={(e) => set('consent', e.target.checked)}
                            className="mt-1 w-4 h-4 accent-brass" />
                          <span>{t.consent}{' '}
                            <Link to={lang === 'FR' ? '/politique-de-confidentialite' : '/en/privacy'} className="text-brass hover:underline">
                              {t.privacy}
                            </Link>
                          </span>
                        </label>

                        {status === 'error' && <p className="text-sm font-sans text-blush">{t.error}{errMsg ? ` (${errMsg})` : ''}</p>}

                        <div className="flex items-center justify-between gap-2 pt-2">
                          <button type="button" onClick={() => setPage(1)}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                            <ChevronLeft size={14} /> {t.prev}
                          </button>
                          <button type="submit" disabled={status === 'submitting' || !page2Valid}
                            className="inline-flex items-center gap-1.5 px-7 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40 disabled:cursor-not-allowed">
                            {status === 'submitting' ? t.submitting : (existing ? t.update : t.send)}
                            {status !== 'submitting' && <ArrowUpRight size={14} />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </>
            )}
          </div>

          {/* ── Approved-bénévole panel ── */}
          <aside className="lg:col-span-4 lg:pl-2 lg:pt-1">
            <div className="lg:sticky lg:top-24 space-y-3">
              <div className="glass-light rounded-lg-card p-6 md:p-7">
                <div className="w-12 h-12 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mb-4">
                  <BadgeCheck size={22} className="text-brass" />
                </div>
                <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-2">
                  {t.approvedKicker}
                </p>
                <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory leading-tight mb-3">
                  {t.approvedTitle}
                </h3>
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
                  {t.approvedBody}
                </p>
                <button onClick={onApprovedClick}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                  {user ? t.approvedCtaSignedIn : t.approvedCtaSignIn}
                  {user ? <ArrowUpRight size={14} /> : <Lock size={12} />}
                </button>
                {existing?.status === 'accepted' && (
                  <p className="font-editorial italic text-[11px] text-emerald-400 mt-3 text-center">
                    ✓ {t.approvedConfirmed}
                  </p>
                )}
                {existing && existing.status !== 'accepted' && (
                  <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-3 text-center">
                    {t.approvedPendingNote}
                  </p>
                )}
                {SHOWCASE_IN_DEV && (
                  <Link to={spaceUrl}
                    className="block mt-3 text-center font-sans text-[10px] uppercase tracking-widest text-ivory-soft/40 hover:text-brass transition">
                    {t.demoLink}
                  </Link>
                )}
              </div>

              <ul className="space-y-1.5 px-1">
                {t.approvedPerks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 font-editorial text-xs text-ivory-soft/80 leading-relaxed">
                    <Check size={11} className="text-brass mt-1 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────
const Step: React.FC<{ n: number; active: boolean; done: boolean; label: string }> = ({ n, active, done, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-display title-medieval text-xs ${
      active ? 'bg-brass text-midnight-deep border-brass'
      : done ? 'bg-brass/20 border-brass/40 text-brass'
      : 'border-ivory-soft/25 text-ivory-soft/60'
    }`}>
      {done ? <Check size={12} /> : n}
    </div>
    <span className={`font-display title-medieval text-[11px] uppercase tracking-widest ${
      active ? 'text-brass' : done ? 'text-ivory-soft' : 'text-ivory-soft/40'
    }`}>{label}</span>
  </div>
);

const Question: React.FC<{ label: string; sub?: string; required?: boolean; children: React.ReactNode }> = ({ label, sub, required, children }) => (
  <div>
    <p className="block font-display title-medieval text-sm text-ivory mb-1">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </p>
    {sub && <p className="font-editorial italic text-xs text-ivory-soft/70 mb-2.5">{sub}</p>}
    <div className={sub ? '' : 'mt-1.5'}>{children}</div>
  </div>
);

const inputCls = 'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';

// ── Copy ───────────────────────────────────────────────────────────
const FR = {
  home: 'Accueil', eyebrow: 'Le cœur du festival', title: 'Joindre l’équipe',
  intro1: 'Le FMM est un événement géré par une équipe de bénévoles. L’équipe permanente d’organisation est insuffisante pour combler tous les besoins du festival le jour J — c’est pourquoi nous appelons les renforts. Si vous souhaitez participer, créez un compte et soumettez votre candidature.',
  intro2: 'Les bénévoles reçoivent de la marchandise unique, deux billets d’entrée pour la fin de semaine, des repas pendant les quarts, et l’accès à un espace de camping sur demande.',
  authTitle: 'Connexion requise',
  authBody: 'Pour postuler comme bénévole, vous devez d’abord créer un compte. Cela nous permet de garder une trace de votre candidature et de communiquer avec vous.',
  signInCta: 'Créer un compte / Se connecter',
  hydrating: 'Chargement de votre candidature…',
  step1: 'Préférences', step2: 'Infos personnelles',
  next: 'Suivant', prev: 'Retour',

  // Page 1
  q1Label: 'Pour quelle(s) journée(s) souhaites-tu t’impliquer ?',
  q1Sub:   'Tu peux cocher plusieurs options.',
  q2Label: 'Quels postes aimerais-tu occuper ?',
  q2Sub:   '1 = mon préféré · 2 = ça ne me dérange pas, je peux dépanner · 3 = pas pour moi · ? = j’ai besoin d’en apprendre davantage avant de me décider.',
  q3Label: 'Comment as-tu entendu parler du Festival ?',
  q4Label: 'Pour quelle(s) raison(s) souhaites-tu t’impliquer comme bénévole au FMM cette année ?',
  q4Placeholder: 'Tes motivations, ce qui t’attire au FMM, ton expérience…',
  heardFromOtherPlaceholder: 'Précisez…',

  // Page 2
  q5Label: 'Quel est ton nom ?',
  prenom: 'Prénom', nom: 'Nom',
  q6Label: 'Quels pronoms utilises-tu ?',
  pronounsOtherPlaceholder: 'Précisez vos pronoms',
  q7Label: 'À quelle tranche d’âge appartiens-tu ?',
  q8Label: 'Si tu as moins de 18 ans, est-ce qu’un parent ou une responsable sera présent·e pendant tes heures de bénévolat ?',
  q8Sub:   'Cette information aide notre équipe à planifier l’accompagnement.',
  q9Label: 'Quel est ton numéro de téléphone ?',
  q10Label: 'Quelle est ta grandeur de t-shirt ?',
  tShirtOtherPlaceholder: 'Précisez',
  q11Label: 'As-tu des allergies (alimentaires ou autres) ?',
  q12Label: 'As-tu des restrictions ou préférences alimentaires ?',
  q13Label: 'As-tu besoin d’un espace de camping pour la fin de semaine ?',
  q13Sub:   'À noter que nous fournissons uniquement l’espace, et non le matériel de camping.',
  q14Label: 'As-tu déjà été bénévole pour le Festival Médiéval de Montpellier ?',
  q15Label: 'As-tu déjà été bénévole pour d’autres festivals ?',
  q16Label: 'Y a-t-il autre chose que tu aimerais nous partager ?',
  q16Sub:   'Questions, infos sur ton expérience, particularités à savoir…',

  consent: 'En cochant la case ci-dessous, je consens à ce que les renseignements personnels fournis dans ce formulaire soient collectés et utilisés par le Festival Médiéval de Montpellier uniquement dans le cadre de la gestion des bénévoles. Je peux demander l’accès, la rectification ou le retrait de mes renseignements en contactant Maïté Fournel (benevoles.medievalmontpellier@gmail.com). J’accepte la',
  privacy: 'politique de confidentialité',
  send: 'Envoyer ma candidature', update: 'Mettre à jour ma candidature',
  submitting: 'Envoi…',
  error: 'Une erreur est survenue.',
  thanksTitle: 'Candidature reçue !',
  thanksBody: 'Nous avons reçu votre candidature de bénévole. Maïté ou un membre de l’équipe vous contactera dans les prochaines semaines pour discuter de votre disponibilité.',
  toAccount: 'Voir mon compte',
  statusPrefix: 'Statut',
  status: { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée' } as Record<string, string>,
  editLead: 'Vous pouvez mettre à jour votre candidature à tout moment.',

  approvedKicker: 'Bénévoles approuvés',
  approvedTitle: 'Accédez à votre espace',
  approvedBody: "Si votre candidature a été acceptée, connectez-vous pour voir vos quarts, signer le contrat et la décharge parentale (si requise), et toutes les infos pratiques.",
  approvedCtaSignIn: 'Se connecter',
  approvedCtaSignedIn: 'Ouvrir mon espace',
  approvedConfirmed: 'Votre candidature est acceptée',
  approvedPendingNote: 'L’espace s’ouvre dès que votre candidature est acceptée.',
  approvedPerks: [
    'Deux billets d’entrée pour la fin de semaine',
    'Repas et rafraîchissements pendant les quarts',
    'T-shirt et articles exclusifs de l’édition',
    'Espace de camping disponible sur demande',
    'Communauté + canaux d’équipe + messages directs',
  ],
  demoLink: 'Voir la démo (Béné Vole)',
};
const EN: typeof FR = {
  home: 'Home', eyebrow: 'The heart of the festival', title: 'Join the team',
  intro1: 'FMM is run by a volunteer team. Our permanent organising team can’t cover everything on the day — so we call for reinforcements. If you’d like to take part, create an account and submit your application.',
  intro2: 'Volunteers receive unique merchandise, two weekend passes, meals during shifts, and a camping spot on request.',
  authTitle: 'Sign-in required',
  authBody: 'To apply as a volunteer, you must first create an account. This lets us track your application and stay in touch.',
  signInCta: 'Create account / sign in',
  hydrating: 'Loading your application…',
  step1: 'Preferences', step2: 'Personal info',
  next: 'Next', prev: 'Back',

  q1Label: 'Which day(s) would you like to volunteer?',
  q1Sub:   'You can pick several.',
  q2Label: 'Which roles would you like to fill?',
  q2Sub:   "1 = my pick · 2 = I'm fine with it if needed · 3 = not for me · ? = I'd like more info before deciding.",
  q3Label: 'How did you hear about the Festival?',
  q4Label: 'Why do you want to volunteer at FMM this year?',
  q4Placeholder: 'Your motivations, what draws you to FMM, your experience…',
  heardFromOtherPlaceholder: 'Specify…',

  q5Label: 'Your full name',
  prenom: 'First name', nom: 'Last name',
  q6Label: 'What pronouns do you use?',
  pronounsOtherPlaceholder: 'Specify your pronouns',
  q7Label: 'Age range',
  q8Label: 'If you are under 18, will a parent or guardian be present during your volunteer hours?',
  q8Sub:   'This helps our team plan supervision.',
  q9Label: 'Phone number',
  q10Label: 'T-shirt size',
  tShirtOtherPlaceholder: 'Specify',
  q11Label: 'Any allergies (food or other)?',
  q12Label: 'Any dietary restrictions or preferences?',
  q13Label: 'Do you need a camping spot for the weekend?',
  q13Sub:   'We provide the space only — bring your own gear.',
  q14Label: 'Have you ever volunteered at FMM before?',
  q15Label: 'Have you ever volunteered at other festivals?',
  q16Label: 'Anything else you’d like to share with us?',
  q16Sub:   'Questions, experience notes, things we should know…',

  consent: 'By checking the box below, I consent to the personal information provided in this form being collected and used by the Festival Médiéval de Montpellier solely for volunteer management. I can request access, correction, or removal by contacting Maïté Fournel (benevoles.medievalmontpellier@gmail.com). I accept the',
  privacy: 'privacy policy',
  send: 'Submit my application', update: 'Update my application',
  submitting: 'Sending…',
  error: 'Something went wrong.',
  thanksTitle: 'Application received!',
  thanksBody: 'We received your volunteer application. Maïté or a team member will reach out in the coming weeks to discuss availability.',
  toAccount: 'View my account',
  statusPrefix: 'Status',
  status: { pending: 'Pending', accepted: 'Accepted', rejected: 'Declined' } as Record<string, string>,
  editLead: 'You can update your application at any time.',

  approvedKicker: 'Approved volunteers',
  approvedTitle: 'Open your space',
  approvedBody: 'If your application has been accepted, sign in to see your shifts, sign the agreement and parental release (if needed), and all practical info.',
  approvedCtaSignIn: 'Sign in',
  approvedCtaSignedIn: 'Open my space',
  approvedConfirmed: 'Your application is accepted',
  approvedPendingNote: 'The space unlocks once your application is accepted.',
  approvedPerks: [
    'Two weekend passes for you and a guest',
    'Meals + refreshments during shifts',
    'T-shirt and exclusive edition merchandise',
    'Camping spot available on request',
    'Community + team channels + direct messages',
  ],
  demoLink: 'See the demo (Béné Vole)',
};

export default BenevolePage;
