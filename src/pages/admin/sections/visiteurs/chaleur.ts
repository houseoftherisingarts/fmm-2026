// ─── Le rendu des cartes de chaleur ─────────────────────────────────────────
// Chaque point est d'abord ancré à son élément dans la page vivante (le
// sélecteur enregistré au clic, puis la position relative dans l'élément) :
// la carte reste juste quand un bloc se déplace ou change de hauteur. Un
// élément fixé à l'écran (le menu, une bulle de clavardage) reçoit ses clics
// là où il se dessine dans l'aperçu, comme chez Hotjar : la lectrice cherche
// les clics sur le menu, pas à la hauteur où la visiteuse avait défilé. Sans
// élément retrouvé, on retombe sur la position dans la page, mise à
// l'échelle de la hauteur du document du jour. La chaleur se peint en
// niveaux de gris puis se colore avec une rampe chaude tirée de la palette
// du site (or, cuivre, rouille, presque noir).

import type { PointClic } from './donnees';

export interface Position { x: number; y: number; point?: PointClic }

export function ancrer(doc: Document, largeur: number, hauteurDoc: number, points: PointClic[]): Position[] {
  const cache = new Map<string, DOMRect | null>();
  const rect = (s: string): DOMRect | null => {
    if (cache.has(s)) return cache.get(s)!;
    let r: DOMRect | null = null;
    try {
      const el = doc.querySelector(s);
      if (el) { const b = el.getBoundingClientRect(); if (b.width > 0 && b.height > 0) r = b; }
    } catch { /* sélecteur invalide */ }
    cache.set(s, r);
    return r;
  };
  const dec = doc.defaultView?.scrollY || 0;
  return points.map(p => {
    const r = rect(p.s);
    if (r) return { x: r.left + p.ex * r.width, y: r.top + dec + p.ey * r.height, point: p };
    const ratio = p.hd > 0 ? hauteurDoc / p.hd : 1;
    return { x: p.vx * largeur, y: p.dy * ratio, point: p };
  });
}

/** Les points de souris (x en millièmes de la largeur, y en dix-millièmes de la hauteur du document) posés sur le cadre. */
export function ancrerMouvements(largeur: number, hauteur: number, mouv: number[]): Position[] {
  const out: Position[] = [];
  for (let i = 0; i + 1 < mouv.length; i += 2) out.push({ x: (mouv[i] / 1000) * largeur, y: (mouv[i + 1] / 10000) * hauteur });
  return out;
}

const RAMPE = ['#f3e2b8', '#e2b463', '#BA7B39', '#8B4A2F', '#4a2a1c'];

function paletteChaude(): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  RAMPE.forEach((col, i) => grad.addColorStop(i / (RAMPE.length - 1), col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1);
  return g.getImageData(0, 0, 256, 1).data;
}

/** Peint la chaleur des points sur le canevas (déjà dimensionné). */
export function peindreChaleur(canvas: HTMLCanvasElement, positions: Position[], rayon: number, intensiteMax = 0) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!positions.length) return;

  // Le gris s'accumule dans un canevas de travail, à l'échelle réduite pour
  // rester léger sur une page de dix mille pixels de haut.
  const echelle = 0.5;
  const w = Math.max(1, Math.round(canvas.width * echelle));
  const h = Math.max(1, Math.round(canvas.height * echelle));
  const travail = document.createElement('canvas');
  travail.width = w; travail.height = h;
  const t = travail.getContext('2d')!;
  const r = Math.max(4, rayon * echelle);
  const tampon = document.createElement('canvas');
  tampon.width = tampon.height = r * 2;
  const tc = tampon.getContext('2d')!;
  const g = tc.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = g;
  tc.fillRect(0, 0, r * 2, r * 2);

  // L'intensité de chaque point : assez douce pour qu'une seule visite se
  // voie sans saturer, calibrée sur le nombre de points.
  const plafond = intensiteMax || Math.max(6, Math.min(40, Math.sqrt(positions.length) * 1.4));
  t.globalAlpha = 1 / plafond;
  for (const p of positions) t.drawImage(tampon, p.x * echelle - r, p.y * echelle - r);

  const img = t.getImageData(0, 0, w, h);
  const d = img.data;
  const pal = paletteChaude();
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (!a) continue;
    const k = a * 4;
    d[i] = pal[k]; d[i + 1] = pal[k + 1]; d[i + 2] = pal[k + 2];
    d[i + 3] = Math.min(235, a + 40);
  }
  t.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(travail, 0, 0, canvas.width, canvas.height);
}

