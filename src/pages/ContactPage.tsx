import React, { useState } from 'react';
import { Mail, Send, Check, MapPin, Phone, Bug } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';
import { useCaravanPage } from '../lib/useCaravanPage';
import { getDepartment } from '../content/departments';
import { addBugReport, CATEGORY_LABELS, type BugCategory } from '../firebase/bugReports';
import { sendMessage } from '../firebase/mail';
import { mockSendMessage } from '../firebase/mockMail';
import { isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Eyebrow, DisplayTitle, GildedFrame } from '../components/marche/atmospherics';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

// ─── ContactPage ─────────────────────────────────────────────────────
// Le formulaire public « Nous joindre ». Le visiteur choisit d'abord la
// BOÎTE à laquelle il s'adresse, pas une personne : le nom du
// responsable ne paraît plus dans la liste (décision d'Alex,
// 2026-08-03). L'acheminement vit côté régie, où chaque boîte a son
// entrée dans le rail de l'onglet Messages.
//
// Le choix de la boîte décide de la destination ET de ce que le
// formulaire demande ensuite : les boîtes de courrier veulent un sujet
// et un message, tandis que « Reporter un bug » bascule sur les champs
// d'un signalement. Le nom reste optionnel et tombe sur « Anonyme »
// quand il est vide; le courriel est obligatoire parce que la réponse
// repart par là. Pas de captcha pour l'instant : le jour où le bruit
// devient gênant, reCAPTCHA ou hCaptcha se branche ici.

// ─── Les boîtes ──────────────────────────────────────────────────────
// L'ordre vient d'Alex : le Général en premier et par défaut, puis les
// boîtes thématiques, et le signalement de bug tout au bout. Les
// identifiants restent ceux de DEPARTMENTS pour que le message tombe
// dans la boîte que la régie affiche déjà dans son rail.
const BUG_BOITE = 'bug';

const ORDRE_BOITES = [
  'general', 'programmation', 'benevoles',
  'partenaires', 'mariages', 'medias', 'kiosques',
];

// Le public voit un nom plus large que celui du rail, et une ligne qui
// dit ce que la boîte a besoin de savoir. Le reste garde DEPARTMENTS.
const HABILLAGE: Record<string, Omit<Boite, 'id'>> = {
  partenaires: {
    labelFR: 'Partenaires et commandites',
    labelEN: 'Partners and sponsorships',
    hintFR:  'Écrivez-nous le nom de votre entreprise et le genre de présence qui vous intéresse. Nous vous enverrons la grille des paliers.',
    hintEN:  'Tell us your company name and the kind of presence you have in mind. We will send you the tiers.',
  },
  mariages: {
    labelFR: 'Mariages et groupes',
    labelEN: 'Weddings and groups',
    hintFR:  'Nous célébrons des mariages sur le site et nous accueillons les groupes. Donnez-nous la date que vous visez et le nombre de personnes.',
    hintEN:  'We hold weddings on site and we welcome groups. Give us the date you have in mind and how many people are coming.',
  },
  medias: {
    labelFR: 'Médias et presse',
    labelEN: 'Media and press',
    hintFR:  'Nous répondons aux demandes d\u2019entrevue et nous délivrons les accréditations. Précisez votre média et votre échéance.',
    hintEN:  'We handle interview requests and press accreditation. Tell us which outlet you write for and your deadline.',
  },
};

interface Boite { id: string; labelFR: string; labelEN: string; hintFR: string; hintEN: string }

const BOITES: Boite[] = [
  ...ORDRE_BOITES.flatMap((id) => {
    const d = getDepartment(id);
    if (!d) return [];
    const h = HABILLAGE[id];
    return [{
      id,
      labelFR: h?.labelFR ?? d.labelFR,
      labelEN: h?.labelEN ?? d.labelEN,
      hintFR:  h?.hintFR  ?? d.hintFR ?? '',
      hintEN:  h?.hintEN  ?? d.hintEN ?? '',
    }];
  }),
  // Le bug ne passe pas par le courrier : il emprunte le chemin déjà
  // en place (addBugReport → bugReports → onglet Bugs), celui de la
  // fenêtre « Signaler un bug » du pied de page. Rien n'est dédoublé.
  {
    id:      BUG_BOITE,
    labelFR: 'Reporter un bug',
    labelEN: 'Report a bug',
    hintFR:  'Le site vous a joué un tour. Décrivez ce qui s\u2019est passé et votre signalement se rend directement à l\u2019équipe technique.',
    hintEN:  'The site misbehaved. Describe what happened and your report goes straight to the technical team.',
  },
];

const CATEGORIES_BUG: BugCategory[] = ['affichage', 'lien', 'formulaire', 'performance', 'contenu', 'autre'];

const ContactPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    boiteId:  BOITES[0].id,
    subject:  '',
    body:     '',
    // Champs propres au signalement de bug. Ils restent inertes tant
    // qu'une autre boîte est choisie.
    category: 'affichage' as BugCategory,
    page:     '',
    expected: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const boite = BOITES.find((b) => b.id === form.boiteId) ?? BOITES[0];
  const isBug = form.boiteId === BUG_BOITE;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.includes('@')) { setErr(t.errEmail); return; }
    if (isBug) {
      if (form.body.trim().length < 10) { setErr(t.errBugDesc); return; }
    } else {
      if (form.subject.trim().length < 3) { setErr(t.errSubject); return; }
      if (form.body.trim().length < 10)   { setErr(t.errBody);    return; }
    }

    setBusy(true); setErr(null);
    try {
      if (isBug) {
        // Exactement le chemin de la fenêtre du pied de page : le
        // signalement s'écrit dans bugReports, une copie part par
        // courriel, et l'onglet Bugs de la régie le voit arriver.
        await addBugReport({
          category:    form.category,
          page:        form.page.trim() || (lang === 'FR' ? 'Non précisé' : 'Not specified'),
          description: form.body.trim(),
          lang,
          email:       form.email.trim().toLowerCase(),
          ...(form.expected.trim() ? { expected: form.expected.trim() } : {}),
          url:       typeof window    !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent  : undefined,
          viewport:  typeof window    !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : undefined,
        });
        setDone(true);
        return;
      }
      const payload = {
        recipient: { type: 'department' as const, departmentId: form.boiteId },
        fromEmail: form.email.trim().toLowerCase(),
        fromName:  form.name.trim() || (lang === 'FR' ? 'Anonyme' : 'Anonymous'),
        subject:   form.subject.trim(),
        body:      form.body.trim(),
      };
      if (DEV_BYPASS || !isFirebaseReady) await mockSendMessage(payload);
      else                                await sendMessage(payload);
      setDone(true);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/partenaires/2a2a4608.jpg"
      />

      <section className="py-12 md:py-16">
        <div className="max-w-screen-lg mx-auto px-4 md:px-8">
          <GildedFrame inset={14} tone="amber" className="relative">
            <div className="caravan-glass p-6 md:p-10">
              {done ? (
                <div className="text-center py-6">
                  <span
                    className="inline-flex items-center justify-center w-14 h-14 mb-5"
                    style={{
                      background: 'rgba(var(--sk-glow-rgb), 0.10)',
                      border: '1px solid var(--color-amber-glow)',
                      clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                      filter: 'drop-shadow(0 0 14px rgba(var(--sk-glow-rgb), 0.45))',
                    }}
                  >
                    {isBug
                      ? <Bug   size={26} style={{ color: 'var(--color-amber-glow)' }} />
                      : <Check size={28} style={{ color: 'var(--color-amber-glow)' }} />}
                  </span>
                  <Eyebrow tone="amber" className="mb-3">
                    {isBug ? t.sentBugEyebrow : t.sentEyebrow}
                  </Eyebrow>
                  <DisplayTitle size="lg" className="mb-3">
                    {isBug ? t.sentBugTitle : t.sentTitle}
                  </DisplayTitle>
                  <p className="font-editorial italic text-base md:text-lg max-w-xl mx-auto"
                     style={{ color: 'rgba(var(--sk-parchment-rgb), 0.78)' }}>
                    {isBug
                      ? t.sentBugBody
                      : t.sentBody.replace('{dept}', lang === 'FR' ? boite.labelFR : boite.labelEN)}
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Header */}
                  <div className="md:col-span-2">
                    <Eyebrow tone="amber" className="mb-2">{t.formEyebrow}</Eyebrow>
                    <DisplayTitle size="lg" className="mb-2">{t.formTitle}</DisplayTitle>
                    <p className="font-editorial italic text-sm md:text-base"
                       style={{ color: 'rgba(var(--sk-parchment-rgb), 0.65)' }}>
                      {t.formIntro}
                    </p>
                  </div>

                  {/* La première question : à quelle boîte le message
                      s'adresse. Aucun nom de responsable n'est affiché,
                      parce qu'un nom vieillit mal (départs,
                      remplacements). */}
                  <div className="md:col-span-2">
                    <FieldLabel required>{t.boiteLabel}</FieldLabel>
                    <select
                      required
                      value={form.boiteId}
                      onChange={(e) => set('boiteId', e.target.value)}
                      className={inputCls}
                    >
                      {BOITES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {lang === 'FR' ? b.labelFR : b.labelEN}
                        </option>
                      ))}
                    </select>
                    {(lang === 'FR' ? boite.hintFR : boite.hintEN) && (
                      <p className="mt-1.5 font-editorial italic text-[12px]"
                         style={{ color: 'rgba(var(--sk-parchment-rgb), 0.55)' }}>
                        {lang === 'FR' ? boite.hintFR : boite.hintEN}
                      </p>
                    )}
                  </div>

                  {/* Name + Email */}
                  <div>
                    <FieldLabel>{t.nameLabel}</FieldLabel>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder={t.namePh}
                      className={inputCls}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <FieldLabel required>{t.emailLabel}</FieldLabel>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="vous@exemple.ca"
                      className={inputCls}
                      autoComplete="email"
                    />
                  </div>

                  {/* La suite dépend de la boîte : le signalement veut
                      la nature du problème et l'endroit, les autres
                      boîtes veulent un sujet. */}
                  {isBug ? (
                    <>
                      <div>
                        <FieldLabel required>{t.bugCategoryLabel}</FieldLabel>
                        <select
                          required
                          value={form.category}
                          onChange={(e) => set('category', e.target.value as BugCategory)}
                          className={inputCls}
                        >
                          {CATEGORIES_BUG.map((c) => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c][lang]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>{t.bugPageLabel}</FieldLabel>
                        <input
                          type="text"
                          value={form.page}
                          onChange={(e) => set('page', e.target.value)}
                          placeholder={t.bugPagePh}
                          className={inputCls}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <FieldLabel required>{t.subjectLabel}</FieldLabel>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={form.subject}
                        onChange={(e) => set('subject', e.target.value)}
                        placeholder={t.subjectPh}
                        className={inputCls}
                      />
                    </div>
                  )}

                  {/* Le corps du message, ou la description du bug. */}
                  <div className="md:col-span-2">
                    <FieldLabel required>{isBug ? t.bugDescLabel : t.bodyLabel}</FieldLabel>
                    <textarea
                      required
                      minLength={10}
                      rows={isBug ? 6 : 8}
                      value={form.body}
                      onChange={(e) => set('body', e.target.value)}
                      placeholder={isBug ? t.bugDescPh : t.bodyPh}
                      className={`${inputCls} resize-y`}
                    />
                  </div>

                  {isBug && (
                    <div className="md:col-span-2">
                      <FieldLabel>{t.bugExpectedLabel}</FieldLabel>
                      <textarea
                        rows={3}
                        value={form.expected}
                        onChange={(e) => set('expected', e.target.value)}
                        placeholder={t.bugExpectedPh}
                        className={`${inputCls} resize-y`}
                      />
                    </div>
                  )}

                  {err && (
                    <p className="md:col-span-2 font-editorial italic text-sm"
                       style={{ color: '#FCA5B0' }}>
                      {err}
                    </p>
                  )}

                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="font-editorial italic text-xs"
                       style={{ color: 'rgba(var(--sk-parchment-rgb), 0.45)' }}>
                      {t.privacyNote}
                    </p>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-7 py-3 font-sans uppercase tracking-[0.32em] text-[11px] font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{
                        color: 'var(--color-velvet-deep)',
                        background:
                          'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 55%, var(--color-copper) 100%)',
                        borderRadius: 16,
                        boxShadow:
                          'inset 0 1px 0 rgba(var(--sk-sheen-rgb), 0.45), 0 14px 32px -10px rgba(var(--sk-mustard-rgb), 0.7)',
                      }}
                    >
                      <Send size={13} /> {busy ? t.sending : (isBug ? t.sendBug : t.send)}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </GildedFrame>

          {/* Alternative contact channels: for visitors who prefer
              a direct email / phone instead of the form. */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4 text-center font-editorial">
            <ChannelCard icon={Mail}    label={SITE.contact.email}    href={`mailto:${SITE.contact.email}`} />
            <ChannelCard icon={Phone}   label={SITE.contact.phone}    href={`tel:${SITE.contact.phone}`} />
            <ChannelCard icon={MapPin}  label={SITE.contact.address}  href={null} />
          </div>
        </div>
      </section>
    </div>
  );
};

