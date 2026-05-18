// ─── Departments — public contact form + admin mailboxes ─────────────
// Each entry powers two surfaces:
//   1. The dropdown on the public /contact form ("À quel département
//      écrivez-vous ?") — the visitor picks one before sending.
//   2. A shared inbox inside the admin Mail tab visible to super, CA,
//      and Organisateurs. Every admin can read every department box.
//
// `responsibleFR/EN` is the human name surfaced in the dropdown next
// to the department label, so visitors see "Kiosques (Jesse)" and
// know who they're writing to. The mapping is loose by design — no
// uid binding yet — so editing the responsible name doesn't require
// touching any auth records.

export interface Department {
  id:            string;
  labelFR:       string;
  labelEN:       string;
  responsibleFR: string;
  responsibleEN: string;
  /** Optional one-line note rendered under the dropdown choice. */
  hintFR?:       string;
  hintEN?:       string;
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'general',
    labelFR: 'Général',          labelEN: 'General',
    responsibleFR: 'Le Conseil', responsibleEN: 'The Council',
    hintFR: 'Toute question qui ne tombe nulle part ailleurs.',
    hintEN: 'Any question that doesn’t fit elsewhere.',
  },
  {
    id: 'kiosques',
    labelFR: 'Kiosques',         labelEN: 'Kiosks',
    responsibleFR: 'Jesse',      responsibleEN: 'Jesse',
    hintFR: 'Marchands, artisans, exposants — exposer ou réserver un kiosque.',
    hintEN: 'Merchants, artisans, exhibitors — booking a kiosk.',
  },
  {
    id: 'programmation',
    labelFR: 'Programmation',    labelEN: 'Programming',
    responsibleFR: 'Tristan',    responsibleEN: 'Tristan',
    hintFR: 'Artistes, troupes, démonstrations, horaire.',
    hintEN: 'Artists, troupes, demos, schedule.',
  },
  {
    id: 'benevoles',
    labelFR: 'Bénévoles',        labelEN: 'Volunteers',
    responsibleFR: 'Maité',      responsibleEN: 'Maité',
    hintFR: 'Devenir bénévole, modifier votre engagement, horaires.',
    hintEN: 'Become a volunteer, edit your engagement, schedule.',
  },
  {
    id: 'partenaires',
    labelFR: 'Partenaires',      labelEN: 'Sponsors',
    responsibleFR: 'Le Conseil', responsibleEN: 'The Council',
    hintFR: 'Commandites, partenariats stratégiques, communications.',
    hintEN: 'Sponsorships, strategic partnerships, communications.',
  },
  {
    id: 'mariages',
    labelFR: 'Mariages',         labelEN: 'Weddings',
    responsibleFR: 'Le Conseil', responsibleEN: 'The Council',
    hintFR: 'Cérémonies, formules, réception sur le site.',
    hintEN: 'Ceremonies, packages, on-site reception.',
  },
  {
    id: 'medias',
    labelFR: 'Médias',           labelEN: 'Media',
    responsibleFR: 'Le Conseil', responsibleEN: 'The Council',
    hintFR: 'Demandes presse, entrevues, accréditations.',
    hintEN: 'Press requests, interviews, accreditation.',
  },
];

export function getDepartment(id: string): Department | null {
  return DEPARTMENTS.find((d) => d.id === id) ?? null;
}
