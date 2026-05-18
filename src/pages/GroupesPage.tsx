import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Check, GraduationCap, Users, Briefcase} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { db, isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// Static info+rates page replacing the Wix Groups community feature
// (per locked decision B: build a static "Groupes scolaires &
// corporatifs" info+rates page with a contact form, NOT a forum).
const TYPES = [
  {
    icon: GraduationCap, key: 'scolaire',
    titleFR: 'Groupes scolaires',     titleEN: 'School groups',
    bodyFR: 'Sortie pédagogique alignée avec le programme d’histoire et d’éducation à la citoyenneté. Visites guidées, ateliers d’artisans, démonstrations de combat médiéval encadrées.',
    bodyEN: 'Educational outing aligned with history and citizenship curricula. Guided tours, artisan workshops, supervised medieval combat demos.',
    perksFR: ['Tarif jeunesse', 'Encadrement par les bénévoles FMM', 'Stations adaptées à la sécurité scolaire', 'Trousse pédagogique sur demande'],
    perksEN: ['Youth pricing', 'FMM-volunteer supervision', 'Stations adapted to school safety', 'Teaching kit on request'],
  },
  {
    icon: Users, key: 'communautaire',
    titleFR: 'Groupes communautaires', titleEN: 'Community groups',
    bodyFR: 'Organismes, scouts, cercles, clubs de loisirs — un terrain de jeu en nature pour vivre le festival ensemble.',
    bodyEN: 'Non-profits, scouts, circles, leisure clubs — an outdoor playground to live the festival together.',
    perksFR: ['Tarif de groupe', 'Tablée commune sur demande', 'Aide à la planification du transport'],
    perksEN: ['Group pricing', 'Shared table on request', 'Transport planning support'],
  },
  {
    icon: Briefcase, key: 'corporatif',
    titleFR: 'Groupes corporatifs',    titleEN: 'Corporate groups',
    bodyFR: 'Sortie d’équipe ou activité de team-building hors des sentiers battus. Banquet privatif possible avec animation médiévale.',
    bodyEN: 'Team outing or off-the-beaten-path team-building. Private banquet possible with medieval entertainment.',
    perksFR: ['Banquet privé en option', 'Activités team-building médiévales', 'Facturation centralisée', 'Reçu d’engagement communautaire'],
    perksEN: ['Optional private banquet', 'Medieval team-building activities', 'Centralised billing', 'Community engagement receipt'],
  },
];

interface FormState {
  org: string; contact: string; email: string; telephone: string;
  type: 'scolaire' | 'communautaire' | 'corporatif' | '';
  size: string; dates: string; message: string; consent: boolean;
}
const EMPTY: FormState = { org: '', contact: '', email: '', telephone: '', type: '', size: '', dates: '', message: '', consent: false };

const inputCls = 'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </span>{children}
  </label>
);

const GroupesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.org || !form.contact || !form.email || !form.type || !form.consent) return;
    setStatus('submitting');
    try {
      if (db && isFirebaseReady) {
        await addDoc(collection(db, 'groupes'), { ...form, year: 2026, createdAt: serverTimestamp() });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        console.info('[FMM] Group inquiry (offline):', form);
      }
      setStatus('sent');
    } catch { setStatus('error'); }
  };

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/home/shields-blue.jpg"
        orbImagePosition="center"
      />

      {/* 3 group types */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {TYPES.map((tp, i) => {
              const Icon = tp.icon;
              return (
                <motion.article key={tp.key}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="glass-light rounded-card p-7 md:p-8 flex flex-col"
                >
                  <div className="w-12 h-12 rounded-card bg-brass/15 border border-brass/40 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-brass" />
                  </div>
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
                    {lang === 'FR' ? tp.titleFR : tp.titleEN}
                  </h3>
                  <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-5">
                    {lang === 'FR' ? tp.bodyFR : tp.bodyEN}
                  </p>
                  <ul className="space-y-2 font-editorial text-sm text-ivory-soft mb-2">
                    {(lang === 'FR' ? tp.perksFR : tp.perksEN).map((perk) => (
                      <li key={perk} className="flex items-start gap-2"><span className="text-brass mt-1">·</span>{perk}</li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
          <p className="font-editorial italic text-base md:text-lg text-ivory-soft text-center max-w-2xl mx-auto mt-12">
            {t.pricingNote}
          </p>
        </div>
      </section>

      {/* Contact form */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-10">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.formEyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{t.formTitle}</h2>
            <div className="divider-brass w-16 mx-auto" />
          </div>

          {status === 'sent' ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass-light rounded-lg-card p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                <Check size={26} className="text-brass" />
              </div>
              <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{t.thanksTitle}</h3>
              <p className="font-editorial text-base text-ivory-soft">{t.thanksBody}</p>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="glass-light rounded-lg-card p-7 md:p-9 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.org} required><input type="text" required value={form.org} onChange={(e) => set('org', e.target.value)} className={inputCls} /></Field>
                <Field label={t.contact} required><input type="text" required value={form.contact} onChange={(e) => set('contact', e.target.value)} className={inputCls} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.email} required><input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
                <Field label={t.telephone}><input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label={t.type} required>
                <select required value={form.type} onChange={(e) => set('type', e.target.value as FormState['type'])} className={inputCls}>
                  <option value="" disabled>{t.typePick}</option>
                  <option value="scolaire">{t.typeScolaire}</option>
                  <option value="communautaire">{t.typeCommunautaire}</option>
                  <option value="corporatif">{t.typeCorporatif}</option>
                </select>
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.size}><input type="text" value={form.size} onChange={(e) => set('size', e.target.value)} placeholder={t.sizePlaceholder} className={inputCls} /></Field>
                <Field label={t.dates}><input type="text" value={form.dates} onChange={(e) => set('dates', e.target.value)} placeholder={t.datesPlaceholder} className={inputCls} /></Field>
              </div>
              <Field label={t.message}>
                <textarea rows={4} value={form.message} onChange={(e) => set('message', e.target.value)}
                  className={`${inputCls} resize-y min-h-[112px]`} />
              </Field>

              <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer">
                <input type="checkbox" required checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-1 w-4 h-4 accent-brass" />
                <span>{t.consent}</span>
              </label>

              <button type="submit" disabled={status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                {status === 'submitting' ? t.sending : t.send} {status !== 'submitting' && <ArrowUpRight size={14} />}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Sortie de groupe', title: 'Groupes',
  intro: 'Tarifs spéciaux et accompagnement sur mesure pour les sorties de groupe : écoles, organismes communautaires, équipes corporatives. Une journée — ou un weekend — au cœur du Moyen Âge québécois.',
  pricingNote: 'Tarifs et formules détaillées sur demande. Contactez-nous via le formulaire ci-dessous et nous reviendrons vers vous avec une proposition adaptée à votre groupe.',
  formEyebrow: 'Demande de groupe', formTitle: 'Parlez-nous de votre groupe',
  org: 'Nom de l’organisation', contact: 'Personne contact',
  email: 'Courriel', telephone: 'Téléphone',
  type: 'Type de groupe',
  typePick: 'Sélectionner', typeScolaire: 'Scolaire', typeCommunautaire: 'Communautaire', typeCorporatif: 'Corporatif',
  size: 'Taille du groupe', sizePlaceholder: 'p. ex. 25 personnes',
  dates: 'Date(s) souhaitée(s)', datesPlaceholder: '25, 26 et/ou 27 sept. 2026',
  message: 'Détails ou questions',
  consent: 'J’accepte d’être contacté(e) par l’équipe FMM au sujet de cette demande.',
  send: 'Envoyer la demande', sending: 'Envoi…',
  thanksTitle: 'Demande reçue !',
  thanksBody: 'Nous reviendrons vers vous sous peu avec une proposition adaptée à votre groupe.',
};
const EN = {
  home: 'Home', eyebrow: 'Group outing', title: 'Groups',
  intro: 'Special pricing and tailored support for group outings: schools, community non-profits, corporate teams. A day — or a weekend — in the heart of Quebec’s Middle Ages.',
  pricingNote: 'Detailed pricing and packages on request. Contact us via the form below and we’ll come back with a tailored proposal for your group.',
  formEyebrow: 'Group request', formTitle: 'Tell us about your group',
  org: 'Organisation name', contact: 'Contact person',
  email: 'Email', telephone: 'Phone',
  type: 'Group type',
  typePick: 'Select', typeScolaire: 'School', typeCommunautaire: 'Community', typeCorporatif: 'Corporate',
  size: 'Group size', sizePlaceholder: 'e.g. 25 people',
  dates: 'Preferred date(s)', datesPlaceholder: 'Sept 25, 26 and/or 27, 2026',
  message: 'Details or questions',
  consent: 'I agree to be contacted by the FMM team about this request.',
  send: 'Send request', sending: 'Sending…',
  thanksTitle: 'Request received!',
  thanksBody: 'We’ll come back to you shortly with a tailored proposal for your group.',
};

export default GroupesPage;
