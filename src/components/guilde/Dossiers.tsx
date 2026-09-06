import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, ExternalLink, FileArchive, FileImage, FileSpreadsheet, FileText, Folder, HardDrive,
  Loader2, Presentation, Trash2, Upload, X, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import Repliable from '../compte/Repliable';
import { lireFiche } from '../../firebase/ordre';
import { FORMES_GUILDE, modifierGuilde, motDeLaForme, type Guilde } from '../../firebase/guildes';
import {
  suivreDocuments, televerser, supprimer, idDossierDrive, lienEmbedDrive, lienDossierDrive,
  DOSSIER_DEFAUT, LONGUEUR_MAX_DOSSIER, ACCEPT_DOCUMENTS, POIDS_MAX_DOCUMENT,
  type DocumentGuilde,
} from '../../firebase/guildeDocuments';

// ─── Les dossiers du groupe ──────────────────────────────────────────
// Addendum 2 du 6 septembre 2026, ordres 13 et 14. Deux régions, l'une
// sous l'autre, en pleine largeur. D'abord l'espace Drive commun : le
// dossier partagé du groupe, montré tel quel dans une iframe, avec le
// lien pour l'ouvrir dans Drive et, pour les chefs, le bouton qui le
// relie ou le change. Puis les documents déposés ici même : le panneau
// de dépôt collant sur quatre colonnes, les dossiers en accordéon sur
// huit, chaque fichier avec son icône, son poids, son auteur et sa
// date. Un membre efface les siens; un chef ou l'équipe efface tout.

export interface DossiersProps { guilde: Guilde; uid: string | null; estChef: boolean; peutGerer?: boolean }

const ROUILLE = '#E08A6E';
const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};
const sourdine = { color: 'rgba(var(--sk-parchment-rgb),0.5)' };

const iconeDe = (ct: string): LucideIcon =>
  ct.startsWith('image/') ? FileImage
    : ct === 'application/zip' ? FileArchive
    : ct.includes('spreadsheet') ? FileSpreadsheet
    : ct.includes('presentation') ? Presentation
    : FileText;

