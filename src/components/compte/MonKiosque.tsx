import React, { useEffect, useState } from 'react';
import { Zap, Wifi, WifiOff, UtensilsCrossed, MapPin, MessageSquare } from 'lucide-react';
import {
  watchPlanMarche, kiosqueDe, kiosquesDeRangee, prixAffiche, WIFI,
  type PlanMarche, type Kiosque,
} from '../../firebase/planMarche';
import { CURRENT_YEAR } from '../../firebase/applications';

// ─── Mon kiosque · l'espace de l'exposant ─────────────────────────────
// Alex, 12 septembre 2026 : un marchand accepté doit retrouver, dans son
// propre espace, le kiosque que Jesse lui a donné : le code, le prix,
// ce qui vient avec, et où il se trouve dans le marché. Tant que Jesse
// n'a posé le nom de personne sur un emplacement, l'espace le dit et se
// met à jour tout seul le jour où c'est fait.
//
// Le composant lit le même document que l'admin (planMarche/{annee}),
// sans jamais y écrire : il regarde, et attend son tour comme les
// autres marchands. Il ne se monte que pour un compte qui a bien une
// candidature de marchand (voir FicheMembre, qui garde ce contrôle).

interface Props {
  uid: string;
  lang: 'FR' | 'EN';
  annee?: number;
  /** Ouvre le fil vers l'équipe des kiosques, dans l'espace du membre. */
  onEcrire?: () => void;
}

const MonKiosque: React.FC<Props> = ({ uid, lang, annee = CURRENT_YEAR, onEcrire }) => {
  const fr = lang === 'FR';
  const [plan, setPlan] = useState<PlanMarche | null>(null);

  useEffect(() => {
    if (!uid) { setPlan(null); return; }
    return watchPlanMarche(annee, (p) => setPlan(p));
  }, [uid, annee]);

  // Le document arrive en un instant depuis le cache local de Firestore :
  // mieux vaut ne rien montrer une fraction de seconde que de montrer,
  // puis d'effacer, un « pas encore de kiosque » qui n'était pas vrai.
  if (!plan) return null;

  const kiosque = kiosqueDe(plan, uid);

  return (
    <section className="glass-light rounded-lg-card p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <MapPin size={14} style={{ color: 'var(--sk-gilt)' }} />
        <p className="witcher-stat-label">{fr ? 'Mon kiosque' : 'My kiosk'}</p>
      </div>

      {kiosque
        ? <KiosqueAssigne plan={plan} kiosque={kiosque} lang={lang} onEcrire={onEcrire} />
        : <EnAttente lang={lang} onEcrire={onEcrire} />}
    </section>
  );
};

export default MonKiosque;

// ─── Un kiosque attribué ───────────────────────────────────────────────

const KiosqueAssigne: React.FC<{
  plan: PlanMarche; kiosque: Kiosque; lang: 'FR' | 'EN'; onEcrire?: () => void;
}> = ({ plan, kiosque, lang, onEcrire }) => {
  const fr = lang === 'FR';
  const rangee = plan.rangees.find((r) => r.id === kiosque.rangeeId);
  const wifi = WIFI.find((w) => w.id === kiosque.wifi);
  const surCarte = !!plan.carte && kiosque.x != null && kiosque.y != null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-4xl md:text-5xl text-ivory tracking-wide">{kiosque.code}</p>
          {rangee && <p className="font-editorial text-sm text-ivory-soft/70 mt-1">{rangee.nom}</p>}
        </div>
        <p className="font-display text-2xl text-brass">{prixAffiche(kiosque.prixCents, lang)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Repere
          actif={kiosque.electricite}
          icone={<Zap size={13} />}
          label={kiosque.electricite ? (fr ? 'Électricité' : 'Power') : (fr ? 'Sans électricité' : 'No power')}
        />
        <Repere
          actif={kiosque.wifi !== 'aucun'}
          icone={kiosque.wifi === 'aucun' ? <WifiOff size={13} /> : <Wifi size={13} />}
          label={wifi ? wifi[fr ? 'FR' : 'EN'] : ''}
        />
        <Repere
          actif={kiosque.nourriture}
          icone={<UtensilsCrossed size={13} />}
          label={kiosque.nourriture ? (fr ? 'Repas livrés' : 'Meals delivered') : (fr ? 'Sans repas livrés' : 'No meals delivered')}
        />
      </div>

      {surCarte
        ? <SchemaCarte plan={plan} kiosque={kiosque} lang={lang} />
        : <SchemaRangees plan={plan} kiosque={kiosque} lang={lang} />}

      {onEcrire && <BoutonEcrire onClick={onEcrire} lang={lang} />}
    </div>
  );
};

