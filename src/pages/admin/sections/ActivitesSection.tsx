import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Save, Sprout } from 'lucide-react';
import {
  suivreFiches, creerFiche, majFiche, supprimerFiche, nouvelIdFiche,
  televerserPhotoFiche, semerDepuisLeCode,
  type FicheActivite, type FicheInput, type CategorieActivite,
} from '../../../firebase/activites';
import { ACTIVITES_DU_CODE } from '../../../content/activitesDuCode';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, EmptyState, ToggleSwitch } from '../primitives';

// ─── Les activités, modifiables sans terminal ───────────────────────
// Alex, 2026-08-23 : « je veux changer les photos, les titres et les
// textes moi-même, et pouvoir ajouter une rangée ». Chaque fiche se
// modifie ici; la page publique suit la collection en temps réel.
//
// Tant que la collection est vide, la page publique affiche les fiches
// écrites dans le code : le bouton « Semer » les recopie une fois dans
// Firestore, et à partir de là tout se pilote d'ici.

const CATEGORIES: Array<{ id: CategorieActivite; label: string }> = [
  { id: 'combat',   label: 'Combat' },
  { id: 'crafts',   label: 'Artisanat' },
  { id: 'shows',    label: 'Spectacles' },
  { id: 'ripaille', label: 'Ripaille' },
  { id: 'family',   label: 'Famille' },
];

const VIDE: FicheInput = {
  titreFR: '', titreEN: '',
  sousTitreFR: '', sousTitreEN: '',
  descFR: '', descEN: '',
  image: '', imagePos: undefined,
  categorie: 'crafts', retiree: false, ordre: 0,
};