/** Les bandes de la carte de défilement : la part des visites qui a atteint chaque palier. */
export function peindreDefilement(canvas: HTMLCanvasElement, scroll: Record<string, number>, hauteurFold: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = scroll.b0 || scroll.b5 || 0;
  if (!total) return;
  const H = canvas.height;
  for (let b = 0; b < 100; b += 5) {
    const part = (scroll[`b${b + 5}`] || 0) / total;
    const y0 = (b / 100) * H, y1 = ((b + 5) / 100) * H;
    ctx.fillStyle = RAMPE[Math.round(part * (RAMPE.length - 1))];
    ctx.globalAlpha = 0.1 + part * 0.62;
    ctx.fillRect(0, y0, canvas.width, y1 - y0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(41,48,39,0.85)';
    ctx.font = `600 ${Math.max(14, Math.round(canvas.width / 60))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(part * 100)} %`, canvas.width - 16, y1 - 8);
  }
  // La ligne de flottaison : ce que l'écran montre avant tout défilement.
  // Une page qui tient dans l'écran n'en a pas. Le cadre est réduit à
  // l'écran (jusqu'à quatre fois sur mobile), donc la ligne est épaisse,
  // doublée d'un halo clair pour rester visible sur un hero sombre, et son
  // étiquette a un fond; sur un cadre étroit, l'étiquette est courte.
  if (hauteurFold >= canvas.height - 8) return;
  const ep = Math.max(4, Math.round(canvas.width / 240));
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = ep * 2.5;
  ctx.beginPath(); ctx.moveTo(0, hauteurFold); ctx.lineTo(canvas.width, hauteurFold); ctx.stroke();
  ctx.setLineDash([ep * 4, ep * 3]);
  ctx.strokeStyle = '#8B4A2F';
  ctx.lineWidth = ep;
  ctx.beginPath(); ctx.moveTo(0, hauteurFold); ctx.lineTo(canvas.width, hauteurFold); ctx.stroke();
  ctx.setLineDash([]);
  const taille = Math.max(14, Math.round(canvas.width / 60));
  ctx.font = `700 ${taille}px Inter, system-ui, sans-serif`;
  const texte = canvas.width < 700 ? 'Ligne de flottaison' : 'Ligne de flottaison : ce que l\'écran montre sans défiler';
  const largeurTexte = ctx.measureText(texte).width;
  ctx.fillStyle = '#8B4A2F';
  ctx.beginPath();
  ctx.roundRect(16, hauteurFold - taille * 2.2, largeurTexte + taille * 1.4, taille * 1.8, taille * 0.9);
  ctx.fill();
  ctx.fillStyle = '#EEE7DB';
  ctx.textAlign = 'left';
  ctx.fillText(texte, 16 + taille * 0.7, hauteurFold - taille * 0.9);
}

export interface Zone { s: string; tx: string; n: number; r: number; m: number; rect?: { x: number; y: number; w: number; h: number } }

/** Regroupe les clics par élément et retrouve chaque élément dans la page. */
export function zones(doc: Document, points: PointClic[]): Zone[] {
  const m = new Map<string, Zone>();
  for (const p of points) {
    const z = m.get(p.s) || { s: p.s, tx: p.tx, n: 0, r: 0, m: 0 };
    z.n += 1; if (p.r) z.r += 1; if (p.m) z.m += 1; if (p.tx) z.tx = p.tx;
    m.set(p.s, z);
  }
  const dec = doc.defaultView?.scrollY || 0;
  const out = [...m.values()].sort((a, b) => b.n - a.n).slice(0, 40);
  for (const z of out) {
    try {
      const el = doc.querySelector(z.s);
      const b = el?.getBoundingClientRect();
      if (b && b.width > 0 && b.height > 0) z.rect = { x: b.left, y: b.top + dec, w: b.width, h: b.height };
    } catch { /* sélecteur invalide */ }
  }
  return out;
}

export function peindreZones(canvas: HTMLCanvasElement, liste: Zone[], total: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const police = Math.max(12, Math.round(canvas.width / 90));
  for (const z of liste) {
    if (!z.rect) continue;
    const part = total ? z.n / total : 0;
    ctx.fillStyle = z.r ? 'rgba(188,74,60,0.22)' : 'rgba(186,123,57,0.22)';
    ctx.strokeStyle = z.r ? '#BC4A3C' : '#BA7B39';
    ctx.lineWidth = 2;
    ctx.fillRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h);
    ctx.strokeRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h);
    const texte = `${z.n} clic${z.n > 1 ? 's' : ''} · ${Math.round(part * 100)} %`;
    ctx.font = `700 ${police}px Inter, system-ui, sans-serif`;
    const largeur = ctx.measureText(texte).width + 14;
    const bx = Math.max(0, Math.min(canvas.width - largeur, z.rect.x));
    const by = Math.max(0, z.rect.y - police - 10);
    ctx.fillStyle = z.r ? '#BC4A3C' : '#293027';
    ctx.fillRect(bx, by, largeur, police + 8);
    ctx.fillStyle = '#EEE7DB';
    ctx.textAlign = 'left';
    ctx.fillText(texte, bx + 7, by + police + 1);
  }
}
