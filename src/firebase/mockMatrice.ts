// Matrice des rôles & responsabilités 2026 — Caravanes & Saltimbanques
// Reforged v2.0. Each ROLE has a primary holder + tasks. Tasks move
// between roles via drag/drop. New roles + tasks can be added.
// Mutations stay in-memory; wire to Firestore later.
//
// Source: ~/Downloads/matrice_reforgee_2026 (1).md

export type RoleCategory = 'master' | 'lead' | 'coord';

export interface MatriceRole {
  id: string;
  code: string;          // e.g. "MN", "MB", "Lead Parking"
  title: string;         // e.g. "Master Nourriture"
  holder: string;        // person assigned, "TBD" if open
  category: RoleCategory;
  mission?: string;      // one-line mission from the matrix
  note?: string;         // surfaced caveat (double-chapeau, priorité, …)
}

export interface MatriceTask {
  id: string;
  roleId: string;
  label: string;
  order: number;
}

let _roles: MatriceRole[] = [
  { id: 'r-cg',   code: 'CG',   title: 'Coordonnateur Général',     holder: 'Tristan', category: 'coord',
    mission: "Intégration entre les Masters. Vision, échéancier, financement, partenariats stratégiques. Le CG ne doit pas exécuter de fonction Master.",
    note: "Suppléant à désigner pour les jours du festival." },

  { id: 'r-mn',   code: 'MN',   title: 'Master Nourriture',         holder: 'Alex',    category: 'master',
    mission: "Offre alimentaire complète, rentable, conforme.",
    note: "Double-chapeau Alex (MN+MW) — désigner suppléant en pic d'arrivée fournisseurs." },

  { id: 'r-mb',   code: 'MB',   title: 'Master Bar',                holder: 'Arno Geoffroy', category: 'master',
    mission: "Offre de boisson, rentabilité, conformité licence d'alcool (RACJ)." },

  { id: 'r-mben', code: 'MBEN', title: 'Master Bénévole',           holder: 'Maïté',   category: 'master',
    mission: "Recruter, planifier, déployer la force bénévole sur les trois phases (montage, festival, démontage)." },

  { id: 'r-mc',   code: 'MC',   title: 'Master Construction',       holder: 'Mikaël',  category: 'master',
    mission: "Conception physique du site, montage, opérations sur site, démontage." },

  { id: 'r-mk',   code: 'MK',   title: 'Master Kiosque',            holder: 'Jesse',   category: 'master',
    mission: "Partenaires et exposants non-F&B (artisans, ateliers, démonstrations)." },

  { id: 'r-mw',   code: 'MW',   title: 'Master Web',                holder: 'Alex',    category: 'master',
    mission: "Numérique, communication externe, production graphique. Rôle large : 8 sous-fonctions.",
    note: "Charge équivalente à 3-4 fonctions normales — déléguer la sous-fonction médias sociaux à un Lead dédié." },

  { id: 'r-mss',  code: 'MSS',  title: 'Master Scène et Son',       holder: 'Pitch',   category: 'master',
    mission: "Programmation artistique, ingénierie de scène, son live." },

  { id: 'r-mcc',  code: 'MCC',  title: 'Master Care et Cérémonies', holder: 'Océane',  category: 'master',
    mission: "Conception et exécution des cérémonies; gouvernance interne; bien-être de l'équipe." },

  { id: 'r-regi', code: 'Lead', title: 'Régisseur',                 holder: 'Fabien',     category: 'lead',
    mission: "Régie de scène, métronome du run-of-show." },
  { id: 'r-sound',code: 'Lead', title: 'Sound woman',               holder: 'Jesse JO',   category: 'lead',
    mission: "Assistance son sur scène lors des spectacles et soundchecks." },
  { id: 'r-tech', code: 'Lead', title: 'Lead Tech',                 holder: 'Christophe', category: 'lead',
    mission: "Assistance technique scène/son aux côtés du MSS et de la Sound woman." },
  { id: 'r-park', code: 'Lead', title: 'Lead Parking',              holder: 'Clément',    category: 'lead',
    mission: "Stationnement efficace, sûr, scalable." },
  { id: 'r-bill', code: 'Lead', title: 'Lead Billetterie',          holder: 'TBD',        category: 'lead',
    mission: "Roulement rapide des entrées, gestion des contingences." },
  { id: 'r-chev', code: 'Lead', title: 'Lead Chevaux',              holder: 'TBD',        category: 'lead',
    mission: "Sécurité et bien-être équin; séparation des flux humains/équins.",
    note: "À pourvoir en priorité — risque opérationnel élevé." },
  { id: 'r-anim', code: 'Lead', title: 'Animateur',                 holder: 'Sara',       category: 'lead',
    mission: "Voix publique du festival; rythme de la programmation." },
  { id: 'r-camp', code: 'Lead', title: 'Lead Camping',              holder: 'TBD',        category: 'lead',
    mission: "Accueil et gestion du camping festivalier." },
  { id: 'r-entr', code: 'Lead', title: 'Lead Entretien',            holder: 'TBD',        category: 'lead',
    mission: "Propreté du site, vide sanitaire, gestion des matières." },
  { id: 'r-secu', code: 'Lead', title: 'Lead Sécurité',             holder: 'TBD',        category: 'lead',
    mission: "Sécurité des personnes; prévention; intervention de premier niveau.",
    note: "PRIORITÉ ABSOLUE — ne doit pas rester à pourvoir au-delà de mai (P1)." },
  { id: 'r-tour', code: 'Lead', title: 'Lead Tournoi',              holder: 'Patrice',    category: 'lead',
    mission: "Conception, règles et déroulement du tournoi." },
];

