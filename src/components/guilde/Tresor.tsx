import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Loader2, Send, Vault, ScrollText } from 'lucide-react';
import CourbeTaux from './CourbeTaux';
import { PieceGuilde } from './SoldePieces';
import { addLocale } from '../../lib/locale';
import { nomMonnaie, type Guilde } from '../../firebase/guildes';
import type { Membre } from '../../firebase/ordre';
import {
  suivreMaBourseGuilde, suivreRegistre, guildeChanger, guildeVirement,
  guildeTresorVerser, resteAChanger, tauxPour, FRAIS_CHANGE, PLAFOND_CHANGE_JOUR,
  type BourseGuilde, type Ecriture, type SensChange, type TypeEcriture,
} from '../../firebase/guildeMonnaie';
import type { Lang } from '../../content';

// ─── Le trésor du groupe ─────────────────────────────────────────────
// Ma bourse en pièces, le cours du jour, le change dans les deux sens,
// le virement à un membre, le trésor commun et le registre. Rien ici
// n'écrit un solde : chaque geste appelle une fonction serveur, qui
// seule bouge l'argent (contrat CLAN-MONNAIE-CONTRAT.md).
//
// Pleine largeur depuis le 6 septembre 2026 : la bourse et le cours à
// gauche sur sept colonnes, le change et le virement à droite sur cinq,
// le registre d'un bord à l'autre dessous.

const ETIQUETTES: Record<TypeEcriture, { FR: string; EN: string }> = {
  entree:    { FR: 'Entrée',        EN: 'Joined' },
  fondation: { FR: 'Fondation',     EN: 'Founding' },
  change:    { FR: 'Change',        EN: 'Exchange' },
  virement:  { FR: 'Virement',      EN: 'Transfer' },
  tresor:    { FR: 'Trésor commun', EN: 'Treasury' },
  souk:      { FR: 'Marché',        EN: 'Market' },
  evenement: { FR: 'Événement',     EN: 'Event' },
};

function messageErreur(e: unknown, fr: boolean): string {
  const code = (e as { code?: string })?.code || '';
  if (/(not-found|internal|unavailable)$/.test(code)) {
    return fr
      ? 'Le service de la monnaie n’est pas encore en ligne. Réessayez un peu plus tard.'
      : 'The currency service is not online yet. Try again a little later.';
  }
  if (code.endsWith('unauthenticated')) return fr ? 'Connectez-vous d’abord.' : 'Sign in first.';
  return e instanceof Error ? e.message : String(e);
}

const Cadre: React.FC<{ titre: string; icone?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  titre, icone, children, className = '',
}) => (
  <section className={`glass-light rounded-lg-card p-5 md:p-6 ${className}`}>
    <p className="witcher-stat-label inline-flex items-center gap-2 mb-4">{icone}{titre}</p>
    {children}
  </section>
);

const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};

