import React, { useEffect, useState } from 'react';
import { Settings, ShieldAlert, Globe, Database, Music, Eye } from 'lucide-react';
import { Card, ToggleSwitch } from '../primitives';
import { PILLAR_PUBLISH_FLAGS, PUBLISH_FLAG_KEYS } from '../../../firebase/siteFlags';
import { watchProgFlags, setProgFlag, PROG_FLAGS_DEFAULTS, type ProgFlags } from '../../../firebase/programmationFlags';

// Libellés FR des sections de la page publique Programmation, dans l'ordre
// d'affichage souhaité par Tristan.
// Les bascules générales, écrites en français plutôt qu'en nom de
// variable : l'équipe ne lit pas le code (2026-08-23).
const LIBELLES: Record<string, string> = {
  ticketingOpen: 'Billetterie ouverte',
  banquetReservationsOpen: 'Réservations du banquet',
  volunteerSignupOpen: 'Inscriptions bénévoles',
  vendorApplicationsOpen: 'Candidatures de marchands',
  showCountdown: 'Compte à rebours',
  showCommanditaire: 'Commanditaire d’honneur',
  showHistoireFrise: 'Frise de l’histoire',
  pubAlliance: 'L’Alliance (page des alliés, en préparation)',
  billetsNonMembres: 'Billets non membres',
};

// Une ligne d'explication sous le libellé, pour les bascules dont l'effet
// ne se devine pas au nom. L'équipe ne lit pas le code (2026-08-23).
const SOUS_TEXTES: Record<string, string> = {
  billetsNonMembres:
    'Éteint : tout le monde reçoit les billets au tarif membre, jusqu’au vote de l’équipe.',
};

const PROG_FLAG_ROWS: { flag: keyof ProgFlags; label: string }[] = [
  { flag: 'bestiaire',        label: 'Grille des activités' },
  { flag: 'horaire',          label: 'Horaire (souvenir 2025)' },
  { flag: 'banquet',          label: "Banquet du Prince William" },
  { flag: 'behourd',          label: 'Tournoi de Béhourd' },
  { flag: 'ateliersJeunesse', label: 'Ateliers Jeunesse (inscriptions)' },
];

