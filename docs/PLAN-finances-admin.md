# Plan — section admin Finances

## Portée

Nouvelle section `finances` dans l'admin FMM (AdminShell), visible pour `super`, `ca`, `organisateur` seulement (données financières sensibles, hors bénévoles/cuisine). Quatre blocs dans un seul écran à onglets internes, calqués sur la structure numérotée d'Alex :

1. **Budget** — catégories de dépenses (montant budgété / réel / écart / barre de progression), total général.
2. **Comptes** — liste configurable de comptes (nom, type, solde, devise).
3. **Répartition** — trois parts façon Coffre des Inconnus (Investir / Épargner / Essentiel), pourcentages configurables, rendu visuel (barres empilées).
4. **Documents** — téléversement Firebase Storage (états financiers, factures, rapports), liste avec nom/catégorie/année/date/lien.

Choix pris (non explicité dans la demande) : quatre onglets internes plutôt que de forcer les items 2 et 3 sous un même onglet "Budget" — plus lisible, chaque bloc a son propre CRUD.

## Données Firestore

- `financeCategories/{id}` — `{ name, budgeted, actual, order, updatedAt }`. Préchargées au premier chargement si la collection est vide (Assurances, Artistes et performeurs, Matériel, Nourriture, Taxes). Ajout/édition/suppression libres depuis l'admin.
- `financeAccounts/{id}` — `{ name, type: 'banque'|'paiement'|'dette'|'autre', balance, currency, order, updatedAt }`. Préchargé au premier chargement (Desjardins/banque, Square/paiement, Zeffy/paiement, Dette/dette) mais entièrement éditable/supprimable — pas de champs en dur.
- `financeAllocation/settings` (doc unique) — `{ investir, epargne, essentiel, updatedAt }` (pourcentages, somme visée 100 mais non forcée côté règles).
- `financeDocuments/{id}` — `{ name, category, year, uploadedAt, url, path, sizeKb }`. `path` = chemin Storage (pour permettre la suppression).

## Storage

- `finances/{timestamp}-{safeName}` — admin-only lecture ET écriture (données financières, contrairement à `media/`/`archives-uploads/` qui sont publics en lecture).

## Fichiers

- `src/firebase/finances.ts` (nouveau) — CRUD catégories/comptes/allocation + upload/liste/suppression Storage. Suit le patron `bar.ts`/`archivesPhotos.ts`.
- `src/pages/admin/sections/FinancesSection.tsx` (nouveau) — UI à 4 onglets internes, suit le patron `BarSection.tsx`/`DisposSection.tsx` (Card, Th, Field, GhostButton, PrimaryButton, DangerButton, EmptyState).
- `src/pages/admin/AdminShell.tsx` — ajoute `'finances'` à `AdminSectionId` + entrée `NAV` (icône `Wallet`).
- `src/lib/adminPermissions.ts` — ajoute `'finances'` aux listes `ca` et `organisateur` dans `ROLE_SECTIONS` (super a déjà `'*'`).
- `src/pages/AdminPage.tsx` — lazy import + `case 'finances'`.
- `firestore.rules` — 4 blocs `match` admin-only (`financeCategories`, `financeAccounts`, `financeAllocation`, `financeDocuments`).
- `storage.rules` — bloc `match /finances/{allPaths=**}` admin-only lecture+écriture.

## Ordre de construction

1. `firebase/finances.ts` (types + CRUD).
2. `FinancesSection.tsx` (UI, 4 onglets).
3. Câblage admin (`AdminShell`, `adminPermissions`, `AdminPage`).
4. Règles Firestore + Storage.
5. `npx tsc -b --noEmit`, puis `npm run build` si dispo.
6. Commit sur `main`.

Pas de mode `devBypass`/mock pour cette section (comme `DisposSection`/`InvitesSection`) : c'est un outil financier réel, l'état vide gracieux (Firestore/Storage non configurés → listes vides + bannière d'erreur) suffit, cohérent avec le reste de l'admin.

## Addenda — Carnet de contacts (même session, ajout d'Alex)

Deuxième section admin, construite après Finances. Référence visuelle trouvée : `~/Documents/quest-grimoire` (The Quest Book), panneau PNJ (`NpcPanel.tsx`) — liste + fiche détaillée, monogramme doré en cercle, libellés en petites capitales dorées. L'admin FMM porte déjà cette même grammaire (fond midnight, accent laiton, `Card`/eyebrows), donc réutilisation directe des primitives existantes plutôt qu'un nouveau style.

- `carnetContacts/{id}` (Firestore) — `{ name, role, allegiance, fonction, organisation, email, phone, notes, lastContactAt, photoUrl, photoPath, archived, order }`. Collection distincte de `contacts` (déjà prise par le formulaire public "Nous contacter").
- `carnet-contacts/{timestamp}.webp` (Storage) — portraits, recadrés en carré côté client (même patron que `AvatarUpload.tsx`).
- `src/firebase/carnetContacts.ts` + `src/pages/admin/sections/CarnetContactsSection.tsx` (nouveaux).
- Admin-only des deux côtés (Firestore + Storage), aucune lecture publique : l'allégeance et les notes portent un jugement sur des personnes réelles. Commenté explicitement en tête des deux fichiers.
- Pas de suppression franche : seulement `setContactArchived` (archiver/désarchiver). Aucune fonction de suppression n'existe dans le module.
- Accès : super, CA, organisateurs (mêmes rôles que Finances) — pas bénévoles/cuisine.
