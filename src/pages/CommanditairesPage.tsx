import React, { useState } from 'react';
import { Shield, Castle, Crown, Check, ArrowUpRight, Handshake, Scale, X, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addSponsorRequest, type SponsorPlan } from '../firebase/commanditaires';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

// 🚨 Page gardée par le drapeau `showPlansCommandite` (siteFlags) : elle
// reste invisible du public tant qu'Alex ne la publie pas depuis l'admin.
// Les trois plans reprennent la vraie hiérarchie nobiliaire française
// (Baron < Comte < Duc), voir la stratégie dans le vault :
// 10_projects/fmm/05-partenaires/strategie-commandites.md
// Aucun reçu de don ici : Médiéval Petite Nation est un OBNL simple, la
// commandite se vend comme dépense publicitaire, jamais comme don.

type Plan = {
  key: 'baron' | 'comte' | 'duc';
  icon: React.ReactNode;
  price: string;
  featured?: boolean;
};

// Le Duc, commanditaire présentateur, trône AU CENTRE de la grille
// (demande d'Alex 2026-08-12); les prix ne sont donc pas en ordre
// croissant de gauche à droite, c'est voulu.
const PLANS: Plan[] = [
  { key: 'baron', icon: <Shield size={26} />, price: '1 500 $' },
  { key: 'duc',   icon: <Crown size={26} />,  price: '10 000 $', featured: true },
  { key: 'comte', icon: <Castle size={26} />, price: '4 000 $' },
];

