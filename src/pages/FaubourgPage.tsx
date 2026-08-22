import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Calendar, Check } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import EmberCanvas from '../components/vendor/EmberCanvas';

// ─── Le Faubourg 2026 ────────────────────────────────────────────────
// Page habillée FMM qui POSTE vers le Google Form de Jessee
// (forms.gle/ydpbbFRoWFV94wGD7). Elle garde sa feuille Sheets et ses
// notifications telles quelles : rien ne passe par Firestore.
// Les entry.* viennent de FB_PUBLIC_LOAD_DATA_ du formulaire. Si Jessee
// ajoute ou retire une question dans Google Forms, refaire la table.
const FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLSftFlYqrqYZwVAZyLuC23juIWAguAYVmj6r6uaMEi8AWYa7kg/formResponse';

const E = {
  courriel:   'emailAddress',
  nom:        'entry.822777972',
  compagnie:  'entry.484520493',
  metier:     'entry.901312965',
  liens:      'entry.114304203',
  deja:       'entry.1197220178',
  tel:        'entry.347614591',
  nombre:     'entry.1403312494',
  benevoles:  'entry.1997068890',
  apparence:  'entry.371091520',
  dimensions: 'entry.1830054693',
  electricite:'entry.1300256088',
  camping:    'entry.1300135530',
  region:     'entry.1292249743',
  entendu:    'entry.549665331',
  autres:     'entry.1720169895',
} as const;

type Key = keyof typeof E;

// Les valeurs des choix doivent être IDENTIQUES aux libellés du Google
// Form, sinon Sheets reçoit une case vide.
const APPARENCE = [
  'Moderne',
  'Médiévale / Historique / Réconstitution',
  'Pas Reconstitution/Histo, mais super beau et bien décoré!',
  "J'ai jamais participé à un événement médiéval/renn faire,  je ne sais pas!",
];
const ELECTRICITE = ['oui', 'non', "non, mais j'aimerais charger ma telephone des fois..."];
const OUI_NON = ['Oui', 'Non'];

const REQUIRED: Key[] = [
  'courriel', 'nom', 'compagnie', 'metier', 'liens', 'deja', 'tel', 'nombre',
  'apparence', 'dimensions', 'electricite', 'camping', 'region',
];

const Field: React.FC<{ k: Key; label: string; hint?: string; err: boolean; reqMsg: string; children: React.ReactNode }> = ({ k, label, hint, err, reqMsg, children }) => (
  <div data-missing={err ? 'true' : undefined}>
    <span className="block font-display text-xs mb-2 tracking-[0.18em]" style={{ color: '#D8B05A' }}>
      {label}{REQUIRED.includes(k) && <span className="ml-1" style={{ color: '#E07A7A' }}>*</span>}
    </span>
    {children}
    {err
      ? <p className="font-sans text-xs mt-1.5" style={{ color: '#E07A7A' }}>{reqMsg}</p>
      : hint && <p className="font-sans text-xs mt-1.5" style={{ color: 'rgba(244,239,227,0.45)' }}>{hint}</p>}
  </div>
);

const Chips: React.FC<{ k: Key; value: string; onChange: (v: string) => void; options: string[]; labels?: string[] }> = ({ k, value, onChange, options, labels }) => (
  <div className="flex flex-col gap-2.5">
    {options.map((o, i) => {
      const active = value === o;
      return (
        <motion.label
          key={o}
          whileTap={{ scale: 0.985 }}
          className="relative cursor-pointer text-left px-4 py-3 border font-sans text-sm transition-all flex items-center gap-3"
          style={{
            background: active ? 'rgba(216,176,90,0.15)' : 'rgba(26,5,11,0.4)',
            borderColor: active ? '#D8B05A' : 'rgba(244,239,227,0.15)',
            color: active ? '#D8B05A' : 'rgba(244,239,227,0.85)',
            boxShadow: active ? '0 0 20px rgba(196,164,90,0.18)' : 'none',
          }}
        >
          <input type="radio" name={k} value={o} checked={active} onChange={() => onChange(o)} className="sr-only" />
          <span className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: active ? '#D8B05A' : 'rgba(244,239,227,0.35)', background: active ? '#D8B05A' : 'transparent' }}>
            {active && <Check size={10} color="#1a050b" />}
          </span>
          <span>{labels ? labels[i] : o}</span>
        </motion.label>
      );
    })}
  </div>
);

const FaubourgPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const reduce = useReducedMotion();

  const [v, setV] = useState<Record<Key, string>>(() =>
    Object.fromEntries(Object.keys(E).map((k) => [k, ''])) as Record<Key, string>,
  );
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const set = (k: Key) => (val: string) => setV((p) => ({ ...p, [k]: val }));
  const missing = REQUIRED.filter((k) => !v[k].trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.length) {
      document.querySelector<HTMLElement>('[data-missing="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setState('sending');
    const body = new URLSearchParams();
    (Object.keys(E) as Key[]).forEach((k) => body.append(E[k], v[k]));
    body.append('fvv', '1');
    body.append('pageHistory', '0');
    try {
      // mode no-cors : Google ne renvoie pas de CORS, la réponse est opaque.
      // Un rejet = réseau coupé; une résolution = Google a reçu le POST.
      await fetch(FORM_ACTION, { method: 'POST', mode: 'no-cors', body });
      setState('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setState('error');
    }
  };

  const fieldCls = 'witcher-input font-sans';
  const err = (k: Key) => touched && REQUIRED.includes(k) && !v[k].trim();

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <section className="relative caravan-stage bleed-edges text-[var(--color-bone)] pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden">
        <EmberCanvas />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">

          <div className="flex items-center justify-between gap-4 mb-12 md:mb-16 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
            <Link to={addLocale('/marche', lang)} className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.3em] text-[var(--color-bone)]/60 hover:text-[#D8B05A] transition">
              <ArrowLeft size={13} /> {t.back}
            </Link>
            <div className="hidden md:flex items-center gap-3">
              <Calendar size={12} style={{ color: '#D8B05A' }} />
              <span className="witcher-stat-label">{t.dates}</span>
            </div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl mb-14 md:mb-20"
          >
            <p className="font-sans uppercase tracking-[0.45em] text-[10px] md:text-[11px] mb-7" style={{ color: '#D8B05A' }}>{t.eyebrow}</p>
            <h1
              className="font-display leading-[1.02] text-3xl sm:text-4xl md:text-6xl lg:text-7xl mb-8"
              style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 0 24px rgba(232,177,74,0.28), 0 0 60px rgba(184,106,42,0.22)' }}
            >
              {t.title}
            </h1>
            <p className="font-sans text-base md:text-lg leading-[1.75]" style={{ color: 'rgba(244,239,227,0.78)', fontWeight: 300 }}>{t.intro}</p>
          </motion.div>

          {state === 'done' ? (
            <div className="max-w-2xl py-16" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
              <p className="font-display text-2xl md:text-4xl mb-5" style={{ color: '#D8B05A' }}>{t.doneTitle}</p>
              <p className="font-sans text-base leading-[1.75]" style={{ color: 'rgba(244,239,227,0.78)', fontWeight: 300 }}>{t.doneBody}</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-8 max-w-2xl">
                <div className="grid gap-8 sm:grid-cols-2">
                  <Field k="nom" err={err('nom')} reqMsg={t.required} label={t.f.nom}><input className={fieldCls} value={v.nom} onChange={(e) => set('nom')(e.target.value)} autoComplete="name" /></Field>
                  <Field k="compagnie" err={err('compagnie')} reqMsg={t.required} label={t.f.compagnie}><input className={fieldCls} value={v.compagnie} onChange={(e) => set('compagnie')(e.target.value)} autoComplete="organization" /></Field>
                </div>
                <Field k="courriel" err={err('courriel')} reqMsg={t.required} label={t.f.courriel}><input className={fieldCls} type="email" value={v.courriel} onChange={(e) => set('courriel')(e.target.value)} autoComplete="email" /></Field>
                <Field k="metier" err={err('metier')} reqMsg={t.required} label={t.f.metier}><textarea rows={4} className={`${fieldCls} resize-y min-h-[80px]`} value={v.metier} onChange={(e) => set('metier')(e.target.value)} /></Field>
                <Field k="liens" err={err('liens')} reqMsg={t.required} label={t.f.liens} hint={t.f.liensHint}><textarea rows={2} className={`${fieldCls} resize-y`} value={v.liens} onChange={(e) => set('liens')(e.target.value)} /></Field>
                <div className="grid gap-8 sm:grid-cols-2">
                  <Field k="tel" err={err('tel')} reqMsg={t.required} label={t.f.tel}><input className={fieldCls} type="tel" value={v.tel} onChange={(e) => set('tel')(e.target.value)} autoComplete="tel" /></Field>
                  <Field k="region" err={err('region')} reqMsg={t.required} label={t.f.region}><input className={fieldCls} value={v.region} onChange={(e) => set('region')(e.target.value)} /></Field>
                </div>
                <Field k="deja" err={err('deja')} reqMsg={t.required} label={t.f.deja}><Chips k="deja" value={v.deja} onChange={set('deja')} options={OUI_NON} labels={t.ouiNon} /></Field>
                <div className="grid gap-8 sm:grid-cols-2">
                  <Field k="nombre" err={err('nombre')} reqMsg={t.required} label={t.f.nombre} hint={t.f.nombreHint}><input className={fieldCls} inputMode="numeric" value={v.nombre} onChange={(e) => set('nombre')(e.target.value)} /></Field>
                  <Field k="dimensions" err={err('dimensions')} reqMsg={t.required} label={t.f.dimensions} hint={t.f.dimensionsHint}><input className={fieldCls} placeholder="10x10" value={v.dimensions} onChange={(e) => set('dimensions')(e.target.value)} /></Field>
                </div>
                <Field k="apparence" err={err('apparence')} reqMsg={t.required} label={t.f.apparence}><Chips k="apparence" value={v.apparence} onChange={set('apparence')} options={APPARENCE} labels={t.apparence} /></Field>
                <Field k="electricite" err={err('electricite')} reqMsg={t.required} label={t.f.electricite}><Chips k="electricite" value={v.electricite} onChange={set('electricite')} options={ELECTRICITE} labels={t.electricite} /></Field>
                <Field k="camping" err={err('camping')} reqMsg={t.required} label={t.f.camping} hint={t.f.campingHint}><Chips k="camping" value={v.camping} onChange={set('camping')} options={OUI_NON} labels={t.ouiNon} /></Field>
                <Field k="benevoles" err={err('benevoles')} reqMsg={t.required} label={t.f.benevoles} hint={t.f.benevolesHint}><textarea rows={2} className={`${fieldCls} resize-y`} value={v.benevoles} onChange={(e) => set('benevoles')(e.target.value)} /></Field>
                <Field k="entendu" err={err('entendu')} reqMsg={t.required} label={t.f.entendu}><input className={fieldCls} value={v.entendu} onChange={(e) => set('entendu')(e.target.value)} /></Field>
                <Field k="autres" err={err('autres')} reqMsg={t.required} label={t.f.autres}><textarea rows={3} className={`${fieldCls} resize-y`} value={v.autres} onChange={(e) => set('autres')(e.target.value)} /></Field>

                <div className="pt-8 flex flex-col items-start gap-4" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
                  <motion.button
                    type="submit"
                    disabled={state === 'sending'}
                    whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="group inline-flex items-center gap-4 px-10 md:px-14 py-5 font-sans uppercase tracking-[0.3em] text-sm disabled:opacity-60"
                    style={{
                      color: '#1a050b', fontWeight: 600,
                      background: 'linear-gradient(180deg, #E8C87A 0%, #D8B05A 55%, #B98F3E 100%)',
                      clipPath: 'polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)',
                      boxShadow: '0 0 48px -8px rgba(216,176,90,0.65), 0 18px 40px -14px rgba(0,0,0,0.8)',
                    }}
                  >
                    {state === 'sending' ? t.sending : t.submit}
                    <span aria-hidden className="inline-block w-6 h-px bg-[#1a050b]/70 transition-all group-hover:w-12" />
                  </motion.button>
                  {state === 'error' && <p className="font-sans text-sm" style={{ color: '#E07A7A' }}>{t.error}</p>}
                  {touched && missing.length > 0 && <p className="font-sans text-sm" style={{ color: '#E07A7A' }}>{t.missing}</p>}
                </div>
              </div>

              <aside className="lg:sticky lg:top-28 self-start grid gap-7">
                {t.facts.map((f) => (
                  <div key={f.label} className="pb-5" style={{ borderBottom: '1px solid rgba(244,239,227,0.10)' }}>
                    <p className="witcher-stat-label mb-2">{f.label}</p>
                    <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(244,239,227,0.78)', fontWeight: 300 }}>{f.body}</p>
                  </div>
                ))}
              </aside>
            </form>
          )}
        </div>
      </section>
    </>
  );
};

