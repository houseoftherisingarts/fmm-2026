import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, Users, Sparkles, Tent, Truck, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { CURRENT_YEAR } from '../../firebase/applications';
import { deposerCandidature, type CandidatureInput } from '../../firebase/candidaturesAnimation';
import { TYPES_ANIMATION, JOURS, type TypeAnimation, type JourFestival } from '../../firebase/animations';

// Porte ouverte à tout le monde, sans compte : une troupe qui écrit au
// festival pour la première fois n'en a pas, et le lui demander fermerait
// la porte avant la première phrase (Alex, 2026-09-15). Une personne déjà
// connectée voit son courriel et son nom pré-remplis, et son uid suit la
// candidature; sinon, tout reste vide et rien n'est envoyé à sa place.

const inputClass =
  'w-full bg-midnight-deep/55 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/70 focus:ring-1 focus:ring-brass/40 transition';

const AnimationForm: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const typeLabels = TYPES_ANIMATION;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [nom, setNom]               = useState('');
  const [type, setType]             = useState<TypeAnimation>('troupe');
  const [contactNom, setContactNom] = useState(user?.displayName ?? '');
  const [courriel, setCourriel]     = useState(user?.email ?? '');
  const [telephone, setTelephone]   = useState('');
  const [siteWeb, setSiteWeb]       = useState('');
  const [provenance, setProvenance] = useState('');
  const [nbPersonnes, setNbPersonnes] = useState('');
  const [description, setDescription] = useState('');
  const [jours, setJours]           = useState<JourFestival[]>([]);
  const [duree, setDuree]           = useState('');
  const [nbPassages, setNbPassages] = useState('');
  const [besoins, setBesoins]       = useState('');
  const [cachetDemande, setCachetDemande] = useState('');
  const [transport, setTransport]   = useState('');
  const [hebergement, setHebergement] = useState(false);
  const [dejaVenu, setDejaVenu]     = useState(false);
  const [message, setMessage]       = useState('');

  const toggleJour = (j: JourFestival) => {
    setJours((cur) => cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j]);
  };

  const courrielValide = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !contactNom.trim() || !courrielValide(courriel) || description.trim().length < 20) {
      setError(t.errValidation);
      return;
    }
    setError(null);
    setSubmitting(true);
    const input: CandidatureInput = {
      nom: nom.trim(),
      type,
      contactNom: contactNom.trim(),
      courriel: courriel.trim(),
      telephone: telephone.trim(),
      siteWeb: siteWeb.trim() || undefined,
      provenance: provenance.trim() || undefined,
      nbPersonnes: nbPersonnes ? Number(nbPersonnes) || undefined : undefined,
      description: description.trim(),
      jours,
      duree: duree.trim() || undefined,
      nbPassages: nbPassages ? Number(nbPassages) || undefined : undefined,
      besoins: besoins.trim() || undefined,
      cachetDemande: cachetDemande.trim() || undefined,
      transport: transport.trim() || undefined,
      hebergement,
      dejaVenu,
      message: message.trim() || undefined,
      lang,
      annee: CURRENT_YEAR,
      uid: user?.uid,
    };
    try {
      await deposerCandidature(input);
      setSubmitted(true);
    } catch (err) {
      console.error('[animationForm] submit failed', err);
      setError(t.errSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="velvet-card rounded-lg-card p-10 md:p-12 text-center max-w-2xl mx-auto"
      >
        <CheckCircle2 size={48} className="mx-auto mb-5 text-emerald-400" />
        <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-3">{t.thanksTitle}</h2>
        <p className="font-editorial italic text-base md:text-lg text-ivory-soft max-w-md mx-auto">{t.thanksBody}</p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="velvet-card rounded-lg-card p-6 md:p-10 max-w-3xl mx-auto space-y-10 text-ivory"
    >
      <Fieldset icon={Users} title={t.sectionQui}>
        <Row label={t.nom} required>
          <input className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} required />
        </Row>
        <Row label={t.type}>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as TypeAnimation)}>
            {typeLabels.map((opt) => (
              <option key={opt.id} value={opt.id}>{lang === 'FR' ? opt.FR : opt.EN}</option>
            ))}
          </select>
        </Row>
        <Row label={t.contactNom} required>
          <input className={inputClass} value={contactNom} onChange={(e) => setContactNom(e.target.value)} required />
        </Row>
        <Row label={t.courriel} required>
          <input type="email" className={inputClass} value={courriel} onChange={(e) => setCourriel(e.target.value)} required />
        </Row>
        <Row label={t.telephone}>
          <input className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </Row>
        <Row label={t.siteWeb}>
          <input className={inputClass} value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://..." />
        </Row>
        <Row label={t.provenance}>
          <input className={inputClass} value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder={t.provenancePh} />
        </Row>
      </Fieldset>

      <Fieldset icon={Sparkles} title={t.sectionQuoi}>
        <Row label={t.description} required>
          <textarea rows={5} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPh} required />
        </Row>
        <Row label={t.nbPersonnes}>
          <input type="number" min={1} className={inputClass} value={nbPersonnes} onChange={(e) => setNbPersonnes(e.target.value)} />
        </Row>
      </Fieldset>

      <Fieldset icon={Tent} title={t.sectionQuand}>
        <Row label={t.jours}>
          <div className="flex flex-wrap gap-2">
            {JOURS.map((j) => (
              <Chip key={j.id} on={jours.includes(j.id)} onClick={() => toggleJour(j.id)}>
                {lang === 'FR' ? j.FR : j.EN}
              </Chip>
            ))}
          </div>
        </Row>
        <Row label={t.duree}>
          <input className={inputClass} value={duree} onChange={(e) => setDuree(e.target.value)} placeholder={t.dureePh} />
        </Row>
        <Row label={t.nbPassages}>
          <input type="number" min={1} className={inputClass} value={nbPassages} onChange={(e) => setNbPassages(e.target.value)} />
        </Row>
      </Fieldset>

      <Fieldset icon={Truck} title={t.sectionLogistique}>
        <Row label={t.besoins}>
          <textarea rows={3} className={inputClass} value={besoins} onChange={(e) => setBesoins(e.target.value)} placeholder={t.besoinsPh} />
        </Row>
        <Row label={t.cachetDemande}>
          <input className={inputClass} value={cachetDemande} onChange={(e) => setCachetDemande(e.target.value)} placeholder={t.cachetDemandePh} />
        </Row>
        <Row label={t.transport}>
          <input className={inputClass} value={transport} onChange={(e) => setTransport(e.target.value)} placeholder={t.transportPh} />
        </Row>
        <Check label={t.hebergement} on={hebergement} onChange={setHebergement} />
        <Check label={t.dejaVenu} on={dejaVenu} onChange={setDejaVenu} />
      </Fieldset>

      <Fieldset icon={MessageSquare} title={t.sectionMot}>
        <Row label={t.message}>
          <textarea rows={3} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Row>
      </Fieldset>

      {error && (
        <p className="font-editorial italic text-sm text-blush text-center">{error}</p>
      )}
      <div className="flex justify-center pt-2">
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card disabled:opacity-50"
        >
          {submitting ? t.submitting : t.submit} <Send size={16} />
        </motion.button>
      </div>
    </form>
  );
};