const inputCls =
  'w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-[0.2em] uppercase">
    {children}
    {required && <span style={{ color: '#FCA5B0' }}> *</span>}
  </label>
);

const ChannelCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string | null;
}> = ({ icon: Icon, label, href }) => {
  const inner = (
    <div className="px-5 py-4 transition-colors"
      style={{
        background: 'rgba(var(--sk-ink-rgb), 0.55)',
        border: '1px solid rgba(var(--sk-mustard-rgb), 0.22)',
      }}
    >
      <Icon size={14} className="text-brass mx-auto mb-2" />
      <p className="text-sm text-ivory truncate">{label}</p>
    </div>
  );
  return href ? <a href={href} className="hover:scale-[1.01] transition-transform">{inner}</a> : inner;
};

const FR = {
  eyebrow:   'Écrire au festival',
  title:     'Nous joindre',
  intro:     'Dites-nous d’abord à quelle boîte vous écrivez. Votre message atterrira chez la personne qui s’en occupe, et le formulaire se règle sur votre choix.',
  formEyebrow: 'Formulaire',
  formTitle: 'Frappez à la bonne porte',
  formIntro: 'Choisissez la boîte : votre message ira directement au bon endroit et la personne qui s’en occupe vous répondra par courriel. Un problème sur le site se signale par la dernière entrée de la liste.',
  boiteLabel: 'À quelle boîte écrivez-vous ?',
  nameLabel: 'Votre nom',
  namePh:    'Optionnel',
  emailLabel:'Courriel',
  subjectLabel: 'Sujet',
  subjectPh:    'Brièvement, en quelques mots',
  bodyLabel:    'Message',
  bodyPh:       'Dites-nous tout. Nous lisons chaque message.',
  send:         'Envoyer',
  sendBug:      'Envoyer le signalement',
  sending:      'Envoi…',
  privacyNote:  'Votre courriel sert uniquement à notre réponse, et à rien d\u2019autre.',
  errEmail:     'Courriel invalide.',
  errSubject:   'Le sujet doit contenir au moins 3 caractères.',
  errBody:      'Le message doit contenir au moins 10 caractères.',
  errBugDesc:   'Décrivez le problème en quelques mots avant d\u2019envoyer.',
  sentEyebrow:  'Message envoyé',
  sentTitle:    'Le messager part au galop',
  sentBody:     'Votre message a été déposé dans la boîte de {dept}. Vous recevrez une réponse par courriel sous peu.',
  // Champs et confirmation du signalement de bug.
  bugCategoryLabel: 'Nature du problème',
  bugPageLabel:     'Où ça se passe',
  bugPagePh:        'Page ou section concernée',
  bugDescLabel:     'Qu\u2019est-ce qui s\u2019est passé ?',
  bugDescPh:        'Décrivez le bug le plus précisément possible…',
  bugExpectedLabel: 'À quoi vous attendiez-vous ? (optionnel)',
  bugExpectedPh:    'Ce qui aurait dû se produire…',
  sentBugEyebrow:   'Signalement envoyé',
  sentBugTitle:     'Le rapport est entre nos mains',
  sentBugBody:      'Votre signalement est arrivé chez l\u2019équipe technique, avec la page et l\u2019appareil d\u2019où vous nous écrivez. Nous vous répondrons si nous avons besoin de précisions.',
};

