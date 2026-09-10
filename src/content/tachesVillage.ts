// ─── Les tâches du Village Gastronomique ────────────────────────────
// La répartition montée avec Marc-Alexis et Phil en juin 2026, portée
// dans l'admin le 10 septembre pour qu'elle se coche à trois plutôt que
// de dormir dans un PDF. Le tableau ci-dessous ne bouge pas tout seul :
// il décrit QUI répond de QUOI. Ce qui est coché vit dans Firestore,
// document `tachesVillage/etat` (voir src/firebase/tachesVillage.ts).
//
// `etat` porte le constat du 10 septembre 2026, tiré du croisement avec
// le vault et la boîte courriel : « fait » quand une preuve existe,
// « encours » quand une démarche est entamée sans être conclue,
// « apres » pour ce qui ne peut se faire qu'après le festival. Une tâche
// sans `etat` n'a laissé aucune trace. Ce constat sert de départ; dès
// que quelqu'un coche dans l'admin, c'est Firestore qui fait foi.

export type Qui = 'M' | 'A' | 'P' | 'E';
export type EtatInitial = 'fait' | 'encours' | 'apres';

export interface TacheVillage {
  /** Identifiant stable, sert de clé dans le document Firestore. */
  id: string;
  /** Le grand chapitre, par exemple « 1 · Administration & conformité ». */
  grand: string;
  /** La sous-section, par exemple « 1.1 Permis & réglementation ». */
  section: string;
  nom: string;
  /** Qui répond de la tâche. Plusieurs personnes quand elle se partage. */
  qui: Qui[];
  etat?: EtatInitial;
  /** D'où vient le constat, affiché en petit sous la tâche. */
  note?: string;
}

export const NOMS_QUI: Record<Qui, string> = {
  M: 'Marc-Alexis',
  A: 'Alex',
  P: 'Phil',
  E: 'Les employés',
};

