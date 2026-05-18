import React from 'react';
import { Settings, ShieldAlert, Globe, Database, Music } from 'lucide-react';
import { Card, ToggleSwitch } from '../primitives';

interface Props {
  flags: Record<string, unknown>;
  setFlag: (k: any, v: boolean) => void;
}

const ParametresSection: React.FC<Props> = ({ flags, setFlag }) => {
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
            // « Écran d'accueil » → don't duplicate it in the generic list.
            .filter((k) => k !== 'knightPlacementEditor')
            .map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
                <span className="font-sans text-sm text-ivory">{k}</span>
                <ToggleSwitch checked={!!flags[k]} onChange={(v) => setFlag(k, v)} />
              </div>
            ))}
        </div>
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
            <p className="font-editorial italic text-sm text-blush">Aucun admin défini — n’importe qui peut se connecter sans gate.</p>
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
