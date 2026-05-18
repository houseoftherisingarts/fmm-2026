import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Check} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { db, isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

interface FormState {
  prenom: string; nom: string; email: string; telephone: string;
  needCelebrant: boolean; needOrganiser: boolean;
  organiserContact: string; celebrantContact: string;
  guestCount: string; vibe: string; donation: '50' | '100' | '200' | '';
  consent: boolean;
}
const EMPTY: FormState = {
  prenom: '', nom: '', email: '', telephone: '',
  needCelebrant: false, needOrganiser: false,
  organiserContact: '', celebrantContact: '',
  guestCount: '', vibe: '', donation: '',
  consent: false,
};

const inputCls = 'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </span>{children}
  </label>
);

const MariagesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.telephone || !form.vibe || !form.consent) return;
    setStatus('submitting');
    try {
      if (db && isFirebaseReady) {
        await addDoc(collection(db, 'mariages'), { ...form, year: 2026, createdAt: serverTimestamp() });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        console.info('[FMM] Wedding inquiry (offline):', form);
      }
      setStatus('sent');
    } catch { setStatus('error'); }
  };

  return (
    <>
      <SEO title={t.title} description={t.intro1} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro1}
        orbImage="/wix/mariages/70dcaeae.jpg"
        orbImagePosition="center"
      />

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
                <Field label={t.prenom} required><input type="text" required value={form.prenom} onChange={(e) => set('prenom', e.target.value)} className={inputCls} /></Field>
                <Field label={t.nom} required><input type="text" required value={form.nom} onChange={(e) => set('nom', e.target.value)} className={inputCls} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.email} required><input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
                <Field label={t.telephone} required><input type="tel" required value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={inputCls} /></Field>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-display title-medieval text-xs text-brass mb-1">{t.helpLabel}</p>
                <label className="flex items-center gap-2 font-editorial text-sm text-ivory-soft cursor-pointer">
                  <input type="checkbox" checked={form.needCelebrant} onChange={(e) => set('needCelebrant', e.target.checked)} className="w-4 h-4 accent-brass" />{t.needCelebrant}
                </label>
                <label className="flex items-center gap-2 font-editorial text-sm text-ivory-soft cursor-pointer">
                  <input type="checkbox" checked={form.needOrganiser} onChange={(e) => set('needOrganiser', e.target.checked)} className="w-4 h-4 accent-brass" />{t.needOrganiser}
                </label>
              </div>

              {!form.needOrganiser && (
                <Field label={t.organiserContact}>
                  <input type="text" value={form.organiserContact} onChange={(e) => set('organiserContact', e.target.value)} className={inputCls} />
                </Field>
              )}
              {!form.needCelebrant && (
                <Field label={t.celebrantContact}>
                  <input type="text" value={form.celebrantContact} onChange={(e) => set('celebrantContact', e.target.value)} className={inputCls} />
                </Field>
              )}

              <Field label={t.guestCount}>
                <input type="text" value={form.guestCount} onChange={(e) => set('guestCount', e.target.value)} placeholder={t.guestPlaceholder} className={inputCls} />
              </Field>

              <Field label={t.vibe} required>
                <textarea rows={4} required value={form.vibe} onChange={(e) => set('vibe', e.target.value)}
                  className={`${inputCls} resize-y min-h-[112px]`} placeholder={t.vibePlaceholder} />
              </Field>

              <p className="font-editorial italic text-sm text-ivory-soft pt-2">{t.shopNote}</p>

              <div>
                <p className="font-display title-medieval text-xs text-brass mb-2">{t.donationLabel}</p>
                <p className="font-editorial italic text-sm text-ivory-soft mb-3">{t.donationLead}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['50', '100', '200'] as const).map((amt) => (
                    <button type="button" key={amt}
                      onClick={() => set('donation', form.donation === amt ? '' : amt)}
                      className={`px-4 py-2.5 rounded-card font-sans text-xs uppercase tracking-wider font-semibold transition ${
                        form.donation === amt ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/30 text-ivory hover:border-brass'
                      }`}>
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft cursor-pointer pt-2">
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
  home: 'Accueil', eyebrow: 'Cérémonie d’époque', title: 'Célébrez votre mariage au FMM en 2026',
  intro1: 'En 2022, un mariage a été célébré sur le site du festival. Si l’idée de célébrer un mariage médiéval, chrétien, laïc, païen, viking, celte, gypsy — ou simplement au cœur des festivités — vous attire, nous sommes ouverts au projet. Si vous comptez vous marier en 2026, écrivez-nous.',
  intro2: 'À noter : envoyer ce formulaire ne garantit pas l’admissibilité du projet ni l’acceptation de la demande.',
  formEyebrow: 'Formulaire d’intérêt', formTitle: 'Parlez-nous de votre mariage',
  prenom: 'Prénom', nom: 'Nom', email: 'Courriel', telephone: 'Téléphone',
  helpLabel: 'Avez-vous besoin d’aide ?',
  needCelebrant: 'J’ai besoin d’un(e) célébrant(e)',
  needOrganiser: 'J’ai besoin d’un(e) organisateur(trice) de mariage',
  organiserContact: 'Contact de l’organisateur(trice) existant(e), si applicable',
  celebrantContact: 'Contact du/de la célébrant(e) existant(e), si applicable',
  guestCount: 'Nombre d’invités souhaités',
  guestPlaceholder: 'p. ex. 60-80 invités',
  vibe: 'Décrivez-nous votre mariage idéal au FMM',
  vibePlaceholder: 'Ambiance, époque, déroulement, attentes…',
  shopNote: 'Note : les boutiques sont ouvertes pendant le festival — vos invités peuvent facilement se procurer un costume sur place.',
  donationLabel: 'Don facultatif au « clergé du FMM »',
  donationLead: 'Le FMM est une OBNL gérée par des bénévoles. En donnant, vous devenez mécène et aidez le projet de mariages à prendre son envol définitif.',
  consent: 'Je comprends que cet envoi constitue une demande d’information et n’engage rien.',
  send: 'Envoyer', sending: 'Envoi…',
  thanksTitle: 'Demande reçue !',
  thanksBody: 'Nous prendrons contact avec vous pour discuter de la faisabilité de votre mariage au FMM.',
};
const EN = {
  home: 'Home', eyebrow: 'Period ceremony', title: 'Celebrate your wedding at FMM 2026',
  intro1: 'In 2022 a wedding was held on the festival site. If the idea of a medieval, Christian, secular, pagan, Viking, Celtic, gypsy — or simply festival-centred — wedding draws you in, we are open to the project. If you plan to marry in 2026, write to us.',
  intro2: 'Note: submitting this form does not guarantee project eligibility or acceptance.',
  formEyebrow: 'Interest form', formTitle: 'Tell us about your wedding',
  prenom: 'First name', nom: 'Last name', email: 'Email', telephone: 'Phone',
  helpLabel: 'Do you need help?',
  needCelebrant: 'I need an officiant',
  needOrganiser: 'I need a wedding organiser',
  organiserContact: 'Existing organiser contact, if applicable',
  celebrantContact: 'Existing officiant contact, if applicable',
  guestCount: 'Desired number of guests',
  guestPlaceholder: 'e.g. 60-80 guests',
  vibe: 'Describe your ideal wedding at FMM',
  vibePlaceholder: 'Atmosphere, era, flow, expectations…',
  shopNote: 'Note: shops are open during the festival — your guests can easily get a costume on site.',
  donationLabel: 'Optional donation to the "FMM clergy"',
  donationLead: 'FMM is a non-profit run by volunteers. By donating, you become a patron and help the wedding project take definitive flight.',
  consent: 'I understand this submission is an inquiry and commits nothing.',
  send: 'Send', sending: 'Sending…',
  thanksTitle: 'Inquiry received!',
  thanksBody: 'We’ll be in touch to discuss the feasibility of your wedding at FMM.',
};

export default MariagesPage;
