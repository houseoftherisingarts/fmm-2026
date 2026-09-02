import React, { useEffect, useState } from 'react';
import { Settings, ShieldAlert, Globe, Database, Music, Eye } from 'lucide-react';
import { Card, ToggleSwitch } from '../primitives';
import { PILLAR_PUBLISH_FLAGS, PUBLISH_FLAG_KEYS } from '../../../firebase/siteFlags';
import { watchProgFlags, setProgFlag, PROG_FLAGS_DEFAULTS, type ProgFlags } from '../../../firebase/programmationFlags';

// ─── Ce que chaque bascule fait vraiment ─────────────────────────────
// Audit du 2 septembre 2026, à la demande d'Alex : chaque interrupteur a
// été suivi jusqu'à la ligne de code qui le lit. Ce qui est écrit ici est
// ce que la bascule change pour de vrai sur le site public, pas ce que
// son nom laisse croire. L'équipe ne lit pas le code (2026-08-23), alors
// la phrase dit aussi ce qui arrive quand on l'éteint.
//
// `dormante` porte le mot qui dit pourquoi l'audit la tient pour sans
// effet. Rien n'a été supprimé : retirer un interrupteur change le site
// pour de vrai, et cette décision appartient à Alex.

type Famille = 'portes' | 'affichage' | 'regie' | 'orphelins';

interface Bascule {
  label:     string;
  effet:     string;
  famille:   Famille;
  dormante?: string;
}

const BASCULES: Record<string, Bascule> = {
  ticketingOpen: {
    label: 'Billetterie ouverte',
    famille: 'portes',
    dormante: 'sans lecteur',
    effet: "Rien ne change nulle part. Aucune page du site ne consulte cette bascule : les boutons de billets mènent à Zeffy dans les deux positions.",
  },
  banquetReservationsOpen: {
    label: 'Réservations du banquet',
    famille: 'portes',
    dormante: 'remplacée',
    effet: "Rien ne change nulle part. Le banquet se montre et se cache par la bascule « Banquet du Prince William » plus bas, et le nombre de places restantes vient du compteur des ventes.",
  },
  volunteerSignupOpen: {
    label: 'Inscriptions bénévoles',
    famille: 'portes',
    dormante: 'remplacée',
    effet: "Rien ne change nulle part. La page des bénévoles s'ouvre et se ferme par « Devenir Bénévole », dans la publication des pages.",
  },
  vendorApplicationsOpen: {
    label: 'Candidatures de marchands',
    famille: 'portes',
    effet: "Allumée : le formulaire du marché accepte les candidatures. Éteinte : le même formulaire devient une liste d'attente et le dit à qui le remplit. Le même interrupteur se trouve aussi en haut de la section Marchands.",
  },
  billetsNonMembres: {
    label: 'Billets non membres',
    famille: 'portes',
    effet: "Allumée : qui arrive sans compte voit les prix majorés de cinq dollars et la porte qui offre le rabais. Éteinte : tout le monde reçoit le tarif membre et la porte ne s'ouvre jamais.",
  },
  showCountdown: {
    label: 'Compte à rebours',
    famille: 'affichage',
    dormante: 'masquée',
    effet: "Rien ne change nulle part. Le compte à rebours a quitté la séquence d'accueil le 13 juillet 2026, et l'accueil garde son bloc éteint sans consulter cette bascule. Celui du pied de page s'affiche toujours.",
  },
  showCommanditaire: {
    label: 'Commanditaire d’honneur',
    famille: 'affichage',
    effet: "Allumée : la page du commanditaire de l'édition suivante s'ouvre. Éteinte : son adresse renvoie à l'accueil. Elle est séparée de la page Commanditaires courante, qui se publie de son côté.",
  },
  showHistoireFrise: {
    label: 'Frise de l’histoire',
    famille: 'affichage',
    effet: "Allumée : la frise animée apparaît sur la page Histoire & Apprendre. Éteinte : la page s'affiche sans elle, tout le reste intact.",
  },
  pubAlliance: {
    label: 'L’Alliance (page des alliés)',
    famille: 'affichage',
    effet: "Allumée : la page des festivals, des monnaies et des lieux alliés s'ouvre. Éteinte : son adresse répond « page introuvable ». Elle attend son heure depuis le 23 août 2026.",
  },
  knightPlacementEditor: {
    label: 'Éditeur de placement du chevalier',
    famille: 'regie',
    effet: "Allumée : les admins connectés voient sur l'accueil les poignées qui déplacent le chevalier sur l'orbe. Éteinte : plus personne ne les voit. Le public ne les voit jamais, dans un cas comme dans l'autre.",
  },
};