let _tasks: MatriceTask[] = [
  // ── Coordonnateur Général (Tristan) ──────────────────────────────
  // Périmètre nettoyé : exécution déplacée vers MC / MK.
  { id: 't-cg-1',  roleId: 'r-cg', label: 'Recherche et gestion des subventions', order: 0 },
  { id: 't-cg-2',  roleId: 'r-cg', label: 'Création et tenue à jour du budget consolidé', order: 1 },
  { id: 't-cg-3',  roleId: 'r-cg', label: "Création et maintien de l'échéancier maître", order: 2 },
  { id: 't-cg-4',  roleId: 'r-cg', label: 'Suivi des dossiers transversaux', order: 3 },
  { id: 't-cg-5',  roleId: 'r-cg', label: 'Communications stratégiques avec les partenaires institutionnels', order: 4 },
  { id: 't-cg-6',  roleId: 'r-cg', label: 'Supervision des Masters et arbitrage inter-équipes', order: 5 },
  { id: 't-cg-7',  roleId: 'r-cg', label: 'Approbation finale des engagements financiers', order: 6 },
  { id: 't-cg-8',  roleId: 'r-cg', label: "Planification globale santé-sécurité (exécution → Lead Sécurité)", order: 7 },
  { id: 't-cg-9',  roleId: 'r-cg', label: 'Biosécurité équine en lien avec Lead Chevaux', order: 8 },
  { id: 't-cg-10', roleId: 'r-cg', label: 'Accueil des partenaires institutionnels sur site', order: 9 },
  { id: 't-cg-11', roleId: 'r-cg', label: 'Gestion de crise (chaîne formelle)', order: 10 },

  // ── Master Nourriture (Alex) ─────────────────────────────────────
  { id: 't-mn-1', roleId: 'r-mn', label: 'Recrutement et sélection des fournisseurs alimentaires', order: 0 },
  { id: 't-mn-2', roleId: 'r-mn', label: 'Négociation des conditions commerciales (commission, dépôts, exclusivités)', order: 1 },
  { id: 't-mn-3', roleId: 'r-mn', label: "Maximisation du chiffre d'affaires alimentaire", order: 2 },
  { id: 't-mn-4', roleId: 'r-mn', label: 'Réponse aux besoins logistiques des fournisseurs (eau, électricité, frigo, accès)', order: 3 },
  { id: 't-mn-5', roleId: 'r-mn', label: 'Accueil et installation des fournisseurs sur site', order: 4 },
  { id: 't-mn-6', roleId: 'r-mn', label: 'Plan spatial des kiosques alimentaires (synchro MB + MK)', order: 5 },
  { id: 't-mn-7', roleId: 'r-mn', label: 'Décorum et cohérence visuelle des stands', order: 6 },
  { id: 't-mn-8', roleId: 'r-mn', label: 'Conformité MAPAQ / hygiène alimentaire', order: 7 },
  { id: 't-mn-9', roleId: 'r-mn', label: 'Coordination des flux de déchets organiques avec Lead Entretien', order: 8 },

  // ── Master Bar (Arno Geoffroy) ────────────────────────────────────
  { id: 't-mb-1', roleId: 'r-mb', label: 'Recrutement et sélection des fournisseurs de boisson', order: 0 },
  { id: 't-mb-2', roleId: 'r-mb', label: "Négociation commerciale et conformité RACJ (permis d'alcool)", order: 1 },
  { id: 't-mb-3', roleId: 'r-mb', label: 'Gestion des canettes : approvisionnement, retour, consigne', order: 2 },
  { id: 't-mb-4', roleId: 'r-mb', label: 'Gestion des déchets/recyclage liés aux contenants (lien Lead Entretien)', order: 3 },
  { id: 't-mb-5', roleId: 'r-mb', label: 'Accueil des fournisseurs de boisson sur site', order: 4 },
  { id: 't-mb-6', roleId: 'r-mb', label: 'Plan spatial des bars (synchro MN + MK)', order: 5 },
  { id: 't-mb-7', roleId: 'r-mb', label: 'Décorum des bars', order: 6 },
  { id: 't-mb-8', roleId: 'r-mb', label: 'Politique de service responsable (coupure, identification mineurs, lien Lead Sécurité)', order: 7 },
  { id: 't-mb-9', roleId: 'r-mb', label: "Maximisation du chiffre d'affaires boisson", order: 8 },

  // ── Master Bénévole (Maïté) ───────────────────────────────────────
  { id: 't-mben-1', roleId: 'r-mben', label: 'Campagne de recrutement (en lien avec MW pour la promo)', order: 0 },
  { id: 't-mben-2', roleId: 'r-mben', label: 'Identification et briefing des super-bénévoles (Leads)', order: 1 },
  { id: 't-mben-3', roleId: 'r-mben', label: 'Listes de besoins par station (accueil, billetterie, parking, entretien, sécurité, camping, scène, bars, bouffe, kiosques)', order: 2 },
  { id: 't-mben-4', roleId: 'r-mben', label: "Création et gestion de l'horaire bénévole", order: 3 },
  { id: 't-mben-5', roleId: 'r-mben', label: 'Onboarding et formation', order: 4 },
  { id: 't-mben-6', roleId: 'r-mben', label: 'Gestion des repas, boissons et reconnaissance bénévole', order: 5 },
  { id: 't-mben-7', roleId: 'r-mben', label: 'Coordination quotidienne sur site (point de ralliement bénévole)', order: 6 },
  { id: 't-mben-8', roleId: 'r-mben', label: 'Suivi post-festival (remerciements, bilan, fidélisation)', order: 7 },

  // ── Master Construction (Mikaël) ─────────────────────────────────
  { id: 't-mc-1', roleId: 'r-mc', label: 'Plan du site (version maître, intégrant les besoins de tous les Masters)', order: 0 },
  { id: 't-mc-2', roleId: 'r-mc', label: 'Estimation des coûts de construction selon le budget CG', order: 1 },
  { id: 't-mc-3', roleId: 'r-mc', label: 'Sourcing des matériaux', order: 2 },
  { id: 't-mc-4', roleId: 'r-mc', label: 'Planification du montage et du démontage', order: 3 },
  { id: 't-mc-5', roleId: 'r-mc', label: 'Coordination avec MK (tentes), MSS (scène), MN/MB (kiosques F&B)', order: 4 },
  { id: 't-mc-6', roleId: 'r-mc', label: 'Opérations sur site pendant le festival (réparations, ajustements)', order: 5 },
  { id: 't-mc-7', roleId: 'r-mc', label: 'Sécurité structurelle des installations', order: 6 },

  // ── Master Kiosque (Jesse) ───────────────────────────────────────
  { id: 't-mk-1', roleId: 'r-mk', label: 'Recrutement et communication avec exposants et partenaires', order: 0 },
  { id: 't-mk-2', roleId: 'r-mk', label: 'Design des tentes et stations', order: 1 },
  { id: 't-mk-3', roleId: 'r-mk', label: 'Plan spatial des kiosques (synchro MN, MB, MC)', order: 2 },
  { id: 't-mk-4', roleId: 'r-mk', label: 'Accueil des partenaires et exposants sur site', order: 3 },
  { id: 't-mk-5', roleId: 'r-mk', label: 'Montage et démontage des tentes', order: 4 },
  { id: 't-mk-6', roleId: 'r-mk', label: 'Coordination du camping artisans', order: 5 },
  { id: 't-mk-7', roleId: 'r-mk', label: 'Tenue à jour de la liste des exposants (pour MW promo et Régisseur)', order: 6 },

  // ── Master Web (Alex) — 8 sous-fonctions + transversales ─────────
  { id: 't-mw-1',  roleId: 'r-mw', label: 'Communications numériques entrantes (courriels, redirection, FAQ)', order: 0 },
  { id: 't-mw-2',  roleId: 'r-mw', label: 'Site web — contenu, mises à jour, intégration billetterie, SEO', order: 1 },
  { id: 't-mw-3',  roleId: 'r-mw', label: 'Plateformes de paiement — billetterie en ligne, paiements partenaires', order: 2 },
  { id: 't-mw-4',  roleId: 'r-mw', label: "Identité graphique — design du matériel signalétique et impression", order: 3 },
  { id: 't-mw-5',  roleId: 'r-mw', label: 'Médias sociaux (sous-fonction la plus volumineuse — voir détail)', order: 4 },
  { id: 't-mw-6',  roleId: 'r-mw', label: 'Promotion — campagnes, partenariats promo, mise en valeur des partenaires', order: 5 },
  { id: 't-mw-7',  roleId: 'r-mw', label: 'Relations médias — entrevues, communiqués, présence média', order: 6 },
  { id: 't-mw-8',  roleId: 'r-mw', label: 'Documentation visuelle — gestion des photographes/vidéastes pendant le festival', order: 7 },
  { id: 't-mw-9',  roleId: 'r-mw', label: "Garantir l'exactitude de toute information publiée", order: 8 },
  { id: 't-mw-10', roleId: 'r-mw', label: 'Maintenir un kit de communication partenaires (logos, dates, hashtags, gabarits)', order: 9 },
  { id: 't-mw-11', roleId: 'r-mw', label: 'Bibliothèque structurée des actifs visuels', order: 10 },
  { id: 't-mw-12', roleId: 'r-mw', label: 'Rapports de performance (avant, pendant, après festival)', order: 11 },

  // ── Master Scène et Son (Pitch) ───────────────────────────────────
  { id: 't-mss-1', roleId: 'r-mss', label: 'Élaboration du plan de scène', order: 0 },
  { id: 't-mss-2', roleId: 'r-mss', label: 'Contacts artistes, négociation et rédaction des contrats', order: 1 },
  { id: 't-mss-3', roleId: 'r-mss', label: 'Location et gestion du parc d’équipement son', order: 2 },
  { id: 't-mss-4', roleId: 'r-mss', label: 'Montage et démontage des installations scène/son', order: 3 },
  { id: 't-mss-5', roleId: 'r-mss', label: 'Coordination du roulement des spectacles avec Régisseur, MCC, Animateur', order: 4 },
  { id: 't-mss-6', roleId: 'r-mss', label: 'Son live et gestion des micros pendant le festival', order: 5 },
  { id: 't-mss-7', roleId: 'r-mss', label: 'Soundchecks', order: 6 },
  { id: 't-mss-8', roleId: 'r-mss', label: 'Encadrement de la Sound woman et du Lead Tech', order: 7 },

  // ── Master Care et Cérémonies (Océane) — refondu ─────────────────
  { id: 't-mcc-1', roleId: 'r-mcc', label: 'Conception du programme cérémoniel (ouverture, clôture, rituels intermédiaires)', order: 0 },
  { id: 't-mcc-2', roleId: 'r-mcc', label: 'Coordination avec les facilitatrices·eurs et personnes concernées', order: 1 },
  { id: 't-mcc-3', roleId: 'r-mcc', label: 'Synchronisation des cérémonies avec MSS (scène, son) et Régisseur', order: 2 },
  { id: 't-mcc-4', roleId: 'r-mcc', label: 'Recherche et propositions sur la structure interne de gouvernance', order: 3 },
  { id: 't-mcc-5', roleId: 'r-mcc', label: 'Veille au bien-être des équipes pendant le festival (point de contact, espace de décompression)', order: 4 },
  { id: 't-mcc-6', roleId: 'r-mcc', label: "Bilan post-festival sur l'expérience humaine et la gouvernance", order: 5 },

  // ── Régisseur (Fabien) ───────────────────────────────────────────
  { id: 't-reg-1', roleId: 'r-regi', label: "Maîtrise totale de l'horaire, du plan du site, des partenaires", order: 0 },
  { id: 't-reg-2', roleId: 'r-regi', label: 'Présentation aux partenaires', order: 1 },
  { id: 't-reg-3', roleId: 'r-regi', label: 'Décompte avant entrée en scène', order: 2 },
  { id: 't-reg-4', roleId: 'r-regi', label: 'Communication temps réel avec MSS et Animateur', order: 3 },

  // ── Sound woman (Jesse JO) ────────────────────────────────────────
  { id: 't-sound-1', roleId: 'r-sound', label: 'Assistance son sur scène lors des spectacles et soundchecks', order: 0 },

  // ── Lead Tech (Christophe) ────────────────────────────────────────
  { id: 't-tech-1', roleId: 'r-tech', label: 'Assistance technique scène/son aux côtés du MSS et de la Sound woman', order: 0 },

  // ── Lead Parking (Clément) ────────────────────────────────────────
  { id: 't-park-1', roleId: 'r-park', label: 'Disposition des bénévoles', order: 0 },
  { id: 't-park-2', roleId: 'r-park', label: 'Recherche de stationnements additionnels en cas de saturation', order: 1 },
  { id: 't-park-3', roleId: 'r-park', label: 'Coordination avec Lead Chevaux (séparation des flux véhicules/équidés)', order: 2 },

  // ── Lead Billetterie (TBD) ────────────────────────────────────────
  { id: 't-bill-1', roleId: 'r-bill', label: 'Roulement des entrées', order: 0 },
  { id: 't-bill-2', roleId: 'r-bill', label: 'Gestion des cas particuliers (comp, presse, partenaires)', order: 1 },
  { id: 't-bill-3', roleId: 'r-bill', label: 'Liaison avec MW (plateforme de paiement)', order: 2 },

  // ── Lead Chevaux (TBD) ────────────────────────────────────────────
  { id: 't-chev-1', roleId: 'r-chev', label: 'Stationnement participants équins', order: 0 },
  { id: 't-chev-2', roleId: 'r-chev', label: 'Aire de bien-être des chevaux', order: 1 },
  { id: 't-chev-3', roleId: 'r-chev', label: 'Normes de sécurité festivalier·es ↔ chevaux', order: 2 },
  { id: 't-chev-4', roleId: 'r-chev', label: 'Liaison biosécurité avec CG', order: 3 },

  // ── Animateur (Sara) ──────────────────────────────────────────────
  { id: 't-anim-1', roleId: 'r-anim', label: 'Annonces', order: 0 },
  { id: 't-anim-2', roleId: 'r-anim', label: 'Animation entre spectacles', order: 1 },
  { id: 't-anim-3', roleId: 'r-anim', label: 'Figure de proue', order: 2 },

  // ── Lead Camping (TBD) ────────────────────────────────────────────
  { id: 't-camp-1', roleId: 'r-camp', label: 'Accueil des campeurs', order: 0 },
  { id: 't-camp-2', roleId: 'r-camp', label: 'Gestion des contingences', order: 1 },
  { id: 't-camp-3', roleId: 'r-camp', label: 'Coordination avec MK (camping artisans)', order: 2 },

  // ── Lead Entretien (TBD) ──────────────────────────────────────────
  { id: 't-entr-1', roleId: 'r-entr', label: 'Toilettes chimiques (commande, vidange, hygiène)', order: 0 },
  { id: 't-entr-2', roleId: 'r-entr', label: 'Gestion déchets et recyclage', order: 1 },
  { id: 't-entr-3', roleId: 'r-entr', label: 'Coordination avec MN (organique) et MB (canettes/contenants)', order: 2 },

  // ── Lead Sécurité (TBD) — explicité ──────────────────────────────
  { id: 't-secu-1', roleId: 'r-secu', label: 'Plan de sécurité du site (points de rassemblement, accès urgences, communication radio)', order: 0 },
  { id: 't-secu-2', roleId: 'r-secu', label: "Coordination avec services d'urgence externes (911, ambulance, pompiers)", order: 1 },
  { id: 't-secu-3', roleId: 'r-secu', label: 'Premiers soins et trousse(s) de secours', order: 2 },
  { id: 't-secu-4', roleId: 'r-secu', label: 'Gestion des situations conflictuelles, intervention sobriété', order: 3 },
  { id: 't-secu-5', roleId: 'r-secu', label: "Liaison avec Lead Chevaux (zones d'exclusion équins/foule)", order: 4 },
  { id: 't-secu-6', roleId: 'r-secu', label: "Liaison avec MB (service responsable d'alcool)", order: 5 },
  { id: 't-secu-7', roleId: 'r-secu', label: "Plan d'évacuation en cas de météo extrême", order: 6 },

  // ── Lead Tournoi (Patrice) ────────────────────────────────────────
  { id: 't-tour-1', roleId: 'r-tour', label: 'Conception du tournoi', order: 0 },
  { id: 't-tour-2', roleId: 'r-tour', label: 'Règles', order: 1 },
  { id: 't-tour-3', roleId: 'r-tour', label: 'Déroulement du tournoi', order: 2 },
];

