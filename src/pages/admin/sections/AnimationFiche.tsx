import React, { useEffect, useState } from 'react';
import {
  ImagePlus, Plus, Trash2, Users2, Tent, Wallet, CalendarClock,
  ClipboardCheck, StickyNote, Music,
} from 'lucide-react';
import {
  TYPES_ANIMATION, STATUTS, JOURS, CONFIRMATIONS,
  coutTransport, coutTotal, enDollars, raisonDeBlocage, compterPubliees,
  televerserPhotoAnimation,
  type Animation, type AnimationInput, type JourFestival,
  type ModeHebergement, type ModeTransport,
} from '../../../firebase/animations';
import type { AppUser } from '../../../firebase/users';
import {
  Badge, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch,
} from '../primitives';

// ─── La fiche d'une animation ────────────────────────────────────────
// Contrôlée : le brouillon vit dans `draft`, initialisé depuis la prop
// `animation` et resynchronisé seulement quand on change de fiche (pas
// à chaque frappe du parent, sinon la saisie se ferait écraser).

const HEBERGEMENT_LABEL: Record<ModeHebergement, string> = {
  aucun: 'Aucun', camping: 'Camping', chambre: 'Chambre', 'a-discuter': 'À discuter',
};
const TRANSPORT_LABEL: Record<ModeTransport, string> = {
  aucun: 'Aucun', forfait: 'Forfait', kilometrage: 'Kilométrage',
};

function versInput(a: Animation): AnimationInput {
  const { id, createdAt, updatedAt, ...reste } = a;
  void id; void createdAt; void updatedAt;
  return reste;
}

function badgeCompte(courriel: string, comptes: Map<string, AppUser> | null): React.ReactNode {
  if (!comptes) return null;
  const c = courriel.trim().toLowerCase();
  if (!c) return null;
  const compte = comptes.get(c);
  return compte
    ? <Badge tone="accepted">Compte FMM · {compte.displayName || compte.email}</Badge>
    : <Badge tone="neutral">Pas de compte</Badge>;
}

const Bloc: React.FC<{ titre: string; icone: React.ComponentType<{ size?: number }>; children: React.ReactNode }> = ({ titre, icone: Icone, children }) => (
  <section className="pt-5 mt-5 border-t first:mt-0 first:pt-0 first:border-0" style={{ borderColor: 'var(--admin-line)' }}>
    <p className="font-display title-medieval text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
      <Icone size={15} /> {titre}
    </p>
    <div className="space-y-4">{children}</div>
  </section>
);

const Grid2: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="grid sm:grid-cols-2 gap-4">{children}</div>;

const Champ: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <label className={`block ${className ?? ''}`}><Label>{label}</Label>{children}</label>
);

