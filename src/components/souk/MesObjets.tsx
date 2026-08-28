import React, { useEffect, useState } from 'react';
import { useBadges } from '../../contexts/BadgesContext';
import { Trash2, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  creerObjetSouk, majObjetSouk, supprimerObjetSouk, suivreObjetsDe, estGratuit,
  MAX_PHOTOS_OBJET, type ObjetSouk, type CategorieSouk, type GenreSouk, type StatutSouk,
} from '../../firebase/souk';
import PieceMontpellois from '../boutique/PieceMontpellois';
import PhotosPicker from './PhotosPicker';

// ─── MesObjets : le formulaire d'ajout + la liste de ses objets ─────
// Rendu par SoukDe quand editable=true (sur la fiche du propriétaire).
// Statut changeable en un clic, suppression avec confirmation légère.
interface Props {
  uid: string;
  lang: 'FR' | 'EN';
}

const CATEGORIES_OBJET: CategorieSouk[] = ['costume', 'arme', 'artisanat', 'livre', 'decor', 'autre'];
const CATEGORIES_SERVICE: CategorieSouk[] = ['coup-de-main', 'couture', 'forge', 'musique', 'transport', 'autre'];
const CAT_LABEL: Record<'FR' | 'EN', Record<CategorieSouk, string>> = {
  FR: {
    costume: 'Costume', arme: 'Arme', artisanat: 'Artisanat', livre: 'Livre', decor: 'Décor', autre: 'Autre',
    'coup-de-main': 'Coup de main', couture: 'Couture', forge: 'Forge', musique: 'Musique', transport: 'Transport',
  },
  EN: {
    costume: 'Costume', arme: 'Weapon', artisanat: 'Craft', livre: 'Book', decor: 'Decor', autre: 'Other',
    'coup-de-main': 'Helping hand', couture: 'Sewing', forge: 'Blacksmithing', musique: 'Music', transport: 'Transport',
  },
};
const STATUT_LABEL: Record<'FR' | 'EN', Record<StatutSouk, string>> = {
  FR: { disponible: 'Disponible', reserve: 'Réservé', vendu: 'Vendu' },
  EN: { disponible: 'Available', reserve: 'Reserved', vendu: 'Sold' },
};

const EMPTY = {
  titre: '', description: '', prix: '', prixMontpellois: '',
  genre: 'objet' as GenreSouk, categorie: 'autre' as CategorieSouk,
};

/** L'encadré de courtoisie, en tête du formulaire (Alex, 2026-08-28) :
 *  deux phrases, pas un pavé juridique. Partagé avec SoukPage.tsx. */
export const DisclaimerSouk: React.FC<{ fr: boolean }> = ({ fr }) => (
  <p className="font-sans text-[11px] text-ivory-soft/60 leading-relaxed rounded-card px-3.5 py-2.5"
     style={{ border: '1px solid rgba(244,239,227,0.12)', background: 'rgba(0,0,0,0.18)' }}>
    {fr
      ? 'Le Festival médiéval de Montpellier et Médiéval Petite Nation ne sont pas responsables des ventes conclues dans le Souk. C’est un espace de courtoisie offert de membre à membre, sans aucune modération des objets ou des services par l’équipe.'
      : 'The Montpellier Medieval Festival and Médiéval Petite Nation are not responsible for sales made in the Souk. It is a space of courtesy offered from member to member, with no moderation of items or services by the team.'}
  </p>
);

