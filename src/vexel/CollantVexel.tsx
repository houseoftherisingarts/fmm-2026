// CollantVexel — le collant foil du pied de page, présent sur tous les sites Vexel sauf
// vexelwebstudio.com lui-même. Aligné le 16 sept 2026 sur le modèle du Lynx
// (le-lynx---observatoire/components/CollantVexel.tsx) : logo complet (cercle et sigil) à
// gauche, « Site créé par » en surtitre et « Vexel Webstudio » en serif, liseré blanc découpé,
// reflet irisé qui suit le pointeur et reste visible au repos, léger basculement 3D, posé droit.
// Le foil de la base est l'irisé; un client peut recevoir la teinte de son canon (Krystine : or et cuivre). La carte qui s'ouvre au clic est
// celle de Laurie (xena-horizon-platform/components/BadgeVexel.tsx, 20 sept 2026) : un volet foil
// avec le grand logo, l'entente en clair (rabais de 10 % pour la personne, commission pour le
// propriétaire du site, dont le code, le nom et le prénom se passent en props) et « Continuer vers Vexel » qui ouvre vexelwebstudio.com avec le code
// partenaire déjà rempli (?parrain=CODE, lu par la page /compte).
// Autonome (styles inline) pour ne dépendre d'aucun token Tailwind du site hôte.
import { useCallback, useEffect, useRef, useState } from 'react';

const TEXTES = {
  FR: {
    kicker: 'Site créé par',
    nom: 'Vexel Webstudio',
    rang: 'Affilié Vexel',
    sousTitre: 'un projet créatif du Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: "Site créé par Vexel Webstudio : en savoir plus sur l'entente",
    titre: 'Un site comme celui-ci, avec un coup de pouce',
    corps: (proprietaire: string, _prenom: string) =>
      `${proprietaire} est affiliée à Vexel Webstudio pour les sites Internet. Si vous ouvrez un dossier chez Vexel à partir d'ici, vous gagnez un rabais sur ce même forfait.`,
    // Sans code partenaire, aucun rabais n'existe : la carte le tait au lieu de le promettre.
    titreSansCode: 'Un site comme celui-ci',
    corpsSansCode: 'Ce site a été bâti par Vexel Webstudio, un studio web fondé au Salon des Inconnus.',
    question: '',
    oui: 'Continuer vers Vexel',
    non: 'Pas maintenant',
    fermer: 'Fermer',
  },
  EN: {
    kicker: 'Site by',
    nom: 'Vexel Webstudio',
    rang: 'Vexel affiliate',
    sousTitre: 'a creative project of Le Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: 'Site by Vexel Webstudio: learn about the partnership',
    titre: 'A site like this one, with a helping hand',
    corps: (proprietaire: string, _prenom: string) =>
      `${proprietaire} is affiliated with Vexel Webstudio for websites. If you open a file with Vexel from here, you earn a discount on that same plan.`,
    titreSansCode: 'A site like this one',
    corpsSansCode: 'This site was built by Vexel Webstudio, a web studio founded at Le Salon des Inconnus.',
    question: '',
    oui: 'Continue to Vexel',
    non: 'Not now',
    fermer: 'Close',
  },
};

const SALON_URL = 'https://lesalondesinconnus.com/';
const LOGO_SALON = '/salon-logo-or.png';
const LOGO_VEXEL = '/vexel-logo.png';
const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

/** L'adresse se reconstruit toujours ici; seul un code de la forme attendue passe. */
const codeValide = (code: string) => /^[A-Z0-9-]{4,24}$/.test(code);
export const lienVexel = (code: string) =>
  codeValide(code) ? `https://vexelwebstudio.com/compte?parrain=${encodeURIComponent(code)}` : 'https://vexelwebstudio.com/compte';

