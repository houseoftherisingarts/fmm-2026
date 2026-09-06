import React, { useEffect, useState } from 'react';
import { useBadges } from '../../contexts/BadgesContext';
import { Trash2, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  creerObjetSouk, majObjetSouk, supprimerObjetSouk, suivreObjetsDe, estGratuit,
  MAX_PHOTOS_OBJET, type ObjetSouk, type CategorieSouk, type GenreSouk, type StatutSouk,
} from '../../firebase/souk';
import { listerMesGuildes, type Guilde, type MonnaieGuilde } from '../../firebase/guildes';
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
  titre: '', description: '', prix: '', prixMontpellois: '', prixPieces: '',
  genre: 'objet' as GenreSouk, categorie: 'autre' as CategorieSouk,
};

/** L'encadré de courtoisie, en tête du formulaire (Alex, 2026-08-28) :
 *  deux phrases, pas un pavé juridique. Partagé avec SoukPage.tsx. */
export const DisclaimerSouk: React.FC<{ fr: boolean }> = ({ fr }) => (
  <p className="font-sans text-[11px] text-ivory-soft/60 leading-relaxed rounded-card px-3.5 py-2.5"
     style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.12)', background: 'rgba(0,0,0,0.18)' }}>
    {fr
      ? 'Le Festival médiéval de Montpellier et Médiéval Petite Nation ne sont pas responsables des ventes conclues dans le Souk. C’est un espace de courtoisie offert de membre à membre, sans aucune modération des objets ou des services par l’équipe.'
      : 'The Montpellier Medieval Festival and Médiéval Petite Nation are not responsible for sales made in the Souk. It is a space of courtesy offered from member to member, with no moderation of items or services by the team.'}
  </p>
);

/** Une guilde déjà choisie et verrouillée (le Marché de la guilde ouvre
 *  le formulaire avec sa propre guilde imposée, jamais un choix). */
export interface GuildeFixe {
  id: string;
  nom: string;
  monnaie?: MonnaieGuilde;
}

/** Le formulaire de mise en vente, seul (Alex/contrat 6 sept 2026) :
 *  extrait de MesObjets pour que le Marché d'une guilde puisse l'ouvrir
 *  avec sa guilde préchoisie et verrouillée (guildeFixe). Sans
 *  guildeFixe, un membre qui appartient à au moins une guilde peut
 *  réserver l'annonce à celle-ci, avec un prix en pièces. */
