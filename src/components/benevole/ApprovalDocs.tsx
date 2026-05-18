import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, FileSignature, Check, X, Save, AlertTriangle, Lock,
} from 'lucide-react';
import { upsertBenevoleApp, type BenevoleApp } from '../../firebase/applications';

// Post-acceptance signing flow.
// Two documents unlock once Maïté flips the application to 'accepted':
//   1. Décharge parentale — required only if the bénévole is under 18.
//   2. Contrat bénévole   — required for everyone accepted.
//
// Both are signed inline (typed signature) and timestamped on the
// BenevoleApp record. The contracts themselves are stored as inline
// markdown here so the legal text can iterate without redeploys
// uploading to Storage; replace COPY_* with the final legal text.

interface Props {
  b: BenevoleApp;
  onChanged: (next: BenevoleApp) => void;
  isDemo?: boolean;
  lang?: 'FR' | 'EN';
}

const ApprovalDocs: React.FC<Props> = ({ b, onChanged, isDemo = false, lang = 'FR' }) => {
  const [open, setOpen] = useState<'decharge' | 'contrat' | null>(null);
  const isMinor = b.ageRange === 'lt18';
  const dechargeDone = !!b.dechargeParentaleSigned;
  const contratDone  = !!b.contratBenevoleSigned;

  const t = lang === 'FR' ? FR : EN;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-400" />
        <p className="font-display title-medieval text-[11px] uppercase tracking-widest text-emerald-400">
          {t.title}
        </p>
      </div>
      <p className="font-editorial italic text-xs text-ivory-soft/70 leading-relaxed">
        {t.lead}
      </p>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {isMinor && (
          <DocButton
            icon="🛡️"
            title={t.dechargeTitle}
            sub={dechargeDone ? t.signedAt(fmt(b.dechargeParentaleSignedAt)) : t.dechargeSub}
            done={dechargeDone}
            onClick={() => setOpen('decharge')}
          />
        )}
        <DocButton
          icon="📜"
          title={t.contratTitle}
          sub={contratDone ? t.signedAt(fmt(b.contratBenevoleSignedAt)) : t.contratSub}
          done={contratDone}
          onClick={() => setOpen('contrat')}
        />
      </div>

      {!isMinor && !contratDone && (
        <p className="font-editorial italic text-[11px] text-ivory-soft/50 mt-2">
          {t.contractRequired}
        </p>
      )}

      <AnimatePresence>
        {open === 'decharge' && (
          <SignModal
            title={t.dechargeTitle}
            body={COPY_DECHARGE}
            requireParentName
            initialParentName={b.dechargeParentaleParentName || ''}
            initialParentPhone={b.dechargeParentaleParentPhone || ''}
            onClose={() => setOpen(null)}
            onSign={async ({ parentName, parentPhone }) => {
              const next: BenevoleApp = {
                ...b,
                dechargeParentaleSigned:      true,
                dechargeParentaleSignedAt:    nowTs(),
                dechargeParentaleParentName:  parentName,
                dechargeParentaleParentPhone: parentPhone,
              };
              if (!isDemo) await upsertBenevoleApp(next);
              onChanged(next);
              setOpen(null);
            }}
            lang={lang}
          />
        )}
        {open === 'contrat' && (
          <SignModal
            title={t.contratTitle}
            body={COPY_CONTRAT}
            initialSignature={b.contratBenevoleSignatureName || ''}
            onClose={() => setOpen(null)}
            onSign={async ({ signature }) => {
              const next: BenevoleApp = {
                ...b,
                contratBenevoleSigned:        true,
                contratBenevoleSignedAt:      nowTs(),
                contratBenevoleSignatureName: signature,
              };
              if (!isDemo) await upsertBenevoleApp(next);
              onChanged(next);
              setOpen(null);
            }}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DocButton: React.FC<{
  icon: string; title: string; sub: string; done: boolean; onClick: () => void;
}> = ({ icon, title, sub, done, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-card border text-left transition ${
      done
        ? 'border-emerald-400/40 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]'
        : 'border-brass/40 bg-brass/[0.05] hover:bg-brass/[0.12]'
    }`}>
    <span className="text-2xl shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="font-display title-medieval text-sm text-ivory truncate">{title}</p>
      <p className={`font-editorial italic text-[11px] truncate ${done ? 'text-emerald-300' : 'text-ivory-soft/60'}`}>
        {sub}
      </p>
    </div>
    {done
      ? <Check size={14} className="text-emerald-400 shrink-0" />
      : <FileSignature size={13} className="text-brass shrink-0" />}
  </button>
);

interface SignModalProps {
  title: string;
  body:  string;
  requireParentName?: boolean;
  initialParentName?:  string;
  initialParentPhone?: string;
  initialSignature?:   string;
  onClose: () => void;
  onSign:  (v: { signature: string; parentName?: string; parentPhone?: string }) => Promise<void>;
  lang: 'FR' | 'EN';
}
const SignModal: React.FC<SignModalProps> = ({
  title, body, requireParentName,
  initialParentName = '', initialParentPhone = '', initialSignature = '',
  onClose, onSign, lang,
}) => {
  const [signature, setSignature] = useState(initialSignature);
  const [parentName,  setParentName]  = useState(initialParentName);
  const [parentPhone, setParentPhone] = useState(initialParentPhone);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSign = agreed && signature.trim().length >= 2 && (!requireParentName || (parentName.trim().length >= 2 && parentPhone.trim().length >= 6));

  const submit = async () => {
    if (!canSign) return;
    setBusy(true);
    try {
      await onSign({
        signature: signature.trim(),
        parentName:  parentName.trim()  || undefined,
        parentPhone: parentPhone.trim() || undefined,
      });
    } finally { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 /80 backdrop-blur-md flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 12, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl border border-brass/30 rounded-lg-card overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-0.5">
              {lang === 'FR' ? 'Document à signer' : 'Document to sign'}
            </p>
            <h3 className="font-display title-medieval text-lg text-ivory">{title}</h3>
          </div>
          <button onClick={onClose} className="text-ivory-soft hover:text-blush transition">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="font-editorial text-sm text-ivory-soft leading-relaxed whitespace-pre-line">
            {body}
          </div>
        </div>

        <footer className="px-5 py-4 space-y-3">
          {requireParentName && (
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">
                  {lang === 'FR' ? 'Nom du parent / tuteur·rice' : 'Parent / guardian name'} *
                </span>
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} required
                  className="w-full /60 border px-3 py-2 text-sm font-sans text-ivory focus:border-brass focus:outline-none rounded-card" />
              </label>
              <label className="block">
                <span className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">
                  {lang === 'FR' ? 'Téléphone parent' : 'Parent phone'} *
                </span>
                <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required
                  className="w-full /60 border px-3 py-2 text-sm font-sans text-ivory focus:border-brass focus:outline-none rounded-card" />
              </label>
            </div>
          )}

          <label className="block">
            <span className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">
              {requireParentName
                ? (lang === 'FR' ? 'Signature du parent (texte)' : 'Parent signature (typed)')
                : (lang === 'FR' ? 'Votre signature (texte)'      : 'Your signature (typed)')} *
            </span>
            <input value={signature} onChange={(e) => setSignature(e.target.value)} required
              placeholder={lang === 'FR' ? 'Tapez votre nom complet' : 'Type your full name'}
              className="w-full /60 border px-3 py-2 text-base font-display title-medieval text-brass focus:border-brass focus:outline-none rounded-card" />
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brass" />
            <span className="font-editorial italic text-xs text-ivory-soft leading-relaxed">
              {lang === 'FR'
                ? "J'ai lu, je comprends et j'accepte les conditions ci-dessus."
                : "I have read, understand, and accept the conditions above."}
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="px-4 py-2 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
              {lang === 'FR' ? 'Annuler' : 'Cancel'}
            </button>
            <button onClick={submit} disabled={!canSign || busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40 disabled:cursor-not-allowed">
              <Save size={11} /> {busy ? '…' : (lang === 'FR' ? 'Signer & enregistrer' : 'Sign & save')}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
};

const COPY_DECHARGE = `Décharge parentale — Festival Médiéval de Montpellier 2026

Je soussigné·e, parent ou tuteur·rice légal·e du·de la mineur·e participant·e au programme de bénévolat du Festival Médiéval de Montpellier (édition 2026, du 25 au 27 septembre 2026), autorise par la présente sa participation aux activités bénévoles encadrées par l'organisation, dans le respect des consignes de sécurité fournies.

Je reconnais :
• Avoir été informé·e de la nature des tâches bénévoles assignées au·à la mineur·e ;
• Avoir transmis les coordonnées d'urgence et les renseignements médicaux pertinents (allergies, médication) au moment de l'inscription ;
• Que la responsabilité civile de l'organisation couvre les bénévoles dans le cadre de leurs fonctions, mais que je reste responsable de mon enfant en dehors de ses heures de bénévolat ;
• Avoir convenu d'un point de rencontre pour les fins de quart, et que je serai joignable au numéro indiqué ci-dessous pendant toute la durée du festival.

J'autorise les responsables sur place à prodiguer ou à faire prodiguer les premiers soins en cas de besoin, et à me contacter immédiatement en cas d'incident.

En signant, je confirme l'exactitude des renseignements fournis et donne mon consentement à la participation du·de la mineur·e.`;

const COPY_CONTRAT = `Contrat bénévole — Festival Médiéval de Montpellier 2026

Je m'engage, à titre de bénévole, à participer au Festival Médiéval de Montpellier (FMM) 2026, édition tenue à Montpellier (Québec) du 25 au 27 septembre 2026.

Engagements :
• Respecter les horaires des quarts qui me sont assignés et prévenir l'équipe coordination dès que possible en cas d'empêchement ;
• Suivre les consignes des responsables de station et de l'équipe sécurité ;
• Représenter le festival avec courtoisie auprès du public, des artisans et des autres bénévoles ;
• Respecter les règles de service responsable (Éduc'alcool) si je suis affecté·e au bar/taverne ;
• Conserver la confidentialité de toute information privée dont je pourrais prendre connaissance dans le cadre de mes fonctions ;
• Porter le t-shirt de bénévole fourni durant les heures de service.

Avantages :
• Deux billets d'entrée pour la fin de semaine, pour moi et une personne de mon choix ;
• Repas et rafraîchissements offerts pendant mes quarts ;
• Articles exclusifs de la 6e édition ;
• Espace de camping disponible sur demande ;
• Une expérience immersive au cœur d'une équipe passionnée.

L'organisation se réserve le droit de mettre fin à mon engagement à tout moment en cas de manquement grave aux règles ou de comportement inapproprié.

En signant, je confirme avoir lu, compris et accepté l'ensemble de ces engagements.`;

function nowTs(): any {
  const d = new Date();
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
}
function fmt(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FR = {
  title:    'Documents à signer',
  lead:     'Votre candidature est acceptée — merci ! Avant le festival, deux documents doivent être signés :',
  dechargeTitle: 'Décharge parentale',
  dechargeSub:   'Requise pour les moins de 18 ans',
  contratTitle:  'Contrat bénévole',
  contratSub:    'Engagements et avantages',
  signedAt: (d: string) => `Signé·e ${d}`,
  contractRequired: 'Le contrat doit être signé avant votre premier quart.',
};
const EN: typeof FR = {
  title:    'Documents to sign',
  lead:     'Your application is accepted — thank you! Two documents must be signed before the festival:',
  dechargeTitle: 'Parental release',
  dechargeSub:   'Required for under-18 volunteers',
  contratTitle:  'Volunteer agreement',
  contratSub:    'Commitments and benefits',
  signedAt: (d: string) => `Signed ${d}`,
  contractRequired: 'The agreement must be signed before your first shift.',
};

// Lock icon imported here to silence the unused warning when none of the
// sub-views are open and we want to surface it in a future iteration.
export { Lock as ApprovalLockIcon, AlertTriangle as ApprovalAlertIcon };

export default ApprovalDocs;
