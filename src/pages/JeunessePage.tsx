import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {ArrowUpRight, Check, Tent, TreePine, Compass, Swords} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { db, isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

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

const JeunessePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

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
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/jeunesse/2b1f82d0.jpg"
        orbImagePosition="right center"
      />

      {/* 3 spaces overview */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {SPACES.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.article
                  key={s.titleFR}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-light rounded-card p-7 md:p-8 text-center"
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
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Jeux — playable medieval games */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-10">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.jeuxEyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{t.jeuxTitle}</h2>
            <div className="divider-brass w-16 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col"
            >
              <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mb-5">
                <Swords size={24} className="text-brass" />
              </div>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">Hnefatafl</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.hnefataflBody}</p>
              <Link
                to={lang === 'EN' ? '/en/youth/hnefatafl' : '/jeunesse/hnefatafl'}
                className="self-start inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
              >
                {t.hnefataflCta}
                <ArrowUpRight size={14} />
              </Link>
            </motion.article>
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col items-start opacity-70"
            >
              <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.jeuxComingSoon}</p>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.jeuxMoreTitle}</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft flex-1">{t.jeuxMoreBody}</p>
            </motion.article>
          </div>
        </div>
      </section>

      {/* Clan Renard feature */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.clanEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.clanTitle}</h2>
            <div className="divider-brass w-20 mb-5" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-6">{t.clanBody}</p>
            {/* Clan Renard CTA — dropped until a real sub-page or external
                URL exists for the clan. Body copy still explains who they are. */}
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-card border">
            <img src="/wix/jeunesse/2b1f82d0.jpg" alt={t.clanTitle} className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/hero/viking-cinematic.webp'; }} />
          </div>
        </div>
      </section>

      {/* Saturday workshop signup */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 md:px-8">
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
              <p className="font-editorial italic text-sm text-brass mt-4">{t.cashReminder}</p>
            </motion.div>
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
        </div>
      </section>

      {/* Camps + Zaryzad partner cards */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-5 md:gap-6">
          <article className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.campsEyebrow}</p>
            <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.campsTitle}</h3>
            <div className="divider-brass w-16 mb-4" />
            <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.campsBody}</p>
            {/* Camps Légendaires CTA — dropped until a real signup URL exists. */}
          </article>
          <article className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.zaryzadEyebrow}</p>
            <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">Zaryzad</h3>
            <div className="divider-brass w-16 mb-4" />
            <p className="font-editorial text-base text-ivory-soft mb-2 flex-1">{t.zaryzadBody}</p>
            <p className="font-editorial italic text-sm text-brass mb-5">438 888 2800</p>
            {/* Zaryzad CTA — dropped until the partner's URL is provided.
                The phone number above stays as the live contact path. */}
          </article>
        </div>
        <div className="max-w-2xl mx-auto px-4 md:px-8 mt-10 md:mt-12 text-center">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-2">{t.youthYourEyebrow}</p>
          <p className="font-editorial text-base md:text-lg text-ivory-soft">{t.youthYourBody}</p>
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
  eyebrow: 'Pour les cœurs d’enfants',
  title: 'Village Jeunesse & Jeux',
  intro: 'Le FMM tient à offrir un espace aussi adapté que possible pour les cœurs d’enfants qui sont encore dans des corps d’enfants. Cette année — en plus d’avoir adapté les prix aux familles — nous avons agrandi le site, ajouté du confort et bonifié les ateliers et activités pour les jeunes.',
  clanEyebrow: 'Pédagogie nature',
  clanTitle: 'Clan Renard',
  clanBody: 'L’art de la vie en forêt, ensemble ! Espace de connexion avec la nature, inspiré du mode de vie de nos ancêtres, de la pédagogie coyote et du modèle des 8 Shields. Venez apprendre les bases de la survie à travers les jeux, la musique et la joie de vivre.',
  clanCta: 'Voir le clan',
  formEyebrow: 'Inscriptions',
  formTitle: 'Ateliers du samedi & dimanche',
  enfant: 'Nom et prénom de l’enfant',
  parent: 'Nom et prénom du parent',
  jour: 'Jour',
  jourPick: 'Choisir un jour',
  samedi: 'Samedi 26 septembre',
  dimanche: 'Dimanche 27 septembre',
  telephone: 'Téléphone', email: 'Courriel',
  details: 'Détails pertinents à savoir',
  cashReminder: 'Je me souviens d’apporter 10 $ comptant par atelier à la tente du Clan Renard.',
  send: 'S’inscrire',
  submitting: 'Envoi…',
  error: 'Une erreur est survenue.',
  thanksTitle: 'Merci, c’est noté !',
  thanksBody: 'Nous avons reçu votre inscription. À bientôt à la tente du Clan Renard.',
  campsEyebrow: 'Camp partenaire',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Maniement de l’épée, tir à l’arc, grands jeux en équipe, quêtes immersives et plus. Depuis 2005, leur mission éducative est au cœur du camp. Par leurs activités, ils contribuent au développement positif des enfants et des ados.',
  campsCta: 'Voir le camp',
  zaryzadEyebrow: 'Grandeur nature',
  zaryzadBody: 'Zaryzad est un grandeur nature fantastique. Leurs histoires et quêtes sauront enchanter les plus jeunes. Inscriptions ou questions :',
  zaryzadCta: 'Site de Zaryzad',
  youthYourEyebrow: 'Partenariats jeunesse',
  youthYourBody: 'Cet espace est réservé à un futur partenaire jeunesse souhaitant contribuer à faire évoluer le projet et animer les cœurs d’enfants.',
  jeuxEyebrow: 'Jeux médiévaux',
  jeuxTitle: 'Joue avec nous',
  hnefataflBody: 'Le jeu d’échecs viking, en 3D. Les Raiders encerclent, les Défenseurs protègent le Roi qui doit s’échapper vers un coin. Plateau 11×11, règles complètes, jouable sur mobile et au bureau.',
  hnefataflCta: 'Jouer maintenant',
  jeuxComingSoon: 'Bientôt',
  jeuxMoreTitle: 'D’autres jeux à venir',
  jeuxMoreBody: 'On prépare d’autres jeux d’époque pour l’édition 2026. Reviens nous voir — la table se remplit.',
};

