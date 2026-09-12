// PartenaireVexelPanneau — la porte « Devenir partenaire Vexel » d'un site client.
//
// Se pose dans l'admin du site (un onglet ou une carte). Explique l'entente en
// trois paragraphes, montre le contrat au complet, prend la signature, puis
// appelle devenirPartenaireSite (vexel-site/functions) sans jamais quitter ce
// site. Le curseur de partage n'est ici qu'un APERÇU : le vrai réglage se fait
// plus tard, dans l'espace partenaire de vexelwebstudio.com. Aucun secret dans
// ce fichier : la clé du site vit déjà dans son propre back-office (celle qui
// sert à /demande/), on la lui repasse ici.
//
// Couleurs : ce composant ne porte AUCUNE couleur de Vexel. Chaque valeur
// visuelle vient d'une variable CSS --pv-*, avec un repli sobre si le site
// hôte ne les définit pas. Voir README.md pour les redéfinir avec le canon
// du site.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eraser, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { ARTICLES, PREAMBULE, TITRE, TEXTE_INTEGRAL_CONTRAT, VERSION_CONTRAT } from './contrat-representant';

/** L'empreinte SHA-256 du texte affiché, calculée dans le navigateur : sert
 * seulement à se faire dire de rafraîchir si le serveur porte un contrat
 * plus récent. La vraie empreinte, celle qui compte, se recalcule côté
 * fonction sur sa propre copie (voir l'en-tête de ce fichier). */
async function empreinteContrat(): Promise<string> {
  const octets = new TextEncoder().encode(TEXTE_INTEGRAL_CONTRAT);
  const hachage = await crypto.subtle.digest('SHA-256', octets);
  return Array.from(new Uint8Array(hachage), (o) => o.toString(16).padStart(2, '0')).join('');
}

const ENDPOINT = 'https://us-central1-vexel-integrations.cloudfunctions.net/devenirPartenaireSite';

const PARTAGES = [5, 10, 15, 20] as const;

const style = `
.pv-panneau {
  --pv-fond: var(--couleur-surface, #101012);
  --pv-texte: var(--couleur-texte, #f2f2f2);
  --pv-muted: var(--couleur-muted, #9a9a9f);
  --pv-bordure: var(--couleur-bordure, rgba(255,255,255,0.14));
  --pv-accent: var(--couleur-accent, #d4af37);
  --pv-radius: var(--rayon-carte, 15px);
  --pv-font: var(--police-corps, system-ui, sans-serif);
  --pv-font-titre: var(--police-titre, var(--pv-font));
  color: var(--pv-texte);
  font-family: var(--pv-font);
  background: var(--pv-fond);
  border: 1px solid var(--pv-bordure);
  border-radius: var(--pv-radius);
  padding: clamp(20px, 4vw, 40px);
  max-width: 720px;
}
.pv-panneau h2 { font-family: var(--pv-font-titre); font-weight: 600; font-size: clamp(1.3rem, 3vw, 1.7rem); margin: 0 0 1rem; line-height: 1.25; }
.pv-panneau h3 { font-family: var(--pv-font-titre); font-weight: 600; font-size: 1rem; margin: 1.5rem 0 0.5rem; }
.pv-panneau p { line-height: 1.6; margin: 0 0 1rem; color: var(--pv-texte); }
.pv-panneau .pv-muted { color: var(--pv-muted); font-size: 0.85rem; }
.pv-panneau .pv-carte {
  border: 1px solid var(--pv-bordure);
  border-radius: calc(var(--pv-radius) - 4px);
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--pv-fond) 80%, white 4%);
}
.pv-panneau .pv-curseur { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0; }
.pv-panneau .pv-curseur input[type='range'] { flex: 1; accent-color: var(--pv-accent); }
.pv-panneau .pv-num { font-variant-numeric: tabular-nums; font-weight: 600; }
.pv-panneau .pv-contrat {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--pv-bordure);
  border-radius: calc(var(--pv-radius) - 4px);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  background: color-mix(in srgb, var(--pv-fond) 90%, black 6%);
}
.pv-panneau .pv-contrat p { font-size: 0.88rem; color: var(--pv-muted); }
.pv-panneau .pv-contrat h3 { font-size: 0.85rem; color: var(--pv-texte); }
.pv-panneau .pv-signature-zone {
  position: relative;
  width: 100%;
  height: 160px;
  border: 1px dashed var(--pv-bordure);
  border-radius: calc(var(--pv-radius) - 4px);
  overflow: hidden;
  background: color-mix(in srgb, var(--pv-fond) 92%, white 3%);
}
.pv-panneau canvas { width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
.pv-panneau input[type='text'], .pv-panneau input[type='email'] {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: calc(var(--pv-radius) - 6px);
  border: 1px solid var(--pv-bordure);
  background: transparent;
  color: var(--pv-texte);
  font-family: var(--pv-font);
  margin-bottom: 0.75rem;
}
.pv-panneau .pv-bouton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  border: 1px solid var(--pv-accent);
  background: var(--pv-accent);
  color: color-mix(in srgb, var(--pv-accent) 5%, black 95%);
  font-weight: 600;
  cursor: pointer;
}
.pv-panneau .pv-bouton:disabled { opacity: 0.5; cursor: not-allowed; }
.pv-panneau .pv-bouton-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--pv-bordure);
  background: transparent;
  color: var(--pv-muted);
  font-size: 0.8rem;
  cursor: pointer;
}
.pv-panneau .pv-erreur { color: #f87171; font-size: 0.85rem; margin-top: 0.5rem; }
.pv-panneau .pv-spin { animation: pv-tourner 0.8s linear infinite; }
@keyframes pv-tourner { to { transform: rotate(360deg); } }
`;

