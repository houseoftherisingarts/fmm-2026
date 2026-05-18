import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Check, Mail, Phone} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { db, isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

interface FormState {
  prenom: string; nom: string; email: string; telephone: string;
  horseName: string; horseBreed: string; insuranceFile: string; cogginsFile: string;
  consent: boolean;
}
const EMPTY: FormState = { prenom: '', nom: '', email: '', telephone: '', horseName: '', horseBreed: '', insuranceFile: '', cogginsFile: '', consent: false };

const inputCls = 'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5">
      {label}{required && <span className="text-blush ml-0.5">*</span>}
    </span>{children}
  </label>
);

const ChevauxPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.telephone || !form.horseName || !form.consent) return;
    setStatus('submitting');
    try {
      if (db && isFirebaseReady) {
        await addDoc(collection(db, 'cliniqueEquestre'), { ...form, year: 2026, createdAt: serverTimestamp() });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        console.info('[FMM] Clinique signup (offline):', form);
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
        orbImage="/wix/chevaux/04ba7d92.jpg"
        orbImagePosition="center"
      />

      {/* Three thumbnails of the clinic in action */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {['04ba7d92.jpg', '1c869c8b.jpg', 'da1da0a5.jpg'].map((f, i) => (
            <motion.figure
              key={f}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.08 }}
              className="aspect-[4/3] overflow-hidden rounded-card border group"
            >
              <img decoding="async" src={`/wix/chevaux/${f}`} alt="" loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </motion.figure>
          ))}
        </div>
      </section>

      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-10">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.formEyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{t.formTitle}</h2>
            <div className="divider-brass w-16 mx-auto mb-3" />
            <p className="font-editorial italic text-sm text-ivory-soft">{t.formNote}</p>
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
              <Field label={t.email} required><input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
              <Field label={t.telephone} required><input type="tel" required value={form.telephone} onChange={(e) => set('telephone', e.target.value)} className={inputCls} /></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.horseName} required><input type="text" required value={form.horseName} onChange={(e) => set('horseName', e.target.value)} className={inputCls} /></Field>
                <Field label={t.horseBreed} required><input type="text" required value={form.horseBreed} onChange={(e) => set('horseBreed', e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label={t.insuranceLabel} required>
                <input type="text" placeholder={t.fileHint} value={form.insuranceFile} onChange={(e) => set('insuranceFile', e.target.value)} className={inputCls} />
              </Field>
              <Field label={t.cogginsLabel} required>
                <input type="text" placeholder={t.fileHint} value={form.cogginsFile} onChange={(e) => set('cogginsFile', e.target.value)} className={inputCls} />
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

          <div className="mt-10 text-center font-editorial text-sm text-ivory-soft">
            <p className="mb-3">{t.contactNote}</p>
            <p className="font-display title-medieval text-base text-brass mb-2">Carilynn</p>
            <p className="flex items-center justify-center gap-2 mb-1">
              <Mail size={14} className="text-brass" />
              <a href="mailto:carilynnlarouche@hotmail.com" className="hover:text-brass transition">carilynnlarouche@hotmail.com</a>
            </p>
            <p className="flex items-center justify-center gap-2">
              <Phone size={14} className="text-brass" />
              <a href="tel:8199810838" className="hover:text-brass transition">819-981-0838</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'Au manège',
  title: 'Clinique Équestre',
  intro: 'Venez découvrir la Clinique Équestre organisée par l’Association Médiévale du Québec (AMQ). Initiez-vous aux jeux médiévaux à cheval — joutes, jeux d’adresse — dans une ambiance conviviale et sécuritaire. Pour participer en tant que cavalier(e) : apportez votre cheval, une preuve d’assurance valide avec Cheval Québec, ainsi que des documents attestant que votre compagnon est à jour dans ses vaccins et possède un test de Coggins négatif. Une occasion parfaite de vivre l’aventure médiévale tout en partageant votre passion équestre.',
  formEyebrow: 'Inscription cavalier(e)',
  formTitle: 'Formulaire d’inscription à la clinique',
  formNote: '7 places disponibles — le samedi seulement.',
  prenom: 'Prénom', nom: 'Nom', email: 'Courriel', telephone: 'Téléphone',
  horseName: 'Nom du cheval', horseBreed: 'Race du cheval',
  insuranceLabel: 'Document d’assurances',
  cogginsLabel: 'Test de Coggins',
  fileHint: 'Lien Drive ou nom de fichier (envoi par courriel ensuite)',
  consent: 'Je confirme que mon cheval est à jour dans ses vaccins et possède un test de Coggins négatif valide.',
  send: 'Envoyer', sending: 'Envoi…',
  thanksTitle: 'Inscription reçue !',
  thanksBody: 'Carilynn vous contactera pour confirmer la place et coordonner l’envoi des documents.',
  contactNote: 'Pour toute question concernant les chevaux, contactez directement notre palefrenière :',
};
const EN = {
  home: 'Home', eyebrow: 'In the ring', title: 'Equestrian Clinic',
  intro: 'Come discover the equestrian clinic organised by the Quebec Medieval Association (AMQ). Try medieval mounted games — jousting, skill games — in a friendly, safe atmosphere. To participate as a rider: bring your horse, a valid Cheval Québec insurance proof, plus documents showing your horse is up-to-date on vaccines and has a negative Coggins test. A perfect chance to live the medieval adventure while sharing your equestrian passion.',
  formEyebrow: 'Rider sign-up', formTitle: 'Clinic registration form', formNote: '7 spots available — Saturday only.',
  prenom: 'First name', nom: 'Last name', email: 'Email', telephone: 'Phone',
  horseName: 'Horse name', horseBreed: 'Horse breed',
  insuranceLabel: 'Insurance document', cogginsLabel: 'Coggins test',
  fileHint: 'Drive link or filename (send by email after)',
  consent: 'I confirm my horse is up-to-date on vaccines and has a valid negative Coggins test.',
  send: 'Send', sending: 'Sending…',
  thanksTitle: 'Registration received!',
  thanksBody: 'Carilynn will contact you to confirm your spot and coordinate document delivery.',
  contactNote: 'For any horse-related question, contact our stablemaster directly:',
};

export default ChevauxPage;
