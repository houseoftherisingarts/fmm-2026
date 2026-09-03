import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── La bannière tissée ─────────────────────────────────────────────
// Alex, 2026-09-02 : essai d'une étoffe qui ondule, avec le logo de
// William J. Walter et nos couleurs, le vert de l'émeraude à la place
// du rouge de la référence.
//
// La référence arrivait dans un cadre isolé qui chargeait Tailwind,
// GSAP et Three depuis trois serveurs de distribution. Le site en tient
// déjà un, `three`, et il vient de passer un audit de la Loi 25 qui
// interdit d'appeler un tiers avant le consentement. La simulation est
// donc portée ici, sur notre propre trois, sans un seul appel sortant.
//
// La physique est un Verlet à contraintes de distance : chaque nœud
// garde sa position d'avant, le vent la pousse, et trois passes de
// relaxation ramènent les fils à leur longueur. La rangée du haut reste
// clouée, comme une bannière pendue à sa hampe.

const VERT_PROFOND = '#1F3D2C';
const VERT_VIF = '#3E7A56';
/** L'os du logo de William J. Walter, repris tel quel : le lettrage de
 *  l'étoffe porte la couleur de la marque, jamais une approximation. */
const OS = '#E8DDC1';

interface Props {
  /** Le logo à tisser dans l'étoffe. Monochrome noir, il se reteint. */
  logo?: string;
  /** La ligne sous le logo. Vide par défaut : Alex ne veut pas du mot
   *  « présente » sur l'étoffe. */
  legende?: string;
  /** Les lignes tissées sous la marque. Une par ligne de l'étoffe. */
  titre?: string[];
  className?: string;
}

/** Le logo, redessiné dans la couleur du festival. Le fichier est noir
 *  uni, donc une composition `source-in` suffit à le reteindre sans
 *  toucher au fichier d'origine. */
async function logoTeinte(url: string, largeur: number, teinte: string): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const ratio = img.naturalHeight / img.naturalWidth || 0.5;
    const c = document.createElement('canvas');
    c.width = largeur;
    c.height = Math.round(largeur * ratio);
    const x = c.getContext('2d');
    if (!x) return null;
    x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = teinte;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

