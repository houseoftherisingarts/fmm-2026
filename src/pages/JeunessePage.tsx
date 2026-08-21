import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Check, Tent, TreePine, Compass} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { db, isFirebaseReady } from '../firebase';
import { watchProgFlags, PROG_FLAGS_DEFAULTS, type ProgFlags } from '../firebase/programmationFlags';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ScrollProgress } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

const SPACES = [
  { icon: Tent,    titleFR: 'Tente de relaxation', titleEN: 'Relaxation tent', bodyFR: 'Pour parents et enfants qui veulent se reposer à l’ombre.', bodyEN: 'For parents and kids who need a shaded rest.' },
  { icon: TreePine,titleFR: 'Parc',                titleEN: 'Park',            bodyFR: 'Pour jouer de façon libre.',                                  bodyEN: 'Free-play space.' },
  { icon: Compass, titleFR: 'Quêtes',              titleEN: 'Quests',          bodyFR: 'Organisées sur tout le site.',                                bodyEN: 'Organised all across the site.' },
];

interface FormState {
  enfant: string;
  parent: string;
  jour: 'samedi' | 'dimanche' | '';
  telephone: string;
  email: string;
  details: string;
  consent: boolean;
}
const EMPTY: FormState = { enfant: '', parent: '', jour: '', telephone: '', email: '', details: '', consent: false };

const JeunessePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  // Le formulaire d'inscription aux ateliers reste masqué tant que le
  // clan qui les anime n'est pas confirmé (siteFlags/programmation).
  const [progFlags, setProgFlags] = useState<ProgFlags>(PROG_FLAGS_DEFAULTS);
  useEffect(() => watchProgFlags(setProgFlags), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.enfant || !form.parent || !form.email || !form.telephone || !form.jour || !form.consent) return;
    setStatus('submitting');
    setErrMsg(null);
    try {
      if (db && isFirebaseReady) {
        await addDoc(collection(db, 'jeunesseAteliers'), {
          ...form,
          source: 'web',
          year: 2026,
          createdAt: serverTimestamp(),
        });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        console.info('[FMM] Atelier signup (offline mode):', form);
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro} />}
      {!embedded && <ScrollProgress />}
      {embedded ? (
        <section className="relative pt-20 md:pt-28 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{t.eyebrow}</p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
            <div className="divider-brass w-24 mt-5" />
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro}
          orbImage="/wix/jeunesse/2b1f82d0.jpg"
          orbImagePosition="right center"
        />
      )}

      {/* La section jeunesse est présentée par Les Camps Légendaires
          (demande d'Alex, 2026-08-20) : Clan Renard et Zaryzad retirés. */}
      {/* Saturday workshop signup */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-40" count={14} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-8 md:mb-10">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.formEyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{t.formTitle}</h2>
            <div className="divider-brass w-16 mx-auto" />
          </Reveal>

          <Reveal>
          {status === 'sent' ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass-light rounded-lg-card p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                <Check size={26} className="text-brass" />
              </div>
              <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{t.thanksTitle}</h3>
              <p className="font-editorial text-base text-ivory-soft">{t.thanksBody}</p>
              <p className="font-editorial italic text-sm text-brass mt-4">{t.cashReminder}</p>
            </motion.div>
          ) : !progFlags.ateliersJeunesse ? (
            <div className="glass-light rounded-lg-card p-10 text-center">
              <p className="font-editorial text-base text-ivory-soft">{t.ateliersSoon}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="glass-light rounded-lg-card p-7 md:p-9 space-y-5">
              <Field label={t.enfant} required>
                <input type="text" required value={form.enfant} onChange={(e) => set('enfant', e.target.value)} className={inputCls} />
              </Field>
              <Field label={t.jour} required>
                <select required value={form.jour} onChange={(e) => set('jour', e.target.value as FormState['jour'])} className={inputCls}>
                  <option value="" disabled>{t.jourPick}</option>
                  <option value="samedi">{t.samedi}</option>
                  <option value="dimanche">{t.dimanche}</option>
                </select>
              </Field>
              <Field label={t.parent} required>
                <input type="text" required value={form.parent} onChange={(e) => set('parent', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.telephone} required>
                  <input type="tel" required value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={inputCls} />
                </Field>
                <Field label={t.email} required>
                  <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label={t.details}>
                <textarea rows={3} value={form.details} onChange={(e) => set('details', e.target.value)} className={`${inputCls} resize-y min-h-[88px]`} />
              </Field>

              <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer">
                <input type="checkbox" required checked={form.consent} onChange={(e) => set('consent', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-brass" />
                <span>{t.cashReminder}</span>
              </label>

              {status === 'error' && (
                <p className="text-sm font-sans text-blush">{t.error}{errMsg ? ` (${errMsg})` : ''}</p>
              )}
              <button type="submit" disabled={status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50 disabled:cursor-wait">
                {status === 'submitting' ? t.submitting : t.send}
                {status !== 'submitting' && <ArrowUpRight size={14} />}
              </button>
            </form>
          )}
          </Reveal>
        </div>
      </section>

      {/* Camps Légendaires : présentateur de la section jeunesse */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid gap-5 md:gap-6" stagger={0.1}>
            <StaggerItem as="article" className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col max-w-3xl mx-auto w-full">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.campsEyebrow}</p>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.campsTitle}</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.campsBody}</p>
              {/* Camps Légendaires CTA dropped until a real signup URL exists. */}
            </StaggerItem>
          </Stagger>
          <Reveal className="max-w-2xl mx-auto mt-10 md:mt-12 text-center">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-2">{t.youthYourEyebrow}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft">{t.youthYourBody}</p>
          </Reveal>
        </div>
      </section>

      {/* Au complet : vue d'ensemble de l'espace jeunesse (Tente,
          Parc, Quêtes). Déplacée en toute fin de la section Jeunesse
          (demande d'Alex, 2026-08-04) : c'était le tout premier bloc
          sous l'en-tête, désormais le dernier. */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid md:grid-cols-3 gap-5 md:gap-6" stagger={0.1}>
            {SPACES.map((s) => {
              const Icon = s.icon;
              return (
                <StaggerItem
                  key={s.titleFR}
                  as="article"
                  className="glass-light rounded-card p-7 md:p-8 text-center transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                    <Icon size={24} className="text-brass" />
                  </div>
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
                    {lang === 'FR' ? s.titleFR : s.titleEN}
                  </h3>
                  <p className="font-editorial italic text-sm md:text-base text-ivory-soft leading-snug">
                    {lang === 'FR' ? s.bodyFR : s.bodyEN}
                  </p>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>
    </>
  );
};

const inputCls =
  'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';

interface FieldProps { label: string; required?: boolean; children: React.ReactNode }
const Field: React.FC<FieldProps> = ({ label, required, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </span>
    {children}
  </label>
);

const FR = {
  home: 'Accueil',
  eyebrow: 'Présenté par Les Camps Légendaires',
  title: 'Village Jeunesse & Jeux',
  intro: 'Le FMM tient à offrir un espace aussi adapté que possible pour les cœurs d’enfants qui sont encore dans des corps d’enfants. Cette année (en plus d’avoir adapté les prix aux familles), nous avons agrandi le site, ajouté du confort et bonifié les ateliers et activités pour les jeunes.',
  formEyebrow: 'Inscriptions',
  formTitle: 'Ateliers du samedi & dimanche',
  ateliersSoon: 'Les inscriptions aux ateliers ouvriront sous peu.',
  enfant: 'Nom et prénom de l’enfant',
  parent: 'Nom et prénom du parent',
  jour: 'Jour',
  jourPick: 'Choisir un jour',
  samedi: 'Samedi 26 septembre',
  dimanche: 'Dimanche 27 septembre',
  telephone: 'Téléphone', email: 'Courriel',
  details: 'Détails pertinents à savoir',
  cashReminder: 'Je me souviens d’apporter 10 $ comptant par atelier à la tente jeunesse.',
  send: 'S’inscrire',
  submitting: 'Envoi…',
  error: 'Une erreur est survenue.',
  thanksTitle: 'Merci, c’est noté !',
  thanksBody: 'Nous avons reçu votre inscription. À bientôt à la tente jeunesse.',
  campsEyebrow: 'Présentateur officiel de la section jeunesse',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Maniement de l’épée, tir à l’arc, grands jeux en équipe, quêtes immersives et plus. Depuis 2005, leur mission éducative est au cœur du camp. Par leurs activités, ils contribuent au développement positif des enfants et des ados.',
  campsCta: 'Voir le camp',
  youthYourEyebrow: 'Partenariats jeunesse',
  youthYourBody: 'Cet espace est réservé à un futur partenaire jeunesse souhaitant contribuer à faire évoluer le projet et animer les cœurs d’enfants.',
};

const EN = {
  home: 'Home',
  eyebrow: 'Presented by Les Camps Légendaires',
  title: 'Youth & Games Village',
  intro: 'FMM strives to offer the most kid-friendly space possible for the young-hearted still living in young bodies. This year (beyond family-adjusted prices), we expanded the site, added comfort, and enriched the workshops and activities for kids.',
  formEyebrow: 'Sign-ups',
  formTitle: 'Saturday & Sunday workshops',
  ateliersSoon: 'Workshop sign-ups will open shortly.',
  enfant: 'Child’s first and last name',
  parent: 'Parent’s first and last name',
  jour: 'Day',
  jourPick: 'Choose a day',
  samedi: 'Saturday September 26',
  dimanche: 'Sunday September 27',
  telephone: 'Phone', email: 'Email',
  details: 'Anything relevant we should know',
  cashReminder: 'I’ll remember to bring $10 cash per workshop to the youth tent.',
  send: 'Sign up',
  submitting: 'Sending…',
  error: 'Something went wrong.',
  thanksTitle: 'Thanks, noted!',
  thanksBody: 'We received your registration. See you at the youth tent.',
  campsEyebrow: 'Official presenter of the youth section',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Swordsmanship, archery, large team games, immersive quests and more. Since 2005, their educational mission has been at the camp’s heart. Through their activities they contribute to the positive development of kids and teens.',
  campsCta: 'See the camp',
  youthYourEyebrow: 'Youth partners',
  youthYourBody: 'This space is reserved for a future youth partner wishing to contribute to the project and animate young hearts.',
};

export default JeunessePage;
