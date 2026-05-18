import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Send, CheckCircle2, ExternalLink, Shield } from 'lucide-react';
import { submitBehourdApplication, type BehourdApplication, type WeightClass, type SkillLevel } from '../../firebase/behourd';

const ZEFFY_BEHOURD_URL =
  import.meta.env.VITE_ZEFFY_BEHOURD_URL ||
  'https://www.zeffy.com/';

interface Props {
  lang: 'FR' | 'EN';
}

const BehourdRegistrationForm: React.FC<Props> = ({ lang }) => {
  const t = lang === 'FR' ? FR : EN;

  const [open, setOpen]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [teamName, setTeamName]       = useState('');
  const [age, setAge]                 = useState(25);
  const [weightClass, setWeightClass] = useState<WeightClass>('medium');
  const [skillLevel, setSkillLevel]   = useState<SkillLevel>('intermediate');
  const [yearsTraining, setYearsTraining]   = useState(0);
  const [pastCompetitions, setPastCompetitions] = useState('');
  const [ownsHelm, setOwnsHelm]           = useState(false);
  const [ownsGambeson, setOwnsGambeson]   = useState(false);
  const [ownsArmor, setOwnsArmor]         = useState(false);
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [medicalNotes, setMedicalNotes]   = useState('');
  const [questions, setQuestions]         = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError(t.errRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    const payload: BehourdApplication = {
      fullName: fullName.trim(),
      email:    email.trim(),
      phone:    phone.trim(),
      teamName: teamName.trim() || undefined,
      age,
      weightClass,
      skillLevel,
      yearsTraining: yearsTraining || undefined,
      pastCompetitions: pastCompetitions.trim() || undefined,
      ownsHelm,
      ownsGambeson,
      ownsArmor,
      equipmentNotes: equipmentNotes.trim() || undefined,
      medicalNotes:   medicalNotes.trim() || undefined,
      questions:      questions.trim() || undefined,
      year: 2027,
    };
    try {
      await submitBehourdApplication(payload);
      setSubmitted(true);
      // Open Zeffy in a new tab so the user can complete payment.
      window.open(ZEFFY_BEHOURD_URL, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[behourd] submit failed', err);
      setError(t.errSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* CTA panel */}
      {!open && !submitted && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition rounded-card shadow-[0_8px_24px_rgba(176,141,58,0.25)]"
          >
            <Swords size={16} /> {t.openCta}
          </button>
          <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-3">
            {t.openHint}
          </p>
        </div>
      )}

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto text-center bg-midnight-deep/60 border border-brass/30 rounded-card p-8 md:p-10"
        >
          <CheckCircle2 size={42} className="mx-auto mb-4 text-emerald-400" />
          <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">{t.thanksTitle}</h3>
          <p className="font-editorial italic text-base text-ivory-soft mb-5">{t.thanksBody}</p>
          <a
            href={ZEFFY_BEHOURD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
          >
            {t.zeffyAgain} <ExternalLink size={13} />
          </a>
        </motion.div>
      )}

      <AnimatePresence>
        {open && !submitted && (
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35 }}
            onSubmit={submit}
            className="max-w-3xl mx-auto bg-midnight-deep/60 border border-brass/30 rounded-card p-6 md:p-10 space-y-8 text-ivory"
          >
            <Fieldset icon={Shield} title={t.sectionIdentity}>
              <Row label={t.fullName} required>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Row>
              <Row label={t.email} required>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Row>
              <Row label={t.phone} required>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </Row>
              <Row label={t.teamName}>
                <input className={inputClass} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t.teamNamePh} />
              </Row>
              <Row label={t.age}>
                <input type="number" min={16} max={80} className={inputClass} value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} />
              </Row>
            </Fieldset>

            <Fieldset icon={Swords} title={t.sectionCombat}>
              <Row label={t.weightClass}>
                <select className={inputClass} value={weightClass} onChange={(e) => setWeightClass(e.target.value as WeightClass)}>
                  <option value="light">{t.wc.light}</option>
                  <option value="medium">{t.wc.medium}</option>
                  <option value="heavy">{t.wc.heavy}</option>
                  <option value="open">{t.wc.open}</option>
                </select>
              </Row>
              <Row label={t.skillLevel}>
                <select className={inputClass} value={skillLevel} onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}>
                  <option value="beginner">{t.skill.beginner}</option>
                  <option value="intermediate">{t.skill.intermediate}</option>
                  <option value="advanced">{t.skill.advanced}</option>
                  <option value="experienced">{t.skill.experienced}</option>
                </select>
              </Row>
              <Row label={t.yearsTraining}>
                <input type="number" min={0} max={50} className={inputClass} value={yearsTraining} onChange={(e) => setYearsTraining(Number(e.target.value) || 0)} />
              </Row>
              <Row label={t.pastCompetitions}>
                <textarea rows={2} className={inputClass} value={pastCompetitions} onChange={(e) => setPastCompetitions(e.target.value)} placeholder={t.pastCompetitionsPh} />
              </Row>
            </Fieldset>

            <Fieldset icon={Shield} title={t.sectionEquipment}>
              <Check label={t.ownsHelm}      on={ownsHelm}      onChange={setOwnsHelm} />
              <Check label={t.ownsGambeson}  on={ownsGambeson}  onChange={setOwnsGambeson} />
              <Check label={t.ownsArmor}     on={ownsArmor}     onChange={setOwnsArmor} />
              <Row label={t.equipmentNotes}>
                <textarea rows={2} className={inputClass} value={equipmentNotes} onChange={(e) => setEquipmentNotes(e.target.value)} placeholder={t.equipmentNotesPh} />
              </Row>
            </Fieldset>

            <Fieldset icon={Shield} title={t.sectionOther}>
              <Row label={t.medicalNotes}>
                <textarea rows={2} className={inputClass} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder={t.medicalNotesPh} />
              </Row>
              <Row label={t.questions}>
                <textarea rows={3} className={inputClass} value={questions} onChange={(e) => setQuestions(e.target.value)} />
              </Row>
            </Fieldset>

            {error && <p className="font-editorial italic text-sm text-blush text-center">{error}</p>}

            <p className="font-editorial italic text-xs text-ivory-soft/70 text-center">
              {t.zeffyHint}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 border border-ivory-soft/30 text-ivory-soft hover:border-ivory-soft/60 hover:text-ivory transition font-sans uppercase tracking-wider text-xs rounded-card"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-7 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
              >
                {submitting ? t.submitting : t.submit} <Send size={14} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Helpers (mirrors MusicianForm style) ──────────────────────────────
