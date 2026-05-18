import React, { useState } from 'react';
import { Mail, Send, Check, MapPin, Phone } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';
import { useCaravanPage } from '../lib/useCaravanPage';
import { DEPARTMENTS, getDepartment } from '../content/departments';
import { sendMessage } from '../firebase/mail';
import { mockSendMessage } from '../firebase/mockMail';
import { isFirebaseReady } from '../firebase';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Eyebrow, DisplayTitle, GildedFrame } from '../components/marche/atmospherics';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

// ─── ContactPage ─────────────────────────────────────────────────────
// Public "Nous joindre" form. Visitors pick a department (each chip
// names the responsible: "Kiosques (Jesse)" etc.) and submit. The
// message lands in the corresponding admin Mail mailbox.
//
// Mandatory fields: email, department, subject, body. Display name is
// optional — defaults to "Anonyme" if left empty so the admin always
// sees a sender label. Email is mandatory because admin replies will
// route back to that address.
//
// We deliberately keep the form simple (no captcha yet) — when the
// volume gets noisy add reCAPTCHA / hCaptcha at this seam.

const ContactPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  const [form, setForm] = useState({
    name:        '',
    email:       '',
    departmentId: DEPARTMENTS[0].id,
    subject:     '',
    body:        '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dept = getDepartment(form.departmentId);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.includes('@'))      { setErr(t.errEmail);   return; }
    if (form.subject.trim().length < 3) { setErr(t.errSubject); return; }
    if (form.body.trim().length < 10)   { setErr(t.errBody);    return; }

    setBusy(true); setErr(null);
    try {
      const payload = {
        recipient: { type: 'department' as const, departmentId: form.departmentId },
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
                      background: 'rgba(232, 177, 74, 0.10)',
                      border: '1px solid var(--color-amber-glow)',
                      clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                      filter: 'drop-shadow(0 0 14px rgba(232, 177, 74, 0.45))',
                    }}
                  >
                    <Check size={28} style={{ color: 'var(--color-amber-glow)' }} />
                  </span>
                  <Eyebrow tone="amber" className="mb-3">{t.sentEyebrow}</Eyebrow>
                  <DisplayTitle size="lg" className="mb-3">{t.sentTitle}</DisplayTitle>
                  <p className="font-editorial italic text-base md:text-lg max-w-xl mx-auto"
                     style={{ color: 'rgba(244, 239, 227, 0.78)' }}>
                    {t.sentBody.replace('{dept}', dept ? (lang === 'FR' ? dept.labelFR : dept.labelEN) : '')}
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Header */}
                  <div className="md:col-span-2">
                    <Eyebrow tone="amber" className="mb-2">{t.formEyebrow}</Eyebrow>
                    <DisplayTitle size="lg" className="mb-2">{t.formTitle}</DisplayTitle>
                    <p className="font-editorial italic text-sm md:text-base"
                       style={{ color: 'rgba(244, 239, 227, 0.65)' }}>
                      {t.formIntro}
                    </p>
                  </div>

                  {/* Department picker — the dropdown shows the responsible */}
                  <div className="md:col-span-2">
                    <FieldLabel required>{t.deptLabel}</FieldLabel>
                    <select
                      required
                      value={form.departmentId}
                      onChange={(e) => set('departmentId', e.target.value)}
                      className={inputCls}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {(lang === 'FR' ? d.labelFR : d.labelEN)} ({lang === 'FR' ? d.responsibleFR : d.responsibleEN})
                        </option>
                      ))}
                    </select>
                    {dept && (lang === 'FR' ? dept.hintFR : dept.hintEN) && (
                      <p className="mt-1.5 font-editorial italic text-[12px]"
                         style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
                        {lang === 'FR' ? dept.hintFR : dept.hintEN}
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

                  {/* Subject */}
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

                  {/* Body */}
                  <div className="md:col-span-2">
                    <FieldLabel required>{t.bodyLabel}</FieldLabel>
                    <textarea
                      required
                      minLength={10}
                      rows={8}
                      value={form.body}
                      onChange={(e) => set('body', e.target.value)}
                      placeholder={t.bodyPh}
                      className={`${inputCls} resize-y`}
                    />
                  </div>

                  {err && (
                    <p className="md:col-span-2 font-editorial italic text-sm"
                       style={{ color: '#FCA5B0' }}>
                      {err}
                    </p>
                  )}

                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="font-editorial italic text-xs"
                       style={{ color: 'rgba(244, 239, 227, 0.45)' }}>
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
                        clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                        boxShadow:
                          'inset 0 1px 0 rgba(255, 240, 200, 0.45), 0 14px 32px -10px rgba(216, 155, 58, 0.7)',
                      }}
                    >
                      <Send size={13} /> {busy ? t.sending : t.send}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </GildedFrame>

          {/* Alternative contact channels — for visitors who prefer
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
        background: 'rgba(10, 2, 7, 0.55)',
        border: '1px solid rgba(216, 155, 58, 0.22)',
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
  intro:     'Un mot pour la cour ? Choisissez le département, et votre message atterrira directement dans la bonne boîte.',
  formEyebrow: 'Formulaire',
  formTitle: 'Toquez à la bonne porte',
  formIntro: 'Sélectionnez le département concerné — votre message ira dans sa boîte de réception. Le responsable nommé vous répondra par courriel.',
  deptLabel: 'Département',
  nameLabel: 'Votre nom',
  namePh:    'Optionnel',
  emailLabel:'Courriel',
  subjectLabel: 'Sujet',
  subjectPh:    'Brièvement, en quelques mots',
  bodyLabel:    'Message',
  bodyPh:       'Dites-nous tout — nous lisons chaque message.',
  send:         'Envoyer',
  sending:      'Envoi…',
  privacyNote:  'Votre courriel sert uniquement à notre réponse, conformément à la Loi 25.',
  errEmail:     'Courriel invalide.',
  errSubject:   'Le sujet doit contenir au moins 3 caractères.',
  errBody:      'Le message doit contenir au moins 10 caractères.',
  sentEyebrow:  'Message envoyé',
  sentTitle:    'Le messager part au galop',
  sentBody:     'Votre message a été déposé dans la boîte de {dept}. Vous recevrez une réponse par courriel sous peu.',
};

const EN: typeof FR = {
  eyebrow:   'Write to the festival',
  title:     'Contact us',
  intro:     'A word for the court? Pick the right department and your message will land directly in the right inbox.',
  formEyebrow: 'Form',
  formTitle: 'Knock on the right door',
  formIntro: 'Select the relevant department — your message will go straight to its inbox. The named lead will reply by email.',
  deptLabel: 'Department',
  nameLabel: 'Your name',
  namePh:    'Optional',
  emailLabel:'Email',
  subjectLabel: 'Subject',
  subjectPh:    'Briefly, in a few words',
  bodyLabel:    'Message',
  bodyPh:       'Tell us everything — we read every message.',
  send:         'Send',
  sending:      'Sending…',
  privacyNote:  'Your email is used only for our reply, in compliance with Quebec Law 25.',
  errEmail:     'Invalid email.',
  errSubject:   'Subject must be at least 3 characters.',
  errBody:      'Message must be at least 10 characters.',
  sentEyebrow:  'Message sent',
  sentTitle:    'The messenger rides off',
  sentBody:     'Your message was placed in the {dept} inbox. You’ll get a reply by email shortly.',
};

export default ContactPage;