const formatOctets = (n: number, fr: boolean): string =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1)} ${fr ? 'Mo' : 'MB'}`
    : `${Math.max(1, Math.round(n / 1024))} ${fr ? 'Ko' : 'KB'}`;

const quand = (d: DocumentGuilde, fr: boolean): string => {
  const ms = d.creeLe?.toMillis?.();
  if (!ms) return fr ? 'à l’instant' : 'just now';
  return new Date(ms).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** « le clan » et « du clan », « la guilde » et « de la guilde »,
 *  « l’ordre » et « de l’ordre ». */
const articles = (forme: Guilde['forme']): { le: string; du: string } => {
  const f = FORMES_GUILDE.find((x) => x.id === (forme || 'guilde')) || FORMES_GUILDE[0];
  const mot = f.FR.toLowerCase();
  if (/^[aeiouéè]/.test(mot)) return { le: `l’${mot}`, du: `de l’${mot}` };
  return f.articleFR === 'une' ? { le: `la ${mot}`, du: `de la ${mot}` } : { le: `le ${mot}`, du: `du ${mot}` };
};

const boutonPlein = 'inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50';
const boutonCreux = 'inline-flex items-center gap-2 px-4 py-2 font-sans text-[11px] uppercase tracking-wider text-ivory-soft hover:text-brass transition rounded-card disabled:opacity-50';
const bordCreux = { border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' };

const Dossiers: React.FC<DossiersProps> = ({ guilde, uid, estChef, peutGerer }) => {
  const { lang } = useUI();
  const { isAdmin } = useAuth();
  const fr = lang === 'FR';
  const gere = peutGerer ?? (estChef || isAdmin);
  const estMembre = !!uid && guilde.membres.includes(uid);

  const [docs, setDocs] = useState<DocumentGuilde[]>([]);
  useEffect(() => (estMembre ? suivreDocuments(guilde.id, setDocs) : undefined), [guilde.id, estMembre]);

  if (!estMembre || !uid) {
    return (
      <section className="glass-light rounded-lg-card p-6 md:p-8">
        <p className="font-editorial text-base text-ivory-soft leading-relaxed">
          {fr
            ? `Ce panneau se lit entre membres. Entrez dans ${articles(guilde.forme).le} pour l’ouvrir.`
            : 'This panel is read among members. Join the group to open it.'}
        </p>
      </section>
    );
  }

  // Les documents arrivent déjà triés par dossier : on les regroupe
  // dans l'ordre, sans rien retrier.
  const parDossier = new Map<string, DocumentGuilde[]>();
  for (const d of docs) parDossier.set(d.dossier, [...(parDossier.get(d.dossier) || []), d]);
  const nomsDossiers = [...parDossier.keys()];

  return (
    <div className="space-y-5">
      <Drive guilde={guilde} gere={gere} fr={fr} />

      <div className="grid gap-5 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 lg:order-2 lg:sticky lg:top-24">
          <Depot guildeId={guilde.id} uid={uid} dossiers={nomsDossiers} fr={fr} />
        </div>

        <div className="lg:col-span-8 space-y-4">
          <p className="witcher-stat-label inline-flex items-center gap-2">
            <Folder size={12} />
            {fr ? `Les documents ${articles(guilde.forme).du}` : `${motDeLaForme(guilde.forme, 'EN')} documents`} ({docs.length})
          </p>
          {docs.length === 0 ? (
            <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
              {fr
                ? 'Aucun document pour l’instant. Le premier que vous déposez ouvre le dossier « Général ».'
                : 'No documents yet. The first one you drop opens the “Général” folder.'}
            </p>
          ) : nomsDossiers.map((nom) => {
            const lignes = parDossier.get(nom) || [];
            return (
              <Repliable key={nom} id={`guilde-${guilde.id}-${nom}`} titre={nom} icone={<Folder size={16} />} resume={String(lignes.length)}>
                <ul className="space-y-1.5">
                  {lignes.map((d) => (
                    <Ligne
                      key={d.id} d={d} guildeId={guilde.id} lang={lang}
                      peutSupprimer={d.uid === uid || gere}
                    />
                  ))}
                </ul>
              </Repliable>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── L'espace Drive commun ───────────────────────────────────────────
const Drive: React.FC<{ guilde: Guilde; gere: boolean; fr: boolean }> = ({ guilde, gere, fr }) => {
  const id = guilde.driveUrl ? idDossierDrive(guilde.driveUrl) : null;
  const [edition, setEdition] = useState(false);
  const [lien, setLien] = useState(guilde.driveUrl || '');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const titre = fr ? 'L’espace Drive commun' : 'The shared Drive space';

  const fermer = () => { setEdition(false); setErreur(null); setLien(guilde.driveUrl || ''); };

  const enregistrer = async () => {
    const nouvelId = idDossierDrive(lien);
    if (!nouvelId) {
      setErreur(fr
        ? 'Ce lien ne mène pas à un dossier Drive. Ouvrez le dossier dans Drive, cliquez sur « Partager », puis copiez le lien.'
        : 'This link does not lead to a Drive folder. Open the folder in Drive, click “Share”, then copy the link.');
      return;
    }
    setBusy(true); setErreur(null);
    try {
      await modifierGuilde(guilde.id, { driveUrl: lienDossierDrive(nouvelId) });
      setEdition(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const formulaire = (
    <div>
      <label className="block">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Le lien du dossier partagé' : 'The shared folder link'}</span>
        <input
          value={lien} onChange={(e) => { setLien(e.target.value); setErreur(null); }} inputMode="url"
          placeholder="https://drive.google.com/drive/folders/…"
          onKeyDown={(e) => { if (e.key === 'Enter') void enregistrer(); }}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
          style={champ}
        />
      </label>
      <p className="font-sans text-[11px] mt-1.5" style={sourdine}>
        {fr
          ? 'Le dossier doit être partagé à « Toute personne disposant du lien », sinon les membres verront une page vide.'
          : 'The folder must be shared with “Anyone with the link”, or members will see an empty page.'}
      </p>
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button type="button" onClick={enregistrer} disabled={busy || !lien.trim()} className={boutonPlein}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {fr ? 'Enregistrer' : 'Save'}
        </button>
        {id && (
          <button type="button" onClick={fermer} className={boutonCreux} style={bordCreux}>
            {fr ? 'Annuler' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );

  if (id) {
    return (
      <section className="glass-light rounded-lg-card overflow-hidden">
        <div className="flex items-center gap-3 flex-wrap px-5 md:px-6 py-4">
          <p className="witcher-stat-label inline-flex items-center gap-2"><HardDrive size={12} /> {titre}</p>
          <span className="ml-auto inline-flex items-center gap-2 flex-wrap">
            <a
              href={lienDossierDrive(id)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-[11px] uppercase tracking-wider transition rounded-card"
            >
              <ExternalLink size={12} /> {fr ? 'Ouvrir dans Drive' : 'Open in Drive'}
            </a>
            {gere && (
              <button type="button" onClick={() => (edition ? fermer() : setEdition(true))} className={boutonCreux} style={bordCreux}>
                {fr ? 'Changer le Drive' : 'Change the Drive'}
              </button>
            )}
          </span>
        </div>
        {edition && gere && <div className="px-5 md:px-6 pb-5">{formulaire}</div>}
        <iframe
          src={lienEmbedDrive(id)} title={titre} loading="lazy"
          className="block w-full border-0 bg-white"
          style={{ height: 'min(70vh, 640px)', minHeight: 360 }}
        />
      </section>
    );
  }

  if (!gere) {
    return (
      <p className="font-sans text-[12px] inline-flex items-center gap-2" style={sourdine}>
        <HardDrive size={12} /> {fr ? 'Aucun espace Drive n’est encore relié au groupe.' : 'No Drive space is linked to the group yet.'}
      </p>
    );
  }

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6" style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.28)' }}>
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        <div className="lg:col-span-5">
          <p className="witcher-stat-label inline-flex items-center gap-2 mb-2"><HardDrive size={12} /> {titre}</p>
          <h3 className="font-display text-2xl text-ivory leading-snug">{fr ? 'Ajoutez votre Drive' : 'Add your Drive'}</h3>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed mt-2">
            {fr
              ? 'Si le groupe range déjà ses affaires dans un dossier Google Drive, collez le lien de partage : le dossier s’affichera ici, pour tous les membres.'
              : 'If the group already keeps its things in a Google Drive folder, paste the sharing link: the folder will show up here for every member.'}
          </p>
        </div>
        <div className="lg:col-span-7">
          {edition ? formulaire : (
            <button type="button" onClick={() => setEdition(true)} className={boutonPlein}>
              <HardDrive size={13} /> {fr ? 'Ajouter votre Drive' : 'Add your Drive'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Un document ─────────────────────────────────────────────────────
// Retirer demande deux clics, comme le renvoi d'un membre : le premier
// ouvre la question, le second tranche.
const Ligne: React.FC<{ d: DocumentGuilde; guildeId: string; lang: 'FR' | 'EN'; peutSupprimer: boolean }> = ({
  d, guildeId, lang, peutSupprimer,
}) => {
  const fr = lang === 'FR';
  const Icone = iconeDe(d.contentType);
  const [confirme, setConfirme] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const retirer = async () => {
    setBusy(true); setErreur(null);
    try { await supprimer(guildeId, d); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); setBusy(false); setConfirme(false); }
  };

  const petit = 'inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider transition rounded-card disabled:opacity-40';

  return (
    <li
      className="flex items-center gap-3 px-3 py-2 rounded-card flex-wrap"
      style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}
    >
      <Icone size={18} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />
      <a
        href={d.fichierUrl} target="_blank" rel="noopener noreferrer"
        className="min-w-[200px] flex-1 group"
        aria-label={fr ? `Télécharger ${d.titre}` : `Download ${d.titre}`}
      >
        <span className="block font-sans text-sm text-ivory truncate group-hover:text-brass transition-colors">{d.titre}</span>
        <span className="block font-sans text-[10px] text-ivory-soft/45">{formatOctets(d.taille, fr)} · {quand(d, fr)}</span>
      </a>
      <Link
        to={`${addLocale('/profil', lang)}/${d.uid}`}
        className="font-sans text-[11px] truncate max-w-[160px] hover:text-brass transition-colors"
        style={sourdine}
      >
        {d.nom}
      </Link>
      {peutSupprimer && (
        <span className="shrink-0 flex items-center gap-1.5">
          {confirme ? (
            <>
              <span className="font-sans text-[11px]" style={{ color: ROUILLE }}>{fr ? 'Retirer ?' : 'Remove?'}</span>
              <button type="button" disabled={busy} onClick={retirer} className={`${petit} bg-[#E08A6E] text-midnight-deep hover:opacity-90`}>
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {fr ? 'Oui' : 'Yes'}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirme(false)} className={`${petit} text-ivory-soft hover:text-ivory`} style={bordCreux}>
                {fr ? 'Non' : 'No'}
              </button>
            </>
          ) : (
            <button
              type="button" onClick={() => setConfirme(true)} aria-label={fr ? 'Retirer le document' : 'Remove the document'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </span>
      )}
      {erreur && <p role="alert" className="w-full font-sans text-xs mt-1" style={{ color: ROUILLE }}>{erreur}</p>}
    </li>
  );
};