export default FaubourgPage;

const FR = {
  back: 'Retour au marché',
  dates: '25 · 26 · 27 septembre 2026',
  eyebrow: 'Le Faubourg · Édition 2026',
  title: 'Votre kiosque au Faubourg',
  intro:
    'La Foire, à l’intérieur des murs, est complète. Le Faubourg, lui, a encore des places : une rue marchande fermée aux voitures, le long du chemin qui mène aux portes. Chaque festivalier passe devant vous à l’arrivée et au départ, et les gens du village viennent acheter sans payer l’entrée.',
  required: 'Ce champ est requis.',
  missing: 'Quelques champs manquent avant l’envoi.',
  submit: 'Envoyer ma demande',
  sending: 'Envoi…',
  error: 'L’envoi n’a pas passé. Vérifiez votre connexion et réessayez.',
  doneTitle: 'Demande reçue.',
  doneBody:
    'Merci. Nous étudions chaque dossier individuellement et nous vous écrivons par courriel avec la réponse et, si vous êtes retenu, le lien de paiement.',
  ouiNon: ['Oui', 'Non'],
  apparence: [
    'Moderne',
    'Médiévale, historique ou reconstitution',
    'Pas historique, mais très beau et bien décoré',
    'Premier événement médiéval : je ne sais pas encore',
  ],
  electricite: ['Oui, c’est essentiel', 'Non', 'Non, mais j’aimerais recharger un téléphone à l’occasion'],
  f: {
    courriel: 'Courriel',
    nom: 'Votre nom',
    compagnie: 'Compagnie ou entreprise',
    metier: 'Votre métier, artisanat ou produit',
    liens: 'Site web et réseaux sociaux',
    liensHint: 'Nous les affichons dans la section des artisans du site.',
    tel: 'Téléphone',
    region: 'Votre région ou village',
    deja: 'Avez-vous déjà exposé avec nous ?',
    nombre: 'Combien serez-vous ?',
    nombreHint: 'Artisans, famille, assistants. Bracelets fournis, maximum 4 par espace de 10 x 10.',
    dimensions: 'Dimensions du kiosque (pieds)',
    dimensionsHint: '50 $ par espace de 10 x 10 pieds.',
    apparence: 'Apparence de votre kiosque',
    electricite: 'Avez-vous absolument besoin d’électricité ?',
    camping: 'Réserver une place au camping ?',
    campingHint: 'Gratuit pour les exposants, sur le terrain de baseball voisin. Pas de feu ni d’électricité.',
    benevoles: 'Quelqu’un de votre équipe aimerait être bénévole ?',
    benevolesHint: 'Nom et courriel. Accès gratuit, repas et tabard du festival pendant le quart.',
    entendu: 'Première inscription : comment avez-vous entendu parler de nous ?',
    autres: 'Questions ou informations à nous transmettre',
  },
  facts: [
    { label: 'Horaire', body: 'Vendredi 16 h 30 à 20 h · Samedi 9 h 30 à 19 h · Dimanche 9 h 30 à 16 h. Présence obligatoire sur tout l’horaire. Ouvrir plus tard le soir est permis.' },
    { label: 'Coût', body: '50 $ par espace de 10 x 10 pieds. Paiement en ligne après acceptation, par le lien reçu par courriel.' },
    { label: 'Emplacement', body: 'Premier arrivé, premier servi, en partant des portes d’entrée. 4, rue du Bosquet, Montpellier.' },
    { label: 'Montage', body: 'Vendredi de 9 h à 16 h 30. Les véhicules sortent du site avant 15 h.' },
    { label: 'Inclus', body: 'Un bracelet d’accès par membre de l’équipe et le camping des exposants, sur réservation.' },
  ],
};