function AperçuPartage() {
  const [partageClient, setPartageClient] = useState(10);
  const montant = 500; // exemple d'abonnement Hybride, pour rendre le partage concret
  const rabais = Math.round((montant * partageClient) / 100);
  const commission = Math.round((montant * (20 - partageClient)) / 100);
  return (
    <div className="pv-carte">
      <p className="pv-muted" style={{ margin: 0 }}>
        Aperçu sur un abonnement à {montant} $ / mois
      </p>
      <div className="pv-curseur">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={PARTAGES.indexOf(partageClient as (typeof PARTAGES)[number])}
          onChange={(e) => setPartageClient(PARTAGES[Number(e.target.value)])}
          aria-label="Aperçu du partage"
        />
        <span className="pv-num">{partageClient} % / {20 - partageClient} %</span>
      </div>
      <p style={{ margin: 0 }}>
        Le client reçoit <span className="pv-num">{rabais} $</span> de rabais, vous gardez{' '}
        <span className="pv-num">{commission} $</span> de commission ce mois-là.
      </p>
      <p className="pv-muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
        Vous réglerez ce partage dans votre espace Vexel, une fois votre code actif.
      </p>
    </div>
  );
}

function ZoneSignature({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const [vide, setVide] = useState(true);

  const initCanvas = (canvas: HTMLCanvasElement) => {
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.strokeStyle = 'currentColor';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const commencer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (canvasRef.current && canvasRef.current.width === 0) initCanvas(canvasRef.current);
    dessine.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };
  const tracer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dessine.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = pos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setVide(false);
  };
  const finir = () => {
    if (!dessine.current) return;
    dessine.current = false;
    onChange(canvasRef.current?.toDataURL('image/png') ?? null);
  };
  const effacer = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVide(true);
    onChange(null);
  };

  return (
    <div>
      <div className="pv-signature-zone">
        <canvas
          ref={(el) => {
            canvasRef.current = el;
            if (el && el.width === 0) initCanvas(el);
          }}
          onPointerDown={commencer}
          onPointerMove={tracer}
          onPointerUp={finir}
          onPointerLeave={finir}
        />
        {vide && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              fontSize: '0.8rem',
              color: 'var(--pv-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            signez ici, au doigt ou à la souris
          </span>
        )}
      </div>
      {!vide && (
        <button type="button" className="pv-bouton-ghost" onClick={effacer} style={{ marginTop: '0.5rem' }}>
          <Eraser size={13} aria-hidden /> effacer
        </button>
      )}
    </div>
  );
}

export interface PartenaireVexelPanneauProps {
  /** L'identifiant du site chez Vexel (clients/{slug} dans vexel-integrations). */
  slug: string;
  /** La clé de ce site, la même que celle déjà utilisée pour /demande/. */
  cle: string;
  /** Appelé une fois le code actif : au site hôte d'écrire settings/vexel
   * dans SA propre base pour que BadgeVexel le lise (voir README.md). */
  onSucces?: (resultat: { code: string; lien: string; page: string }) => void;
}

type Etat = 'formulaire' | 'envoi' | 'fait' | 'erreur';