// ─── Le dépôt ────────────────────────────────────────────────────────
const NOUVEAU = '__nouveau__';

const Depot: React.FC<{ guildeId: string; uid: string; dossiers: string[]; fr: boolean }> = ({ guildeId, uid, dossiers, fr }) => {
  const { user } = useAuth();
  const [choix, setChoix] = useState(DOSSIER_DEFAUT);
  const [nouveau, setNouveau] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const entree = useRef<HTMLInputElement>(null);

  const options = dossiers.includes(DOSSIER_DEFAUT) ? dossiers : [DOSSIER_DEFAUT, ...dossiers];
  const dossier = choix === NOUVEAU ? nouveau.trim() : choix;
  const pret = !!fichier && dossier.length > 0;

  const choisirFichier = (f: File | null) => {
    if (!f) return;
    if (f.size >= POIDS_MAX_DOCUMENT) { setErreur(fr ? 'Le fichier dépasse 25 Mo.' : 'The file is over 25 MB.'); return; }
    setErreur(null); setFait(null); setFichier(f);
  };

  const envoyer = async () => {
    if (!fichier) return;
    setEnvoi(true); setErreur(null); setFait(null); setProgression(0);
    try {
      const fiche = await lireFiche(uid).catch(() => null);
      await televerser(
        guildeId,
        { uid, nom: fiche?.nom || user?.displayName || (fr ? 'Un inconnu' : 'A stranger') },
        fichier, dossier, setProgression,
      );
      setFichier(null);
      if (choix === NOUVEAU) { setChoix(dossier); setNouveau(''); }
      setFait(fr ? 'Le document est rangé.' : 'The document is filed.');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); setProgression(0); }
  };

  const IconeChoisie = fichier ? iconeDe(fichier.type || '') : Upload;

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
      <p className="witcher-stat-label inline-flex items-center gap-2 mb-1.5"><Upload size={12} /> {fr ? 'Déposer un document' : 'Drop a document'}</p>
      <p className="font-sans text-[11px] mb-4" style={sourdine}>
        {fr
          ? 'Un PDF, une image, un document Office, un texte ou un zip passent, jusqu’à 25 Mo. Seuls les membres le voient.'
          : 'A PDF, an image, an Office document, a text file or a zip will do, up to 25 MB. Only members see it.'}
      </p>

      <label className="block mb-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Dossier' : 'Folder'}</span>
        <select
          value={choix} onChange={(e) => { setChoix(e.target.value); setFait(null); }}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory"
          style={champ}
        >
          {options.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value={NOUVEAU}>{fr ? 'Nouveau dossier…' : 'New folder…'}</option>
        </select>
      </label>

      {choix === NOUVEAU && (
        <label className="block mb-3">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Le nom du dossier' : 'Folder name'}</span>
          <input
            value={nouveau} onChange={(e) => setNouveau(e.target.value.slice(0, LONGUEUR_MAX_DOSSIER))}
            placeholder={fr ? 'Chants de la veillée' : 'Evening songs'}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
            style={champ}
          />
        </label>
      )}

      <button
        type="button" onClick={() => entree.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); choisirFichier(e.dataTransfer.files?.[0] || null); }}
        className="w-full rounded-card px-4 py-6 text-center font-sans text-[12px] text-ivory-soft hover:text-brass transition-colors"
        style={{ border: '1px dashed rgba(var(--sk-gilt-rgb),0.35)', background: 'rgba(0,0,0,0.2)' }}
      >
        <Upload size={16} className="mx-auto mb-2" />
        {fr ? 'Choisissez un fichier ou déposez-le ici.' : 'Pick a file or drop it here.'}
      </button>
      <input
        ref={entree} type="file" accept={ACCEPT_DOCUMENTS} className="sr-only"
        onChange={(e) => { choisirFichier(e.target.files?.[0] || null); e.target.value = ''; }}
      />

      {fichier && (
        <span className="relative mt-3 inline-flex items-center gap-2 max-w-full px-3.5 py-2 pr-10 rounded-card font-sans text-[12px] text-ivory" style={champ}>
          <IconeChoisie size={13} className="shrink-0" style={{ color: 'var(--sk-gilt)' }} />
          <span className="truncate">{fichier.name}</span>
          <span className="shrink-0" style={sourdine}>{formatOctets(fichier.size, fr)}</span>
          <button
            type="button" onClick={() => setFichier(null)} aria-label={fr ? 'Retirer le fichier' : 'Remove file'}
            className="absolute top-1/2 -translate-y-1/2 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(var(--sk-ink-rgb),0.8)', color: 'var(--sk-parchment)' }}
          >
            <X size={13} />
          </button>
        </span>
      )}

      {envoi && progression > 0 && (
        <div
          className="h-1 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(var(--sk-parchment-rgb),0.12)' }}
          role="progressbar" aria-valuenow={Math.round(progression * 100)} aria-valuemin={0} aria-valuemax={100}
        >
          <div className="h-full transition-[width] duration-200" style={{ width: `${Math.round(progression * 100)}%`, background: 'var(--sk-gilt)' }} />
        </div>
      )}

      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}
      {fait && <p className="mt-2 font-sans text-xs" style={{ color: 'var(--sk-gilt)' }}>{fait}</p>}

      <div className="flex justify-end mt-4">
        <button type="button" onClick={envoyer} disabled={envoi || !pret} className={boutonPlein}>
          {envoi ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {fr ? 'Déposer' : 'Upload'}
        </button>
      </div>
    </section>
  );
};

export default Dossiers;
