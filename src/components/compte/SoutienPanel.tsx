import React, { useState } from 'react';
import { LifeBuoy, Phone, Send, Check } from 'lucide-react';
import { SITE } from '../../content';
import { DEPARTMENTS } from '../../content/departments';
import { sendMessage } from '../../firebase/mail';
import { mockSendMessage } from '../../firebase/mockMail';
import { isFirebaseReady } from '../../firebase';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

// ─── Guichet de soutien de l'espace client ──────────────────────────
// Ce panneau ouvrait un `mailto:` : le message partait dans le client de
// courriel du visiteur, personne au festival n'en gardait trace, et rien
// ne garantissait qu'il atteigne la bonne personne.
//
// Il écrit maintenant dans les MÊMES boîtes que le formulaire public
// /contact (collection `mail`, aiguillage par département). Un seul
// aiguillage à entretenir, un seul endroit où lire : l'onglet Courrier
// de l'admin. Le responsable de chaque département y voit sa boîte.
//
// Différence avec /contact : ici la personne est connectée, donc son nom
// et son courriel sont déjà connus. Elle n'a qu'à choisir le sujet et
// écrire. Le téléphone reste offert pour l'urgent.
const SoutienPanel: React.FC<{
  lang: 'FR' | 'EN';
  userEmail: string;
  userName: string;
}> = ({ lang, userEmail, userName }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  const [deptId, setDeptId]   = useState(DEPARTMENTS[0].id);
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  const dept = DEPARTMENTS.find((d) => d.id === deptId) ?? DEPARTMENTS[0];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (subject.trim().length < 3) { setErr(t.errSubject); return; }
    if (body.trim().length < 10)   { setErr(t.errBody);    return; }
    setBusy(true);
    try {
      const payload = {
        recipient: { type: 'department' as const, departmentId: deptId },
        fromEmail: userEmail,
        fromName:  userName || userEmail,
        subject:   subject.trim(),
        body:      body.trim(),
      };
      if (DEV_BYPASS || !isFirebaseReady) await mockSendMessage(payload);
      else                                await sendMessage(payload);
      setSent(true);
      setSubject(''); setBody('');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(26, 5, 11, 0.55)', border: '1px solid rgba(244, 239, 227, 0.10)' }}
    >
      <header className="flex items-start gap-4 mb-5">
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
            <LifeBuoy size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1.5">{t.eyebrow}</p>
          <h2
            className="font-display text-2xl md:text-3xl leading-snug"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {t.title}
          </h2>
        </div>
      </header>

      {sent ? (
        <div className="py-6 text-center">
          <span className="witcher-tile mx-auto mb-5 block" style={{ width: 48, height: 48 }}>
            <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Check size={17} /></span>
          </span>
          <p className="font-display text-xl mb-2" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
            {t.sentTitle}
          </p>
          <p className="font-sans text-sm" style={{ color: 'rgba(244,239,227,0.6)', fontWeight: 300 }}>
            {t.sentBody}
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="witcher-prompt mt-6"
          >
            <span className="witcher-prompt-glyph"><span>X</span></span>
            {t.again}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <p
            className="font-sans text-sm md:text-[15px] leading-[1.7] mb-6"
            style={{ color: 'rgba(244, 239, 227, 0.7)', fontWeight: 300 }}
          >
            {t.lead}
          </p>

          <label className="block mb-4">
            <span className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-2" style={{ color: '#D8B05A' }}>
              {t.deptLabel}
            </span>
            {/* Aucun nom de responsable ici non plus : on choisit un sujet. */}
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="witcher-input font-sans"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>{fr ? d.labelFR : d.labelEN}</option>
              ))}
            </select>
            {(fr ? dept.hintFR : dept.hintEN) && (
              <span className="block font-sans text-xs mt-2" style={{ color: 'rgba(244,239,227,0.42)', fontWeight: 300 }}>
                {fr ? dept.hintFR : dept.hintEN}
              </span>
            )}
          </label>

          <label className="block mb-4">
            <span className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-2" style={{ color: '#D8B05A' }}>
              {t.subjectLabel}
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPh}
              className="witcher-input font-sans"
            />
          </label>

          <label className="block mb-5">
            <span className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-2" style={{ color: '#D8B05A' }}>
              {t.bodyLabel}
            </span>
            <textarea
              value={body}
              rows={5}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.bodyPh}
              className="witcher-input font-sans resize-y min-h-[120px]"
            />
          </label>

          {err && <p className="font-sans text-sm mb-4" style={{ color: '#E08A6E' }}>{err}</p>}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button type="submit" disabled={busy} className="witcher-prompt disabled:opacity-50" data-primary="true">
              <span className="witcher-prompt-glyph"><span>A</span></span>
              {busy ? t.sending : t.send}
              {!busy && <Send size={13} />}
            </button>

            <a
              href={`tel:${SITE.contact.phone.replace(/[^\d+]/g, '')}`}
              className="group inline-flex items-center gap-2.5 font-sans text-sm transition-colors"
              style={{ color: 'rgba(244,239,227,0.6)' }}
            >
              <Phone size={14} style={{ color: '#D8B05A' }} />
              <span className="group-hover:text-[#D8B05A] transition-colors">
                {t.urgent} {SITE.contact.phone}
              </span>
            </a>
          </div>

          <p className="font-sans text-xs mt-5" style={{ color: 'rgba(244,239,227,0.38)', fontWeight: 300 }}>
            {t.asNote} {userEmail}
          </p>
        </form>
      )}
    </section>
  );
};

const FR = {
  eyebrow: 'Soutien',
  title:   'Une question, un pépin',
  lead:    'Choisissez le département : votre message arrive directement dans la bonne boîte, du côté de l’équipe. La personne qui s’en occupe vous répond par courriel.',
  deptLabel:    'Département',
  subjectLabel: 'Sujet',
  subjectPh:    'Brièvement, en quelques mots',
  bodyLabel:    'Message',
  bodyPh:       'Dites-nous tout. Nous lisons chaque message.',
  send:      'Envoyer',
  sending:   'Envoi…',
  urgent:    'Pressant ?',
  asNote:    'Envoyé au nom de',
  again:     'Écrire un autre message',
  sentTitle: 'Message parti',
  sentBody:  'Il attend dans la boîte du département. Vous recevrez la réponse par courriel.',
  errSubject:'Donnez un sujet, même court.',
  errBody:   'Écrivez quelques mots de plus, que nous puissions vous aider.',
};

const EN: typeof FR = {
  eyebrow: 'Support',
  title:   'A question, a snag',
  lead:    'Pick the department: your message lands straight in the right inbox on the team’s side. Whoever handles it replies by email.',
  deptLabel:    'Department',
  subjectLabel: 'Subject',
  subjectPh:    'Briefly, in a few words',
  bodyLabel:    'Message',
  bodyPh:       'Tell us everything. We read every message.',
  send:      'Send',
  sending:   'Sending…',
  urgent:    'Urgent?',
  asNote:    'Sent on behalf of',
  again:     'Write another message',
  sentTitle: 'Message sent',
  sentBody:  'It is waiting in the department inbox. You will get the reply by email.',
  errSubject:'Give it a subject, even a short one.',
  errBody:   'Write a few more words so we can actually help.',
};

export default SoutienPanel;