/** L'étoffe elle-même, peinte une fois puis tendue sur la grille. */
async function tisserLetoffe(
  logo: string | undefined, legende: string, titre: string[],
): Promise<THREE.CanvasTexture> {
  const W = 1280;
  const H = 800;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;

  // Un brun foncé, pour que l'os du lettrage ressorte (Alex, 2026-09-02).
  const fond = x.createLinearGradient(0, 0, 0, H);
  fond.addColorStop(0, '#3a2418');
  fond.addColorStop(0.5, '#2e1c12');
  fond.addColorStop(1, '#241610');
  x.fillStyle = fond;
  x.fillRect(0, 0, W, H);

  // L'ourlet, deux traits comme sur une bannière cousue.
  x.strokeStyle = VERT_VIF;
  x.lineWidth = 10;
  x.strokeRect(46, 46, W - 92, H - 92);
  x.lineWidth = 3;
  x.strokeStyle = VERT_PROFOND;
  x.strokeRect(66, 66, W - 132, H - 132);

  x.textAlign = 'center';
  x.textBaseline = 'middle';

  const dessin = logo ? await logoTeinte(logo, 760, OS) : null;
  if (dessin) {
    x.drawImage(dessin, (W - dessin.width) / 2, 300 - dessin.height / 2);
  } else {
    x.fillStyle = OS;
    x.font = 'bold 96px Georgia, "Times New Roman", serif';
    x.fillText('WILLIAM J. WALTER', W / 2, 320);
  }

  // Aucun mot « présente » sur l'étoffe : la bannière porte la marque
  // et le festival, la phrase de commandite vit dans la page (Alex).
  // Le petit mot du commanditaire se glisse entre la marque et le
  // titre, discret : c'est une mention, pas une annonce (Alex).
  if (legende) {
    x.fillStyle = OS;
    x.globalAlpha = 0.82;
    x.font = 'italic 30px Georgia, "Times New Roman", serif';
    x.fillText(legende, W / 2, 528);
    x.globalAlpha = 1;
  }

  // Le titre se centre sur ce qui reste de l'étoffe, quel que soit le
  // nombre de lignes : une seule ligne ne doit pas pendre en haut.
  x.fillStyle = OS;
  x.font = 'bold 84px Georgia, "Times New Roman", serif';
  const depart = 614 - ((titre.length - 1) * 90) / 2;
  titre.forEach((ligne, i) => { x.fillText(ligne, W / 2, depart + i * 90); });

  // Le tissage, deux trames croisées, et le grain du fil.
  for (let y = 0; y < H; y += 3) {
    x.strokeStyle = 'rgba(0,0,0,0.10)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, y + 0.5); x.lineTo(W, y + 0.5); x.stroke();
  }
  for (let i = 0; i < W; i += 3) {
    x.strokeStyle = 'rgba(232,221,193,0.05)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, H); x.stroke();
  }
  const image = x.getImageData(0, 0, W, H);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 2 - 1) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(image, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const DrapeauTisse: React.FC<Props> = ({
  logo = '/partenaires/wjw-logo.svg',
  legende = '',
  titre = ['VILLAGE NOURRITURE'],
  className,
}) => {
  const hote = useRef<HTMLCanvasElement | null>(null);
  // Le tableau des lignes se fige en texte pour la dépendance de
  // l'effet : un littéral neuf à chaque rendu remonterait la scène.
  const lignes = titre.join('|');

  useEffect(() => {
    const canvas = hote.current;
    if (!canvas) return;
    let vivant = true;
    let raf = 0;

    const sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const rendu = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const LARGE = 4.4; const HAUT = 2.75; const GX = 40; const GY = 26;
    const geo = new THREE.PlaneGeometry(LARGE, HAUT, GX, GY);
    const mat = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide, shininess: 6, specular: 0x14261c, color: 0xffffff,
    });
    scene.add(new THREE.Mesh(geo, mat));
    void tisserLetoffe(logo, legende, lignes.split('|')).then((t) => { if (vivant) { mat.map = t; mat.needsUpdate = true; } });

    scene.add(new THREE.AmbientLight(0xffe9d0, 0.62));
    const cle = new THREE.DirectionalLight(0xfff0dc, 1.15);
    cle.position.set(-3, 3.5, 3.2);
    scene.add(cle);
    const contre = new THREE.DirectionalLight(0x2f6b4c, 0.45);
    contre.position.set(3, -1.5, 2);
    scene.add(contre);

    const pos = geo.attributes.position;
    const N = (GX + 1) * (GY + 1);
    const ici = new Float32Array(N * 3);
    const avant = new Float32Array(N * 3);
    const repos = new Float32Array(N * 3);
    const cloue = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const ax = pos.getX(i); const ay = pos.getY(i);
      ici[i * 3] = avant[i * 3] = repos[i * 3] = ax;
      ici[i * 3 + 1] = avant[i * 3 + 1] = repos[i * 3 + 1] = ay;
      ici[i * 3 + 2] = avant[i * 3 + 2] = repos[i * 3 + 2] = 0;
    }
    for (let ix = 0; ix <= GX; ix++) cloue[ix] = 1;
    const num = (ix: number, iy: number) => ix + iy * (GX + 1);
    const filH = LARGE / GX; const filV = HAUT / GY;
    const GRAVITE = -3.1; const FREIN = 0.985; const PAS = 0.016;

    const tendre = (a: number, b: number, longueur: number) => {
      let dx = ici[b * 3] - ici[a * 3];
      let dy = ici[b * 3 + 1] - ici[a * 3 + 1];
      let dz = ici[b * 3 + 2] - ici[a * 3 + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const k = ((d - longueur) / d) * 0.5;
      dx *= k; dy *= k; dz *= k;
      const pa = cloue[a]; const pb = cloue[b];
      if (!pa && !pb) {
        ici[a * 3] += dx; ici[a * 3 + 1] += dy; ici[a * 3 + 2] += dz;
        ici[b * 3] -= dx; ici[b * 3 + 1] -= dy; ici[b * 3 + 2] -= dz;
      } else if (pa && !pb) {
        ici[b * 3] -= dx * 2; ici[b * 3 + 1] -= dy * 2; ici[b * 3 + 2] -= dz * 2;
      } else if (!pa && pb) {
        ici[a * 3] += dx * 2; ici[a * 3 + 1] += dy * 2; ici[a * 3 + 2] += dz * 2;
      }
    };

    const souffler = (t: number) => {
      for (let iy = 0; iy <= GY; iy++) {
        for (let ix = 0; ix <= GX; ix++) {
          const i = num(ix, iy);
          if (cloue[i]) continue;
          const cx = ix / GX; const cy = iy / GY;
          const course = t * 1.7 - cy * 4.2;
          const rafale = 0.6 + 0.42 * Math.sin(t * 0.6) + 0.18 * Math.sin(t * 1.9 + 1.3);
          const ampleur = 4.3 * cy;
          const fz = (Math.sin(course + cx * 3.3) + 0.5 * Math.sin(course * 1.7 + cx * 6)) * ampleur * rafale;
          const fx = Math.sin(t * 0.9 + cy * 2.2) * 0.6 * cy;
          const fy = -0.4 * cy + GRAVITE;
          for (let k = 0; k < 3; k++) {
            const j = i * 3 + k;
            const a = k === 0 ? fx : k === 1 ? fy : fz;
            const v = (ici[j] - avant[j]) * FREIN;
            avant[j] = ici[j];
            ici[j] = ici[j] + v + a * PAS * PAS;
          }
        }
      }
      for (let n = 0; n < 3; n++) {
        for (let iy = 0; iy <= GY; iy++) for (let ix = 0; ix < GX; ix++) tendre(num(ix, iy), num(ix + 1, iy), filH);
        for (let iy = 0; iy < GY; iy++) for (let ix = 0; ix <= GX; ix++) tendre(num(ix, iy), num(ix, iy + 1), filV);
      }
      for (let ix = 0; ix <= GX; ix++) {
        for (let k = 0; k < 3; k++) { ici[ix * 3 + k] = repos[ix * 3 + k]; avant[ix * 3 + k] = repos[ix * 3 + k]; }
      }
    };

    const poser = () => {
      for (let i = 0; i < N; i++) pos.setXYZ(i, ici[i * 3], ici[i * 3 + 1], ici[i * 3 + 2]);
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    let camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const cadrer = () => {
      const p = canvas.parentElement;
      const w = p?.clientWidth || window.innerWidth;
      const h = p?.clientHeight || window.innerHeight;
      rendu.setSize(w, h, false);
      const rapport = w / h;
      camera = new THREE.PerspectiveCamera(42, rapport, 0.1, 100);
      // L'étoffe remplit la LARGEUR de l'écran (Alex, 2026-09-02). La
      // caméra se cale donc sur l'horizontale seule, et ce qui dépasse en
      // hauteur se perd hors cadre plutôt que de laisser des marges.
      const horizontal = (LARGE / 2) / Math.tan((42 * Math.PI) / 360) / rapport;
      // Un souffle de recul : l'étoffe pend et gonfle sous le vent, donc
      // un cadrage collé à la largeur lui coupe les bords au premier pli.
      camera.position.set(0, -0.18, horizontal * 1.06);
      camera.lookAt(0, 0, 0);
    };
    cadrer();
    window.addEventListener('resize', cadrer);

    let t = 0;
    const boucle = () => {
      if (!vivant) return;
      t += PAS;
      souffler(t);
      poser();
      rendu.render(scene, camera);
      raf = requestAnimationFrame(boucle);
    };

    if (sobre) {
      // Le vent souffle en avance rapide, puis l'étoffe se fige : une
      // personne qui refuse le mouvement voit quand même un vrai pli.
      for (let s = 0; s < 220; s++) souffler(s * PAS);
      poser();
      rendu.render(scene, camera);
    } else {
      for (let s = 0; s < 40; s++) souffler(s * PAS);
      t = 40 * PAS;
      raf = requestAnimationFrame(boucle);
    }

    return () => {
      vivant = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', cadrer);
      geo.dispose();
      mat.map?.dispose();
      mat.dispose();
      rendu.dispose();
    };
  }, [logo, legende, lignes]);

  return <canvas ref={hote} className={className ?? 'absolute inset-0 block h-full w-full'} />;
};

export default DrapeauTisse;
