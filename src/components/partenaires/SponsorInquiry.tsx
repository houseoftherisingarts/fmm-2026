import React, { useState } from 'react';
import { Crown, Send, Check } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { sendMessage } from '../../firebase/mail';
import { mockSendMessage } from '../../firebase/mockMail';
import { isFirebaseReady } from '../../firebase';
import { GildedFrame } from '../marche/atmospherics';

// ─── Devenir commanditaire d'honneur ─────────────────────────────────
// Petit bouton discret en bas de /partenaires. Au clic, le formulaire se
// déplie sur place. Le message tombe dans la boîte PERSONNELLE d'Alex
// (Admin → Courrier → « Ma boîte »), pas dans une boîte d'équipe :
// une candidature de commandite se négocie avant d'être partagée.
//
// Même canal que le formulaire /contact (collection `mail`), donc aucune
// règle Firestore ni extension courriel à ajouter.

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

/** Boîte personnelle réceptrice. Doit correspondre au courriel avec
 *  lequel Alex ouvre l'admin, sinon le message reste invisible. */
const RECIPIENT_EMAIL = 'alex@lesalondesinconnus.com';

const SponsorInquiry: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', org: '', email: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.includes('@'))     { setErr(t.errEmail); return; }
    if (form.body.trim().length < 10)  { setErr(t.errBody);  return; }

    setBusy(true); setErr(null);
    try {
      const who = form.org.trim() || form.name.trim() || form.email.trim();
      const payload = {
        recipient: { type: 'admin' as const, adminEmail: RECIPIENT_EMAIL },
        fromEmail: form.email.trim().toLowerCase(),
        fromName:  form.name.trim() || (lang === 'FR' ? 'Anonyme' : 'Anonymous'),
        subject:   `${t.mailSubject}: ${who}`,
        body:      form.org.trim()
          ? `${t.mailOrgLine} ${form.org.trim()}\n\n${form.body.trim()}`
          : form.body.trim(),
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

  if (done) {
    return (
      <p className="inline-flex items-center gap-2 font-editorial text-sm text-brass">
        <Check size={15} /> {t.sent}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass/60 text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-[0.24em] text-[11px] font-semibold transition rounded-card"
      >
        <Crown size={13} /> {t.trigger}
      </button>
    );
  }

  return (
    <GildedFrame inset={12} tone="amber" className="mt-2 text-left">
      <form onSubmit={onSubmit} className="caravan-glass rounded-lg-card p-6 md:p-8 grid sm:grid-cols-2 gap-x-5 gap-y-4">
        <div className="sm:col-span-2">
          <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-1.5">{t.formTitle}</h3>
          <p className="font-editorial text-sm text-ivory-soft">{t.formIntro}</p>
        </div>

        <Field label={t.nameLabel}>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                 placeholder={t.namePh} autoComplete="name" className={inputCls} />
        </Field>
        <Field label={t.orgLabel}>
          <input type="text" value={form.org} onChange={(e) => set('org', e.target.value)}
                 placeholder={t.orgPh} autoComplete="organization" className={inputCls} />
        </Field>
        <Field label={t.emailLabel} required>
          <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                 placeholder="vous@exemple.ca" autoComplete="email" className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.bodyLabel} required>
            <textarea required minLength={10} rows={5} value={form.body}
                      onChange={(e) => set('body', e.target.value)}
                      placeholder={t.bodyPh} className={`${inputCls} resize-y`} />
          </Field>
        </div>

        {err && <p className="sm:col-span-2 font-editorial text-sm" style={{ color: '#FCA5B0' }}>{err}</p>}

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="font-editorial text-xs" style={{ color: 'rgba(var(--sk-parchment-rgb), 0.45)' }}>{t.privacy}</p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-[0.24em] text-[11px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
          >
            <Send size={13} /> {busy ? t.sending : t.send}
          </button>
        </div>
      </form>
    </GildedFrame>
  );
};

const inputCls =
  'w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-[0.2em] uppercase">
      {label}{required && <span style={{ color: '#FCA5B0' }}> *</span>}
    </label>
    {children}
  </div>
);

const FR = {
  trigger:     'Devenir commanditaire l’an prochain',
  formTitle:   'Commanditaire d’honneur 2027',
  formIntro:   'Une seule place par édition. Dites-nous qui vous êtes et ce que vous aimeriez porter : nous vous répondons personnellement.',
  nameLabel:   'Votre nom',        namePh: 'Optionnel',
  orgLabel:    'Entreprise',       orgPh:  'Optionnel',
  emailLabel:  'Courriel',
  bodyLabel:   'Votre message',
  bodyPh:      'Ce qui vous attire dans le festival, ce que vous aimeriez y faire.',
  send:        'Envoyer',          sending: 'Envoi…',
  sent:        'Message reçu. Nous vous revenons rapidement.',
  privacy:     'Votre courriel sert uniquement à notre réponse, conformément à la Loi 25.',
  errEmail:    'Courriel invalide.',
  errBody:     'Le message doit contenir au moins 10 caractères.',
  mailSubject: 'Commandite d’honneur 2027',
  mailOrgLine: 'Entreprise :',
};

const EN: typeof FR = {
  trigger:     'Sponsor next year’s edition',
  formTitle:   'Sponsor of honour 2027',
  formIntro:   'One seat per edition. Tell us who you are and what you’d like to carry: we answer personally.',
  nameLabel:   'Your name',        namePh: 'Optional',
  orgLabel:    'Company',          orgPh:  'Optional',
  emailLabel:  'Email',
  bodyLabel:   'Your message',
  bodyPh:      'What draws you to the festival, and what you’d like to do there.',
  send:        'Send',             sending: 'Sending…',
  sent:        'Message received. We’ll get back to you shortly.',
  privacy:     'Your email is used only for our reply, in compliance with Quebec Law 25.',
  errEmail:    'Invalid email.',
  errBody:     'Message must be at least 10 characters.',
  mailSubject: 'Sponsor of honour 2027',
  mailOrgLine: 'Company:',
};

export default SponsorInquiry;