let _idSeq = 1000;
const nextId = (prefix: string) => `${prefix}-${++_idSeq}`;

// ── Public API ──────────────────────────────────────────────────────
export function listMatriceRoles(): Promise<MatriceRole[]> {
  return Promise.resolve([..._roles]);
}
export function listMatriceTasks(): Promise<MatriceTask[]> {
  return Promise.resolve([..._tasks]);
}

export function moveTask(taskId: string, toRoleId: string, toIndex?: number): Promise<void> {
  const task = _tasks.find((t) => t.id === taskId);
  if (!task) return Promise.resolve();
  // Remove from current position
  _tasks = _tasks.filter((t) => t.id !== taskId);
  // Re-number siblings in source role
  _tasks.filter((t) => t.roleId === task.roleId)
    .sort((a, b) => a.order - b.order)
    .forEach((t, i) => { t.order = i; });
  // Insert into target
  const siblings = _tasks.filter((t) => t.roleId === toRoleId).sort((a, b) => a.order - b.order);
  const insertAt = toIndex == null || toIndex > siblings.length ? siblings.length : toIndex;
  siblings.splice(insertAt, 0, { ...task, roleId: toRoleId, order: insertAt });
  _tasks = _tasks.filter((t) => t.roleId !== toRoleId).concat(siblings.map((t, i) => ({ ...t, order: i })));
  return Promise.resolve();
}

