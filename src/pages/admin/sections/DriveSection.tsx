import React, { useState } from 'react';
import { FolderOpen, ArrowUpRight, ShieldAlert, RefreshCw } from 'lucide-react';

// ─── Le Drive du festival, dans la régie ────────────────────────────
// Alex, 2026-09-02 : « on a un Google Drive avec le festival médiéval,
// pour l'intégrer et être capable de voir les documents qu'on met dans
// le Google Drive sur notre plateforme ».
//
// Ce que Google permet vraiment, mesuré le même jour plutôt que supposé.
// La vue de dossier embarquée et l'aperçu d'un fichier se laissent
// cadrer depuis notre domaine : les deux répondent sans interdire le
// cadrage. Les pages d'ÉDITION, elles, redirigent vers la connexion, et
// cette route interdit le cadrage. Cette section montre donc le Drive
// en lecture, ce qui est exactement ce que Google soutient.
//
// La suite du plan, le sélecteur de fichiers avec le champ d'accès
// `drive.file`, vit dans docs/REGIE-SUITE.md. Elle demande une clé de
// navigateur restreinte et un écran de consentement, deux gestes qui
// appartiennent à Alex.

/** Le dossier racine du festival, donné par Alex le 2026-09-02. */
const DOSSIER = '1n_9ep-iECXTwxBM89fGR5_tQsvjVnhLL';

const vueDossier = (id: string, grille: boolean) =>
  `https://drive.google.com/embeddedfolderview?id=${id}#${grille ? 'grid' : 'list'}`;

const DriveSection: React.FC<{ devBypass?: boolean }> = () => {
  const [grille, setGrille] = useState(true);
  const [cle, setCle] = useState(0);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="witcher-stat-label inline-flex items-center gap-2">
          <FolderOpen size={13} /> Le Drive du festival
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGrille((v) => !v)}
            className="admin-ghost"
          >
            {grille ? 'En liste' : 'En grille'}
          </button>
          <button
            type="button"
            onClick={() => setCle((n) => n + 1)}
            className="admin-ghost inline-flex items-center gap-2"
            title="Recharger la vue du dossier"
          >
            <RefreshCw size={12} /> Recharger
          </button>
          <a
            href={`https://drive.google.com/drive/folders/${DOSSIER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-cta inline-flex items-center gap-2"
          >
            Ouvrir dans Drive <ArrowUpRight size={12} />
          </a>
        </span>
      </header>

      {/* Ce que la régie doit savoir avant de déposer un document ici.
          La vue ne fonctionne que parce que le dossier est partagé « toute
          personne avec le lien peut consulter ». Un registre de bénévoles
          ou une liste de courriels n'a donc rien à y faire. */}
      <p className="admin-card inline-flex items-start gap-2 p-4 text-[13px] leading-relaxed">
        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
        <span>
          Ce dossier est partagé par lien, ce qui est la condition pour qu'il
          paraisse ici. Toute personne qui obtient le lien voit ce qu'il contient,
          donc les renseignements personnels restent hors de ce dossier. Afficher
          cette vue transmet aussi l'adresse du visiteur à Google, ce que la
          politique de confidentialité nomme.
        </span>
      </p>

      <div
        className="rounded-card overflow-hidden"
        style={{ border: '1px solid var(--admin-line)', background: 'rgba(0,0,0,0.35)' }}
      >
        <iframe
          key={cle}
          title="Le Drive du festival"
          src={vueDossier(DOSSIER, grille)}
          className="w-full border-0"
          style={{ height: 620 }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </section>
  );
};

export default DriveSection;