// Un champ qui traîne dans Firestore sans exister dans le code se décrit
// tout seul, pour qu'aucune bascule muette n'apparaisse sans explication.
const decrire = (cle: string): Bascule =>
  BASCULES[cle] ?? {
    label: cle,
    famille: 'orphelins',
    dormante: 'orphelin',
    effet: "Rien ne change nulle part. Ce champ est resté dans Firestore après une refonte, mais plus une seule ligne du code ne le lit.",
  };

const FAMILLES: { id: Famille; titre: string; intro: string }[] = [
  { id: 'portes',    titre: 'Les portes',            intro: "Ce qui ouvre et ferme une inscription ou une vente." },
  { id: 'affichage', titre: 'L’affichage public',    intro: "Ce qui montre ou cache une page, un bloc ou une section au visiteur." },
  { id: 'regie',     titre: 'Les outils de la régie', intro: "Des interrupteurs réservés aux admins connectés. Le public ne voit rien changer." },
  { id: 'orphelins', titre: 'Les orphelins',         intro: "Des champs restés dans Firestore après une refonte. Plus rien ne les lit : ils attendent qu'on les efface." },
];

// La publication d'une page dit toujours la même chose, avec son nom
// dedans : une phrase par page plutôt qu'un paragraphe pour les neuf.
const effetPublication = (label: string) =>
  `Allumée : « ${label} » apparaît dans le menu principal et sa page s'ouvre, en direct. Éteinte : elle quitte le menu et son adresse renvoie à l'accueil, derrière le teaser.`;

interface LigneProg {
  flag:      keyof ProgFlags;
  label:     string;
  effet:     string;
  dormante?: string;
}

const PROG_FLAG_ROWS: LigneProg[] = [
  { flag: 'bestiaire', label: 'Grille des activités',
    effet: "Allumée : la grille des activités du festival s'affiche. Éteinte : la page Programmation saute ce bloc." },
  { flag: 'horaire', label: 'Horaire (souvenir 2025)',
    effet: "Allumée : l'horaire de l'édition 2025 s'affiche en souvenir. Éteinte : il quitte la page." },
  { flag: 'banquet', label: 'Banquet du Prince William',
    effet: "Allumée : le banquet et le nombre de places encore libres s'affichent. Éteinte : toute la section disparaît de la page." },
  { flag: 'behourd', label: 'Tournoi de Béhourd',
    effet: "Allumée : le tournoi revient sur la page. Éteinte depuis le 4 août 2026, le temps que l'organisation règle ses incidents." },
  { flag: 'ateliersJeunesse', label: 'Ateliers Jeunesse (inscriptions)',
    dormante: 'sans lecteur',
    effet: "Rien ne change nulle part. La page Programmation ne consulte pas cette bascule : les ateliers jeunesse n'y ont pas encore de section à cacher." },
];

// La pastille qui signale une bascule que l'audit tient pour sans effet,
// avec le mot qui dit pourquoi.
const Dormante: React.FC<{ mot: string }> = ({ mot }) => (
  <span
    className="font-display title-medieval text-[10px] uppercase tracking-widest px-2 py-0.5 shrink-0 text-blush"
    style={{ border: '1px solid rgba(228, 236, 247, 0.18)' }}
  >
    Dormante · {mot}
  </span>
);