export const TACHES_VILLAGE: TacheVillage[] = [
  { id: '1-1-permis-alimentaire', grand: "1 · Administration & conformité", section: "1.1 Permis & réglementation", nom: "Permis alimentaire", qui: ["A"], note: "aucun permis 2026 au vault ni dans les courriels" },
  { id: '1-1-documents-d-inspection-mapaq', grand: "1 · Administration & conformité", section: "1.1 Permis & réglementation", nom: "Documents d'inspection MAPAQ", qui: ["A"], note: "aucun document d'inspection 2026" },
  { id: '1-1-regles-incendie', grand: "1 · Administration & conformité", section: "1.1 Permis & réglementation", nom: "Règles incendie", qui: ["A"], etat: 'encours', note: "service incendie demandé à la municipalité le 27 janvier, sans réponse" },
  { id: '1-1-permis-d-alcool', grand: "1 · Administration & conformité", section: "1.1 Permis & réglementation", nom: "Permis d'alcool", qui: ["A"], note: "le dernier permis au dossier date de septembre 2024" },
  { id: '1-1-responsabilite-de-la-cuisine-municipale', grand: "1 · Administration & conformité", section: "1.1 Permis & réglementation", nom: "Responsabilité de la cuisine municipale", qui: ["A"], etat: 'encours', note: "cuisine du centre communautaire demandée le 27 janvier pour le 20 au 29 septembre" },
  { id: '1-2-cout-matieres-premieres-22-a-27', grand: "1 · Administration & conformité", section: "1.2 Budget", nom: "Coût matières premières (22 à 27 %)", qui: ["M"] },
  { id: '1-2-cout-equipements', grand: "1 · Administration & conformité", section: "1.2 Budget", nom: "Coût équipements", qui: ["P"] },
  { id: '1-2-cout-staff', grand: "1 · Administration & conformité", section: "1.2 Budget", nom: "Coût staff", qui: ["M"] },
  { id: '1-2-cout-imprevus', grand: "1 · Administration & conformité", section: "1.2 Budget", nom: "Coût imprévus", qui: ["A"], note: "la contingence de 1 300 $ votée en juin est celle du festival, pas du Village" },
  { id: '1-2-cout-transport', grand: "1 · Administration & conformité", section: "1.2 Budget", nom: "Coût transport", qui: ["A"], note: "aucune ligne de transport propre au Village" },
  { id: '1-3-demande-de-soumissions-avec-liste-d-ingredie', grand: "1 · Administration & conformité", section: "1.3 Fournisseurs", nom: "Demande de soumissions avec liste d'ingrédients", qui: ["P"] },
  { id: '1-3-comparatif-de-prix-le-moins-de-fournisseurs-', grand: "1 · Administration & conformité", section: "1.3 Fournisseurs", nom: "Comparatif de prix (le moins de fournisseurs possible)", qui: ["P"] },
  { id: '1-3-confirmation-des-commandes-avec-les-represen', grand: "1 · Administration & conformité", section: "1.3 Fournisseurs", nom: "Confirmation des commandes avec les représentants", qui: ["P"] },
  { id: '1-3-planification-livraison-et-pick-up', grand: "1 · Administration & conformité", section: "1.3 Fournisseurs", nom: "Planification livraison et pick-up", qui: ["P"] },
  { id: '1-3-fournisseurs-de-secours', grand: "1 · Administration & conformité", section: "1.3 Fournisseurs", nom: "Fournisseurs de secours", qui: ["P", "M"] },
  { id: '1-4-contrats-employes-et-employeurs', grand: "1 · Administration & conformité", section: "1.4 Gestion administrative", nom: "Contrats employés et employeurs", qui: ["A"], etat: 'encours', note: "gabarit d'entente envoyé le 2 août, champs encore vides" },
  { id: '1-4-horaires', grand: "1 · Administration & conformité", section: "1.4 Gestion administrative", nom: "Horaires", qui: ["M", "P"] },
  { id: '1-4-paiements-et-paies-selon-le-poste', grand: "1 · Administration & conformité", section: "1.4 Gestion administrative", nom: "Paiements et paies (selon le poste)", qui: ["A", "M", "P"], etat: 'encours', note: "250 $ par jour fixés à l'article 4, entente non signée" },
  { id: '1-4-pourboires-selon-le-poste', grand: "1 · Administration & conformité", section: "1.4 Gestion administrative", nom: "Pourboires (selon le poste)", qui: ["A", "M", "P"], etat: 'encours', note: "partage au prorata rédigé à l'article 5, entente non signée" },
  { id: '1-4-rapport-financier-detaille-post-evenement', grand: "1 · Administration & conformité", section: "1.4 Gestion administrative", nom: "Rapport financier détaillé post-événement", qui: ["A"], etat: 'apres', note: "se rédige après le festival; le gabarit de 2025 existe" },
  { id: '2-1-choisir-les-recettes', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Choisir les recettes", qui: ["M"] },
  { id: '2-1-fiches-techniques', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Fiches techniques", qui: ["M"] },
  { id: '2-1-food-cost', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Food cost", qui: ["M"] },
  { id: '2-1-marge-beneficiaire', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Marge bénéficiaire", qui: ["M"] },
  { id: '2-1-allergenes', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Allergènes", qui: ["M"] },
  { id: '2-1-fiches-historique', grand: "2 · Cuisine & approvisionnement", section: "2.1 Planification menu", nom: "Fiches historique", qui: ["M"] },
  { id: '2-2-liste-complete-des-ingredients', grand: "2 · Cuisine & approvisionnement", section: "2.2 Achats", nom: "Liste complète des ingrédients", qui: ["M", "P"] },
  { id: '2-2-liste-des-consommables-hors-vente', grand: "2 · Cuisine & approvisionnement", section: "2.2 Achats", nom: "Liste des consommables (hors vente)", qui: ["M", "P"] },
  { id: '2-2-liste-materiel-jetable', grand: "2 · Cuisine & approvisionnement", section: "2.2 Achats", nom: "Liste matériel jetable", qui: ["M", "P"] },
  { id: '2-3-calendrier-de-production-et-mise-en-place', grand: "2 · Cuisine & approvisionnement", section: "2.3 Production", nom: "Calendrier de production et mise en place", qui: ["M"] },
  { id: '2-3-plan-de-cuisson-sur-place', grand: "2 · Cuisine & approvisionnement", section: "2.3 Production", nom: "Plan de cuisson sur place", qui: ["M", "P"] },
  { id: '2-3-plan-de-conservation-avant-apres-frigo', grand: "2 · Cuisine & approvisionnement", section: "2.3 Production", nom: "Plan de conservation (avant, après, frigo)", qui: ["M", "P"] },
  { id: '2-3-gestion-des-surplus', grand: "2 · Cuisine & approvisionnement", section: "2.3 Production", nom: "Gestion des surplus", qui: ["M", "A", "P"], note: "aucun plan pour les surplus" },
  { id: '2-4-controle-des-temperatures', grand: "2 · Cuisine & approvisionnement", section: "2.4 Salubrité", nom: "Contrôle des températures", qui: ["E"] },
  { id: '2-4-station-de-lavage-de-mains', grand: "2 · Cuisine & approvisionnement", section: "2.4 Salubrité", nom: "Station de lavage de mains", qui: ["A"], note: "les lave-mains portables restent un besoin non comblé" },
  { id: '2-4-desinfection-des-surfaces', grand: "2 · Cuisine & approvisionnement", section: "2.4 Salubrité", nom: "Désinfection des surfaces", qui: ["E"] },
  { id: '2-4-gestion-des-dechets', grand: "2 · Cuisine & approvisionnement", section: "2.4 Salubrité", nom: "Gestion des déchets", qui: ["E"] },
  { id: '2-5-fours', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Fours", qui: ["P"] },
  { id: '2-5-frigos', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Frigos", qui: ["P", "A"], etat: 'encours', note: "roulotte réfrigérée à ramasser et à payer chez Sunbelt, 820 $" },
  { id: '2-5-grill-en-hauteur', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Grill en hauteur", qui: ["M", "P"] },
  { id: '2-5-tables-de-travail', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Tables de travail", qui: ["M", "P", "A"], etat: 'encours', note: "une table sur dix, trois encore à acheter" },
  { id: '2-5-couteaux', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Couteaux", qui: ["E"] },
  { id: '2-5-planches', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Planches", qui: ["A", "P"], etat: 'fait', note: "dix planches prêtées par Marc-Alexis" },
  { id: '2-5-thermometre-balances', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Thermomètre, balances", qui: ["A", "P"], etat: 'encours', note: "les deux thermomètres et la balance restent à acheter" },
  { id: '2-5-bacs-alimentaires-contenants', grand: "2 · Cuisine & approvisionnement", section: "2.5 Équipement de cuisine", nom: "Bacs alimentaires, contenants", qui: ["A", "P"], etat: 'encours', note: "bacs de marinade, bacs 6 L et bacs à plonge encore à acheter" },
  { id: '3-1-amenagement-de-l-espace-de-couchage', grand: "3 · Logistique & personnel", section: "3.1 Hébergement des employés", nom: "Aménagement de l'espace de couchage", qui: ["A"], etat: 'encours', note: "deux options chiffrées envoyées à Marc-Alexis, aucun choix arrêté" },
  { id: '3-1-roulottes-ou-tentes-fournies', grand: "3 · Logistique & personnel", section: "3.1 Hébergement des employés", nom: "Roulottes ou tentes fournies", qui: ["A"], etat: 'encours', note: "trois loueurs comparés, rien de réservé" },
  { id: '3-1-matelas-fournis', grand: "3 · Logistique & personnel", section: "3.1 Hébergement des employés", nom: "Matelas fournis", qui: ["A"], note: "aucune mention de matelas" },
  { id: '3-1-roulotte-hygienique', grand: "3 · Logistique & personnel", section: "3.1 Hébergement des employés", nom: "Roulotte hygiénique", qui: ["A"], note: "aucune roulotte de douches pour l'équipage" },
  { id: '3-1-toilettes', grand: "3 · Logistique & personnel", section: "3.1 Hébergement des employés", nom: "Toilettes", qui: ["A"], etat: 'encours', note: "Toilettes Nation au dossier de Tristan depuis juin" },
  { id: '3-2-dejeuner-diner-souper-collation', grand: "3 · Logistique & personnel", section: "3.2 Repas employés", nom: "Déjeuner, dîner, souper, collation", qui: ["E"] },
  { id: '3-2-cafe', grand: "3 · Logistique & personnel", section: "3.2 Repas employés", nom: "Café", qui: ["E"] },
  { id: '3-2-eau-potable', grand: "3 · Logistique & personnel", section: "3.2 Repas employés", nom: "Eau potable", qui: ["A"], note: "rien sur l'eau des repas d'équipe" },
  { id: '3-3-recrutement', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Recrutement", qui: ["M"] },
  { id: '3-3-salaire-selon-le-poste', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Salaire selon le poste", qui: ["M"] },
  { id: '3-3-formation', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Formation", qui: ["M", "P"] },
  { id: '3-3-repartition-des-taches', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Répartition des tâches", qui: ["M", "P"] },
  { id: '3-3-gestion-des-pauses', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Gestion des pauses", qui: ["M", "P"] },
  { id: '3-3-horaire', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Horaire", qui: ["M"] },
  { id: '3-3-gestion-de-remplacement', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Gestion de remplacement", qui: ["M", "P"] },
  { id: '3-3-gestion-des-urgences', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Gestion des urgences", qui: ["M", "P", "A"], etat: 'encours', note: "procédures d'urgence chez les bénévoles, équipe TACTIC nommée" },
  { id: '3-3-liste-de-quoi-amener-au-festival', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Liste de quoi amener au festival", qui: ["M"] },
  { id: '3-3-costumes', grand: "3 · Logistique & personnel", section: "3.3 Gestion du personnel", nom: "Costumes", qui: ["A"], note: "rien sur les costumes de la cuisine" },
  { id: '3-4-positionnement-de-la-cuisine', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Positionnement de la cuisine", qui: ["M", "A"], note: "aucun plan qui situe la cuisine sur le site" },
  { id: '3-4-positionnement-des-feux', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Positionnement des feux", qui: ["M", "A"], etat: 'encours', note: "Thierry gère les feux, briques et billots déjà chez Alex" },
  { id: '3-4-positionnement-des-frigos', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Positionnement des frigos", qui: ["M", "P"] },
  { id: '3-4-zone-de-stockage-sec-et-froid', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Zone de stockage (sec et froid)", qui: ["M"] },
  { id: '3-4-zone-de-plonge-sur-le-site', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Zone de plonge sur le site", qui: ["M", "P"] },
  { id: '3-4-zone-de-service', grand: "3 · Logistique & personnel", section: "3.4 Aménagement du site", nom: "Zone de service", qui: ["M", "P"] },
  { id: '3-5-eau-potable-et-reserve-d-eau', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Eau potable et réserve d'eau", qui: ["A"], etat: 'fait', note: "boyau d'eau acquis, chez Alex" },
  { id: '3-5-electricite-et-generatrice', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Électricité et génératrice", qui: ["A"], etat: 'encours', note: "rallonges acquises, la génératrice n'apparaît nulle part" },
  { id: '3-5-eclairage', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Éclairage", qui: ["A"], etat: 'encours', note: "1 000 $ de guirlandes votés, suivi encore ouvert au 20 août" },
  { id: '3-5-extincteurs', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Extincteurs", qui: ["A"], etat: 'encours', note: "budget coupé en juin pour emprunter, aucun prêt confirmé" },
  { id: '3-5-premiers-soins', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Premiers soins", qui: ["A"], etat: 'encours', note: "deux premiers répondants demandés à la municipalité le 27 janvier" },
  { id: '3-5-wifi', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "WiFi", qui: ["A"], etat: 'encours', note: "note Starlink de 575 à 1 400 $ jamais approuvée" },
  { id: '3-5-walkie-talkie', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Walkie-talkie", qui: ["A"], etat: 'encours', note: "quinze walkies budgétés, soumission chez Maïté" },
  { id: '3-5-kart-de-golf', grand: "3 · Logistique & personnel", section: "3.5 Infrastructure", nom: "Kart de golf", qui: ["A"], note: "aucun kart réservé pour 2026" },
];

/** Les tâches d'une personne, dans l'ordre du document. */
export function tachesDe(qui: Qui): TacheVillage[] {
  return TACHES_VILLAGE.filter((t) => t.qui.includes(qui));
}
