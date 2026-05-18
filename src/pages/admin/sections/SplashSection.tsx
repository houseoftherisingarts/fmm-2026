import React from 'react';
import { Sparkles, Eye, EyeOff, ExternalLink, Wrench } from 'lucide-react';
import { Card, ToggleSwitch } from '../primitives';
import { useSiteFlags } from '../../../contexts/SiteFlagsContext';

const SplashSection: React.FC = () => {
  const mode = (import.meta.env.VITE_SITE_MODE || 'live') as 'live' | 'placeholder';
  const isPlaceholder = mode === 'placeholder';
  const { flags, setFlag } = useSiteFlags();

  return (
    <div className="space-y-5 max-w-3xl">
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-card flex items-center justify-center shrink-0 ${isPlaceholder ? 'bg-blush/15 border border-blush/40 text-blush' : 'bg-emerald-400/15 border border-emerald-400/40 text-emerald-400'}`}>
            {isPlaceholder ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">Mode actuel</p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">
              {isPlaceholder ? 'Placeholder · « Site internet de retour »' : 'Site complet en ligne'}
            </h2>
            <p className="font-editorial text-sm text-ivory-soft mb-5">
              {isPlaceholder
                ? 'Les visiteurs voient le teaser brumeux avec le poster FMM 2026 et le bouton Zeffy. Les pages internes restent accessibles via URL directe.'
                : 'Les visiteurs voient le site complet (hero, billetterie, sections pillars, etc.).'}
            </p>
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
              <ExternalLink size={12} /> Voir l’accueil
            </a>
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles size={14} /> Comment basculer
        </h3>
        <p className="font-editorial text-sm text-ivory-soft mb-4">
          Le mode du site est contrôlé par la variable d’environnement <code className="text-brass">VITE_SITE_MODE</code> dans <code className="text-brass">.env.local</code>.
          Le changement nécessite un redémarrage du serveur de développement (ou un nouveau déploiement en production).
        </p>
        <pre className="bg-midnight-deep/60 border border-ivory-soft/15 rounded-card p-4 font-mono text-xs text-ivory overflow-x-auto">
{`# .env.local
VITE_SITE_MODE=${isPlaceholder ? 'live' : 'placeholder'}    # ${isPlaceholder ? 'pour publier le site complet' : 'pour revenir au teaser'}`}
        </pre>
        <p className="font-editorial italic text-xs text-ivory-soft/60 mt-3">
          Astuce : pour une bascule sans redéploiement, on peut migrer ce flag vers Firestore (collection <code className="text-brass">siteFlags/global</code>). À faire dans une prochaine itération.
        </p>
      </Card>

      {/* Dev tools — knight placement editor on /. Hidden by default; flip
          on to expose the on-page pencil button, fine-tune the overlay,
          then flip back off so visitors don't see it. Gated additionally
          by isAdmin on the public page. */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Wrench size={14} /> Outils — placement du chevalier
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Active le pinceau en haut à droite de la page d’accueil pour bouger / redimensionner le chevalier qui tient la sphère. Réservé aux admins, à éteindre une fois le réglage figé.
        </p>
        <div className="flex items-center justify-between gap-4 py-3 border-t border-ivory-soft/15">
          <div>
            <p className="font-sans text-sm text-ivory">Éditeur de placement du chevalier</p>
            <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5">
              Drapeau : <code className="text-brass">knightPlacementEditor</code>
            </p>
          </div>
          <ToggleSwitch
            checked={!!flags.knightPlacementEditor}
            onChange={(v) => setFlag('knightPlacementEditor', v)}
          />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-3">Aperçu du teaser</h3>
        <p className="font-editorial text-sm text-ivory-soft mb-5">
          Voici à quoi ressemble la page d’accueil en mode placeholder :
        </p>
        <div className="aspect-video rounded-card border border-ivory-soft/15 overflow-hidden bg-midnight-deep">
          <iframe src="/?preview=placeholder" className="w-full h-full" title="Aperçu placeholder" />
        </div>
        <p className="font-editorial italic text-[11px] text-ivory-soft/50 mt-2 text-center">
          Aperçu via iframe — l’ouverture dans un nouvel onglet montre le mode réellement actif.
        </p>
      </Card>
    </div>
  );
};

export default SplashSection;
