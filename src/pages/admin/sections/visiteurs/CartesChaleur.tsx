import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../primitives';
import { chargerCarte, nb, nomElement, pct, type Carte, type Device, type Resume } from './donnees';
import { ancrer, ancrerMouvements, peindreChaleur, peindreDefilement, peindreZones, zones, type Position, type Zone } from './chaleur';
import { hauteurNaturelle, reveler } from './cadre';
import type { Periode } from '../VisiteursSection';

// ─── Cartes de chaleur ──────────────────────────────────────────────────────
// La page vivante s'ouvre dans un cadre à la largeur de l'appareil choisi
// (1440 pour l'ordinateur, 1024 pour la tablette, 390 pour le téléphone), sans défilement interne
// puisque le cadre prend toute la hauteur du document, et la carte se peint
// sur un canevas posé par-dessus. Quatre lectures : les clics, les
// déplacements de la souris, le défilement, et les zones (chaque bouton ou
// lien avec sa part des clics).

type Mode = 'clics' | 'mouvements' | 'defilement' | 'zones';
const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: 'clics',       label: 'Clics',        icon: 'fa-arrow-pointer' },
  { id: 'mouvements',  label: 'Souris',       icon: 'fa-wind' },
  { id: 'defilement',  label: 'Défilement',   icon: 'fa-arrows-up-down' },
  { id: 'zones',       label: 'Zones',        icon: 'fa-vector-square' },
];
const LARGEURS: Record<Device, number> = { ordinateur: 1440, tablette: 1024, mobile: 390 };
const FOLDS: Record<Device, number> = { ordinateur: 900, tablette: 1366, mobile: 844 };
const APPAREILS: { id: Device; label: string; icon: string }[] = [
  { id: 'ordinateur', label: 'Ordinateur', icon: 'fa-desktop' },
  { id: 'tablette',   label: 'Tablette',   icon: 'fa-tablet-screen-button' },
  { id: 'mobile',     label: 'Téléphone',  icon: 'fa-mobile-screen' },
];
// Safari refuse un canevas de plus de seize millions de pixels : au-delà, la
// mémoire se réduit et le CSS remet la carte à la taille du cadre.
const PIXELS_CANEVAS_MAX = 16e6;

interface Props { resume: Resume | null; periode: Periode; pageChoisie: string; onPage: (cle: string) => void }

