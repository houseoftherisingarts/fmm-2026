// ─── Les rendez-vous médiévaux du Québec ─────────────────────────────
// Alex, 2026-08-27 : sur sa fiche, chacun coche les événements et les
// communautés qu'il fréquente, pour que les gens se retrouvent entre
// eux. Le festival est coché d'office. Liste vérifiée le 27 août 2026
// (sites officiels, La Page à Melkor, presse régionale); les événements
// sans trace récente (Lévis, Oriflamme) n'y sont pas.

export type CategorieEvenement = 'festival' | 'gn' | 'behourd' | 'hema' | 'reconstitution' | 'viking';

export const CATEGORIES_EVENEMENTS: Array<{ id: CategorieEvenement; nomFR: string; nomEN: string }> = [
  { id: 'festival',       nomFR: 'Festivals et salons',        nomEN: 'Festivals and fairs' },
  { id: 'gn',             nomFR: 'Grandeur nature',            nomEN: 'Live-action role play' },
  { id: 'behourd',        nomFR: 'Béhourd et combat',          nomEN: 'Buhurt and combat' },
  { id: 'hema',           nomFR: 'Escrime historique',         nomEN: 'Historical fencing' },
  { id: 'reconstitution', nomFR: 'Reconstitution et troupes',  nomEN: 'Reenactment and troupes' },
  { id: 'viking',         nomFR: 'Vikings',                    nomEN: 'Vikings' },
];

export interface EvenementMedieval {
  id: string;
  nom: string;
  lieu?: string;
  categorie: CategorieEvenement;
  url?: string;
}

export const FMM_ID = 'fmm';

export const EVENEMENTS_MEDIEVAUX: EvenementMedieval[] = [
  // Festivals et salons
  { id: FMM_ID, nom: 'Festival médiéval de Montpellier', lieu: 'Montpellier, Outaouais', categorie: 'festival', url: 'https://www.festivalmedievaldemontpellier.org/' },
  { id: 'saint-marcellin', nom: 'Feste médiévale de Saint-Marcellin', lieu: 'Bas-Saint-Laurent', categorie: 'festival', url: 'https://www.festemedievale.net/' },
  { id: 'lanaudiere', nom: 'Les Médiévales de Lanaudière', lieu: 'L’Assomption', categorie: 'festival', url: 'https://medievaleslanaudiere.com/' },
  { id: 'salon-passion', nom: 'Salon de la Passion Médiévale', lieu: 'Laval', categorie: 'festival', url: 'https://salonmedieval.ca/' },
  { id: 'eliasgoth', nom: 'Festival médiéval des Terres d’Eliasgoth', lieu: 'Hérouxville, Mékinac', categorie: 'festival', url: 'https://www.facebook.com/Eliasgoth/' },
  { id: 'saint-colomban', nom: 'Fête médiévale de Saint-Colomban', lieu: 'Laurentides', categorie: 'festival', url: 'https://st-colomban.qc.ca/evenements/' },
  { id: 'calicon', nom: 'CaliCON', lieu: 'Sherbrooke', categorie: 'festival', url: 'https://calimacil.com/pages/calicon' },
  // Grandeur nature
  { id: 'bicolline', nom: 'Duché de Bicolline', lieu: 'Saint-Mathieu-du-Parc', categorie: 'gn', url: 'https://bicolline.org/' },
  { id: 'belenos', nom: 'Les Terres de Bélénos', lieu: 'Sainte-Clotilde-de-Horton', categorie: 'gn', url: 'https://www.terres-de-belenos.com/' },
  { id: 'conflits-eternels', nom: 'Conflits Éternels', lieu: 'Brownsburg-Chatham', categorie: 'gn' },
  { id: 'eklaizia', nom: 'Éklaizia', lieu: 'Brownsburg-Chatham', categorie: 'gn' },
  { id: 'obsidia', nom: 'Royaume d’Obsidia', lieu: 'Outaouais', categorie: 'gn' },
  { id: 'ondeval', nom: 'Terres d’Ondeval', categorie: 'gn' },
  { id: 'advitam', nom: 'Advitam Eternam', lieu: 'Rawdon', categorie: 'gn' },
  { id: 'antremonde', nom: 'Antremonde', lieu: 'Saint-Majorique', categorie: 'gn' },
  // Béhourd
  { id: 'fqcm', nom: 'Fédération québécoise de combats médiévaux', categorie: 'behourd', url: 'http://fqcm.org/' },
  { id: 'nordik', nom: 'Nordik de Québec', lieu: 'Québec', categorie: 'behourd', url: 'https://www.facebook.com/NordikQuebec/' },
  { id: 'wakinyan', nom: 'Wakinyan', lieu: 'Québec', categorie: 'behourd' },
  // Escrime historique
  { id: 'scrimicie', nom: 'Académie Scrimicie', lieu: 'plusieurs villes', categorie: 'hema', url: 'https://scrimicie.com/' },
  { id: 'compagnie-medievale', nom: 'La Compagnie Médiévale', lieu: 'Montréal', categorie: 'hema', url: 'https://compagniemedievale.ca/' },
  { id: 'camhs', nom: 'Club d’arts martiaux historiques de Sherbrooke', lieu: 'Sherbrooke', categorie: 'hema', url: 'https://www.camhsherbrooke.ca/' },
  // Reconstitution et troupes
  { id: 'amq', nom: 'Association Médiévale de Québec', lieu: 'Québec', categorie: 'reconstitution' },
  { id: 'crm', nom: 'Club de Recréation Médiévale', lieu: 'Montréal', categorie: 'reconstitution' },
  { id: 'dragon-dormant', nom: 'Baronnie de l’Île du Dragon Dormant (SCA)', lieu: 'Montréal', categorie: 'reconstitution', url: 'https://dragondormant.eastkingdom.org/' },
  { id: 'havre-des-glaces', nom: 'Baronnie du Havre des Glaces (SCA)', categorie: 'reconstitution' },
  { id: 'constantinople', nom: 'Le Royaume de Constantinople', categorie: 'reconstitution' },
  { id: 'hulsborg', nom: 'Hülsborg', categorie: 'reconstitution' },
  { id: 'vestvegir', nom: 'Vestvegir', categorie: 'reconstitution' },
  // Vikings
  { id: 'urwaz', nom: 'URWAZ', lieu: 'Montréal', categorie: 'viking', url: 'https://www.facebook.com/urwazviking/' },
  { id: 'aegir', nom: 'La Troupe d’Aegir', lieu: 'Saguenay–Lac-Saint-Jean', categorie: 'viking' },
  { id: 'estuaire', nom: 'Clan de l’Estuaire', lieu: 'Québec', categorie: 'viking' },
];