// ─── Small bits (mêmes gabarits que MusicianForm) ────────────────────
const Fieldset: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <section>
    <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
      <Icon size={14} /> {title}
    </h3>
    <div className="divider-brass w-16 mb-4" />
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

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-wider transition ${
      on
        ? 'bg-brass/25 border-brass text-brass'
        : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
    }`}
  >
    {children}
  </button>
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
  sectionQui:  'Qui vous êtes',
  sectionQuoi: 'Ce que vous présentez',
  sectionQuand:'Votre passage',
  sectionLogistique: 'Ce qu’il faut prévoir',
  sectionMot:  'Un mot de plus',
  nom: 'Nom de la troupe ou de l’acte',
  type: 'Type d’animation',
  contactNom: 'Personne-ressource',
  courriel: 'Courriel',
  telephone: 'Téléphone',
  siteWeb: 'Site web ou page',
  provenance: 'Vous venez de',
  provenancePh: 'Ville, région ou pays',
  description: 'Décrivez ce que vous faites',
  descriptionPh: 'Le numéro, le métier ou le conte que vous présentez, en quelques lignes.',
  nbPersonnes: 'Nombre de personnes',
  jours: 'Jours où vous seriez présents',
  duree: 'Durée d’un passage',
  dureePh: 'Ex. : 30 minutes',
  nbPassages: 'Nombre de passages souhaités',
  besoins: 'Ce que ça demande sur le terrain',
  besoinsPh: 'Espace, feu, électricité, matériel à prévoir…',
  cachetDemande: 'Cachet demandé',
  cachetDemandePh: 'Champ libre : Tristan vous reviendra',
  transport: 'Ce que vous attendez pour le déplacement',
  transportPh: 'Forfait, kilométrage, ou rien de particulier',
  hebergement: 'Nous aurions besoin d’un hébergement sur place',
  dejaVenu: 'Nous sommes déjà venus au festival',
  message: 'Autre chose à ajouter',
  submit: 'Envoyer ma candidature',
  submitting: 'Envoi en cours…',
  errValidation: 'Il manque le nom, la personne-ressource, un courriel valide ou une description d’au moins vingt caractères.',
  errSubmit: 'La candidature n’a pas pu être envoyée. Réessayez ou écrivez à admin@festivalmedievaldemontpellier.org.',
  thanksTitle: 'Votre candidature est arrivée',
  thanksBody: 'Tristan la lira et vous répondra par courriel, à l’adresse que vous avez laissée.',
};

const EN: typeof FR = {
  sectionQui:  'Who you are',
  sectionQuoi: 'What you bring',
  sectionQuand:'Your time on site',
  sectionLogistique: 'What we should plan for',
  sectionMot:  'Anything else',
  nom: 'Troupe or act name',
  type: 'Type of act',
  contactNom: 'Primary contact',
  courriel: 'Email',
  telephone: 'Phone',
  siteWeb: 'Website or page',
  provenance: 'You’re coming from',
  provenancePh: 'City, region or country',
  description: 'Describe what you do',
  descriptionPh: 'The act, the craft or the story you bring, in a few lines.',
  nbPersonnes: 'Number of people',
  jours: 'Days you could be there',
  duree: 'Length of a performance',
  dureePh: 'e.g. 30 minutes',
  nbPassages: 'Number of performances wanted',
  besoins: 'What it takes on site',
  besoinsPh: 'Space, fire, power, equipment to plan for…',
  cachetDemande: 'Fee requested',
  cachetDemandePh: 'Free text: Tristan will follow up',
  transport: 'What you expect for travel',
  transportPh: 'Flat rate, mileage, or nothing in particular',
  hebergement: 'We would need lodging on site',
  dejaVenu: 'We’ve already performed at the festival',
  message: 'Anything else to add',
  submit: 'Send my application',
  submitting: 'Sending…',
  errValidation: 'Missing the name, the primary contact, a valid email, or a description of at least twenty characters.',
  errSubmit: 'The application could not be sent. Try again or email admin@festivalmedievaldemontpellier.org.',
  thanksTitle: 'Your application has arrived',
  thanksBody: 'Tristan will read it and reply by email, at the address you left.',
};

export default AnimationForm;