export function addTask(roleId: string, label: string): Promise<MatriceTask> {
  const order = _tasks.filter((t) => t.roleId === roleId).length;
  const t: MatriceTask = { id: nextId('t'), roleId, label: label.trim(), order };
  _tasks = [..._tasks, t];
  return Promise.resolve(t);
}

export function deleteTask(taskId: string): Promise<void> {
  _tasks = _tasks.filter((t) => t.id !== taskId);
  return Promise.resolve();
}

export function renameTask(taskId: string, label: string): Promise<void> {
  _tasks = _tasks.map((t) => (t.id === taskId ? { ...t, label: label.trim() } : t));
  return Promise.resolve();
}

export function addRole(role: Omit<MatriceRole, 'id'>): Promise<MatriceRole> {
  const r: MatriceRole = { ...role, id: nextId('r') };
  _roles = [..._roles, r];
  return Promise.resolve(r);
}

export function updateRoleHolder(roleId: string, holder: string): Promise<void> {
  _roles = _roles.map((r) => (r.id === roleId ? { ...r, holder: holder.trim() || 'TBD' } : r));
  return Promise.resolve();
}

export function deleteRole(roleId: string): Promise<void> {
  _roles = _roles.filter((r) => r.id !== roleId);
  _tasks = _tasks.filter((t) => t.roleId !== roleId);
  return Promise.resolve();
}

