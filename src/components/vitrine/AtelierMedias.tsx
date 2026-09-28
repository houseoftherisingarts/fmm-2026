import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Music, Plus, Trash2, Upload } from 'lucide-react';
import {
  MAX_PHOTOS, MAX_PISTES, MAX_PRODUITS, dureeAudio, formatDuree, majVitrine, nouvelId,
  supprimerFichiers, televerserPhotoVitrine, televerserPiste,
  type Piste, type Produit, type Vitrine,
} from '../../firebase/vitrines';
import { Carte, Champ, BoutonOr, BoutonSobre, classeChamp } from './primitives';

// ─── Les médias de l'atelier : pistes, créations, galerie ────────────
// Chaque liste écrit dans Firestore dès qu'elle change (ajout, retrait,
// titre), parce qu'un fichier déjà téléversé n'a pas à attendre un
// bouton Enregistrer. Les titres et les prix se posent à la sortie du
// champ (onBlur), pour ne pas écrire à chaque touche.

const T = {
  FR: {
    pistesEyebrow: 'Écouter', pistesTitre: 'Vos pistes',
    pistesAide: 'Déposez vos morceaux en mp3, m4a, wav, ogg ou flac, jusqu’à 30 Mo chacun. Le titre se corrige en cliquant dessus.',
    ajouterPistes: 'Ajouter des pistes', envoi: 'Envoi…', pistesPleines: 'La vitrine tient douze pistes au plus.',
    produitsEyebrow: 'L’atelier', produitsTitre: 'Vos créations',
    produitsAide: 'Une carte par objet, album ou service : un nom, un prix si vous voulez l’afficher, une photo, et le lien où le commander si vous en avez un.',
    ajouterProduit: 'Ajouter une création', nom: 'Nom', prix: 'Prix ($)', description: 'Description', lien: 'Lien de commande (Square, Stripe, Etsy…)',
    photo: 'Photo', changerPhoto: 'Changer la photo', retirer: 'Retirer', produitsPleins: 'La vitrine tient trente créations au plus.',
    galerieEyebrow: 'En images', galerieTitre: 'Votre galerie',
    galerieAide: 'Jusqu’à douze photos, redimensionnées ici même avant l’envoi.',
    ajouterPhotos: 'Ajouter des photos', galeriePleine: 'La galerie tient douze photos au plus.',
    erreurEnvoi: 'L’envoi n’a pas abouti. Réessayez.',
  },
  EN: {
    pistesEyebrow: 'Listen', pistesTitre: 'Your tracks',
    pistesAide: 'Drop your tracks as mp3, m4a, wav, ogg or flac, up to 30 MB each. Click a title to fix it.',
    ajouterPistes: 'Add tracks', envoi: 'Uploading…', pistesPleines: 'The showcase holds twelve tracks at most.',
    produitsEyebrow: 'The workshop', produitsTitre: 'Your creations',
    produitsAide: 'One card per item, album or service: a name, a price if you want it shown, a photo, and the link to order it if you have one.',
    ajouterProduit: 'Add a creation', nom: 'Name', prix: 'Price ($)', description: 'Description', lien: 'Order link (Square, Stripe, Etsy…)',
    photo: 'Photo', changerPhoto: 'Change photo', retirer: 'Remove', produitsPleins: 'The showcase holds thirty creations at most.',
    galerieEyebrow: 'In pictures', galerieTitre: 'Your gallery',
    galerieAide: 'Up to twelve photos, resized right here before upload.',
    ajouterPhotos: 'Add photos', galeriePleine: 'The gallery holds twelve photos at most.',
    erreurEnvoi: 'The upload did not go through. Try again.',
  },
};

interface Props { v: Vitrine; lang: 'FR' | 'EN' }