// Une ligne d'interrupteur : le nom, la pastille s'il y a lieu, la phrase
// qui dit ce qui arrive, et la bascule elle-même.
const Ligne: React.FC<{
  label: string;
  effet: string;
  dormante?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}> = ({ label, effet, dormante, checked, onChange, children }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
    <div className={`min-w-0 ${dormante ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-sans text-sm text-ivory">{label}</span>
        {dormante && <Dormante mot={dormante} />}
      </div>
      <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1">{effet}</p>
    </div>
    <div className="flex items-center gap-3 shrink-0 pt-0.5">
      {children}
      <ToggleSwitch checked={checked} onChange={onChange} label={label} />
    </div>
  </div>
);

// Interrupteur accessible (role="switch" + aria-pressed) dans le style admin
// existant, réimplémenté ici en <button> réel plutôt que le <span> de
// ToggleSwitch dans primitives.tsx.
const ProgToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-pressed={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="w-10 h-6 relative transition-colors"
    style={{
      background: checked ? 'var(--admin-accent)' : 'rgba(228, 236, 247, 0.12)',
      border: '1px solid var(--admin-line)',
    }}
  >
    <span
      className="absolute top-0.5 w-5 h-5 transition-transform"
      style={{
        left: checked ? '1.1rem' : '2px',
        background: checked ? 'var(--admin-bg-deep)' : 'var(--admin-text)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }}
    />
  </button>
);

interface Props {
  flags: Record<string, unknown>;
  setFlag: (k: any, v: boolean) => void;
}

const ParametresSection: React.FC<Props> = ({ flags, setFlag }) => {
  const [progFlags, setProgFlags] = useState<ProgFlags>(PROG_FLAGS_DEFAULTS);

  useEffect(() => {
    const unsubscribe = watchProgFlags(setProgFlags);
    return unsubscribe;
  }, []);

  const handleProgToggle = (champ: keyof ProgFlags, valeur: boolean) => {
    setProgFlags((prev) => ({ ...prev, [champ]: valeur }));
    setProgFlag(champ, valeur).catch(() => {
      // Firestore indisponible : l'avertissement du bloc couvre déjà ce cas.
    });
  };

  // Les bascules générales : tout ce qui est booléen, moins les drapeaux
  // de publication, qui ont leur propre panneau juste en dessous. Les clés
  // inconnues restent visibles, rangées parmi les orphelins.
  const clesGenerales = Object.keys(flags).filter(
    (k) => typeof flags[k] === 'boolean' && !PUBLISH_FLAG_KEYS.has(k),
  );

  const env = {
    siteMode:   import.meta.env.VITE_SITE_MODE || 'live',
    devBypass:  import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true',
    fbReady:    !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    pixelReady: !!import.meta.env.VITE_META_PIXEL_ID,
    audioReady: !!import.meta.env.VITE_AUDIO_TRACK_URL,
    zeffyReady: !!import.meta.env.VITE_ZEFFY_TICKET_URL,
    admins:     (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').filter(Boolean),
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Site flags toggles, rangés par famille */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Settings size={14} /> Drapeaux du site
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-6">
          Bascules visibles côté public, synchronisées en temps réel via Firestore (<code className="text-brass">siteFlags/global</code>). Sous chaque nom, la phrase dit ce qui arrive quand on l’éteint. Une pastille « Dormante » signale un interrupteur que l’audit du 2 septembre 2026 a trouvé sans effet : il reste en place tant qu’Alex n’a pas tranché.
        </p>
        <div className="space-y-8">
          {FAMILLES.map(({ id, titre, intro }) => {
            const cles = clesGenerales.filter((k) => decrire(k).famille === id);
            if (cles.length === 0) return null;
            return (
              <div key={id}>
                <p className="font-display title-medieval text-xs text-brass uppercase tracking-widest">{titre}</p>
                <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1 mb-2">{intro}</p>
                <div className="space-y-1">
                  {cles.map((k) => {
                    const b = decrire(k);
                    return (
                      <Ligne
                        key={k}
                        label={b.label}
                        effet={b.effet}
                        dormante={b.dormante}
                        checked={!!flags[k]}
                        onChange={(v) => setFlag(k, v)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-page publication: reveal categories one by one */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Eye size={14} /> Publication des pages
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Chaque page reste cachée derrière le teaser « Site bientôt disponible » tant qu'elle est éteinte. Activez-la pour la faire apparaître dans le menu principal, en direct, sans redéploiement.
        </p>
        <div className="space-y-1">
          {PILLAR_PUBLISH_FLAGS.map(({ flag, label }) => (
            <Ligne
              key={flag}
              label={label}
              effet={effetPublication(label)}
              checked={!!flags[flag]}
              onChange={(v) => setFlag(flag, v)}
            />
          ))}
        </div>
      </Card>

      {/* Programmation page section toggles */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Eye size={14} /> Page Programmation : sections visibles
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Bascules synchronisées en temps réel via Firestore (<code className="text-brass">siteFlags/programmation</code>).
        </p>
        {!env.fbReady && (
          <p className="flex items-center gap-2 font-sans text-xs text-blush mb-4">
            <ShieldAlert size={13} className="shrink-0" /> Firebase indisponible : ces bascules affichent les valeurs par défaut et ne s'enregistrent pas pour le moment.
          </p>
        )}
        <div className="space-y-1">
          {PROG_FLAG_ROWS.map(({ flag, label, effet, dormante }) => (
            <div key={flag} className="flex items-start justify-between gap-4 py-3 border-b border-ivory-soft/15 last:border-0">
              <div className={`min-w-0 ${dormante ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans text-sm text-ivory">{label}</span>
                  {dormante && <Dormante mot={dormante} />}
                </div>
                <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1">{effet}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <span className={`font-display title-medieval text-xs ${progFlags[flag] ? 'text-emerald-400' : 'text-ivory-soft/50'}`}>
                  {progFlags[flag] ? 'Allumé' : 'Éteint'}
                </span>
                <ProgToggle checked={progFlags[flag]} onChange={(v) => handleProgToggle(flag, v)} label={label} />
              </div>
            </div>
          ))}
        </div>
        <p className="font-editorial italic text-xs text-ivory-soft/70 mt-5 pt-5 border-t border-ivory-soft/15">
          Éteindre une section la retire de la page publique immédiatement. Le Béhourd et les Ateliers sont éteints par défaut.
        </p>
      </Card>

      {/* Configuration status */}
      <Card className="p-6 md:p-8">
        <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
          <Globe size={14} /> État de la configuration
        </h3>
        <p className="font-editorial italic text-sm text-ivory-soft mb-5">
          Variables d’environnement actuellement détectées dans <code className="text-brass">.env.local</code>.
        </p>
        <div className="space-y-2 font-sans text-sm">
          <Row icon={Database} label="Firebase"             value={env.fbReady    ? 'Configuré'    : 'Non configuré'} ok={env.fbReady} />
          <Row icon={ShieldAlert} label="Bypass admin DEV"  value={env.devBypass  ? 'ACTIF'        : 'Désactivé'}     warn={env.devBypass} />
          <Row icon={Globe}    label="Mode du site"         value={env.siteMode}                                                ok={env.siteMode === 'live'} />
          <Row icon={Music}    label="Lecteur audio"        value={env.audioReady ? 'Configuré'    : 'Aucune piste'}  ok={env.audioReady} />
          <Row icon={Globe}    label="Pixel Meta"           value={env.pixelReady ? 'Configuré'    : 'Non configuré'} ok={env.pixelReady} />
          <Row icon={Globe}    label="Zeffy ticketing"      value={env.zeffyReady ? 'Configuré'    : 'Non configuré'} ok={env.zeffyReady} />
        </div>
        <div className="mt-5 pt-5 border-t border-ivory-soft/15">
          <p className="font-display title-medieval text-xs text-brass mb-2">Admins (allowlist)</p>
          {env.admins.length === 0 ? (
            <p className="font-editorial italic text-sm text-blush">Aucun admin défini: n’importe qui peut se connecter sans gate.</p>
          ) : (
            <ul className="space-y-1">
              {env.admins.map((a) => (
                <li key={a} className="font-sans text-sm text-ivory-soft">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};

const Row: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; ok?: boolean; warn?: boolean }> = ({ icon: Icon, label, value, ok, warn }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-ivory-soft/10 last:border-0">
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-brass shrink-0" />
      <span className="text-ivory">{label}</span>
    </div>
    <span className={`font-display title-medieval text-xs ${warn ? 'text-blush' : ok ? 'text-emerald-400' : 'text-ivory-soft'}`}>{value}</span>
  </div>
);

export default ParametresSection;
