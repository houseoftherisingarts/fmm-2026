// ─── Le cadre d'aperçu ──────────────────────────────────────────────────────
// La page vivante s'ouvre dans un cadre qui prend toute la hauteur de son
// document, pour que la carte se peigne d'un seul tenant. Deux choses
// dérangent cette idée et se règlent ici : les hauteurs en « vh » (un hero
// de 100vh grandirait avec le cadre, et le cadre avec lui, sans fin), et
// les sections qui n'apparaissent qu'au défilement (rien ne défile dans un
// cadre qui fait toute la hauteur).

const RE_VH = /(-?\d*\.?\d+)(?:s|d|l)?vh\b/g;
const ID_FIGE = 'vh-fige';

// L'aperçu montre la version sans mouvement du site, celle qu'un visiteur
// qui la demande voit déjà : rien ne défile dans le cadre, et une section
// épinglée ou révélée au défilement y resterait vide. Les conditions
// « prefers-reduced-motion » de la feuille se récrivent sur place; le site,
// lui, en fait autant pour son JavaScript quand l'URL porte ?vh=apercu.
function sansMouvement(m: MediaList): void {
  const t = m.mediaText;
  const n = t.replace(/\(prefers-reduced-motion:\s*no-preference\)/g, '(min-width: 100000px)').replace(/\(prefers-reduced-motion(:\s*reduce)?\)/g, '(min-width: 0px)');
  if (n !== t) m.mediaText = n;
}

// Parcourt les règles d'une feuille et écrit, pour chaque déclaration qui
// contient un « vh », la même déclaration en pixels, prioritaire, sous le
// même sélecteur et la même condition (@media, @supports, @container).
function reglesEnPx(regles: CSSRuleList, enPx: (s: string) => string, sortie: string[]): void {
  for (const r of Array.from(regles)) {
    const nom = r.constructor.name;
    const style = (r as CSSStyleRule).style;
    if (nom === 'CSSStyleRule' && style) {
      const decl: string[] = [];
      for (let i = 0; i < style.length; i += 1) {
        const p = style[i];
        const v = style.getPropertyValue(p);
        if (/vh\b/.test(v)) decl.push(`${p}:${enPx(v)}!important`);
      }
      if (decl.length) sortie.push(`${(r as CSSStyleRule).selectorText}{${decl.join(';')}}`);
      continue;
    }
    if (nom === 'CSSMediaRule') sansMouvement((r as CSSMediaRule).media);
    const enfants = (r as CSSGroupingRule).cssRules;
    if (!enfants) continue;
    const condition = { CSSMediaRule: '@media', CSSSupportsRule: '@supports', CSSContainerRule: '@container' }[nom as string];
    if (!condition) { reglesEnPx(enfants, enPx, sortie); continue; }
    const dedans: string[] = [];
    reglesEnPx(enfants, enPx, dedans);
    if (dedans.length) sortie.push(`${condition} ${(r as CSSMediaRule).conditionText}{${dedans.join('')}}`);
  }
}

// Fige chaque « vh » des feuilles de style et des styles en ligne à sa valeur
// en pixels pour la hauteur d'écran de l'appareil choisi. Les feuilles ne
// sont pas touchées (Tailwind, chargé par CDN, récrit la sienne à chaque
// changement de classe) : une feuille prioritaire posée en fin d'en-tête
// les recouvre, et se régénère au besoin. Se rappelle sans risque.
export function figerVh(doc: Document, ecran: number): void {
  const enPx = (s: string) => s.replace(RE_VH, (_, n: string) => `${Math.round(parseFloat(n) * ecran) / 100}px`);
  const sortie: string[] = [];
  for (const feuille of Array.from(doc.styleSheets)) {
    if ((feuille.ownerNode as Element | null)?.id === ID_FIGE) continue;
    try { reglesEnPx(feuille.cssRules, enPx, sortie); } catch { /* feuille d'une autre origine : pas lisible, pas la nôtre */ }
  }
  let style = doc.getElementById(ID_FIGE) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = ID_FIGE;
    doc.head.appendChild(style);
  }
  const texte = sortie.join('\n');
  if (style.textContent !== texte) style.textContent = texte;
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[style*="vh"]'))) {
    el.setAttribute('style', enPx(el.getAttribute('style') || ''));
  }
}

// Refait le gel dès qu'une feuille change dans l'en-tête (Tailwind qui se
// régénère, une feuille qui arrive tard), sauf quand c'est la nôtre.
function veillerVh(doc: Document, ecran: number): void {
  let prevu = 0;
  const obs = new MutationObserver(muts => {
    const notre = muts.every(m => (m.target as Element).id === ID_FIGE || (m.target as Node).parentElement?.id === ID_FIGE);
    if (notre || prevu) return;
    prevu = doc.defaultView?.requestAnimationFrame(() => { prevu = 0; figerVh(doc, ecran); }) || 0;
  });
  obs.observe(doc.head, { childList: true, subtree: true, characterData: true });
}

// La hauteur du document tel qu'il se lit sur l'appareil, mesurée dans un
// cadre à la hauteur de son écran : la hauteur d'un document ne descend
// jamais sous celle de son cadre, donc un cadre déjà grand fausserait la
// lecture, et un cadre plus court que l'écran ferait tomber les requêtes
// sur la hauteur (un rail horizontal réservé aux écrans de 760 px et plus
// se mesurerait à la verticale, puis se replierait une fois le cadre grandi).
export function hauteurNaturelle(cadre: HTMLIFrameElement, ecran: number): number {
  const doc = cadre.contentDocument;
  if (!doc) return 0;
  figerVh(doc, ecran);
  const avant = cadre.style.height;
  cadre.style.height = `${ecran}px`;
  const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0, ecran);
  cadre.style.height = avant;
  return Math.min(h, 30000);
}

// Les pages du site révèlent leurs sections au défilement (classe .reveal
// sur les pages statiques, whileInView de framer-motion ailleurs). On force
// ce qui est caché à s'afficher, puis on fait passer la page une fois dans
// un cadre à la hauteur d'un écran pour que ses propres observateurs se
// déclenchent.
export async function reveler(cadre: HTMLIFrameElement, ecran: number): Promise<void> {
  const win = cadre.contentWindow;
  const doc = win?.document;
  if (!win || !doc?.head) return;
  const style = doc.createElement('style');
  style.textContent = '[style*="opacity: 0"],[style*="opacity:0"],.reveal{opacity:1!important;transform:none!important}';
  doc.head.appendChild(style);
  doc.querySelectorAll('.reveal').forEach(n => n.classList.add('in'));
  figerVh(doc, ecran);
  veillerVh(doc, ecran);
  const total = Math.min(doc.documentElement.scrollHeight, 30000);
  const pas = Math.max(300, Math.round(ecran * 0.8));
  const avant = cadre.style.height;
  cadre.style.height = `${ecran}px`;
  for (let y = 0; y <= total; y += pas) {
    win.scrollTo(0, y);
    await new Promise(r => window.setTimeout(r, 24));
  }
  win.scrollTo(0, 0);
  cadre.style.height = avant;
}