// Interrupteur accessible (role="switch" + aria-pressed) dans le style admin
// existant, réimplémenté ici en <button> réel plutôt que le <span> de
// ToggleSwitch dans primitives.tsx.
const ProgToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-pressed={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="w-10 h-6 relative transition-colors"
    style={{
      background: checked ? 'var(--admin-accent)' : 'rgba(228, 236, 247, 0.12)',
      border: '1px solid var(--admin-line)',
    }}
  >
    <span
      className="absolute top-0.5 w-5 h-5 transition-transform"
      style={{
        left: checked ? '1.1rem' : '2px',
        background: checked ? 'var(--admin-bg-deep)' : 'var(--admin-text)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }}
    />
  </button>
);

interface Props {
  flags: Record<string, unknown>;
  setFlag: (k: any, v: boolean) => void;
}

const ParametresSection: React.FC<Props> = ({ flags, setFlag }) => {
  const [progFlags, setProgFlags] = useState<ProgFlags>(PROG_FLAGS_DEFAULTS);

  useEffect(() => {
    const unsubscribe = watchProgFlags(setProgFlags);
    return unsubscribe;
  }, []);

  const handleProgToggle = (champ: keyof ProgFlags, valeur: boolean) => {
    setProgFlags((prev) => ({ ...prev, [champ]: valeur }));
    setProgFlag(champ, valeur).catch(() => {
      // Firestore indisponible : l'avertissement du bloc couvre déjà ce cas.
    });
  };

  const env = {
    siteMode:   import.meta.env.VITE_SITE_MODE || 'live',
    devBypass:  import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true',
    fbReady:    !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    pixelReady: !!import.meta.env.VITE_META_PIXEL_ID,
    audioReady: !!import.meta.env.VITE_AUDIO_TRACK_URL,
    zeffyReady: !!import.meta.env.VITE_ZEFFY_TICKET_URL,
    admins:     (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').filter(Boolean),
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Site flags toggles */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Settings size={14} /> Drapeaux du site
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Bascules visibles côté public. Synchronisées en temps réel via Firestore (<code className="text-brass">siteFlags/global</code>).
        </p>
        <div className="space-y-1">
          {Object.keys(flags)
            // `knightPlacementEditor` has its own dedicated toggle inside
            // « Écran d'accueil »; the per-page publication flags get their own
            // labeled panel below → keep both out of this generic list.
            .filter((k) => k !== 'knightPlacementEditor' && !PUBLISH_FLAG_KEYS.has(k))
            .map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
                <div className="min-w-0">
                  <span className="font-sans text-sm text-ivory">{LIBELLES[k] || k}</span>
                  {SOUS_TEXTES[k] && (
                    <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1">{SOUS_TEXTES[k]}</p>
                  )}
                </div>
                <ToggleSwitch checked={!!flags[k]} onChange={(v) => setFlag(k, v)} />
              </div>
            ))}
        </div>
      </Card>

      {/* Per-page publication: reveal categories one by one */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Eye size={14} /> Publication des pages
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Chaque page reste cachée derrière le teaser « Site bientôt disponible » tant qu'elle est éteinte. Activez-la pour la faire apparaître dans le menu principal, en direct, sans redéploiement.
        </p>
        <div className="space-y-1">
          {PILLAR_PUBLISH_FLAGS.map(({ flag, label }) => (
            <div key={flag} className="flex items-center justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
              <span className="font-sans text-sm text-ivory">{label}</span>
              <ToggleSwitch checked={!!flags[flag]} onChange={(v) => setFlag(flag, v)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Programmation page section toggles */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Eye size={14} /> Page Programmation : sections visibles
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Bascules synchronisées en temps réel via Firestore (<code className="text-brass">siteFlags/programmation</code>).
        </p>
        {!env.fbReady && (
          <p className="flex items-center gap-2 font-sans text-xs text-blush mb-4">
            <ShieldAlert size={13} className="shrink-0" /> Firebase indisponible : ces bascules affichent les valeurs par défaut et ne s'enregistrent pas pour le moment.
          </p>
        )}
        <div className="space-y-1">
          {PROG_FLAG_ROWS.map(({ flag, label }) => (
            <div key={flag} className="flex items-center justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
              <span className="font-sans text-sm text-ivory">{label}</span>
              <div className="flex items-center gap-3">
                <span className={`font-display title-medieval text-xs ${progFlags[flag] ? 'text-emerald-400' : 'text-ivory-soft/50'}`}>
                  {progFlags[flag] ? 'Allumé' : 'Éteint'}
                </span>
                <ProgToggle checked={progFlags[flag]} onChange={(v) => handleProgToggle(flag, v)} label={label} />
              </div>
            </div>
          ))}
        </div>
        <p className="font-editorial italic text-xs text-ivory-soft/70 mt-5 pt-5 border-t border-ivory-soft/15">
          Éteindre une section la retire de la page publique immédiatement. Le Béhourd et les Ateliers sont éteints par défaut.
        </p>
      </Card>

      {/* Configuration status */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Globe size={14} /> État de la configuration
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Variables d’environnement actuellement détectées dans <code className="text-brass">.env.local</code>.
        </p>
        <div className="space-y-2 font-sans text-sm">
          <Row icon={Database} label="Firebase"             value={env.fbReady    ? 'Configuré'    : 'Non configuré'} ok={env.fbReady} />
          <Row icon={ShieldAlert} label="Bypass admin DEV"  value={env.devBypass  ? 'ACTIF'        : 'Désactivé'}     warn={env.devBypass} />
          <Row icon={Globe}    label="Mode du site"         value={env.siteMode}                                                ok={env.siteMode === 'live'} />
          <Row icon={Music}    label="Lecteur audio"        value={env.audioReady ? 'Configuré'    : 'Aucune piste'}  ok={env.audioReady} />
          <Row icon={Globe}    label="Pixel Meta"           value={env.pixelReady ? 'Configuré'    : 'Non configuré'} ok={env.pixelReady} />
          <Row icon={Globe}    label="Zeffy ticketing"      value={env.zeffyReady ? 'Configuré'    : 'Non configuré'} ok={env.zeffyReady} />
        </div>
        <div className="mt-5 pt-5 border-t border-ivory-soft/15">
          <p className="font-display title-medieval text-xs text-brass mb-2">Admins (allowlist)</p>
          {env.admins.length === 0 ? (
            <p className="font-editorial italic text-sm text-blush">Aucun admin défini: n’importe qui peut se connecter sans gate.</p>
          ) : (
            <ul className="space-y-1">
              {env.admins.map((a) => (
                <li key={a} className="font-sans text-sm text-ivory-soft">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};

const Row: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; ok?: boolean; warn?: boolean }> = ({ icon: Icon, label, value, ok, warn }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-ivory-soft/10 last:border-0">
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-brass shrink-0" />
      <span className="text-ivory">{label}</span>
    </div>
    <span className={`font-display title-medieval text-xs ${warn ? 'text-blush' : ok ? 'text-emerald-400' : 'text-ivory-soft'}`}>{value}</span>
  </div>
);

export default ParametresSection;