// ─── Pistes ──────────────────────────────────────────────────────────
export const AtelierPistes: React.FC<Props> = ({ v, lang }) => {
  const t = T[lang];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ajouter(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const place = MAX_PISTES - v.pistes.length;
    if (place <= 0) { setErr(t.pistesPleines); return; }
    const nouvelles: Piste[] = [];
    try {
      for (const f of Array.from(files).slice(0, place)) {
        setBusy(f.name);
        const [fichier, duree] = await Promise.all([televerserPiste(v.slug, f), dureeAudio(f)]);
        nouvelles.push({ id: nouvelId(), titre: f.name.replace(/\.[^.]+$/, ''), url: fichier.url, chemin: fichier.chemin, duree });
      }
      await majVitrine(v.slug, { pistes: [...v.pistes, ...nouvelles] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.erreurEnvoi);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }
  async function renommer(id: string, titre: string) {
    const propre = titre.trim().slice(0, 80);
    if (!propre) return;
    await majVitrine(v.slug, { pistes: v.pistes.map((p) => (p.id === id ? { ...p, titre: propre } : p)) });
  }
  async function retirer(p: Piste) {
    await majVitrine(v.slug, { pistes: v.pistes.filter((x) => x.id !== p.id) });
    await supprimerFichiers([p.chemin]);
  }

  return (
    <Carte icone={Music} eyebrow={t.pistesEyebrow} titre={t.pistesTitre} aide={t.pistesAide}>
      <ul className="space-y-2 mb-4">
        {v.pistes.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-card border border-white/10 bg-black/25 px-3 py-2">
            <span className="font-sans text-xs text-ivory-soft/70 w-6">{String(i + 1).padStart(2, '0')}</span>
            <input defaultValue={p.titre} onBlur={(e) => renommer(p.id, e.target.value)} aria-label={t.nom}
                   className="flex-1 min-w-0 bg-transparent font-editorial text-base text-ivory outline-none focus:text-brass" />
            <span className="font-sans text-xs text-ivory-soft/80">{formatDuree(p.duree)}</span>
            <button type="button" onClick={() => retirer(p)} aria-label={t.retirer} className="text-ivory-soft/60 hover:text-blush transition"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <input ref={input} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac" multiple hidden onChange={(e) => ajouter(e.target.files)} />
      <BoutonOr onClick={() => input.current?.click()} disabled={!!busy || v.pistes.length >= MAX_PISTES}>
        <Upload size={14} /> {busy ? `${t.envoi} ${busy}` : t.ajouterPistes}
      </BoutonOr>
      {err && <p className="font-sans text-xs text-blush mt-3">{err}</p>}
    </Carte>
  );
};

// ─── Créations ───────────────────────────────────────────────────────
export const AtelierProduits: React.FC<Props> = ({ v, lang }) => {
  const t = T[lang];
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ecrire(produits: Produit[]) {
    setErr(null);
    try { await majVitrine(v.slug, { produits }); }
    catch (e) { setErr(e instanceof Error ? e.message : t.erreurEnvoi); }
  }
  function ajouter() {
    if (v.produits.length >= MAX_PRODUITS) { setErr(t.produitsPleins); return; }
    ecrire([...v.produits, { id: nouvelId(), nom: '' }]);
  }
  function poser(id: string, champs: Partial<Produit>) {
    ecrire(v.produits.map((p) => (p.id === id ? nettoyer({ ...p, ...champs }) : p)));
  }
  async function retirer(p: Produit) {
    await ecrire(v.produits.filter((x) => x.id !== p.id));
    if (p.photo) await supprimerFichiers([p.photo.chemin]);
  }
  async function photo(p: Produit, file: File | undefined) {
    if (!file) return;
    setBusy(p.id); setErr(null);
    try {
      const f = await televerserPhotoVitrine(v.slug, `produit-${p.id}`, file, 1400);
      const ancien = p.photo?.chemin;
      await ecrire(v.produits.map((x) => (x.id === p.id ? { ...x, photo: f } : x)));
      if (ancien) await supprimerFichiers([ancien]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.erreurEnvoi);
    } finally { setBusy(null); }
  }

  return (
    <Carte icone={ImageIcon} eyebrow={t.produitsEyebrow} titre={t.produitsTitre} aide={t.produitsAide}>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {v.produits.map((p) => (
          <li key={p.id} className="rounded-lg-card border border-white/10 bg-black/25 p-4 space-y-3">
            <div className="flex gap-4">
              <label className="shrink-0 w-24 h-24 rounded-card overflow-hidden border border-white/15 bg-black/30 flex items-center justify-center cursor-pointer hover:border-brass/60 transition" title={p.photo ? t.changerPhoto : t.photo}>
                {p.photo ? <img src={p.photo.url} alt="" className="w-full h-full object-cover" /> : (busy === p.id ? <span className="font-sans text-[10px] text-brass">{t.envoi}</span> : <Plus size={18} className="text-brass" />)}
                <input type="file" accept="image/*" hidden onChange={(e) => photo(p, e.target.files?.[0])} />
              </label>
              <div className="flex-1 min-w-0 space-y-2">
                <input defaultValue={p.nom} placeholder={t.nom} onBlur={(e) => poser(p.id, { nom: e.target.value.trim().slice(0, 80) })} className={classeChamp} />
                <input defaultValue={p.prix ?? ''} placeholder={t.prix} inputMode="decimal"
                       onBlur={(e) => { const n = Number(String(e.target.value).replace(',', '.')); poser(p.id, { prix: e.target.value.trim() === '' || Number.isNaN(n) ? undefined : Math.round(n * 100) / 100 }); }}
                       className={classeChamp} />
              </div>
            </div>
            <textarea defaultValue={p.description ?? ''} placeholder={t.description} rows={2}
                      onBlur={(e) => poser(p.id, { description: e.target.value.trim().slice(0, 400) || undefined })} className={classeChamp} />
            <input defaultValue={p.lien ?? ''} placeholder={t.lien} inputMode="url"
                   onBlur={(e) => poser(p.id, { lien: urlPropre(e.target.value) })} className={classeChamp} />
            <div className="flex justify-end">
              <button type="button" onClick={() => retirer(p)} className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-ivory-soft/70 hover:text-blush transition">
                <Trash2 size={13} /> {t.retirer}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <BoutonOr onClick={ajouter} disabled={v.produits.length >= MAX_PRODUITS}><Plus size={14} /> {t.ajouterProduit}</BoutonOr>
      {err && <p className="font-sans text-xs text-blush mt-3">{err}</p>}
    </Carte>
  );
};

// ─── Galerie ─────────────────────────────────────────────────────────
export const AtelierGalerie: React.FC<Props> = ({ v, lang }) => {
  const t = T[lang];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ajouter(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const place = MAX_PHOTOS - v.photos.length;
    if (place <= 0) { setErr(t.galeriePleine); return; }
    setBusy(true);
    try {
      const nouvelles = [];
      for (const f of Array.from(files).slice(0, place)) nouvelles.push(await televerserPhotoVitrine(v.slug, 'photo', f, 1920));
      await majVitrine(v.slug, { photos: [...v.photos, ...nouvelles] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.erreurEnvoi);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function retirer(chemin: string) {
    await majVitrine(v.slug, { photos: v.photos.filter((p) => p.chemin !== chemin) });
    await supprimerFichiers([chemin]);
  }

  return (
    <Carte icone={ImageIcon} eyebrow={t.galerieEyebrow} titre={t.galerieTitre} aide={t.galerieAide}>
      {v.photos.length > 0 && (
        <ul className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {v.photos.map((p) => (
            <li key={p.chemin} className="relative group aspect-square rounded-card overflow-hidden border border-white/10">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => retirer(p.chemin)} aria-label={t.retirer}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-ivory flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => ajouter(e.target.files)} />
      <BoutonSobre onClick={() => input.current?.click()} disabled={busy || v.photos.length >= MAX_PHOTOS}>
        <Upload size={14} /> {busy ? t.envoi : t.ajouterPhotos}
      </BoutonSobre>
      {err && <p className="font-sans text-xs text-blush mt-3">{err}</p>}
    </Carte>
  );
};

function nettoyer(p: Produit): Produit {
  const out: Produit = { id: p.id, nom: p.nom };
  if (p.description) out.description = p.description;
  if (typeof p.prix === 'number') out.prix = p.prix;
  if (p.photo) out.photo = p.photo;
  if (p.lien) out.lien = p.lien;
  return out;
}

export function urlPropre(s: string): string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  return /^https?:\/\//i.test(t) ? t.slice(0, 500) : `https://${t}`.slice(0, 500);
}