// ─── RACI-derived dependency graph ───────────────────────────────
// Source: matrice_reforgee_2026 v2.0 — sections "Matrice RACI maître"
// (Masters + Leads). Each row is a tâche/domaine; cells are R/A/C/I.
// Co-involvement per row contributes a weighted edge between the two
// roles. Higher weight = stronger interdependence.

export type RaciMark = 'R' | 'A' | 'C' | 'I';

const RACI_MATRIX: Array<{ area: string; involvements: Partial<Record<string, RaciMark>> }> = [
  // ── Masters (18 lignes) ────────────────────────────────────────
  { area: 'Offre alimentaire',
    involvements: { 'r-mn':'R', 'r-mb':'C', 'r-mben':'C', 'r-mc':'I', 'r-mk':'C', 'r-mw':'I', 'r-cg':'A' } },
  { area: 'Offre boisson',
    involvements: { 'r-mn':'C', 'r-mb':'R', 'r-mben':'C', 'r-mc':'I', 'r-mk':'C', 'r-mw':'I', 'r-cg':'A' } },
  { area: 'Recrutement bénévole',
    involvements: { 'r-mn':'C', 'r-mb':'C', 'r-mben':'R', 'r-mc':'C', 'r-mk':'C', 'r-mw':'C', 'r-mss':'C', 'r-mcc':'C', 'r-cg':'A' } },
  { area: 'Plan du site (maître)',
    involvements: { 'r-mn':'C', 'r-mb':'C', 'r-mben':'I', 'r-mc':'R', 'r-mk':'C', 'r-mw':'I', 'r-mss':'C', 'r-mcc':'I', 'r-cg':'A' } },
  { area: 'Sourcing matériaux construction',
    involvements: { 'r-mben':'I', 'r-mc':'R', 'r-cg':'A' } },
  { area: 'Recrutement exposants',
    involvements: { 'r-mben':'I', 'r-mk':'R', 'r-mw':'I', 'r-cg':'A' } },
  { area: 'Site web et plateformes paiement',
    involvements: { 'r-mw':'R', 'r-cg':'A' } },
  { area: 'Identité graphique et signalétique',
    involvements: { 'r-mn':'C', 'r-mb':'C', 'r-mk':'C', 'r-mw':'R', 'r-mss':'C', 'r-mcc':'C', 'r-cg':'A' } },
  { area: 'Médias sociaux',
    involvements: { 'r-mn':'C', 'r-mb':'C', 'r-mben':'C', 'r-mk':'C', 'r-mw':'R', 'r-mss':'C', 'r-mcc':'C', 'r-cg':'A' } },
  { area: 'Relations médias',
    involvements: { 'r-mw':'R', 'r-mss':'C', 'r-cg':'A' } },
  { area: 'Programmation artistique',
    involvements: { 'r-mw':'I', 'r-mss':'R', 'r-mcc':'C', 'r-cg':'A' } },
  { area: 'Son live et soundchecks',
    involvements: { 'r-mss':'R', 'r-mcc':'I', 'r-cg':'A' } },
  { area: 'Cérémonies',
    involvements: { 'r-mn':'I', 'r-mben':'I', 'r-mc':'I', 'r-mw':'I', 'r-mss':'C', 'r-mcc':'R', 'r-cg':'A' } },
  { area: 'Gouvernance interne (R&D)',
    involvements: { 'r-mcc':'R', 'r-cg':'A' } },
  { area: 'Budget consolidé',
    involvements: { 'r-mn':'I', 'r-mb':'I', 'r-mben':'I', 'r-mc':'I', 'r-mk':'I', 'r-mw':'I', 'r-mss':'I', 'r-mcc':'I', 'r-cg':'R' } },
  { area: 'Subventions',
    involvements: { 'r-mn':'C', 'r-mb':'C', 'r-mben':'C', 'r-mc':'C', 'r-mk':'C', 'r-mw':'C', 'r-mss':'C', 'r-mcc':'C', 'r-cg':'R' } },
  { area: 'Échéancier maître',
    involvements: { 'r-mn':'I', 'r-mb':'I', 'r-mben':'I', 'r-mc':'I', 'r-mk':'I', 'r-mw':'I', 'r-mss':'I', 'r-mcc':'I', 'r-cg':'R' } },
  { area: 'Biosécurité équine',
    involvements: { 'r-cg':'R', 'r-chev':'R' } },

  // ── Leads / opérations terrain (12 lignes) ──────────────────────
  { area: 'Régie de scène',
    involvements: { 'r-mben':'C', 'r-mss':'A', 'r-mw':'I', 'r-cg':'I', 'r-regi':'R' } },
  { area: 'Assistance son',
    involvements: { 'r-mben':'I', 'r-mss':'A', 'r-sound':'R' } },
  { area: 'Tech scène',
    involvements: { 'r-mben':'I', 'r-mss':'A', 'r-tech':'R' } },
  { area: 'Stationnement',
    involvements: { 'r-mben':'C', 'r-mw':'I', 'r-cg':'A', 'r-park':'R' } },
  { area: 'Billetterie',
    involvements: { 'r-mben':'C', 'r-mw':'C', 'r-cg':'A', 'r-bill':'R' } },
  { area: 'Chevaux et biosécurité',
    involvements: { 'r-mben':'C', 'r-mw':'I', 'r-cg':'A', 'r-chev':'R' } },
  { area: 'Animation publique',
    involvements: { 'r-mben':'I', 'r-mss':'A', 'r-mw':'C', 'r-cg':'I', 'r-anim':'R' } },
  { area: 'Camping festivalier',
    involvements: { 'r-mben':'C', 'r-mw':'I', 'r-cg':'A', 'r-camp':'R' } },
  { area: 'Camping artisans',
    involvements: { 'r-mben':'C', 'r-mk':'R', 'r-mw':'I', 'r-cg':'C', 'r-camp':'R' } },
  { area: 'Entretien site, déchets, sanitaires',
    involvements: { 'r-mben':'C', 'r-mw':'I', 'r-cg':'A', 'r-entr':'R' } },
  { area: 'Sécurité et premiers soins',
    involvements: { 'r-mben':'C', 'r-mw':'I', 'r-cg':'A', 'r-secu':'R' } },
  { area: 'Tournoi',
    involvements: { 'r-mben':'C', 'r-mss':'C', 'r-mw':'I', 'r-cg':'A', 'r-tour':'R' } },
];