const style = `
.cv-foil {
  --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.1rem;
  border-radius: 15px;
  border: 2px solid #fff;
  color: #fff;
  text-decoration: none;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(120% 120% at var(--mx) var(--my), rgb(255 255 255 / 0.18), transparent 55%),
    linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 10px 24px -10px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25);
  transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 220ms ease, box-shadow 220ms ease;
  will-change: transform;
}
.cv-foil:hover { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 18px 34px -12px rgb(0 0 0 / 0.65), inset 0 1px 0 rgb(255 255 255 / 0.35); }
.cv-sheen {
  position: absolute; inset: -40%; pointer-events: none; z-index: 0;
  background: repeating-conic-gradient(from 200deg at var(--mx) var(--my),
    #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
  opacity: 0.18; mix-blend-mode: color-dodge; filter: saturate(1.2) blur(2px);
  transition: opacity 260ms ease;
}
.cv-foil:hover .cv-sheen { opacity: 0.34; }
.cv-grain {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: soft-light;
  opacity: 0.35;
}
.cv-foil > *:not(.cv-sheen):not(.cv-grain) { position: relative; z-index: 1; }
@media (prefers-reduced-motion: reduce) { .cv-foil { transform: none; transition: none; } }
.cv-overlay {
  position: fixed; inset: 0; z-index: 900;
  display: flex; align-items: flex-end; justify-content: center; padding: 1rem;
  background: rgba(28,23,18,0.55); backdrop-filter: blur(4px);
}
.cv-carte {
  position: relative;
  width: 100%; max-width: 960px;
  display: grid; grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  border-radius: 15px;
  background: #f4efe6;
  border: 1px solid rgba(156,122,68,0.35);
  color: #1c1712;
  box-shadow: 0 30px 80px -30px rgba(20,16,12,0.6);
  text-align: left;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.cv-volet {
  --mx: 30%; --my: 30%;
  position: relative; isolation: isolate; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem;
  min-height: 200px; padding: 1.5rem; text-align: center; color: #fff;
  background:
    radial-gradient(120% 120% at var(--mx) var(--my), rgb(255 255 255 / 0.18), transparent 55%),
    linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%);
}
.cv-volet > *:not(.cv-sheen):not(.cv-grain) { position: relative; z-index: 1; }
.cv-corps { position: relative; display: flex; flex-direction: column; justify-content: center; padding: 1.5rem; }
/* Le titre de la carte garde son encre, même sous les styles de titre du site hôte (dégradés, texte détouré). */
.cv-carte h2 { color: #1c1712; -webkit-text-fill-color: #1c1712; background: none; text-shadow: none; letter-spacing: normal; text-transform: none; }
.cv-carte-fermer {
  position: absolute; top: 0.75rem; right: 0.75rem;
  width: 2.5rem; height: 2.5rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 999px; border: none; background: transparent; color: #7a6a58; cursor: pointer; font-size: 1rem;
}
.cv-carte-fermer:hover { color: #1c1712; }
.cv-rang { display: flex; align-items: center; gap: 0.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #7d6330; }
.cv-boutons { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.5rem; padding-right: 5.5rem; }
.cv-bouton {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 1.4rem;
  border-radius: 999px; background: #1c1712; color: #f4efe6; font-weight: 600; font-size: 0.875rem;
  text-decoration: none; border: 1px solid #1c1712;
}
.cv-bouton:hover { background: #34241a; border-color: #34241a; }
.cv-bouton-non {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 1.4rem; font-size: 0.875rem; cursor: pointer;
  border-radius: 999px; background: transparent; color: #1c1712; border: 1px solid rgba(28,23,18,0.25);
}
.cv-bouton-non:hover { border-color: #1c1712; }
.cv-salon { position: absolute; right: 1.25rem; bottom: 1.25rem; display: inline-block; }
@media (min-width: 640px) {
  .cv-overlay { align-items: center; }
  .cv-carte { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); aspect-ratio: 16 / 9; }
  .cv-volet { padding: 2rem; }
  .cv-corps { padding: 2.5rem; }
  .cv-salon { right: 1.75rem; bottom: 1.75rem; }
}
`;

export interface CollantVexelProps {
  lang?: 'FR' | 'EN';
  className?: string;
  /** Code partenaire du propriétaire du site, rempli d'avance chez Vexel au clic sur « Continuer ».
   * Vide tant que le propriétaire n'a pas de code : la carte parle alors du studio, sans rabais. */
  codeParrain?: string;
  proprietaire?: string;
  prenom?: string;
}

