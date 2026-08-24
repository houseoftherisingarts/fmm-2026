import React, { useEffect, useMemo, useState } from 'react';
import { Search, Save, BadgeCheck } from 'lucide-react';
import {
  listerMembres, filtrerMembres, definirRoles,
  ROLES_MEMBRE, LIBELLE_ROLE, rolesAffiches,
  type Membre, type RoleMembre,
} from '../../../firebase/ordre';
import { Card, Input, PrimaryButton, EmptyState } from '../primitives';

// ─── Les fonctions des membres ───────────────────────────────────────
// Alex, 2026-08-23 : une même personne porte souvent plusieurs chapeaux.
// On la cherche par son nom, on coche ses fonctions, elles paraissent
// aussitôt en pastilles sous son nom, sur son espace comme sur sa fiche
// publique. Personne ne s'attribue « administrateur » tout seul : la
// règle Firestore refuse le champ à tout le monde sauf à l'équipe.

const FonctionsMembres: React.FC = () => {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [terme, setTerme]     = useState('');
  const [ouvert, setOuvert]   = useState<string | null>(null);
  const [choix, setChoix]     = useState<RoleMembre[]>([]);
  const [busy, setBusy]       = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);
  const [fait, setFait]       = useState<string | null>(null);

  useEffect(() => {
    listerMembres()
      .then(setMembres)
      .catch((e) => setErreur(e instanceof Error ? e.message : String(e)));
  }, []);

  const trouves = useMemo(
    () => (terme.trim() ? filtrerMembres(membres, terme).slice(0, 12) : []),
    [membres, terme],
  );

  const ouvrir = (m: Membre) => {
    setOuvert(m.uid);
    setChoix(rolesAffiches(m.roles));
    setFait(null);
  };

  const cocher = (r: RoleMembre) => {
    if (r === 'membre') return;   // tout le monde reste membre
    setChoix((c) => (c.includes(r) ? c.filter((x) => x !== r) : [...c, r]));
    setFait(null);
  };

  const enregistrer = async (m: Membre) => {
    setBusy(true); setErreur(null);
    try {
      const roles = rolesAffiches(choix);
      await definirRoles(m.uid, roles);
      setMembres((liste) => liste.map((x) => (x.uid === m.uid ? { ...x, roles } : x)));
      setFait(m.uid);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <BadgeCheck size={16} className="text-brass" />
        <h3 className="font-display title-medieval text-lg text-ivory">Fonctions des membres</h3>
      </div>
      <p className="font-editorial text-sm text-ivory-soft mb-4">
        Cherchez quelqu’un par son nom, puis cochez les fonctions qu’il porte au festival.
        Elles paraissent en pastilles sous son nom, partout sur le site. Tout le monde garde « Membre ».
      </p>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-soft/50" />
        <Input
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder="Nom, ville ou description"
          className="pl-9"
        />
      </div>

      {erreur && (
        <p className="font-editorial text-sm text-blush mb-4">{erreur}</p>
      )}

      {terme.trim() && trouves.length === 0 && (
        <EmptyState>Personne de ce nom dans le registre.</EmptyState>
      )}

      <ul className="space-y-2">
        {trouves.map((m) => {
          const actif = ouvert === m.uid;
          return (
            <li key={m.uid} className="rounded-card border border-ivory-soft/12">
              <button
                type="button"
                onClick={() => (actif ? setOuvert(null) : ouvrir(m))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-display text-base text-ivory truncate">{m.nom || 'Sans nom'}</span>
                  <span className="block font-sans text-[11px] uppercase tracking-[0.18em] text-ivory-soft/55 truncate">
                    {rolesAffiches(m.roles).map((r) => LIBELLE_ROLE[r].FR).join(' · ')}
                  </span>
                </span>
                <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-brass shrink-0">
                  {actif ? 'Fermer' : 'Modifier'}
                </span>
              </button>

              {actif && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ROLES_MEMBRE.map((r) => {
                      const pris = choix.includes(r);
                      const fige = r === 'membre';
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => cocher(r)}
                          disabled={fige}
                          className="px-3 py-1.5 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] transition disabled:cursor-default"
                          style={{
                            color: pris ? '#D8B05A' : 'rgba(244,239,227,0.55)',
                            background: pris ? 'rgba(216,176,90,0.14)' : 'transparent',
                            border: `1px solid ${pris ? 'rgba(216,176,90,0.45)' : 'rgba(244,239,227,0.16)'}`,
                            opacity: fige ? 0.75 : 1,
                          }}
                        >
                          {LIBELLE_ROLE[r].FR}
                        </button>
                      );
                    })}
                  </div>
                  <PrimaryButton type="button" disabled={busy} onClick={() => void enregistrer(m)}>
                    <Save size={14} className="inline mr-1.5 -mt-0.5" />
                    {fait === m.uid ? 'Fonctions à jour' : 'Enregistrer les fonctions'}
                  </PrimaryButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default FonctionsMembres;
