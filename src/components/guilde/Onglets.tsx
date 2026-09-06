import React from 'react';
import { ScrollText, MessagesSquare, CalendarDays, Store, Coins, Users } from 'lucide-react';
import { addLocale, ONGLETS_GUILDE_FR_EN } from '../../lib/locale';
import type { Lang } from '../../content';

// ─── Les onglets d'un groupe ─────────────────────────────────────────
// Six panneaux, un seul à la fois, l'onglet retenu dans l'adresse :
// /{slug} ouvre le mur, /{slug}/tresor ouvre le trésor. Le patron
// visuel est celui de la fiche de membre (witcher-tab, filet du bas),
// pour que la maison entière garde la même grammaire.

export type OngletGuilde = 'mur' | 'salon' | 'evenements' | 'marche' | 'tresor' | 'membres';

interface Definition {
  cle: OngletGuilde;
  /** Le segment d'adresse en français; vide pour le mur, qui est la
   *  page d'accueil du groupe. */
  slug: string;
  FR: string;
  EN: string;
  Icone: React.ComponentType<{ size?: number | string }>;
}

export const ONGLETS_GUILDE: readonly Definition[] = [
  { cle: 'mur',        slug: '',            FR: 'Mur',        EN: 'Wall',    Icone: ScrollText },
  { cle: 'salon',      slug: 'salon',       FR: 'Salon',      EN: 'Chat',    Icone: MessagesSquare },
  { cle: 'evenements', slug: 'evenements',  FR: 'Événements', EN: 'Events',  Icone: CalendarDays },
  { cle: 'marche',     slug: 'marche',      FR: 'Marché',     EN: 'Market',  Icone: Store },
  { cle: 'tresor',     slug: 'tresor',      FR: 'Trésor',     EN: 'Treasury', Icone: Coins },
  { cle: 'membres',    slug: 'membres',     FR: 'Membres',    EN: 'Members', Icone: Users },
];

// Le paramètre d'adresse arrive dans la langue de la page. Les deux
// écritures mènent au même panneau.
const PAR_SLUG: Record<string, OngletGuilde> = (() => {
  const table: Record<string, OngletGuilde> = {};
  for (const o of ONGLETS_GUILDE) {
    if (!o.slug) continue;
    table[o.slug] = o.cle;
    const en = ONGLETS_GUILDE_FR_EN[o.slug];
    if (en) table[en] = o.cle;
  }
  return table;
})();

export const ongletDepuisSlug = (s: string | undefined): OngletGuilde | null =>
  (s && PAR_SLUG[s]) || null;

/** L'adresse d'un onglet, dans la langue de la page. */
export function cheminGuilde(slug: string, onglet: OngletGuilde, lang: Lang): string {
  const def = ONGLETS_GUILDE.find((o) => o.cle === onglet);
  return addLocale(def?.slug ? `/${slug}/${def.slug}` : `/${slug}`, lang);
}

const Onglets: React.FC<{
  actif: OngletGuilde;
  lang: Lang;
  onChoisir: (o: OngletGuilde) => void;
}> = ({ actif, lang, onChoisir }) => {
  const fr = lang === 'FR';

  const flecher = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const pas = e.key === 'ArrowRight' ? 1 : ONGLETS_GUILDE.length - 1;
    const index = ONGLETS_GUILDE.findIndex((o) => o.cle === actif);
    const suivant = ONGLETS_GUILDE[(index + pas) % ONGLETS_GUILDE.length].cle;
    onChoisir(suivant);
    document.getElementById(`onglet-guilde-${suivant}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={fr ? 'Les panneaux du groupe' : 'The group panels'}
      onKeyDown={flecher}
      className="flex flex-wrap items-center gap-1.5 pb-3"
      style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
    >
      {ONGLETS_GUILDE.map(({ cle, FR, EN, Icone }) => {
        const estActif = cle === actif;
        return (
          <button
            key={cle}
            id={`onglet-guilde-${cle}`}
            type="button"
            role="tab"
            aria-selected={estActif}
            aria-controls={`panneau-guilde-${cle}`}
            tabIndex={estActif ? 0 : -1}
            data-active={estActif}
            onClick={() => onChoisir(cle)}
            className="witcher-tab inline-flex items-center gap-2 rounded-card"
          >
            <Icone size={14} /> {fr ? FR : EN}
          </button>
        );
      })}
    </div>
  );
};

export default Onglets;