const Tresor: React.FC<{
  guilde: Guilde;
  uid: string;
  /** Un chef du groupe, ou l'équipe du festival : verse depuis le trésor. */
  peutGerer: boolean;
  lang: Lang;
  fiches: Record<string, Membre | null>;
}> = ({ guilde, uid, peutGerer, lang, fiches }) => {
  const fr = lang === 'FR';
  const sigle = guilde.monnaie?.sigle || 'PCE';
  const taux = guilde.taux ?? tauxPour(guilde.nbActifs ?? guilde.nbMembres ?? 0);

  const [bourse, setBourse] = useState<BourseGuilde | null>(null);
  useEffect(() => suivreMaBourseGuilde(guilde.id, uid, setBourse), [guilde.id, uid]);

  const [registre, setRegistre] = useState<Ecriture[]>([]);
  useEffect(() => suivreRegistre(guilde.id, setRegistre), [guilde.id]);

  const reste = resteAChanger(bourse);

  // Chaque personne du registre mène à son profil (addendum, ordre 6).
  const nomDe = (ref: string | undefined): React.ReactNode => {
    if (!ref) return '·';
    if (ref === 'tresor') return fr ? 'le trésor' : 'the treasury';
    if (ref === 'monnaie') return fr ? 'la frappe' : 'the mint';
    return (
      <Link to={`${addLocale('/profil', lang)}/${ref}`} className="hover:text-brass transition-colors">
        {fiches[ref]?.nom || (fr ? 'un membre' : 'a member')}
      </Link>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">

        {/* ── Colonne gauche : ma bourse, le cours, le trésor commun ── */}
        <div className="lg:col-span-7 space-y-5">
          <Cadre titre={fr ? 'Ma bourse' : 'My purse'} icone={<Vault size={12} />}>
            <div className="flex items-end gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <PieceGuilde guilde={guilde} size={64} />
                <div>
                  <p className="font-display text-4xl md:text-5xl text-ivory leading-none tabular-nums">{bourse?.solde ?? 0}</p>
                  <p className="font-sans uppercase tracking-[0.2em] text-[10px] mt-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                    {nomMonnaie(guilde, lang)}
                  </p>
                </div>
              </div>
              <dl className="flex items-center gap-8 pb-1 sm:ml-auto">
                {[
                  { cle: 'gagne', label: fr ? 'Gagné' : 'Earned', valeur: bourse?.gagne ?? 0 },
                  { cle: 'depense', label: fr ? 'Dépensé' : 'Spent', valeur: bourse?.depense ?? 0 },
                ].map((l) => (
                  <div key={l.cle}>
                    <dt className="font-sans uppercase tracking-[0.22em] text-[9px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>{l.label}</dt>
                    <dd className="font-sans text-xl text-ivory tabular-nums mt-0.5">{l.valeur}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Cadre>

          <Cadre titre={fr ? 'Le cours du jour' : 'Today’s rate'}>
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
              <p className="font-display text-3xl text-ivory tabular-nums inline-flex items-center gap-2">
                1 <PieceGuilde guilde={guilde} size={22} /> {sigle} = {taux} M
              </p>
              <p className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                {fr
                  ? `${guilde.nbActifs ?? 0} membres actifs dans les trente derniers jours.`
                  : `${guilde.nbActifs ?? 0} members active in the last thirty days.`}
              </p>
            </div>
            <CourbeTaux
              historique={guilde.tauxHistorique}
              tauxActuel={taux}
              nbActifs={guilde.nbActifs ?? 0}
              lang={lang}
            />
          </Cadre>

          <Cadre titre={fr ? 'Le trésor commun' : 'The common treasury'} icone={<Vault size={12} />}>
            <div className="flex items-center gap-4 mb-1.5">
              <PieceGuilde guilde={guilde} size={40} />
              <p className="font-display text-3xl text-ivory leading-none tabular-nums">
                {Math.round(guilde.tresor ?? 0)} {sigle}
              </p>
            </div>
            <p className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
              {fr
                ? 'Les frais de change et les places d’événement payantes y tombent.'
                : 'Exchange fees and paid event seats fall in here.'}
            </p>
            {peutGerer && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
                <FormulaireVirement
                  guilde={guilde} uid={uid} lang={lang} fiches={fiches}
                  soldePieces={guilde.tresor ?? 0} depuisTresor
                />
              </div>
            )}
          </Cadre>
        </div>

        {/* ── Colonne droite : le change et le virement ── */}
        <div className="lg:col-span-5 space-y-5">
          <FormulaireChange
            guilde={guilde} lang={lang} taux={taux} reste={reste}
            soldePieces={bourse?.solde ?? 0}
          />
          <FormulaireVirement
            guilde={guilde} uid={uid} lang={lang} fiches={fiches}
            soldePieces={bourse?.solde ?? 0}
          />
        </div>
      </div>

      {/* ── Le registre, d'un bord à l'autre ── */}
      <Cadre titre={fr ? 'Le registre' : 'The ledger'} icone={<ScrollText size={12} />}>
        {registre.length === 0 ? (
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr ? 'Rien n’a encore changé de mains.' : 'Nothing has changed hands yet.'}
          </p>
        ) : (
          <ul className="grid gap-1.5 xl:grid-cols-2">
            {registre.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 px-3 py-2 rounded-card"
                style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}
              >
                <span
                  className="font-sans uppercase tracking-[0.18em] text-[9px] shrink-0 w-24"
                  style={{ color: 'var(--sk-gilt)' }}
                >
                  {(ETIQUETTES[l.type] || ETIQUETTES.change)[fr ? 'FR' : 'EN']}
                </span>
                <span className="font-sans text-[12px] text-ivory-soft min-w-0 flex-1 truncate">
                  {l.note || <>{nomDe(l.de)} → {nomDe(l.a)}</>}
                </span>
                <span className="font-sans text-[12px] text-ivory tabular-nums shrink-0 inline-flex items-center gap-1.5">
                  {l.pieces !== undefined && <>{l.pieces} <PieceGuilde guilde={guilde} size={14} /></>}
                  {l.pieces !== undefined && l.montpellois !== undefined && ' · '}
                  {l.montpellois !== undefined && `${l.montpellois} M`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cadre>
    </div>
  );
};

// ─── Le change ───────────────────────────────────────────────────────
const FormulaireChange: React.FC<{
  guilde: Guilde; lang: Lang; taux: number; reste: number; soldePieces: number;
}> = ({ guilde, lang, taux, reste, soldePieces }) => {
  const fr = lang === 'FR';
  const sigle = guilde.monnaie?.sigle || 'PCE';
  const [sens, setSens] = useState<SensChange>('piecesVersM');
  const [montant, setMontant] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const n = Math.max(0, Math.floor(Number(montant) || 0));

  // La même arithmétique que le serveur, sinon l'aperçu ment.
  const apercu = useMemo(() => {
    if (sens === 'piecesVersM') {
      const frais = Math.round(n * FRAIS_CHANGE);
      const recu = Math.floor((n - frais) * taux);
      return { frais, recu, piecesEngagees: n, versM: true };
    }
    const recu = Math.floor(n / taux);
    return { frais: 0, recu, piecesEngagees: recu, versM: false };
  }, [n, sens, taux]);

  const trop = apercu.piecesEngagees > reste;
  const videCote = n > 0 && apercu.recu <= 0;
  const pasAssez = sens === 'piecesVersM' && n > soldePieces;
  const bloque = n <= 0 || trop || videCote || pasAssez;

  const changer = async () => {
    setBusy(true); setErreur(null); setFait(null);
    try {
      const r = await guildeChanger({ guildeId: guilde.id, sens, montant: n });
      setMontant('');
      setFait(fr
        ? `Fait. Il vous reste ${r.soldePieces} ${sigle} et ${r.soldeM} M.`
        : `Done. You now hold ${r.soldePieces} ${sigle} and ${r.soldeM} M.`);
    } catch (e) {
      setErreur(messageErreur(e, fr));
    } finally { setBusy(false); }
  };

  const piece = <PieceGuilde guilde={guilde} size={14} />;

  return (
    <Cadre titre={fr ? 'Changer' : 'Exchange'} icone={<ArrowLeftRight size={12} />}>
      <div className="flex flex-wrap gap-1.5 mb-4" role="radiogroup" aria-label={fr ? 'Le sens du change' : 'Exchange direction'}>
        {([
          { cle: 'piecesVersM' as const, contenu: <>{piece} {sigle} {fr ? 'vers' : 'to'} M</> },
          { cle: 'mVersPieces' as const, contenu: <>M {fr ? 'vers' : 'to'} {piece} {sigle}</> },
        ]).map((o) => {
          const actif = sens === o.cle;
          return (
            <button
              key={o.cle} type="button" role="radio" aria-checked={actif}
              onClick={() => { setSens(o.cle); setFait(null); setErreur(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
              style={{
                border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`,
                background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent',
                color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)',
              }}
            >
              {o.contenu}
            </button>
          );
        })}
      </div>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">
          {sens === 'piecesVersM'
            ? (fr ? 'Pièces à changer' : 'Coins to exchange')
            : (fr ? 'Montpellois à changer' : 'Montpellois to exchange')}
        </span>
        <input
          type="number" min={0} inputMode="numeric" value={montant}
          onChange={(e) => { setMontant(e.target.value); setFait(null); setErreur(null); }}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory tabular-nums"
          style={champ}
        />
      </label>

      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="font-sans uppercase tracking-[0.2em] text-[9px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>
          {fr ? 'Vous recevez' : 'You receive'}
        </span>
        <span className="font-display text-2xl text-ivory tabular-nums inline-flex items-center gap-2">
          {apercu.recu} {apercu.versM ? 'M' : <PieceGuilde guilde={guilde} size={20} />}
        </span>
      </div>
      <p className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
        {sens === 'piecesVersM'
          ? (fr
            ? `Cinq pour cent vont au trésor commun, soit ${apercu.frais} ${glyphe}.`
            : `Five percent goes to the common treasury, that is ${apercu.frais} ${glyphe}.`)
          : (fr ? 'Ce sens ne coûte aucun frais.' : 'This direction carries no fee.')}
        {' '}
        {fr
          ? `Il vous reste ${reste} ${glyphe} à changer aujourd’hui sur ${PLAFOND_CHANGE_JOUR}.`
          : `You have ${reste} ${glyphe} left to exchange today out of ${PLAFOND_CHANGE_JOUR}.`}
      </p>

      {trop && (
        <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>
          {fr ? 'Ce change dépasse votre plafond du jour.' : 'This exchange goes over your daily cap.'}
        </p>
      )}
      {pasAssez && (
        <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>
          {fr ? 'Votre bourse ne contient pas assez de pièces.' : 'Your purse does not hold that many coins.'}
        </p>
      )}
      {videCote && (
        <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>
          {fr ? 'Ce montant ne rapporte rien au change. Montez-le.' : 'That amount yields nothing. Raise it.'}
        </p>
      )}
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
      {fait && <p className="mt-2 font-sans text-xs" style={{ color: 'var(--sk-gilt)' }}>{fait}</p>}

      <div className="flex justify-end mt-4">
        <button
          type="button" onClick={changer} disabled={busy || bloque}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowLeftRight size={13} />}
          {fr ? 'Changer' : 'Exchange'}
        </button>
      </div>
    </Cadre>
  );
};

// ─── Le virement ─────────────────────────────────────────────────────
// Le même formulaire sert au membre qui paie un autre membre et au chef
// qui puise dans le trésor commun : seule la fonction appelée change.
const FormulaireVirement: React.FC<{
  guilde: Guilde; uid: string; lang: Lang;
  fiches: Record<string, Membre | null>;
  soldePieces: number;
  depuisTresor?: boolean;
}> = ({ guilde, uid, lang, fiches, soldePieces, depuisTresor }) => {
  const fr = lang === 'FR';
  const [aUid, setAUid] = useState('');
  const [montant, setMontant] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const destinataires = guilde.membres.filter((m) => depuisTresor || m !== uid);
  const n = Math.max(0, Math.floor(Number(montant) || 0));
  const bloque = !aUid || n <= 0 || n > soldePieces;

  const envoyer = async () => {
    setBusy(true); setErreur(null); setFait(null);
    try {
      const args = { guildeId: guilde.id, aUid, montant: n, note: note.trim() || undefined };
      if (depuisTresor) await guildeTresorVerser(args);
      else await guildeVirement(args);
      setMontant(''); setNote('');
      setFait(fr ? 'Les pièces sont parties.' : 'The coins are on their way.');
    } catch (e) {
      setErreur(messageErreur(e, fr));
    } finally { setBusy(false); }
  };

  const corps = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'À qui' : 'To whom'}</span>
          <select
            value={aUid} onChange={(e) => setAUid(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory"
            style={champ}
          >
            <option value="">{fr ? 'Choisir un membre' : 'Pick a member'}</option>
            {destinataires.map((m) => (
              <option key={m} value={m}>{fiches[m]?.nom || (fr ? 'Un inconnu' : 'A stranger')}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Combien' : 'How much'}</span>
          <input
            type="number" min={0} inputMode="numeric" value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory tabular-nums"
            style={champ}
          />
        </label>
      </div>
      <label className="block mt-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Pour quoi' : 'What for'}</span>
        <input
          value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
          placeholder={fr ? 'La tournée de la veillée' : 'The evening round'}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
          style={champ}
        />
      </label>
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
      {fait && <p className="mt-2 font-sans text-xs" style={{ color: 'var(--sk-gilt)' }}>{fait}</p>}
      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="font-sans text-[11px] inline-flex items-center gap-1.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
          {fr ? 'Disponible :' : 'Available:'} {soldePieces} <PieceGuilde guilde={guilde} size={13} />
        </span>
        <button
          type="button" onClick={envoyer} disabled={busy || bloque}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {depuisTresor ? (fr ? 'Verser' : 'Pay out') : (fr ? 'Virer' : 'Send')}
        </button>
      </div>
    </>
  );

  if (depuisTresor) {
    return (
      <>
        <p className="witcher-stat-label mb-3">{fr ? 'Verser à un membre' : 'Pay a member'}</p>
        {corps}
      </>
    );
  }

  return (
    <Cadre titre={fr ? 'Virer des pièces' : 'Send coins'} icone={<Send size={12} />}>
      {corps}
    </Cadre>
  );
};

export default Tresor;