// ── Formulaire de demande ────────────────────────────────────────
// Petit modal par plan : la soumission écrit dans la collection
// Firestore `commanditaires`, relue par la section admin du même nom.
const RequestModal: React.FC<{
  plan: SponsorPlan;
  t: typeof FR;
  lang: 'FR' | 'EN';
  onClose: () => void;
}> = ({ plan, t, lang, onClose }) => {
  const [form, setForm] = useState({ company: '', contactName: '', email: '', phone: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const f = t.form;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      await addSponsorRequest({ plan, ...form, lang });
      setState('sent');
    } catch (err) {
      console.warn('[Commanditaires] submit failed:', err);
      setState('error');
    }
  };
  const inputCls = 'w-full bg-black/30 border border-white/15 rounded-card px-4 py-2.5 font-editorial text-[15px] text-ivory placeholder:text-stone focus:outline-none focus:border-brass transition';
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg glass-light border border-brass/40 rounded-card p-6 md:p-8 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" onClick={onClose} aria-label={f.close}
          className="absolute top-4 right-4 text-stone hover:text-ivory transition">
          <X size={18} />
        </button>
        {state === 'sent' ? (
          <div className="text-center py-8">
            <Crown size={30} className="text-brass mx-auto mb-4" />
            <h3 className="font-display title-medieval text-2xl text-ivory mb-3">{f.sentTitle}</h3>
            <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-6">{f.sentBody}</p>
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
              {f.close}
            </button>
          </div>
        ) : (
          <>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-1.5">{f.eyebrow}</p>
            <h3 className="font-display title-medieval text-2xl text-ivory mb-1">{t.plans[plan].name}</h3>
            <p className="font-editorial italic text-sm text-ivory-soft mb-5">{f.sub}</p>
            <form onSubmit={submit} className="space-y-3">
              <input required maxLength={120} className={inputCls} placeholder={f.company}     value={form.company}     onChange={set('company')} />
              <input required maxLength={120} className={inputCls} placeholder={f.contactName} value={form.contactName} onChange={set('contactName')} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input required type="email" maxLength={200} className={inputCls} placeholder={f.email} value={form.email} onChange={set('email')} />
                <input maxLength={40} className={inputCls} placeholder={f.phone} value={form.phone} onChange={set('phone')} />
              </div>
              <textarea rows={4} maxLength={2000} className={inputCls} placeholder={f.message} value={form.message} onChange={set('message')} />
              {state === 'error' && (
                <p className="font-editorial text-sm text-red-300">{f.error}</p>
              )}
              <button type="submit" disabled={state === 'sending'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-60">
                {state === 'sending' ? f.sending : f.submit} <Send size={14} />
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

const CommanditairesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [openPlan, setOpenPlan] = useState<SponsorPlan | null>(null);
  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/tournage/commanditaires-hero.jpg"
        orbImagePosition="center"
      />

      {/* Où va l'argent : la promesse concrète */}
      <section className="relative py-14 md:py-20 overflow-hidden">
        <Motes className="opacity-40" count={12} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro eyebrow={t.whyEyebrow} title={t.whyTitle} className="mb-8" />
          <Reveal>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-3xl">
              {t.whyBody}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Les trois rangs */}
      <section className="relative py-10 md:py-16 overflow-hidden">
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid lg:grid-cols-3 gap-5 md:gap-6 items-stretch" stagger={0.12}>
            {PLANS.map((plan) => {
              const p = t.plans[plan.key];
              return (
                <StaggerItem
                  key={plan.key}
                  as="article"
                  className={
                    plan.featured
                      ? 'relative rounded-card p-7 md:p-9 flex flex-col glass-light border-2 border-brass shadow-[0_0_60px_rgba(232,177,74,0.12)] lg:-translate-y-2'
                      : 'relative rounded-card p-7 md:p-9 flex flex-col glass-light border border-white/10'
                  }
                >
                  {plan.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-bold rounded-card whitespace-nowrap">
                      {t.only}
                    </span>
                  )}
                  <div className="text-brass mb-4">{plan.icon}</div>
                  <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-1.5">{p.rank}</p>
                  <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight mb-2">{p.name}</h3>
                  <p className="font-display text-3xl md:text-4xl text-brass mb-1">{plan.price}</p>
                  <p className="font-editorial italic text-sm text-ivory-soft mb-5">{p.tagline}</p>
                  <div className="divider-brass w-14 mb-5" />
                  {p.includes && (
                    <p className="font-sans uppercase tracking-wider text-[10px] text-stone mb-3">{p.includes}</p>
                  )}
                  <ul className="space-y-2.5 mb-8">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5">
                        <Check size={15} className="text-brass mt-1 shrink-0" />
                        <span className="font-editorial text-sm md:text-[15px] text-ivory-soft leading-snug">{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setOpenPlan(plan.key)}
                    className={
                      plan.featured
                        ? 'mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card'
                        : 'mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card'
                    }
                  >
                    {p.cta} <ArrowUpRight size={14} />
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>
          <Reveal>
            <p className="font-editorial italic text-sm text-stone text-center mt-8 max-w-2xl mx-auto">{t.exclusivity}</p>
          </Reveal>
        </div>
      </section>

      {/* Compagnons (échange) + avantage fiscal */}
      <section className="relative py-14 md:py-20 overflow-hidden">
        <Motes className="opacity-40" count={10} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-5 md:gap-6">
          <Reveal from="left">
            <article className="glass-light rounded-card p-7 md:p-8 h-full">
              <Handshake size={24} className="text-brass mb-4" />
              <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{t.compagnonsTitle}</h3>
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">{t.compagnonsBody}</p>
            </article>
          </Reveal>
          <Reveal from="right" delay={0.1}>
            <article className="glass-light rounded-card p-7 md:p-8 h-full">
              <Scale size={24} className="text-brass mb-4" />
              <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{t.fiscalTitle}</h3>
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">{t.fiscalBody}</p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <Reveal className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 text-center">
          <Crown size={28} className="text-brass mx-auto mb-4" />
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.ctaEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.ctaTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 leading-relaxed">{t.ctaBody}</p>
          <a
            href={`mailto:admin@festivalmedievaldemontpellier.org?subject=${encodeURIComponent(t.ctaMail)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
          >
            {t.ctaCta} <ArrowUpRight size={14} />
          </a>
        </Reveal>
      </section>

      <AnimatePresence>
        {openPlan && (
          <RequestModal plan={openPlan} t={t} lang={lang} onClose={() => setOpenPlan(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

const FR = {
  eyebrow: 'La cour du festival', title: 'Commanditaires',
  intro: 'Votre entreprise peut prendre rang à la cour du Festival Médiéval de Montpellier. Trois plans de commandite, trois rangs de noblesse : plus votre maison s’engage, plus haut flotte sa bannière.',
  whyEyebrow: 'Où va votre or',
  whyTitle: 'Du son, des spectacles, un festival plus grand',
  whyBody: 'Chaque commandite finance directement la qualité de ce que vivent les visiteurs : une sonorisation professionnelle sur la scène principale, des troupes et des cavaliers de calibre supérieur, des tournois, des combats et des artisans du feu. Vous n’achetez pas une banderole : vous rendez le festival plus grand, aux côtés de la MRC Papineau, du Groupe Gagnon et de la municipalité de Montpellier qui portent déjà l’événement avec nous.',
  only: 'Un seul, par édition',
  plans: {
    baron: {
      rank: 'Premier rang', name: 'Baron', tagline: 'La baronnie des commerces d’ici',
      includes: '',
      perks: [
        'Logo et lien sur la page des commanditaires du site',
        'Logo sur la banderole collective des partenaires à l’entrée du site',
        'Publication de remerciement sur nos réseaux sociaux',
        'Mention dans l’infolettre bilan du festival',
        '10 laissez-passer week-end',
        'Facture de commandite pour vos livres',
      ],
      cta: 'Devenir Baron', mail: 'Plan Baron : commandite FMM',
    },
    comte: {
      rank: 'Rang majeur', name: 'Comte', tagline: 'Le comté d’une zone du festival',
      includes: 'Tout le plan Baron, et de plus :',
      perks: [
        'Exclusivité : un seul Comte par secteur d’activité',
        'Une zone du festival à votre nom (village gastronomique, village jeunesse, lice de tournoi, zone équestre ou camping)',
        'Bannière de votre maison dans votre zone',
        'Mentions par les animateurs de scène, chaque jour',
        'Publication dédiée sur nos réseaux, avec nos photos professionnelles',
        'Kiosque ou présence de marque sur le site du festival',
        '30 laissez-passer week-end et 2 places au banquet de l’Équinoxe',
        'Rapport de visibilité chiffré après le festival',
      ],
      cta: 'Devenir Comte', mail: 'Plan Comte : commandite FMM',
    },
    duc: {
      rank: 'Commanditaire présentateur', name: 'Duc du Festival', tagline: 'Le festival, présenté par votre maison',
      includes: 'Tout le plan Comte, et de plus :',
      perks: [
        '« Festival Médiéval de Montpellier, présenté par votre entreprise » sur le site, les affiches, les communiqués et la billetterie',
        'La scène principale porte votre nom : c’est votre or qui paie le son',
        'Allocution à la cérémonie d’ouverture et au banquet',
        'Capsule vidéo ou série photo de votre présence, livrée pour vos propres réseaux',
        'Droit d’utiliser le nom et l’image du festival dans votre publicité pendant 12 mois',
        '50 laissez-passer week-end et 4 places au banquet',
        'Premier droit de renouvellement pour l’édition suivante',
      ],
      cta: 'Prendre le titre de Duc', mail: 'Plan Duc du Festival : commandite FMM',
    },
  },
  exclusivity: 'Chaque rang inclut les avantages des rangs précédents. Le titre de Duc est unique : une seule maison le porte par édition.',
  compagnonsTitle: 'Les Compagnons du festival',
  compagnonsBody: 'Votre soutien peut aussi prendre la forme de biens ou de services : sonorisation, impression, matériel, breuvages, hébergement. Nous chiffrons la valeur de l’échange ensemble et vous recevez la visibilité du rang équivalent. Écrivez-nous, chaque métier a sa place à la cour.',
  fiscalTitle: 'Un investissement, pas un don',
  fiscalBody: 'Une commandite du festival est une dépense de publicité pour votre entreprise, généralement déductible à 100 %. Nous émettons une facture de commandite détaillant les avantages livrés, le document qu’attend votre comptable. Le festival est porté par Médiéval Petite Nation, un organisme sans but lucratif.',
  ctaEyebrow: 'Rejoindre la cour',
  ctaTitle: 'Votre bannière au festival',
  ctaBody: 'Le nombre de rangs est limité : un seul Duc, un Comte par secteur d’activité. Écrivez-nous et nous préparons une entente à la mesure de votre maison.',
  ctaCta: 'Nous écrire', ctaMail: 'Devenir commanditaire : FMM',
  form: {
    eyebrow: 'Demande de commandite',
    sub: 'Laissez-nous vos coordonnées et nous vous rappelons pour préparer l’entente.',
    company: 'Nom de votre entreprise', contactName: 'Votre nom',
    email: 'Courriel', phone: 'Téléphone (facultatif)',
    message: 'Un mot sur votre maison, vos envies, vos questions (facultatif)',
    submit: 'Envoyer la demande', sending: 'Envoi en cours',
    sentTitle: 'Demande reçue',
    sentBody: 'Votre demande est arrivée à la cour. Nous vous écrivons sous peu pour la suite.',
    error: 'L’envoi a échoué. Réessayez, ou écrivez-nous à admin@festivalmedievaldemontpellier.org.',
    close: 'Fermer',
  },
};

const EN = {
  eyebrow: 'The festival court', title: 'Sponsors',
  intro: 'Your business can take rank at the court of the Festival Médiéval de Montpellier. Three sponsorship plans, three ranks of nobility: the more your house commits, the higher its banner flies.',
  whyEyebrow: 'Where your gold goes',
  whyTitle: 'Sound, shows, a greater festival',
  whyBody: 'Every sponsorship directly funds what visitors experience: professional sound on the main stage, higher-calibre troupes and riders, tournaments, combat and fire artisans. You are not buying a banner: you are making the festival greater, alongside MRC Papineau, Groupe Gagnon and the municipality of Montpellier who already carry the event with us.',
  only: 'One per edition',
  plans: {
    baron: {
      rank: 'First rank', name: 'Baron', tagline: 'The barony of local businesses',
      includes: '',
      perks: [
        'Logo and link on the sponsors page of the site',
        'Logo on the collective partner banner at the festival entrance',
        'Thank-you post on our social networks',
        'Mention in the festival recap newsletter',
        '10 weekend passes',
        'Sponsorship invoice for your books',
      ],
      cta: 'Become a Baron', mail: 'Baron plan: FMM sponsorship',
    },
    comte: {
      rank: 'Major rank', name: 'Count', tagline: 'The county of a festival zone',
      includes: 'Everything in Baron, plus:',
      perks: [
        'Exclusivity: one Count per business sector',
        'A festival zone in your name (food village, youth village, tournament lists, equestrian grounds or camping)',
        'Your house banner in your zone',
        'Daily mentions by the stage hosts',
        'Dedicated post on our networks, with our professional photos',
        'Booth or brand presence on the festival grounds',
        '30 weekend passes and 2 seats at the Equinox banquet',
        'A visibility report with numbers after the festival',
      ],
      cta: 'Become a Count', mail: 'Count plan: FMM sponsorship',
    },
    duc: {
      rank: 'Presenting sponsor', name: 'Duke of the Festival', tagline: 'The festival, presented by your house',
      includes: 'Everything in Count, plus:',
      perks: [
        '"Festival Médiéval de Montpellier, presented by your company" on the site, posters, press releases and ticketing',
        'The main stage bears your name: your gold pays for the sound',
        'Address at the opening ceremony and the banquet',
        'Video capsule or photo series of your presence, delivered for your own networks',
        'Right to use the festival name and image in your advertising for 12 months',
        '50 weekend passes and 4 banquet seats',
        'First right of renewal for the next edition',
      ],
      cta: 'Take the title of Duke', mail: 'Duke of the Festival plan: FMM sponsorship',
    },
  },
  exclusivity: 'Each rank includes the perks of the ranks below. The title of Duke is unique: one house per edition.',
  compagnonsTitle: 'Companions of the festival',
  compagnonsBody: 'Your support can also take the form of goods or services: sound, printing, equipment, beverages, lodging. We value the exchange together and you receive the visibility of the equivalent rank. Write to us, every trade has its place at court.',
  fiscalTitle: 'An investment, not a donation',
  fiscalBody: 'A festival sponsorship is an advertising expense for your business, generally 100% deductible. We issue a sponsorship invoice detailing the delivered benefits, the document your accountant expects. The festival is carried by Médiéval Petite Nation, a non-profit organization.',
  ctaEyebrow: 'Join the court',
  ctaTitle: 'Your banner at the festival',
  ctaBody: 'Ranks are limited: a single Duke, one Count per business sector. Write to us and we will prepare an agreement worthy of your house.',
  ctaCta: 'Write to us', ctaMail: 'Become a sponsor: FMM',
  form: {
    eyebrow: 'Sponsorship request',
    sub: 'Leave us your details and we will call you back to prepare the agreement.',
    company: 'Your company name', contactName: 'Your name',
    email: 'Email', phone: 'Phone (optional)',
    message: 'A word about your house, your wishes, your questions (optional)',
    submit: 'Send the request', sending: 'Sending',
    sentTitle: 'Request received',
    sentBody: 'Your request has reached the court. We will write to you shortly.',
    error: 'Sending failed. Try again, or write to admin@festivalmedievaldemontpellier.org.',
    close: 'Close',
  },
};

export default CommanditairesPage;