const EN: typeof FR = {
  back: 'Back to the market',
  dates: 'September 25 · 26 · 27, 2026',
  eyebrow: 'The Faubourg · 2026 edition',
  title: 'Your booth in the Faubourg',
  intro:
    'The Fair, inside the walls, is full. The Faubourg still has room: a merchant street closed to cars, along the path to the gates. Every festival-goer walks past you coming in and going out, and villagers can shop without paying admission.',
  required: 'This field is required.',
  missing: 'A few fields are missing before sending.',
  submit: 'Send my application',
  sending: 'Sending…',
  error: 'The submission did not go through. Check your connection and try again.',
  doneTitle: 'Application received.',
  doneBody:
    'Thank you. We review each application individually and will email you our answer and, if accepted, the payment link.',
  ouiNon: ['Yes', 'No'],
  apparence: [
    'Modern',
    'Medieval, historical or reenactment',
    'Not historical, but beautiful and well decorated',
    'First medieval event: I do not know yet',
  ],
  electricite: ['Yes, essential', 'No', 'No, but I would like to charge a phone now and then'],
  f: {
    courriel: 'Email',
    nom: 'Your name',
    compagnie: 'Company or business',
    metier: 'Your craft, trade or product',
    liens: 'Website and social media',
    liensHint: 'We show them in the artisans section of the site.',
    tel: 'Phone',
    region: 'Your region or village',
    deja: 'Have you exhibited with us before?',
    nombre: 'How many in your party?',
    nombreHint: 'Artisans, family, helpers. Wristbands provided, maximum 4 per 10 x 10 space.',
    dimensions: 'Booth dimensions (feet)',
    dimensionsHint: '$50 per 10 x 10 foot space.',
    apparence: 'Look of your booth',
    electricite: 'Do you absolutely need electricity?',
    camping: 'Reserve a camping spot?',
    campingHint: 'Free for exhibitors, on the baseball field next door. No fires, no electricity.',
    benevoles: 'Would anyone on your team like to volunteer?',
    benevolesHint: 'Name and email. Free access, meals and a festival tabard during the shift.',
    entendu: 'First time applying: how did you hear about us?',
    autres: 'Questions or anything else we should know',
  },
  facts: [
    { label: 'Hours', body: 'Friday 4:30 to 8 pm · Saturday 9:30 am to 7 pm · Sunday 9:30 am to 4 pm. Attendance required for the full schedule. Staying open later in the evening is allowed.' },
    { label: 'Cost', body: '$50 per 10 x 10 foot space. Online payment after acceptance, through the link sent by email.' },
    { label: 'Placement', body: 'First come, first served, starting by the entrance gates. 4 rue du Bosquet, Montpellier.' },
    { label: 'Setup', body: 'Friday 9 am to 4:30 pm. Vehicles off the site before 3 pm.' },
    { label: 'Included', body: 'One access wristband per team member and the exhibitors’ campground, on reservation.' },
  ],
};