export function CollantVexel({ lang = 'FR', className = '', codeParrain = '', proprietaire = '', prenom = '' }: CollantVexelProps) {
  const t = TEXTES[lang];
  const lien = lienVexel(codeParrain);
  const aCode = codeValide(codeParrain) && proprietaire !== '';
  const ref = useRef<HTMLAnchorElement>(null);
  const ouiRef = useRef<HTMLAnchorElement>(null);
  const [ouverte, setOuverte] = useState(false);

  const suivre = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
  }, []);
  const relacher = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '30%');
    el.style.setProperty('--my', '30%');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  // Le lien reste réel (lecteur d'écran, clic du milieu), mais le clic ordinaire explique d'abord.
  const ouvrir = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOuverte(true);
  };

  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuverte(false);
    };
    window.addEventListener('keydown', onKey);
    const minuterie = window.setTimeout(() => ouiRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(minuterie);
    };
  }, [ouverte]);

  return (
    <>
      <style>{style}</style>
      <a
        ref={ref}
        href={lien}
        onClick={ouvrir}
        aria-haspopup="dialog"
        aria-expanded={ouverte}
        aria-label={t.libelle}
        onPointerMove={suivre}
        onPointerLeave={relacher}
        className={`cv-foil ${className}`}
      >
        <span aria-hidden className="cv-sheen" />
        <span aria-hidden className="cv-grain" />
        <img src={LOGO_VEXEL} alt="" width={329} height={320} style={{ height: '1.75rem', width: 'auto', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.7)' }}>
            {t.kicker}
          </span>
          <span style={{ marginTop: '0.25rem', fontFamily: SERIF, fontSize: '1.05rem' }}>{t.nom}</span>
        </span>
      </a>

      {ouverte && (
        <div className="cv-overlay" role="presentation" onClick={() => setOuverte(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collant-vexel-titre"
            className="cv-carte"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Le volet de gauche reprend la surface foil du collant, avec le logo complet en grand. */}
            <div className="cv-volet">
              <span aria-hidden className="cv-sheen" />
              <span aria-hidden className="cv-grain" />
              <img src={LOGO_VEXEL} alt="" width={329} height={320} style={{ height: '7rem', width: 'auto', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }} />
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.7)' }}>{t.kicker}</span>
                <span style={{ marginTop: '0.4rem', fontFamily: SERIF, fontSize: '1.375rem' }}>{t.nom}</span>
              </span>
            </div>

            <div className="cv-corps">
              <button type="button" className="cv-carte-fermer" aria-label={t.fermer} onClick={() => setOuverte(false)}>
                ✕
              </button>
              {aCode ? (
                <p className="cv-rang" style={{ margin: 0 }}>
                  <span aria-hidden style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '999px', background: '#bb9a5e' }} />
                  {t.rang}
                </p>
              ) : null}
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#7a6a58' }}>{t.sousTitre}</p>
              <h2 id="collant-vexel-titre" style={{ margin: '1rem 0 0', fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(1.35rem, 2.4vw, 1.75rem)', lineHeight: 1.15 }}>{aCode ? t.titre : t.titreSansCode}</h2>
              <p style={{ margin: '1rem 0 0', fontSize: '0.9375rem', lineHeight: 1.65 }}>{aCode ? t.corps(proprietaire, prenom) : t.corpsSansCode}</p>
              {t.question ? <p style={{ margin: '0.75rem 0 0', fontSize: '0.9375rem', fontWeight: 600 }}>{t.question}</p> : null}
              <div className="cv-boutons">
                <a ref={ouiRef} href={lien} target="_blank" rel="noopener" onClick={() => setOuverte(false)} className="cv-bouton">
                  {t.oui}
                </a>
                <button type="button" className="cv-bouton-non" onClick={() => setOuverte(false)}>
                  {t.non}
                </button>
              </div>
              <a href={SALON_URL} target="_blank" rel="noopener noreferrer" aria-label={t.salon} className="cv-salon">
                <img src={LOGO_SALON} alt={t.salon} style={{ height: '3.5rem', width: 'auto', filter: 'drop-shadow(0 2px 6px rgba(197,160,89,0.35))' }} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CollantVexel;
