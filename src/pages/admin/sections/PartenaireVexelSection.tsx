import React from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PartenaireVexelPanneau } from '../../../vexel/PartenaireVexelPanneau';

// ─── Devenir partenaire Vexel · section admin ───────────────────────
// Habille le panneau partagé (_vexel-base/src/vexel/) aux couleurs du
// canon FMM (brass + parchemin). Le panneau appelle lui-même
// devenirPartenaireSite; une fois le code reçu, c'est à ce site
// d'écrire settings/vexel dans sa propre base pour que BadgeVexel le
// lise au pied de page (voir README.md du module).
const PartenaireVexelSection: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="admin-title text-2xl">Devenir partenaire Vexel</h1>
      <p className="admin-prose">
        Recommandez Vexel Webstudio et touchez une part de chaque client amené, tant que son site
        reste en ligne et payé.
      </p>
    </div>
    <div
      style={{
        // @ts-expect-error -- variables CSS custom, pas dans le typage React
        '--couleur-surface': 'rgba(var(--sk-ink-rgb), 0.55)',
        '--couleur-texte': 'var(--color-bone)',
        '--couleur-muted': 'color-mix(in srgb, var(--color-bone) 60%, transparent)',
        '--couleur-bordure': 'rgba(var(--sk-glow-rgb), 0.28)',
        '--couleur-accent': 'var(--color-amber-glow)',
        '--rayon-carte': '15px',
        '--police-corps': 'var(--font-sans, system-ui, sans-serif)',
        '--police-titre': 'var(--font-display, var(--font-sans, system-ui, sans-serif))',
      }}
    >
      <PartenaireVexelPanneau
        slug="fmm"
        cle="SVCf6bxaH3dsY5KNVMs-uKpq"
        onSucces={async (resultat) => {
          try {
            await setDoc(
              doc(db, 'settings/vexel'),
              { partenaire: { code: resultat.code, lien: resultat.lien, page: resultat.page, signeLe: serverTimestamp() } },
              { merge: true },
            );
          } catch (e) {
            console.warn('[FMM] settings/vexel, écriture refusée :', e);
          }
        }}
      />
    </div>
  </div>
);

export default PartenaireVexelSection;