const CartesChaleur: React.FC<Props> = ({ resume, periode, pageChoisie, onPage }) => {
  const [device, setDevice] = useState<Device>('ordinateur');
  const [mode, setMode] = useState<Mode>('clics');
  const [carte, setCarte] = useState<Carte | null>(null);
  const [chargement, setChargement] = useState(false);
  const [pret, setPret] = useState(false);
  const [hauteur, setHauteur] = useState(900);
  const [largeurCadre, setLargeurCadre] = useState(0);
  const [liste, setListe] = useState<Zone[]>([]);
  const iframe = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const enveloppe = useRef<HTMLDivElement>(null);
  const observateurCadre = useRef<ResizeObserver | null>(null);
  const rafCadre = useRef(0);

  const pages = resume?.pages || [];
  const page = pages.find(p => p.cle === pageChoisie) || pages[0];
  const largeur = LARGEURS[device];

  useEffect(() => { if (!pageChoisie && pages[0]) onPage(pages[0].cle); }, [pageChoisie, pages, onPage]);
  // Changer de page ou d'appareil recharge le cadre (sa clé change), et
  // tout se remesure.
  useEffect(() => { setPret(false); }, [page?.path, device]);

  // Les points de la période, pour la page et l'appareil choisis.
  useEffect(() => {
    if (!page) return;
    let vivant = true;
    setChargement(true); setCarte(null);
    chargerCarte(device, page.cle, periode.de, periode.a)
      .then(c => { if (vivant) setCarte(c); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [page?.cle, device, periode]);

  // La largeur disponible, pour mettre le cadre à l'échelle.
  useEffect(() => {
    const el = enveloppe.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setLargeurCadre(el.clientWidth));
    obs.observe(el);
    setLargeurCadre(el.clientWidth);
    return () => obs.disconnect();
    // L'enveloppe n'existe qu'une fois le résumé chargé : l'observateur se
    // pose à ce moment-là, pas au premier rendu (qui montre le squelette).
  }, [resume, pages.length]);

  const echelle = largeurCadre ? Math.min(1, largeurCadre / largeur) : 1;

  // Le cadre suit la hauteur de son document : une première lecture quand la
  // page est rendue, puis à chaque fois que le corps de la page change de
  // taille (les images, les polices et les données qui arrivent après). Les
  // hauteurs en « vh » sont figées à l'écran de l'appareil avant chaque
  // lecture (voir cadre.ts), sinon le cadre et la page grandiraient sans fin.
  const mesurer = () => {
    const el = iframe.current;
    if (!el?.contentDocument) return;
    const h = hauteurNaturelle(el, FOLDS[device]);
    if (h) setHauteur(h);
  };
  const surChargement = () => {
    const el = iframe.current;
    const win = el?.contentWindow;
    if (!el || !win?.document.body) return;
    observateurCadre.current?.disconnect();
    reveler(el, FOLDS[device]).finally(() => {
      if (iframe.current !== el) return;   // le cadre a été remplacé pendant la révélation
      mesurer();
      setPret(true);
      const obs = new (win as Window & typeof globalThis).ResizeObserver(() => {
        if (rafCadre.current) return;
        rafCadre.current = window.requestAnimationFrame(() => { rafCadre.current = 0; if (iframe.current === el) mesurer(); });
      });
      obs.observe(win.document.body);
      observateurCadre.current = obs;
    });
  };

  // La peinture, dès que la carte, le cadre et la hauteur sont là.
  useEffect(() => {
    const c = canvas.current;
    const doc = iframe.current?.contentDocument;
    if (!c || !doc || !pret || !carte) return;
    const k = Math.min(1, Math.sqrt(PIXELS_CANEVAS_MAX / (largeur * hauteur)));
    c.width = Math.round(largeur * k); c.height = Math.round(hauteur * k);
    const echelle = (p: Position[]) => (k === 1 ? p : p.map(q => ({ ...q, x: q.x * k, y: q.y * k })));
    const rayon = (device === 'mobile' ? 16 : 26) * k;
    if (mode === 'clics') {
      peindreChaleur(c, echelle(ancrer(doc, largeur, hauteur, carte.clics)), rayon);
      setListe([]);
    } else if (mode === 'mouvements') {
      peindreChaleur(c, echelle(ancrerMouvements(largeur, hauteur, carte.mouv)), rayon * 1.6, 60);
      setListe([]);
    } else if (mode === 'defilement') {
      peindreDefilement(c, carte.scroll, FOLDS[device] * k);
      setListe([]);
    } else {
      // Les points gardés sont un échantillon (les derniers de chaque jour) :
      // les comptes par zone se ramènent au vrai total pour rester lisibles
      // à côté du nombre de clics de l'en-tête.
      const f = carte.clics.length && carte.nClics > carte.clics.length ? carte.nClics / carte.clics.length : 1;
      const z = zones(doc, carte.clics).map(x => (f > 1 ? { ...x, n: Math.round(x.n * f), r: Math.round(x.r * f), m: Math.round(x.m * f) } : x));
      peindreZones(c, k === 1 ? z : z.map(x => (x.rect ? { ...x, rect: { x: x.rect.x * k, y: x.rect.y * k, w: x.rect.w * k, h: x.rect.h * k } } : x)), Math.max(carte.nClics, carte.clics.length, 1));
      setListe(z);
    }
  }, [carte, mode, pret, hauteur, largeur, device]);

  // Le chemin vient des données recueillies, donc d'un navigateur inconnu :
  // seul un chemin relatif propre du site s'ouvre en cadre, jamais une
  // adresse extérieure ni un chemin qui commence par deux barres.
  // Le cadre est de même origine par construction (une page du site), et la
  // carte a besoin de son DOM pour retrouver chaque élément cliqué; le
  // sandbox garde scripts et origine mais ferme la navigation du parent,
  // les fenêtres et l'envoi de formulaires depuis la page encadrée.
  const src = useMemo(() => {
    const chemin = page?.path || '';
    const sur = /^\/(?!\/)[a-zA-Z0-9\-._~/%]*$/.test(chemin);
    return sur ? `${chemin}?vh=apercu` : 'about:blank';
  }, [page?.path]);
  // Le cadre change (page, appareil) ou l'onglet se ferme : l'observateur et
  // la mesure en attente s'arrêtent avec lui.
  useEffect(() => () => {
    observateurCadre.current?.disconnect();
    observateurCadre.current = null;
    if (rafCadre.current) { window.cancelAnimationFrame(rafCadre.current); rafCadre.current = 0; }
  }, [src, device]);
  const scrollTotal = carte?.scroll.b0 || carte?.scroll.b5 || 0;
  // Ce qui manque, dit pour la carte qu'on regarde.
  const vide: string | null = chargement || !carte ? null
    : (mode === 'clics' || mode === 'zones') && !carte.clics.length ? 'Aucun clic sur cette page, sur cet appareil, pendant la période.'
    : mode === 'mouvements' && !carte.mouv.length ? (device === 'mobile' ? "Sur téléphone, il n'y a pas de souris : cette carte reste vide." : 'Aucun déplacement de souris relevé sur cette page pendant la période.')
    : mode === 'defilement' && !scrollTotal ? 'Aucune visite terminée sur cette page pendant la période : le défilement se compte quand la page se ferme.'
    : null;

  if (!resume) return <div className="h-64 animate-pulse rounded-[20px] bg-white/45" aria-busy="true" />;
  if (!pages.length) return <Card className="p-6"><p className="text-sm text-[#38403a]/70">Les cartes apparaissent dès qu'une page a reçu des visites.</p></Card>;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/55">Page</span>
            <select value={page?.cle || ''} onChange={e => onPage(e.target.value)} className="w-full min-w-0 rounded-xl border border-[#38403a]/10 bg-white/70 px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:bg-white/5 dark:text-white">
              {pages.map(p => <option key={p.cle} value={p.cle}>{p.titre ? `${p.titre} · ${p.path}` : p.path} ({nb(p.vues)} vues)</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-1 rounded-full border border-[#38403a]/10 bg-white/50 p-1" role="group" aria-label="Appareil">
            {APPAREILS.map(d => (
              <button key={d.id} type="button" onClick={() => { setDevice(d.id); setPret(false); }} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${device === d.id ? 'bg-[#293027] text-[#EEE7DB]' : 'text-[#38403a]/65 hover:bg-white/70'}`}>
                <i className={`fa-solid ${d.icon} text-[10px]`} aria-hidden="true" />{d.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-full border border-[#38403a]/10 bg-white/50 p-1" role="group" aria-label="Type de carte">
            {MODES.map(m => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${mode === m.id ? 'bg-[#BA7B39] text-[#293027]' : 'text-[#38403a]/65 hover:bg-white/70'}`}>
                <i className={`fa-solid ${m.icon} text-[10px]`} aria-hidden="true" />{m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#38403a]/65 dark:text-white/55">
          <span><b className="font-semibold text-[#293027] dark:text-white">{nb(carte?.vues || 0)}</b> vues sur cet appareil</span>
          <span><b className="font-semibold text-[#293027] dark:text-white">{nb(carte?.nClics || 0)}</b> clics</span>
          <span><b className="font-semibold text-[#BC4A3C]">{nb(carte?.nRage || 0)}</b> de rage</span>
          <span><b className="font-semibold text-[#293027] dark:text-white">{nb(carte?.nMorts || 0)}</b> dans le vide</span>
          {scrollTotal > 0 && <span><b className="font-semibold text-[#293027] dark:text-white">{pct(carte?.scroll.b50 || 0, scrollTotal)} %</b> passent la moitié de la page</span>}
          {chargement && <span className="text-[#8B4A2F]"><i className="fa-solid fa-circle-notch fa-spin mr-1" aria-hidden="true" />chargement</span>}
          {vide && <span className="text-[#8B4A2F]">{vide}</span>}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Le cadre à l'échelle, sa carte par-dessus */}
        <div ref={enveloppe} className="min-w-0 overflow-hidden rounded-[20px] border border-white/60 bg-white shadow-[0_18px_50px_-20px_rgba(41,48,39,0.35)]">
          <div style={{ width: largeur * echelle, height: hauteur * echelle }} className="relative mx-auto">
            <div style={{ width: largeur, height: hauteur, transform: `scale(${echelle})`, transformOrigin: 'top left' }} className="absolute left-0 top-0">
              <iframe ref={iframe} key={src + device} src={src} title={`Aperçu de ${page?.path}`} onLoad={surChargement}
                style={{ width: largeur, height: hauteur, border: 0, pointerEvents: 'none' }} sandbox="allow-scripts allow-same-origin" />
              <canvas ref={canvas} className="pointer-events-none absolute left-0 top-0" style={{ width: largeur, height: hauteur }} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* La légende et le palmarès */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/55">Comment lire</p>
            <div className="mb-3 h-2 w-full rounded-full" style={{ background: 'linear-gradient(90deg,#f3e2b8,#e2b463,#BA7B39,#8B4A2F,#4a2a1c)' }} />
            <div className="mb-3 flex justify-between text-[11px] text-[#38403a]/55"><span>peu</span><span>beaucoup</span></div>
            <p className="text-[13px] leading-relaxed text-[#38403a]/75 dark:text-white/65">
              {mode === 'clics' && 'Chaque tache est un endroit où des visiteuses ont cliqué; plus elle est sombre, plus il y a eu de clics. Un clic est rattaché au bouton ou au lien touché, la carte reste donc juste même si la page a changé de hauteur.'}
              {mode === 'mouvements' && 'Les traces de la souris montrent ce que le regard suit sur un ordinateur ou une tablette avec souris : les zones sombres sont celles où la souris s\'attarde. Sur téléphone, il n\'y a pas de souris et cette carte reste vide.'}
              {mode === 'defilement' && 'Chaque bande dit la part des visites qui est descendue jusque là. La ligne pointillée marque ce que l\'écran montre avant tout défilement : ce qui est en dessous n\'est vu que par celles qui défilent.'}
              {mode === 'zones' && 'Chaque bouton ou lien cliqué est encadré avec son nombre de clics et sa part de tous les clics de la page. Un cadre rouge signale des clics de rage.'}
            </p>
          </Card>
          {mode === 'zones' && liste.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/55">Les plus cliqués{carte && carte.nClics > carte.clics.length ? ` · estimés sur les ${nb(carte.clics.length)} derniers clics gardés` : ''}</p>
              <ol className="space-y-2 text-[13px]">
                {liste.slice(0, 12).map((z, i) => (
                  <li key={`${i}-${z.s}`} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[#293027] dark:text-white" title={z.s}>{nomElement(z)}</span>
                    <span className="shrink-0 tabular-nums text-[#38403a]/60">{nb(z.n)}{z.r ? <i className="fa-solid fa-bolt ml-1.5 text-[10px] text-[#BC4A3C]" title="clics de rage" aria-label="clics de rage" /> : null}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartesChaleur;