const inputClass =
  'w-full bg-black/40 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/70 focus:ring-1 focus:ring-brass/40 transition';

const Fieldset: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <section>
    <h4 className="font-display title-medieval text-base text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
      <Icon size={14} /> {title}
    </h4>
    <div className="divider-brass w-14 mb-4" />
    <div className="space-y-4">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="font-sans text-xs uppercase tracking-widest text-ivory-soft/80 mb-1.5 inline-block">
      {label}{required ? ' *' : ''}
    </span>
    {children}
  </label>
);

const Check: React.FC<{ label: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, on, onChange }) => (
  <label className="flex items-start gap-2.5 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={on}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-ivory-soft/40 bg-midnight-deep accent-brass"
    />
    <span className="font-sans text-sm text-ivory-soft">{label}</span>
  </label>
);

// ─── i18n ──────────────────────────────────────────────────────────────
const FR = {
  openCta:    'S’inscrire au Tournoi de Behourd 2027',
  openHint:   'Place limitée — l’inscription est à 1 an d’avance.',
  cancel:     'Annuler',
  submit:     'Enregistrer puis payer via Zeffy',
  submitting: 'Envoi…',
  zeffyHint:  'Après envoi, vous serez redirigé vers Zeffy pour finaliser votre paiement d’inscription.',
  zeffyAgain: 'Reouvrir Zeffy',
  thanksTitle:'Inscription enregistrée',
  thanksBody: 'Nous vous attendons sur Zeffy pour finaliser le paiement. Tristan vous reviendra par courriel pour la suite.',
  errRequired:'Nom, courriel et téléphone sont obligatoires.',
  errSubmit:  'Impossible d’enregistrer pour l’instant. Réessayez ou écrivez à admin@festivalmedievaldemontpellier.org.',
  sectionIdentity:  'Identité',
  sectionCombat:    'Spécifications de combat',
  sectionEquipment: 'Équipement',
  sectionOther:     'Santé & questions',
  fullName: 'Nom complet',
  email:    'Courriel',
  phone:    'Téléphone',
  teamName: 'Équipe / clan (optionnel)',
  teamNamePh:'Ex.: Clan Managarm, Compagnie d’armes…',
  age:      'Âge',
  weightClass: 'Catégorie de poids',
  wc: { light: 'Léger', medium: 'Moyen', heavy: 'Lourd', open: 'Toutes catégories' } as Record<string, string>,
  skillLevel:  'Niveau',
  skill: { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', experienced: 'Expérimenté (compétition)' } as Record<string, string>,
  yearsTraining: 'Années d’entraînement',
  pastCompetitions: 'Compétitions passées',
  pastCompetitionsPh: 'Liste libre — événement, année, résultat',
  ownsHelm:     'Je possède un casque conforme',
  ownsGambeson: 'Je possède un gambison',
  ownsArmor:    'Je possède une armure complète (au moins partielle conforme)',
  equipmentNotes: 'Notes équipement',
  equipmentNotesPh: 'Ce que vous apportez vs ce qu’il faut prêter',
  medicalNotes:   'Conditions médicales / allergies pertinentes',
  medicalNotesPh: 'Confidentiel — partagé uniquement avec l’équipe sécurité',
  questions:      'Questions / commentaires',
};

const EN: typeof FR = {
  openCta:    'Register for the 2027 Behourd Tournament',
  openHint:   'Limited slots — registration is one year in advance.',
  cancel:     'Cancel',
  submit:     'Save and pay via Zeffy',
  submitting: 'Sending…',
  zeffyHint:  'After saving, you’ll be redirected to Zeffy to complete your registration payment.',
  zeffyAgain: 'Reopen Zeffy',
  thanksTitle:'Registration saved',
  thanksBody: 'We’ll meet you on Zeffy to finalize payment. Tristan will follow up by email.',
  errRequired:'Name, email and phone are required.',
  errSubmit:  'Could not save right now. Retry or email admin@festivalmedievaldemontpellier.org.',
  sectionIdentity:  'Identity',
  sectionCombat:    'Combat specs',
  sectionEquipment: 'Equipment',
  sectionOther:     'Health & questions',
  fullName: 'Full name',
  email:    'Email',
  phone:    'Phone',
  teamName: 'Team / clan (optional)',
  teamNamePh:'e.g. Clan Managarm, Compagnie d’armes…',
  age:      'Age',
  weightClass: 'Weight class',
  wc: { light: 'Light', medium: 'Medium', heavy: 'Heavy', open: 'Open' } as Record<string, string>,
  skillLevel:  'Skill level',
  skill: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', experienced: 'Experienced (competitions)' } as Record<string, string>,
  yearsTraining: 'Years of training',
  pastCompetitions: 'Past competitions',
  pastCompetitionsPh: 'Free list — event, year, result',
  ownsHelm:     'I have a regulation helm',
  ownsGambeson: 'I have a gambeson',
  ownsArmor:    'I own (at least partial) regulation armor',
  equipmentNotes: 'Equipment notes',
  equipmentNotesPh: 'What you bring vs what you need to borrow',
  medicalNotes:   'Relevant medical conditions / allergies',
  medicalNotesPh: 'Confidential — shared only with the safety team',
  questions:      'Questions / notes',
};

export default BehourdRegistrationForm;