const MARK_WEIGHT: Record<RaciMark, number> = { R: 3, A: 3, C: 2, I: 1 };

export interface DepEdge {
  a: string;          // role id
  b: string;          // role id
  weight: number;     // sum of co-involvement weights
  shared: string[];   // task areas they both touch
}

// Returns symmetric edge list — each undirected pair listed once with a < b.
export function computeDependencies(): DepEdge[] {
  const map = new Map<string, DepEdge>();
  for (const row of RACI_MATRIX) {
    const ids = Object.keys(row.involvements);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [aRaw, bRaw] = [ids[i], ids[j]];
        const [a, b] = aRaw < bRaw ? [aRaw, bRaw] : [bRaw, aRaw];
        const key = `${a}|${b}`;
        const wA = MARK_WEIGHT[row.involvements[a]!];
        const wB = MARK_WEIGHT[row.involvements[b]!];
        const wPair = Math.min(wA, wB) + 1; // floor 1 for any co-involvement
        const existing = map.get(key);
        if (existing) {
          existing.weight += wPair;
          existing.shared.push(row.area);
        } else {
          map.set(key, { a, b, weight: wPair, shared: [row.area] });
        }
      }
    }
  }
  return Array.from(map.values()).sort((x, y) => y.weight - x.weight);
}