// ─── Pas encore de kiosque ─────────────────────────────────────────────

const EnAttente: React.FC<{ lang: 'FR' | 'EN'; onEcrire?: () => void }> = ({ lang, onEcrire }) => {
  const fr = lang === 'FR';
  return (
    <div className="space-y-4">
      <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed max-w-xl">
        {fr
          ? 'Le plan du marché se dessine encore. Jesse, qui orchestre les kiosques, place les marchands un par un à mesure que les emplacements se confirment, et cet espace affichera le vôtre dès qu’il sera fixé, sans que vous ayez à revenir vérifier.'
          : 'The market plan is still taking shape. Jesse, who runs the kiosks, is placing merchants one at a time as spots get confirmed, and this space will show yours the moment it is set, with nothing for you to check back on.'}
      </p>
      {onEcrire && <BoutonEcrire onClick={onEcrire} lang={lang} />}
    </div>
  );
};

// ─── Les petites pièces ─────────────────────────────────────────────────

const Repere: React.FC<{ actif: boolean; icone: React.ReactNode; label: string }> = ({ actif, icone, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs ${
    actif ? 'text-brass border border-brass/40 bg-brass/10' : 'text-ivory-soft/45 border border-ivory-soft/15'
  }`}>
    {icone} {label}
  </span>
);

const BoutonEcrire: React.FC<{ onClick: () => void; lang: 'FR' | 'EN' }> = ({ onClick, lang }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 px-4 py-2 border border-stone text-ivory-soft hover:border-brass hover:text-brass font-sans text-xs uppercase tracking-wider transition rounded-card"
  >
    <MessageSquare size={13} /> {lang === 'FR' ? 'Écrire à l’équipe des kiosques' : 'Write to the kiosk team'}
  </button>
);

/** Trois rangées en pastilles, tant que Jesse n'a pas encore posé sa
 *  photo : chaque kiosque un petit carré, le nôtre en laiton, les
 *  autres en gris. Aucun nom d'un autre marchand ne s'affiche ici. */
const SchemaRangees: React.FC<{ plan: PlanMarche; kiosque: Kiosque; lang: 'FR' | 'EN' }> = ({ plan, kiosque, lang }) => (
  <div className="space-y-3">
    <p className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/60">
      {lang === 'FR' ? 'Où il se trouve' : 'Where it stands'}
    </p>
    <div className="space-y-2">
      {plan.rangees.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="font-sans text-[11px] text-ivory-soft/50 w-20 shrink-0 truncate">{r.nom}</span>
          <div className="flex flex-wrap gap-1.5">
            {kiosquesDeRangee(plan, r.id).map((k) => (
              <span
                key={k.id}
                title={k.id === kiosque.id ? k.code : undefined}
                className={`w-5 h-5 rounded-sm ${k.id === kiosque.id ? 'bg-brass' : 'bg-ivory-soft/15'}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** La photo de la carte de Jesse, avec notre repère en laiton posé à sa
 *  position et les autres kiosques occupés en points discrets, sans
 *  dire qui s'y trouve. */
const SchemaCarte: React.FC<{ plan: PlanMarche; kiosque: Kiosque; lang: 'FR' | 'EN' }> = ({ plan, kiosque, lang }) => {
  const carte = plan.carte!;
  const autres = plan.kiosques.filter((k) => k.id !== kiosque.id && k.x != null && k.y != null);
  return (
    <div>
      <p className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/60 mb-3">
        {lang === 'FR' ? 'Où il se trouve sur la carte' : 'Where it stands on the map'}
      </p>
      <div className="relative rounded-card overflow-hidden border border-brass/20">
        <img src={carte.url} width={carte.largeur} height={carte.hauteur} alt="" className="w-full h-auto block" />
        {autres.map((k) => (
          <span
            key={k.id}
            className="absolute w-2 h-2 rounded-full bg-ivory-soft/40 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${k.x}%`, top: `${k.y}%` }}
          />
        ))}
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ left: `${kiosque.x}%`, top: `${kiosque.y}%` }}
        >
          <span className="absolute w-6 h-6 rounded-full bg-brass/30 animate-ping" />
          <span className="relative w-3.5 h-3.5 rounded-full bg-brass border-2 border-midnight-deep" />
        </span>
      </div>
    </div>
  );
};