const Pilule: React.FC<{ actif: boolean; onClick: () => void; children: React.ReactNode }> = ({ actif, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={`font-sans text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-card border transition ${
      actif ? 'bg-brass/15 border-brass/40 text-brass' : 'border-dashed border-ivory-soft/20 text-ivory-soft/50 hover:border-brass/30'
    }`}>
    {children}
  </button>
);

const numOrUndef = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

export interface AnimationFicheProps {
  animation: Animation;
  isNew?: boolean;
  comptes: Map<string, AppUser> | null;
  onSave: (patch: AnimationInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onPublier: (a: Animation) => Promise<string>;
  onRetirer: (a: Animation) => Promise<string>;
  onCancel?: () => void;
}

const AnimationFiche: React.FC<AnimationFicheProps> = ({
  animation, isNew = false, comptes, onSave, onDelete, onPublier, onRetirer, onCancel,
}) => {
  const [draft, setDraft] = useState<Animation>(animation);
  useEffect(() => { setDraft(animation); }, [animation.id]);

  const [busy, setBusy] = useState(false);
  const [busyPub, setBusyPub] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultatPub, setResultatPub] = useState<string | null>(null);
  const [confirmerSuppr, setConfirmerSuppr] = useState(false);
  const [publieesCompte, setPublieesCompte] = useState<number | null>(null);

  useEffect(() => {
    if (isNew) { setPublieesCompte(0); return; }
    let vivant = true;
    compterPubliees([animation]).then((m) => { if (vivant) setPublieesCompte(m[animation.id] ?? 0); }).catch(() => {});
    return () => { vivant = false; };
  }, [animation, isNew]);

  const upd = (patch: Partial<Animation>) => setDraft((d) => ({ ...d, ...patch }));

  const enregistrer = async () => {
    setBusy(true); setErreur(null);
    try { await onSave(versInput(draft)); }
    catch (e) { console.warn('[AnimationFiche] enregistrement échoué', e); setErreur('Échec de l’enregistrement de la fiche.'); }
    finally { setBusy(false); }
  };

  const supprimer = async () => {
    setBusy(true); setErreur(null);
    try { await onDelete(); }
    catch (e) { console.warn('[AnimationFiche] suppression échouée', e); setErreur('Échec de la suppression.'); }
    finally { setBusy(false); }
  };

  const publier = async () => {
    setBusyPub(true); setErreur(null); setResultatPub(null);
    try {
      await onSave(versInput(draft));
      const phrase = await onPublier(draft);
      upd({ statut: 'publiee' });
      setResultatPub(phrase);
      compterPubliees([draft]).then((m) => setPublieesCompte(m[draft.id] ?? 0)).catch(() => {});
    } catch (e) {
      console.warn('[AnimationFiche] publication échouée', e);
      setErreur('Échec de la publication à l’horaire.');
    } finally { setBusyPub(false); }
  };

  const retirer = async () => {
    setBusyPub(true); setErreur(null); setResultatPub(null);
    try {
      const phrase = await onRetirer(draft);
      upd({ statut: 'confirmee' });
      setResultatPub(phrase);
      setPublieesCompte(0);
    } catch (e) {
      console.warn('[AnimationFiche] retrait échoué', e);
      setErreur('Échec du retrait de l’horaire.');
    } finally { setBusyPub(false); }
  };

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusyPhoto(true); setErreur(null);
    try { upd({ photoUrl: await televerserPhotoAnimation(draft.id, file) }); }
    catch (e) { console.warn('[AnimationFiche] téléversement de la photo échoué', e); setErreur('Échec du téléversement de la photo.'); }
    finally { setBusyPhoto(false); }
  };

  const ajouterCreneau = () => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `creneau-${draft.creneaux.length}-${draft.id}`;
    upd({ creneaux: [...draft.creneaux, { id, jour: 'vendredi', heure: '', titre: '', lieu: '' }] });
  };
  const majCreneau = (id: string, patch: Partial<Animation['creneaux'][number]>) =>
    upd({ creneaux: draft.creneaux.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const retirerCreneau = (id: string) => upd({ creneaux: draft.creneaux.filter((c) => c.id !== id) });

  const blocage = raisonDeBlocage(draft);
  const totalPassages = draft.creneaux.length;
  const compteCourriel = badgeCompte(draft.courriel, comptes);

  return (
    <div>
      {erreur && <p className="text-sm mb-4 px-3 py-2 rounded-card border border-blush/40 bg-blush/8 text-blush">{erreur}</p>}

      <Bloc titre="Qui vient" icone={Users2}>
        <Grid2>
          <Champ label="Nom de l’animation"><Input value={draft.nom} onChange={(e) => upd({ nom: e.target.value })} placeholder="Ex. : Troupe des Loups d’Hiver" /></Champ>
          <Champ label="Type">
            <select value={draft.type} onChange={(e) => upd({ type: e.target.value as Animation['type'] })} className="admin-input w-full">
              {TYPES_ANIMATION.map((t) => <option key={t.id} value={t.id}>{t.FR}</option>)}
            </select>
          </Champ>
        </Grid2>
        <Champ label="Statut" className="sm:w-64">
          <select value={draft.statut} onChange={(e) => upd({ statut: e.target.value as Animation['statut'] })} className="admin-input w-full">
            {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.FR}</option>)}
          </select>
        </Champ>
        <Grid2>
          <Champ label="Personne-ressource"><Input value={draft.contactNom} onChange={(e) => upd({ contactNom: e.target.value })} placeholder="Nom du contact" /></Champ>
          <Champ label="Courriel">
            <Input type="email" value={draft.courriel} onChange={(e) => upd({ courriel: e.target.value })} placeholder="contact@exemple.com" />
            {compteCourriel && <div className="mt-1.5">{compteCourriel}</div>}
          </Champ>
        </Grid2>
        <Grid2>
          <Champ label="Téléphone"><Input value={draft.telephone} onChange={(e) => upd({ telephone: e.target.value })} placeholder="514 555-0100" /></Champ>
          <Champ label="Site web"><Input type="url" value={draft.siteWeb ?? ''} onChange={(e) => upd({ siteWeb: e.target.value || undefined })} placeholder="https://…" /></Champ>
        </Grid2>
        <Grid2>
          <Champ label="Réseaux sociaux"><Input value={draft.reseaux ?? ''} onChange={(e) => upd({ reseaux: e.target.value || undefined })} placeholder="@troupe sur Instagram" /></Champ>
          <Champ label="Provenance"><Input value={draft.provenance ?? ''} onChange={(e) => upd({ provenance: e.target.value || undefined })} placeholder="Ville, région" /></Champ>
        </Grid2>
        <Champ label="Nombre de personnes" className="sm:w-48">
          <Input type="number" min={0} value={draft.nbPersonnes ?? ''} onChange={(e) => upd({ nbPersonnes: numOrUndef(e.target.value) })} />
        </Champ>
      </Bloc>

      <Bloc titre="Ce qui paraît au programme" icone={ClipboardCheck}>
        <div className="grid sm:grid-cols-[160px_1fr] gap-4 items-start">
          <label className="relative block w-full aspect-[4/3] rounded-card border-2 border-dashed border-ivory-soft/20 bg-midnight-deep/40 cursor-pointer overflow-hidden hover:border-brass transition">
            {draft.photoUrl
              ? <img src={draft.photoUrl} alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center text-ivory-soft/30"><ImagePlus size={22} /></div>}
            {busyPhoto && <div className="absolute inset-0 bg-midnight-deep/60 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-t-transparent border-brass animate-spin" /></div>}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
          </label>
          <Champ label="Adresse de la photo"><Input value={draft.photoUrl ?? ''} onChange={(e) => upd({ photoUrl: e.target.value || undefined })} placeholder="https://…" /></Champ>
        </div>
        <Champ label="Description (français)"><Textarea rows={3} value={draft.descriptionFR} onChange={(e) => upd({ descriptionFR: e.target.value })} placeholder="Ce que le public voit et vit" /></Champ>
        <Champ label="Description (anglais)"><Textarea rows={3} value={draft.descriptionEN} onChange={(e) => upd({ descriptionEN: e.target.value })} placeholder="What visitors see and experience" /></Champ>
      </Bloc>

      <Bloc titre="Sur le terrain" icone={Tent}>
        <div>
          <Label>Jours de présence</Label>
          <div className="flex flex-wrap gap-2">
            {JOURS.map((j) => (
              <Pilule key={j.id} actif={draft.jours.includes(j.id)}
                onClick={() => upd({ jours: draft.jours.includes(j.id) ? draft.jours.filter((x) => x !== j.id) : [...draft.jours, j.id] })}>
                {j.FR}
              </Pilule>
            ))}
          </div>
        </div>
        <Grid2>
          <Champ label="Espace requis"><Input value={draft.espaceRequis ?? ''} onChange={(e) => upd({ espaceRequis: e.target.value || undefined })} placeholder="Ex. : 10 m × 10 m, ombragé" /></Champ>
          <Champ label="Montage et arrivée"><Input value={draft.montage ?? ''} onChange={(e) => upd({ montage: e.target.value || undefined })} placeholder="Jour et heure d’arrivée souhaités" /></Champ>
        </Grid2>
        <Grid2>
          <Champ label="Électricité"><Input value={draft.electricite ?? ''} onChange={(e) => upd({ electricite: e.target.value || undefined })} placeholder="Ex. : une prise 15A" /></Champ>
          <Champ label="Son"><Input value={draft.son ?? ''} onChange={(e) => upd({ son: e.target.value || undefined })} placeholder="Sonorisation demandée" /></Champ>
        </Grid2>
        <div className="flex flex-wrap gap-6">
          <ToggleSwitch checked={draft.eau} onChange={(v) => upd({ eau: v })} label="Point d’eau" />
          <ToggleSwitch checked={draft.feu} onChange={(v) => upd({ feu: v })} label="Feu ou flamme" />
        </div>
        <Champ label="Sécurité"><Input value={draft.securite ?? ''} onChange={(e) => upd({ securite: e.target.value || undefined })} placeholder="Ex. : périmètre pour la joute" /></Champ>
        <Grid2>
          <Champ label="Hébergement">
            <select value={draft.hebergement} onChange={(e) => upd({ hebergement: e.target.value as ModeHebergement })} className="admin-input w-full">
              {(Object.keys(HEBERGEMENT_LABEL) as ModeHebergement[]).map((m) => <option key={m} value={m}>{HEBERGEMENT_LABEL[m]}</option>)}
            </select>
          </Champ>
          <Champ label="Nombre de campeurs"><Input type="number" min={0} value={draft.nbCampeurs ?? ''} onChange={(e) => upd({ nbCampeurs: numOrUndef(e.target.value) })} /></Champ>
        </Grid2>
        <Grid2>
          <Champ label="Repas par jour"><Input type="number" min={0} value={draft.repasParJour ?? ''} onChange={(e) => upd({ repasParJour: numOrUndef(e.target.value) })} /></Champ>
          <Champ label="Véhicules"><Input type="number" min={0} value={draft.vehicules ?? ''} onChange={(e) => upd({ vehicules: numOrUndef(e.target.value) })} /></Champ>
        </Grid2>
        <Champ label="Besoins particuliers"><Textarea rows={2} value={draft.besoinsParticuliers ?? ''} onChange={(e) => upd({ besoinsParticuliers: e.target.value || undefined })} /></Champ>
      </Bloc>

      <Bloc titre="L’argent" icone={Wallet}>
        <Grid2>
          <Champ label="Cachet"><Input type="number" min={0} step="0.01" value={draft.cachet ?? ''} onChange={(e) => upd({ cachet: numOrUndef(e.target.value) })} /></Champ>
          <Champ label="Dépôt"><Input type="number" min={0} step="0.01" value={draft.depot ?? ''} onChange={(e) => upd({ depot: numOrUndef(e.target.value) })} /></Champ>
        </Grid2>
        <Champ label="Note sur le cachet"><Input value={draft.cachetNote ?? ''} onChange={(e) => upd({ cachetNote: e.target.value || undefined })} placeholder="Ce qui a été entendu" /></Champ>
        <Champ label="Mode de transport" className="sm:w-64">
          <select value={draft.transportMode} onChange={(e) => upd({ transportMode: e.target.value as ModeTransport })} className="admin-input w-full">
            {(Object.keys(TRANSPORT_LABEL) as ModeTransport[]).map((m) => <option key={m} value={m}>{TRANSPORT_LABEL[m]}</option>)}
          </select>
        </Champ>
        {draft.transportMode === 'forfait' && (
          <Champ label="Forfait de transport" className="sm:w-64"><Input type="number" min={0} step="0.01" value={draft.transportForfait ?? ''} onChange={(e) => upd({ transportForfait: numOrUndef(e.target.value) })} /></Champ>
        )}
        {draft.transportMode === 'kilometrage' && (
          <Grid2>
            <Champ label="Kilomètres"><Input type="number" min={0} value={draft.transportKm ?? ''} onChange={(e) => upd({ transportKm: numOrUndef(e.target.value) })} /></Champ>
            <Champ label="Taux au kilomètre"><Input type="number" min={0} step="0.01" value={draft.transportTauxKm ?? ''} onChange={(e) => upd({ transportTauxKm: numOrUndef(e.target.value) })} /></Champ>
          </Grid2>
        )}
        <Champ label="Note sur le transport"><Input value={draft.transportNote ?? ''} onChange={(e) => upd({ transportNote: e.target.value || undefined })} /></Champ>
        <div className="flex flex-wrap gap-6">
          <ToggleSwitch checked={draft.repasFournis} onChange={(v) => upd({ repasFournis: v })} label="Repas fournis" />
          <ToggleSwitch checked={draft.hebergementFourni} onChange={(v) => upd({ hebergementFourni: v })} label="Hébergement fourni" />
        </div>
        <Grid2>
          <Champ label="Mode de paiement"><Input value={draft.modePaiement ?? ''} onChange={(e) => upd({ modePaiement: e.target.value || undefined })} placeholder="Virement, chèque…" /></Champ>
          <Champ label="Payé le"><Input type="date" value={draft.payeLe ?? ''} onChange={(e) => upd({ payeLe: e.target.value || undefined })} /></Champ>
        </Grid2>
        <div className="rounded-card border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center" style={{ borderColor: 'var(--admin-line)', background: 'rgba(196,214,230,0.03)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-mute)' }}>Transport</p>
            <p className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>{enDollars(coutTransport(draft))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-mute)' }}>Cachet</p>
            <p className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>{enDollars(draft.cachet ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-mute)' }}>Total</p>
            <p className="font-display title-medieval text-lg text-brass">{enDollars(coutTotal(draft))}</p>
          </div>
        </div>
      </Bloc>

      <Bloc titre="Les passages" icone={CalendarClock}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left">
                {['Jour', 'Heure', 'Titre', 'Lieu', ''].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-sans text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.creneaux.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--admin-line)' }}>
                  <td className="py-2 pr-3">
                    <select value={c.jour} onChange={(e) => majCreneau(c.id, { jour: e.target.value as JourFestival })} className="admin-input">
                      {JOURS.map((j) => <option key={j.id} value={j.id}>{j.FR}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3"><Input value={c.heure} onChange={(e) => majCreneau(c.id, { heure: e.target.value })} placeholder="14h00" className="w-28" /></td>
                  <td className="py-2 pr-3"><Input value={c.titre} onChange={(e) => majCreneau(c.id, { titre: e.target.value })} placeholder={draft.nom || 'Titre à l’horaire'} /></td>
                  <td className="py-2 pr-3"><Input value={c.lieu} onChange={(e) => majCreneau(c.id, { lieu: e.target.value })} placeholder="Arène, Village…" /></td>
                  <td className="py-2">
                    <button type="button" onClick={() => retirerCreneau(c.id)} title="Retirer" className="p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <GhostButton type="button" onClick={ajouterCreneau}><Plus size={12} /> Ajouter un passage</GhostButton>
      </Bloc>

      <Bloc titre="Les confirmations" icone={ClipboardCheck}>
        <div className="space-y-3">
          {CONFIRMATIONS.map((c) => (
            <label key={c.id} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={draft.confirmations[c.id]}
                onChange={(e) => upd({ confirmations: { ...draft.confirmations, [c.id]: e.target.checked } })}
                className="mt-1 accent-brass w-4 h-4" />
              <span>
                <span className="block text-sm" style={{ color: 'var(--admin-text)' }}>{c.FR}</span>
                <span className="block text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.aide}</span>
              </span>
            </label>
          ))}
        </div>
      </Bloc>

      <Bloc titre="Notes internes" icone={StickyNote}>
        <Textarea rows={3} value={draft.notes ?? ''} onChange={(e) => upd({ notes: e.target.value || undefined })} placeholder="Réservé à l’équipe, ne paraît jamais au programme" />
      </Bloc>

      <section className="pt-5 mt-5 border-t" style={{ borderColor: 'var(--admin-line)' }}>
        <div className="rounded-card border p-4" style={{ borderColor: 'var(--admin-accent-line)', background: 'color-mix(in oklab, var(--admin-accent), transparent 94%)' }}>
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--admin-accent)' }}>
            <Music size={12} /> Publication à l’horaire
          </p>
          {draft.statut === 'publiee' ? (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--admin-text)' }}>
                {(publieesCompte ?? 0)} passage{(publieesCompte ?? 0) === 1 ? '' : 's'} sur {totalPassages} figure{(publieesCompte ?? 0) === 1 ? '' : 'nt'} à l’horaire public en ce moment.
              </p>
              <DangerButton type="button" onClick={retirer} disabled={busyPub}>{busyPub ? 'Retrait…' : 'Retirer de l’horaire'}</DangerButton>
            </>
          ) : (
            <>
              <PrimaryButton type="button" onClick={publier} disabled={busyPub || busy || !!blocage}>{busyPub ? 'Publication…' : 'Publier à l’horaire'}</PrimaryButton>
              {blocage && <p className="text-xs mt-2" style={{ color: 'var(--admin-text-mute)' }}>{blocage}</p>}
            </>
          )}
          {resultatPub && <p className="text-xs mt-3" style={{ color: 'var(--admin-accent)' }}>{resultatPub}</p>}
          <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            L’horaire déjà publié se relit et se corrige dans la section Horaire, pas ici.
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-5 mt-5 border-t" style={{ borderColor: 'var(--admin-line)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {isNew ? (
            onCancel && <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
          ) : confirmerSuppr ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Supprimer cette fiche pour de bon ?</span>
              <DangerButton type="button" onClick={supprimer} disabled={busy}>Oui, supprimer</DangerButton>
              <GhostButton type="button" onClick={() => setConfirmerSuppr(false)}>Annuler</GhostButton>
            </div>
          ) : (
            <GhostButton type="button" onClick={() => setConfirmerSuppr(true)}>Supprimer</GhostButton>
          )}
        </div>
        <PrimaryButton type="button" onClick={enregistrer} disabled={busy || busyPub}>{busy ? 'Enregistrement…' : isNew ? 'Créer la fiche' : 'Enregistrer'}</PrimaryButton>
      </div>
    </div>
  );
};

export default AnimationFiche;