// Helper: top N dependencies for a given role, sorted by weight desc.
export function topDependenciesFor(roleId: string, n = 4): Array<{ otherId: string; weight: number; shared: string[] }> {
  const all = computeDependencies();
  return all
    .filter((e) => e.a === roleId || e.b === roleId)
    .map((e) => ({ otherId: e.a === roleId ? e.b : e.a, weight: e.weight, shared: e.shared }))
    .slice(0, n);
}

// ─── People directory ────────────────────────────────────────────
// Aggregates roles by holder so we can render a per-person view in
// the admin and a /admin/personne/:slug profile page.

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface PersonSummary {
  slug: string;
  name: string;
  isTBD: boolean;
  roles: MatriceRole[];
}

// Group all roles by holder. TBD entries are merged into a single
// "À pourvoir" pseudo-person so the directory still surfaces vacancies.
export function listPeople(roles: MatriceRole[]): PersonSummary[] {
  const byKey = new Map<string, PersonSummary>();
  for (const r of roles) {
    const isTBD = !r.holder || r.holder.trim() === '' || r.holder.trim().toLowerCase() === 'tbd';
    const name = isTBD ? 'À pourvoir' : r.holder.trim();
    const key  = isTBD ? '__tbd__' : slugify(name);
    const existing = byKey.get(key);
    if (existing) existing.roles.push(r);
    else byKey.set(key, { slug: key, name, isTBD, roles: [r] });
  }
  // Real people: sort by # roles desc, then alpha. TBD always last.
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.isTBD !== b.isTBD) return a.isTBD ? 1 : -1;
    if (a.roles.length !== b.roles.length) return b.roles.length - a.roles.length;
    return a.name.localeCompare(b.name, 'fr');
  });
}

export function findPersonBySlug(roles: MatriceRole[], slug: string): PersonSummary | null {
  return listPeople(roles).find((p) => p.slug === slug) || null;
}
