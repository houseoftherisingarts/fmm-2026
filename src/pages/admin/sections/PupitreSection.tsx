import React, { useMemo } from 'react';
import { Crown, Feather } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../primitives';
import PupitreApp from '../pupitre/PupitreApp';
import { PRESET_NAMES } from '../pupitre/constants';

// ─── Pupitre admin section ────────────────────────────────────────────
// Mounts the standalone "Le Pupitre Médiéval" tool inside the admin
// shell. Two signing rules:
//   • Super-admins (Tristan, Alex, or anyone with super role)
//     can pick ANY preset name as the signer.
//   • CA / Organisateurs are locked to their own name (resolved from
//     their displayName via a fuzzy match against PRESET_NAMES).
//
// The locked name is also enforced inside PupitreApp itself so a
// devtools edit of the disabled <select> can't sneak through.

// Tokenise a name for matching: lowercase, strip accents, split on
// whitespace + punctuation. "Maïté Fournel" → ['maite', 'fournel'].
function tokenize(s: string): string[] {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Pick the PRESET_NAME whose tokens best overlap with the user's
// displayName tokens. Returns null if no preset matches at least
// 2 shared tokens (rule of thumb — first + last name).
function resolveLockedName(displayName: string | null | undefined): string | null {
  if (!displayName) return null;
  const userTokens = new Set(tokenize(displayName));
  if (userTokens.size === 0) return null;
  let best: { name: string; score: number } | null = null;
  for (const preset of PRESET_NAMES) {
    const presetTokens = tokenize(preset);
    let score = 0;
    for (const t of presetTokens) if (userTokens.has(t)) score++;
    if (score >= 2 && (!best || score > best.score)) best = { name: preset, score };
  }
  return best ? best.name : null;
}

const PupitreSection: React.FC = () => {
  const { user, adminRole, isSuperAdmin } = useAuth();
  const displayName = user?.displayName || null;

  const lockedSignerName = useMemo(
    () => resolveLockedName(displayName),
    [displayName],
  );

  // Super-admins (covers Tristan / Alex / any future super) get the
  // free dropdown. Organisateurs + CA are locked to their own name.
  const canSignAnyName = isSuperAdmin || adminRole === 'super';

  // Sanity prompt — if a non-super admin's displayName doesn't match
  // any PRESET_NAME, they can't sign anything. Surface the rule so
  // they know who to ping to get their name added.
  if (!canSignAnyName && !lockedSignerName) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-card bg-blush/15 border border-blush/40 text-blush flex items-center justify-center shrink-0">
              <Feather size={20} />
            </div>
            <div>
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">Le Pupitre</p>
              <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">Nom non reconnu</h2>
              <p className="font-editorial italic text-sm text-ivory-soft">
                Votre nom (« {displayName || 'inconnu'} ») ne correspond à aucun signataire pré-enregistré
                dans la liste du Pupitre. Demandez à Tristan ou Alex d’ajouter votre nom à la liste des signataires.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personalised header */}
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-card bg-brass/15 border border-brass/40 text-brass flex items-center justify-center shrink-0">
            {canSignAnyName ? <Crown size={20} /> : <Feather size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">
              Le Pupitre Médiéval de Montpellier
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">
              {canSignAnyName ? 'Bureau de scribe — accès complet' : 'Bureau de scribe'}
            </h2>
            <p className="font-editorial italic text-sm text-ivory-soft">
              {canSignAnyName
                ? 'Vous pouvez choisir n’importe quel nom de signataire. Réservé aux super-admins (Tristan, Alex).'
                : <>Vous signerez sous le nom <strong className="text-ivory">{lockedSignerName}</strong> — seul Tristan ou Alex peuvent signer au nom d’autrui.</>}
            </p>
          </div>
        </div>
      </Card>

      <PupitreApp
        canSignAnyName={canSignAnyName}
        lockedSignerName={lockedSignerName}
      />
    </div>
  );
};

export default PupitreSection;