export function PartenaireVexelPanneau({ slug, cle, onSucces }: PartenaireVexelPanneauProps) {
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>('formulaire');
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState<{ code: string; lien: string; page: string } | null>(null);
  const [copie, setCopie] = useState(false);
  const [empreinte, setEmpreinte] = useState<string | null>(null);

  useEffect(() => {
    empreinteContrat().then(setEmpreinte).catch(() => setEmpreinte(null));
  }, []);

  const pretAEnvoyer = nom.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel) && Boolean(signature);

  async function envoyer() {
    if (!pretAEnvoyer || !signature) return;
    setEtat('envoi');
    setErreur('');
    try {
      const rep = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: slug, cle, nom, courriel, signaturePng: signature, empreinte }),
      });
      const corps = await rep.json();
      if (!rep.ok) throw new Error(corps?.erreur || 'L’inscription a échoué.');
      setEtat('fait');
      // Le serveur est le notre, mais le navigateur ne fait confiance qu'a un
      // code de la forme attendue et reconstruit lui-meme les deux adresses.
      const codeSur = typeof corps?.code === 'string' && /^[A-Z0-9-]{4,24}$/.test(corps.code) ? corps.code : null;
      if (!codeSur) throw new Error('La réponse du studio est inattendue. Réessayez dans un instant.');
      const corpsSur = {
        code: codeSur,
        lien: `https://vexelwebstudio.com/compte?parrain=${encodeURIComponent(codeSur)}`,
        page: `https://vexelwebstudio.com/r/${encodeURIComponent(codeSur)}`,
      };
      setResultat(corpsSur);
      onSucces?.(corpsSur);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'L’inscription a échoué.');
      setEtat('erreur');
    }
  }

  return (
    <div className="pv-panneau">
      <style>{style}</style>

      {etat === 'fait' && resultat ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2>Vous êtes partenaire Vexel</h2>
          <p>
            Votre code est actif. Le badge apparaît dès maintenant au pied de votre site, et votre commission
            commence dès votre premier client amené.
          </p>
          <div className="pv-carte" style={{ marginBottom: '1rem' }}>
            <p className="pv-muted" style={{ margin: 0 }}>
              Votre code
            </p>
            <p className="pv-num" style={{ fontSize: '1.4rem', margin: '0.25rem 0' }}>
              {resultat.code}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pv-bouton-ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(resultat.lien);
                  setCopie(true);
                  setTimeout(() => setCopie(false), 1500);
                }}
              >
                {copie ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                {copie ? 'lien copié' : 'copier le lien'}
              </button>
              <a className="pv-bouton-ghost" href={resultat.page} target="_blank" rel="noreferrer">
                <ExternalLink size={13} aria-hidden /> voir ma page
              </a>
            </div>
          </div>
          <p className="pv-muted">
            Réglez le partage entre votre rabais client et votre commission, et suivez vos versements, dans votre
            espace Vexel : vexelwebstudio.com/compte/partenaire.
          </p>
        </motion.div>
      ) : (
        <>
          <h2>Devenez partenaire Vexel</h2>
          <p>
            Vexel construit ce site. En devenant représentant, vous recommandez le studio à qui vous voulez et vous
            touchez une part de chaque abonnement des clients que vous amenez, tant que leur site reste en ligne et
            payé. Cette part vaut 20 % de l’abonnement mensuel : vous choisissez comment elle se partage entre un
            rabais pour votre client et votre propre commission, et cette commission grandit d’elle-même à mesure que
            votre portefeuille grandit, cinq points de plus par tranche de dix clients actifs, sans plafond.
          </p>
          <p>
            Rien ne se verse avant la signature de l’entente ci-dessous, et rien ne s’y engage au-delà de ce qu’elle
            dit : aucun lien d’emploi, aucune exclusivité, vous restez libre de recommander qui vous voulez. Une fois
            signée, votre code s’active tout de suite et le badge Vexel apparaît au pied de ce site.
          </p>
          <p>
            Vos commissions partent chaque mois par virement Stripe, sur les abonnements réellement encaissés, et
            vous suivez tout, votre partage, votre palier, vos versements, depuis votre propre espace sur
            vexelwebstudio.com.
          </p>

          <h3>Aperçu du partage</h3>
          <AperçuPartage />

          <h3>L’entente, en entier</h3>
          <div className="pv-contrat">
            <p className="pv-muted" style={{ marginBottom: '0.75rem' }}>
              {TITRE}, version du {VERSION_CONTRAT}
            </p>
            {PREAMBULE.map((p, i) => (
              <p key={`pre-${i}`}>{p}</p>
            ))}
            {ARTICLES.map((a) => (
              <div key={a.numero}>
                <h3>
                  {a.numero}. {a.titre}
                </h3>
                {a.paragraphes.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ))}
          </div>

          <h3>Votre nom, votre courriel</h3>
          <input
            type="text"
            placeholder="Votre nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="name"
          />
          <input
            type="email"
            placeholder="Votre courriel"
            value={courriel}
            onChange={(e) => setCourriel(e.target.value)}
            autoComplete="email"
          />

          <h3>Votre signature</h3>
          <ZoneSignature onChange={setSignature} />

          <div style={{ marginTop: '1.25rem' }}>
            <button type="button" className="pv-bouton" onClick={envoyer} disabled={!pretAEnvoyer || etat === 'envoi'}>
              {etat === 'envoi' ? <Loader2 size={16} className="pv-spin" aria-hidden /> : null}
              Je deviens partenaire
            </button>
          </div>
          <AnimatePresence>
            {etat === 'erreur' && erreur && (
              <motion.p className="pv-erreur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {erreur}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default PartenaireVexelPanneau;