const EN: typeof FR = {
  eyebrow:   'Write to the festival',
  title:     'Contact us',
  intro:     'Tell us first which inbox you are writing to. Your message lands with whoever handles it, and the form adjusts to your choice.',
  formEyebrow: 'Form',
  formTitle: 'Knock on the right door',
  formIntro: 'Pick the inbox: your message goes straight to the right place and whoever handles it will reply by email. A problem with the site goes through the last entry on the list.',
  boiteLabel: 'Which inbox are you writing to?',
  nameLabel: 'Your name',
  namePh:    'Optional',
  emailLabel:'Email',
  subjectLabel: 'Subject',
  subjectPh:    'Briefly, in a few words',
  bodyLabel:    'Message',
  bodyPh:       'Tell us everything. We read every message.',
  send:         'Send',
  sendBug:      'Send report',
  sending:      'Sending…',
  privacyNote:  'Your email is used only for our reply, and for nothing else.',
  errEmail:     'Invalid email.',
  errSubject:   'Subject must be at least 3 characters.',
  errBody:      'Message must be at least 10 characters.',
  errBugDesc:   'Describe the problem in a few words before sending.',
  sentEyebrow:  'Message sent',
  sentTitle:    'The messenger rides off',
  sentBody:     'Your message was placed in the {dept} inbox. You’ll get a reply by email shortly.',
  bugCategoryLabel: 'Type of issue',
  bugPageLabel:     'Where it happens',
  bugPagePh:        'Page or section involved',
  bugDescLabel:     'What happened?',
  bugDescPh:        'Describe the bug as precisely as you can…',
  bugExpectedLabel: 'What did you expect? (optional)',
  bugExpectedPh:    'What should have happened…',
  sentBugEyebrow:   'Report sent',
  sentBugTitle:     'The report is in our hands',
  sentBugBody:      'Your report reached the technical team, along with the page and the device you wrote from. We will get back to you if we need more detail.',
};

export default ContactPage;