const MesObjets: React.FC<Props> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const { gagnerBadge } = useBadges();
  const [objets, setObjets] = useState<ObjetSouk[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => suivreObjetsDe(uid, setObjets), [uid]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.titre.trim()) {
      setError(fr ? 'Un titre est requis.' : 'A title is required.');
      return;
    }
    // Le prix est facultatif : vide veut dire aucun prix en dollars,
    // pas zéro dollar (Alex, 2026-08-28).
    const prixBrut = form.prix.trim();
    let prix: number | undefined;
    if (prixBrut) {
      prix = Number(prixBrut.replace(',', '.'));
      if (!Number.isFinite(prix) || prix < 0) {
        setError(fr ? 'Le prix n’est pas valide.' : 'The price is not valid.');
        return;
      }
    }
    const prixMontpelloisBrut = form.prixMontpellois.trim();
    const prixMontpellois = prixMontpelloisBrut ? Number(prixMontpelloisBrut) : undefined;
    if (prixMontpellois !== undefined && (!Number.isFinite(prixMontpellois) || prixMontpellois < 0)) {
      setError(fr ? 'Le prix en Montpellois n’est pas valide.' : 'The Montpellois price is not valid.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await creerObjetSouk({
        uid,
        nom: user.displayName || user.email || '',
        avatarUrl: user.photoURL || undefined,
        titre: form.titre.trim(),
        description: form.description.trim(),
        prix,
        prixMontpellois,
        categorie: form.categorie,
        fichiers: photos,
      });
      gagnerBadge('souk');
      setForm(EMPTY); setPhotos([]); setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const changerStatut = (id: string, statut: StatutSouk) => majObjetSouk(id, { statut });
  const retirer = (id: string) => {
    if (window.confirm(fr ? 'Retirer cet objet du Souk ?' : 'Remove this item from the Souk?')) {
      supprimerObjetSouk(id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="witcher-stat-label">{fr ? 'Mes objets en vente' : 'My items for sale'}</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? (fr ? 'Fermer' : 'Close') : (fr ? 'Mettre un objet en vente' : 'Sell an item')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="glass-light rounded-lg-card p-5 md:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Titre' : 'Title'}</span>
              <input className="witcher-input font-sans" value={form.titre} maxLength={80}
                     onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} required />
            </label>
            <label className="block">
              <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Prix (CAD)' : 'Price (CAD)'}</span>
              <input className="witcher-input font-sans" type="number" min={0} step="0.01" value={form.prix}
                     onChange={(e) => setForm((p) => ({ ...p, prix: e.target.value }))} required />
            </label>
          </div>
          <label className="block">
            <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
              {fr ? 'Prix en Montpellois (facultatif)' : 'Price in Montpellois (optional)'}
            </span>
            <input className="witcher-input font-sans" type="number" min={0} step="1" value={form.prixMontpellois}
                   placeholder={fr ? 'Laissez vide pour vendre seulement en dollars' : 'Leave blank to sell in dollars only'}
                   onChange={(e) => setForm((p) => ({ ...p, prixMontpellois: e.target.value }))} />
          </label>
          <label className="block">
            <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Catégorie' : 'Category'}</span>
            <select className="witcher-input font-sans" value={form.categorie}
                    onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value as CategorieSouk }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[lang][c]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Description' : 'Description'}</span>
            <textarea className="witcher-input font-sans resize-y min-h-[80px]" rows={3} value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </label>
          <PhotosPicker
            lang={lang} max={MAX_PHOTOS_OBJET}
            photosExistantes={[]} onRetirerExistante={() => {}}
            nouvellesPhotos={photos} onChangeNouvelles={setPhotos}
          />
          {error && <p className="font-editorial italic text-xs text-blush">{error}</p>}
          <button type="submit" disabled={busy}
                  className="witcher-prompt disabled:opacity-50" data-primary="true">
            {busy ? (fr ? 'Envoi…' : 'Sending…') : (fr ? 'Mettre en vente' : 'List item')}
          </button>
        </form>
      )}

      {objets.length === 0 ? (
        <p className="font-editorial italic text-sm text-ivory-soft">
          {fr ? 'Rien en vente pour le moment.' : 'Nothing for sale yet.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {objets.map((o) => (
            <div key={o.id} className="glass-light rounded-lg-card p-4 flex gap-3">
              <div className="w-16 h-16 shrink-0 rounded-card overflow-hidden bg-midnight-deep/50 border border-brass/20">
                {o.photos[0] && <img src={o.photos[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display title-medieval text-sm text-ivory truncate">{o.titre}</p>
                <p className="font-sans text-xs text-brass mb-2 flex items-center gap-2 flex-wrap">
                  <span>{o.prix.toFixed(2)} $</span>
                  {o.prixMontpellois != null && (
                    <span className="inline-flex items-center gap-1"><PieceMontpellois size={12} />{o.prixMontpellois}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={o.statut}
                    onChange={(e) => changerStatut(o.id, e.target.value as StatutSouk)}
                    className="witcher-input font-sans text-xs py-1"
                  >
                    {(['disponible', 'reserve', 'vendu'] as StatutSouk[]).map((s) => (
                      <option key={s} value={s}>{STATUT_LABEL[lang][s]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => retirer(o.id)}
                          className="text-ivory-soft hover:text-blush transition" aria-label={fr ? 'Retirer' : 'Remove'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesObjets;