const EN = {
  home: 'Home',
  eyebrow: 'For young hearts',
  title: 'Youth & Games Village',
  intro: 'FMM strives to offer the most kid-friendly space possible for the young-hearted still living in young bodies. This year — beyond family-adjusted prices — we expanded the site, added comfort, and enriched the workshops and activities for kids.',
  clanEyebrow: 'Nature pedagogy',
  clanTitle: 'Clan Renard',
  clanBody: 'The art of living in the forest, together. A space to reconnect with nature, inspired by our ancestors’ ways of life, coyote pedagogy, and the 8 Shields model. Come learn survival basics through play, music and joy.',
  clanCta: 'See the clan',
  formEyebrow: 'Sign-ups',
  formTitle: 'Saturday & Sunday workshops',
  enfant: 'Child’s first and last name',
  parent: 'Parent’s first and last name',
  jour: 'Day',
  jourPick: 'Choose a day',
  samedi: 'Saturday September 26',
  dimanche: 'Sunday September 27',
  telephone: 'Phone', email: 'Email',
  details: 'Anything relevant we should know',
  cashReminder: 'I’ll remember to bring $10 cash per workshop to the Clan Renard tent.',
  send: 'Sign up',
  submitting: 'Sending…',
  error: 'Something went wrong.',
  thanksTitle: 'Thanks — noted!',
  thanksBody: 'We received your registration. See you at the Clan Renard tent.',
  campsEyebrow: 'Partner camp',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Swordsmanship, archery, large team games, immersive quests and more. Since 2005, their educational mission has been at the camp’s heart. Through their activities they contribute to the positive development of kids and teens.',
  campsCta: 'See the camp',
  zaryzadEyebrow: 'Live-action role-play',
  zaryzadBody: 'Zaryzad is a fantasy LARP. Their stories and quests enchant young guests. Registrations or questions:',
  zaryzadCta: 'Visit Zaryzad',
  youthYourEyebrow: 'Youth partners',
  youthYourBody: 'This space is reserved for a future youth partner wishing to contribute to the project and animate young hearts.',
  jeuxEyebrow: 'Medieval games',
  jeuxTitle: 'Come play',
  hnefataflBody: 'The Viking chess game, in 3D. Raiders surround, Defenders protect the King who must escape to a corner. 11×11 board, full rules, playable on mobile and desktop.',
  hnefataflCta: 'Play now',
  jeuxComingSoon: 'Coming soon',
  jeuxMoreTitle: 'More games on the way',
  jeuxMoreBody: 'We\'re preparing more period games for the 2026 edition. Check back — the table is filling up.',
};

export default JeunessePage;
