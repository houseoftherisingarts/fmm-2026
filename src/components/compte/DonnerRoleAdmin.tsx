import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile } from '../../firebase/applications';
import { getAdminRole, setAdminRole } from '../../firebase/adminRoles';
import { ALL_ROLES, ROLE_ACCENT, ROLE_LABELS, ROLE_DESCRIPTIONS, type AdminRole } from '../../lib/adminPermissions';

// ─── Ouvrir les portes de l'admin à un membre ────────────────────────
// Alex, 2026-08-28 : « un membre de l'organisation peut choisir
// d'ajouter sur n'importe quel profil la fonction d'administrateur ».
// Le rôle vit dans la collection des rôles d'admin, indexée par le
// courriel, comme ailleurs dans l'application; ce panneau ne paraît que
// pour l'équipe, sur la fiche publique de quelqu'un d'autre.

const DonnerRoleAdmin: React.FC<{ uid: string; nom: string; lang: 'FR' | 'EN' }> = ({ uid, nom, lang }) => {
  const fr = lang === 'FR';
  const { user, isSuperAdmin } = useAuth();
  const [courriel, setCourriel] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState<AdminRole | 'aucun' | null>(null);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const profil = await getUserProfile(uid).catch(() => null);
      if (!vivant) return;
      const mail = profil?.email || null;
      setCourriel(mail);
      if (mail) setRole(await getAdminRole(mail).catch(() => null));
      setChargement(false);
    })();
    return () => { vivant = false; };
  }, [uid]);

  const poser = async (suivant: AdminRole | null) => {
    if (!courriel || !user) return;
    setEnvoi(suivant ?? 'aucun'); setErreur(null);
    try {
      await setAdminRole(courriel, suivant, {
        displayName: nom,
        assignedBy: user.displayName || user.email || 'Équipe',
        assignedByEmail: user.email || '',
      });
      setRole(suivant);
      setFait(true); window.setTimeout(() => setFait(false), 2400);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(null); }
  };

  // Seul un compte de rang supérieur décerne le rang suprême.
  const choix = ALL_ROLES.filter((r) => r !== 'super' || isSuperAdmin);

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-4 pb-2" style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2"><ShieldCheck size={13} /> {fr ? 'Les portes de l’équipe' : 'The team doors'}</span>
        {fait && <span className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-amber-glow)' }}><Check size={12} /> {fr ? 'Enregistré' : 'Saved'}</span>}
      </div>

      {chargement ? (
        <p className="font-sans text-xs text-ivory-soft/50 inline-flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> {fr ? 'Lecture du compte…' : 'Reading the account…'}</p>
      ) : !courriel ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {fr ? 'Ce compte ne porte aucun courriel, alors aucun rôle ne peut lui être attaché.' : 'This account carries no email address, so no role can be attached to it.'}
        </p>
      ) : (
        <>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
            {fr
              ? `Choisissez la porte que ${nom} peut franchir dans l’espace admin. Chaque rang ouvre ses propres sections.`
              : `Choose the door ${nom} may go through in the admin space. Each rank opens its own sections.`}
          </p>
          <ul className="space-y-2">
            {choix.map((r) => {
              const teinte = ROLE_ACCENT[r];
              const actif = role === r;
              return (
                <li key={r}>
                  <button type="button" onClick={() => poser(actif ? null : r)} disabled={envoi !== null}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-card text-left transition-colors disabled:opacity-60"
                          style={{ background: actif ? `${teinte.accentDim}44` : 'rgba(var(--sk-deep-rgb),0.4)', border: `1px solid ${actif ? teinte.accent : teinte.line}` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: teinte.accent }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans uppercase tracking-[0.16em] text-[11px]" style={{ color: actif ? teinte.accent : 'var(--sk-parchment)' }}>
                        {ROLE_LABELS[r][lang]}
                      </span>
                      <span className="block font-editorial text-xs mt-0.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                        {ROLE_DESCRIPTIONS[r][lang]}
                      </span>
                    </span>
                    {envoi === r ? <Loader2 size={13} className="animate-spin shrink-0" style={{ color: teinte.accent }} />
                      : actif ? <Check size={14} className="shrink-0" style={{ color: teinte.accent }} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {role && (
            <button type="button" onClick={() => poser(null)} disabled={envoi !== null}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-stone text-ivory-soft hover:border-brass hover:text-brass font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50">
              {envoi === 'aucun' ? <Loader2 size={13} className="animate-spin" /> : null}
              {fr ? 'Retirer toutes les portes' : 'Remove every door'}
            </button>
          )}
          {erreur && <p className="mt-3 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
        </>
      )}
    </section>
  );
};

export default DonnerRoleAdmin;