const ActivitesSection: React.FC = () => {
  const [fiches, setFiches] = useState<FicheActivite[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Record<string, Partial<FicheInput>>>({});
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => suivreFiches((f) => { setFiches(f); setChargement(false); }), []);

  const valeur = (f: FicheActivite, cle: keyof FicheInput) => {
    const b = brouillon[f.id];
    return (b && cle in b ? b[cle] : f[cle]) as never;
  };
  const changer = (id: string, cle: keyof FicheInput, v: unknown) =>
    setBrouillon((p) => ({ ...p, [id]: { ...p[id], [cle]: v } }));

  const enregistrer = async (f: FicheActivite) => {
    const patch = brouillon[f.id];
    if (!patch) return;
    setOccupe(f.id);
    try {
      await majFiche(f.id, patch);
      setBrouillon((p) => { const n = { ...p }; delete n[f.id]; return n; });
      setMessage(`« ${patch.titreFR ?? f.titreFR} » enregistrée.`);
    } catch (e) {
      setMessage(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOccupe(null);
    }
  };

  const ajouter = async () => {
    const id = nouvelIdFiche();
    await creerFiche(id, {
      ...VIDE,
      titreFR: 'Nouvelle activité', titreEN: 'New activity',
      ordre: (fiches[fiches.length - 1]?.ordre ?? 0) + 1,
    });
    setOuverte(id);
  };

  const deplacer = async (f: FicheActivite, sens: -1 | 1) => {
    const i = fiches.findIndex((x) => x.id === f.id);
    const j = i + sens;
    if (j < 0 || j >= fiches.length) return;
    const autre = fiches[j];
    await Promise.all([
      majFiche(f.id, { ordre: autre.ordre }),
      majFiche(autre.id, { ordre: f.ordre }),
    ]);
  };

  const semer = async () => {
    setOccupe('semis');
    try {
      const n = await semerDepuisLeCode(ACTIVITES_DU_CODE);
      setMessage(n > 0 ? `${n} fiches recopiées depuis le site.` : 'La collection contient déjà des fiches.');
    } finally {
      setOccupe(null);
    }
  };

  const photo = async (f: FicheActivite, fichier: File) => {
    setOccupe(f.id);
    try {
      const url = await televerserPhotoFiche(f.id, fichier);
      await majFiche(f.id, { image: url });
      setMessage('Photo remplacée.');
    } catch (e) {
      setMessage(`Échec de l’envoi : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOccupe(null);
    }
  };

  const total = useMemo(() => fiches.length, [fiches]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory">Activités</h1>
          <p className="font-editorial text-sm text-ivory-soft/70 mt-1">
            {total} fiche{total > 1 ? 's' : ''} · titres, textes et photos de la page Programmation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {total === 0 && (
            <GhostButton onClick={semer} disabled={occupe === 'semis'}>
              <Sprout size={14} className="inline mr-1.5 -mt-0.5" />
              {occupe === 'semis' ? 'Semis…' : 'Semer depuis le site'}
            </GhostButton>
          )}
          <PrimaryButton onClick={ajouter}>
            <Plus size={14} className="inline mr-1.5 -mt-0.5" /> Ajouter une activité
          </PrimaryButton>
        </div>
      </div>

      {message && (
        <Card><p className="font-editorial text-sm text-brass">{message}</p></Card>
      )}

      {chargement ? (
        <Card><p className="font-editorial italic text-sm text-ivory-soft">Chargement…</p></Card>
      ) : total === 0 ? (
        <EmptyState icon={ImageIcon}>
          Aucune fiche dans la base. La page publique montre encore les activités écrites dans le
          code : « Semer depuis le site » les recopie ici, une seule fois, et tout devient modifiable.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {fiches.map((f, i) => {
            const modifiee = !!brouillon[f.id];
            const ouvert = ouverte === f.id;
            return (
              <Card key={f.id}>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-card overflow-hidden bg-black/40 border border-brass/25 shrink-0">
                    {valeur(f, 'image') ? (
                      <img
                        src={valeur(f, 'image')}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: (valeur(f, 'imagePos') as string) || undefined }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ivory-soft/30">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setOuverte(ouvert ? null : f.id)}
                      className="text-left w-full"
                    >
                      <p className="font-display text-lg text-ivory truncate">
                        {String(valeur(f, 'titreFR')) || '(sans titre)'}
                      </p>
                      <p className="font-editorial text-xs text-ivory-soft/60 truncate">
                        {String(valeur(f, 'sousTitreFR'))} · {CATEGORIES.find((c) => c.id === valeur(f, 'categorie'))?.label}
                        {valeur(f, 'retiree') ? ' · en relâche' : ''}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <GhostButton onClick={() => deplacer(f, -1)} disabled={i === 0} title="Monter">
                      <ArrowUp size={14} />
                    </GhostButton>
                    <GhostButton onClick={() => deplacer(f, 1)} disabled={i === fiches.length - 1} title="Descendre">
                      <ArrowDown size={14} />
                    </GhostButton>
                  </div>
                </div>

                {ouvert && (
                  <div className="mt-5 pt-5 border-t border-ivory-soft/10 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Titre (FR)</Label>
                        <Input value={String(valeur(f, 'titreFR'))} onChange={(e) => changer(f.id, 'titreFR', e.target.value)} />
                      </div>
                      <div>
                        <Label>Titre (EN)</Label>
                        <Input value={String(valeur(f, 'titreEN'))} onChange={(e) => changer(f.id, 'titreEN', e.target.value)} />
                      </div>
                      <div>
                        <Label>Sous-titre (FR)</Label>
                        <Input value={String(valeur(f, 'sousTitreFR'))} onChange={(e) => changer(f.id, 'sousTitreFR', e.target.value)} />
                      </div>
                      <div>
                        <Label>Sous-titre (EN)</Label>
                        <Input value={String(valeur(f, 'sousTitreEN'))} onChange={(e) => changer(f.id, 'sousTitreEN', e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label>Description longue (FR)</Label>
                      <Textarea rows={4} value={String(valeur(f, 'descFR'))} onChange={(e) => changer(f.id, 'descFR', e.target.value)} />
                    </div>
                    <div>
                      <Label>Description longue (EN)</Label>
                      <Textarea rows={4} value={String(valeur(f, 'descEN'))} onChange={(e) => changer(f.id, 'descEN', e.target.value)} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Catégorie</Label>
                        <select
                          value={String(valeur(f, 'categorie'))}
                          onChange={(e) => changer(f.id, 'categorie', e.target.value)}
                          className="w-full bg-midnight-deep/60 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory"
                        >
                          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Cadrage de la photo</Label>
                        <Input
                          placeholder="ex. 38% 50%"
                          value={String(valeur(f, 'imagePos') ?? '')}
                          onChange={(e) => changer(f.id, 'imagePos', e.target.value || undefined)}
                        />
                      </div>
                      <div className="flex items-end">
                        <ToggleSwitch
                          checked={!!valeur(f, 'retiree')}
                          onChange={(v) => changer(f.id, 'retiree', v)}
                          label="En relâche cette année"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Photo</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={String(valeur(f, 'image'))}
                          onChange={(e) => changer(f.id, 'image', e.target.value)}
                          placeholder="/activites/webp/… ou une adresse https://"
                        />
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/40 text-brass text-xs uppercase tracking-widest cursor-pointer hover:bg-brass hover:text-midnight-deep transition">
                          <ImageIcon size={14} /> Téléverser
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const x = e.target.files?.[0]; if (x) void photo(f, x); }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <DangerButton
                        onClick={() => {
                          if (window.confirm(`Supprimer « ${f.titreFR} » ? Cette fiche disparaîtra du site.`)) {
                            void supprimerFiche(f.id);
                          }
                        }}
                      >
                        <Trash2 size={14} className="inline mr-1.5 -mt-0.5" /> Supprimer
                      </DangerButton>
                      <PrimaryButton onClick={() => enregistrer(f)} disabled={!modifiee || occupe === f.id}>
                        <Save size={14} className="inline mr-1.5 -mt-0.5" />
                        {occupe === f.id ? 'Enregistrement…' : modifiee ? 'Enregistrer' : 'Rien à enregistrer'}
                      </PrimaryButton>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivitesSection;