export const FormulaireSouk: React.FC<{
  uid: string;
  lang: 'FR' | 'EN';
  guildeFixe?: GuildeFixe;
  onDone?: () => void;
}> = ({ uid, lang, guildeFixe, onDone }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const { gagnerBadge } = useBadges();
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guildes, setGuildes] = useState<Guilde[]>([]);
  const [guildeId, setGuildeId] = useState<string>(guildeFixe?.id || '');

  useEffect(() => {
    if (guildeFixe) return;
    listerMesGuildes(uid).then(setGuildes);
  }, [uid, guildeFixe]);

  const guildeMonnaie: MonnaieGuilde | undefined = guildeFixe
    ? guildeFixe.monnaie
    : guildes.find((g) => g.id === guildeId)?.monnaie;
  const nomPieces = guildeMonnaie?.nom ?? (fr ? 'pièces' : 'coins');

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
    const guildeIdFinal = guildeFixe?.id || guildeId || undefined;
    const prixPiecesBrut = form.prixPieces.trim();
    const prixPieces = guildeIdFinal && prixPiecesBrut ? Number(prixPiecesBrut) : undefined;
    if (prixPieces !== undefined && (!Number.isFinite(prixPieces) || prixPieces < 0)) {
      setError(fr ? `Le prix en ${nomPieces} n’est pas valide.` : `The ${nomPieces} price is not valid.`);
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
        genre: form.genre,
        categorie: form.categorie,
        guildeId: guildeIdFinal,
        prixPieces,
        fichiers: photos,
      });
      gagnerBadge('souk');
      setForm(EMPTY); setPhotos([]);
      if (!guildeFixe) setGuildeId('');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="glass-light rounded-lg-card p-5 md:p-6 space-y-4">
      <DisclaimerSouk fr={fr} />
      <label className="block">
        <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Genre' : 'Kind'}</span>
        <div className="flex gap-2">
          {(['objet', 'service'] as GenreSouk[]).map((g) => (
            <button key={g} type="button"
                    onClick={() => setForm((p) => ({ ...p, genre: g, categorie: 'autre' }))}
                    className={`px-4 py-2 rounded-card font-sans text-xs uppercase tracking-wider transition border ${
                      form.genre === g ? 'bg-brass/20 border-brass text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50 hover:text-brass'
                    }`}>
              {g === 'objet' ? (fr ? 'Objet' : 'Item') : (fr ? 'Service' : 'Service')}
            </button>
          ))}
        </div>
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Titre' : 'Title'}</span>
          <input className="witcher-input font-sans" value={form.titre} maxLength={80}
                 onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} required />
        </label>
        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
            {fr ? 'Prix (CAD, facultatif)' : 'Price (CAD, optional)'}
          </span>
          <input className="witcher-input font-sans" type="number" min={0} step="0.01" value={form.prix}
                 placeholder={fr ? 'Laissez vide pour donner' : 'Leave blank to give away'}
                 onChange={(e) => setForm((p) => ({ ...p, prix: e.target.value }))} />
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

      {guildeFixe ? (
        <p className="font-sans text-xs text-ivory-soft">
          {fr ? 'Réservé à la guilde : ' : 'Reserved to the guild: '}<span className="text-brass">{guildeFixe.nom}</span>
        </p>
      ) : guildes.length > 0 ? (
        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
            {fr ? 'Réserver à ma guilde (facultatif)' : 'Reserve to my guild (optional)'}
          </span>
          <select className="witcher-input font-sans" value={guildeId}
                  onChange={(e) => setGuildeId(e.target.value)}>
            <option value="">{fr ? 'Aucune, Souk public' : 'None, public Souk'}</option>
            {guildes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
        </label>
      ) : null}

      {(guildeFixe?.id || guildeId) && (
        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
            {fr ? `Prix en ${nomPieces} (guilde)` : `Price in ${nomPieces} (guild)`}
          </span>
          <input className="witcher-input font-sans" type="number" min={0} step="1" value={form.prixPieces}
                 onChange={(e) => setForm((p) => ({ ...p, prixPieces: e.target.value }))} />
        </label>
      )}

      <label className="block">
        <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{fr ? 'Catégorie' : 'Category'}</span>
        <select className="witcher-input font-sans" value={form.categorie}
                onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value as CategorieSouk }))}>
          {(form.genre === 'service' ? CATEGORIES_SERVICE : CATEGORIES_OBJET).map((c) => (
            <option key={c} value={c}>{CAT_LABEL[lang][c]}</option>
          ))}
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
  );
};

const MesObjets: React.FC<Props> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [objets, setObjets] = useState<ObjetSouk[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => suivreObjetsDe(uid, setObjets), [uid]);

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

      {showForm && <FormulaireSouk uid={uid} lang={lang} onDone={() => setShowForm(false)} />}
      {error && <p className="font-editorial italic text-xs text-blush">{error}</p>}

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
                <p className="font-sans text-xs mb-2 flex items-center gap-2 flex-wrap">
                  {estGratuit(o) ? (
                    <span style={{ color: '#8fd6b4' }}>{fr ? 'Gratuit, à donner' : 'Free to a good home'}</span>
                  ) : (
                    <span className="text-brass">{(o.prix ?? 0).toFixed(2)} $</span>
                  )}
                  {o.prixMontpellois ? (
                    <span className="inline-flex items-center gap-1 text-brass"><PieceMontpellois size={12} />{o.prixMontpellois}</span>
                  ) : null}
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
