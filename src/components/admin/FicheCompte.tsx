import React, { useEffect, useState } from 'react';
import {
  X, Mail, Phone, Languages, MapPin, Ticket, HandHeart, ShoppingBag,
  BadgeCheck, Tag, Send, Save, Loader2, TriangleAlert, CircleCheck, CalendarDays,
} from 'lucide-react';
import { Textarea, PrimaryButton, GhostButton, Badge, fmtDate } from '../../pages/admin/primitives';
import { useAuth } from '../../contexts/AuthContext';
import {
  lireFiche, rolesAffiches, ROLES_MEMBRE, LIBELLE_ROLE,
  type Membre, type RoleMembre,
} from '../../firebase/ordre';
import { definirFonctions, type AppUser } from '../../firebase/users';
import { ecrireAUnMembre } from '../../firebase/messagerieAdmin';
import { LONGUEUR_MAX } from '../../firebase/moderation';

// ─── La fiche d'un compte ────────────────────────────────────────────
// Alex, 2026-09-02 : dans le registre des comptes, un clic sur un nom
// ouvre la personne. On y lit ce que le festival sait d'elle, on lui
// pose ou on lui retire ses fonctions, et on lui écrit sans changer
// d'écran.
//
// Les fonctions sont exactement celles de « Écrire au membre » : la
// liste vit dans ROLES_MEMBRE (src/firebase/ordre.ts) et sert autant au
// filtre de la messagerie qu'aux pastilles sous le nom, partout sur le
// site. Une personne en porte plusieurs, et tout le monde garde
// « Membre » : c'est le plancher que rolesAffiches remet toujours.
//
// Deux garde-fous. La fonction d'administrateur se redemande dans un
// panneau avant de partir, parce qu'elle affiche « Admin · Modérateur »
// sous le nom devant tout le registre. Et chaque enregistrement écrit
// sur la fiche du membre le courriel de la personne qui l'a fait, avec
// l'heure, de sorte qu'une pastille surprenante se remonte à sa source.
//
// Ce que ces fonctions ne font PAS : ouvrir l'espace admin. Les vrais
// droits d'accès vivent dans la collection `adminRoles` et dans la
// liste de courriels de firestore.rules, et se décernent depuis l'écran
// des rôles. Poser ici « administrateur » décore un nom, ça n'ouvre
// aucune porte.

interface Props {
  compte: AppUser;
  onFermer: () => void;
}

/** Les trois champs de trace que `definirFonctions` pose sur la fiche
 *  du membre. Ils ne figurent pas dans l'interface `Membre` : la fiche
 *  du compte est la seule à les écrire et à les lire. */
type Trace = { rolesPar?: string; rolesParEmail?: string; rolesLe?: unknown };

const memesFonctions = (a: RoleMembre[], b: RoleMembre[]): boolean =>
  a.length === b.length && a.every((r) => b.includes(r));

const FicheCompte: React.FC<Props> = ({ compte, onFermer }) => {
  const { user } = useAuth();

  const [fiche, setFiche]     = useState<(Membre & Trace) | null>(null);
  const [maFiche, setMaFiche] = useState<Membre | null>(null);
  const [chargement, setChargement] = useState(true);

  // `poses` est ce qui dort dans Firestore, `choix` ce que l'écran
  // montre. Tant que les deux diffèrent, le bouton d'enregistrement a
  // quelque chose à faire.
  const [poses, setPoses] = useState<RoleMembre[]>(['membre']);
  const [choix, setChoix] = useState<RoleMembre[]>(['membre']);
  const [garde, setGarde] = useState(false);

  const [texte, setTexte] = useState('');
  const [busy, setBusy]   = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const nom = (fiche?.nom || compte.displayName || '').trim() || 'Sans nom';
  const monNom = (maFiche?.nom || '').trim()
    || (user?.displayName || '').trim()
    || (user?.email || '').split('@')[0]
    || 'L’équipe du festival';
  const cestMoi = !!user?.uid && user.uid === compte.uid;

  useEffect(() => {
    let mort = false;
    setChargement(true);
    Promise.all([
      lireFiche(compte.uid),
      user?.uid ? lireFiche(user.uid) : Promise.resolve(null),
    ])
      .then(([f, moi]) => {
        if (mort) return;
        const fichePlus = f as (Membre & Trace) | null;
        setFiche(fichePlus);
        setMaFiche(moi);
        const r = rolesAffiches(fichePlus?.roles);
        setPoses(r);
        setChoix(r);
      })
      .catch((e) => { if (!mort) setErreur(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!mort) setChargement(false); });
    return () => { mort = true; };
  }, [compte.uid, user?.uid]);

  // La touche d'échappement ferme la fiche, comme partout ailleurs.
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [onFermer]);

  const cocher = (r: RoleMembre) => {
    if (r === 'membre') return;   // le plancher de tout le monde
    setGarde(false); setSucces(null);
    setChoix((c) => (c.includes(r) ? c.filter((x) => x !== r) : [...c, r]));
  };

  const aChange   = !memesFonctions(choix, poses);
  const donneAdmin = choix.includes('administrateur') && !poses.includes('administrateur');

  const demanderEnregistrement = () => {
    setErreur(null); setSucces(null);
    if (!aChange) return;
    if (donneAdmin) setGarde(true);
    else void enregistrer();
  };

  const enregistrer = async () => {
    if (!user?.uid || !user.email) {
      setErreur('Votre session n’a pas de courriel : impossible de signer le changement.');
      return;
    }
    setBusy(true); setGarde(false); setErreur(null); setSucces(null);
    try {
      const roles = rolesAffiches(choix);
      await definirFonctions(compte.uid, roles, { uid: user.uid, email: user.email });
      const courriel = user.email.trim().toLowerCase();
      setPoses(roles);
      setChoix(roles);
      setFiche((f) => ({
        ...(f ?? { uid: compte.uid, nom }),
        roles,
        rolesPar: user.uid,
        rolesParEmail: courriel,
        rolesLe: new Date(),
      } as Membre & Trace));
      setSucces(`Les fonctions de ${nom} sont à jour.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const envoyer = async () => {
    const corps = texte.trim();
    if (!corps || !user?.uid) return;
    setEnvoi(true); setErreur(null); setSucces(null);
    try {
      await ecrireAUnMembre(
        { uid: user.uid, nom: monNom, teinte: maFiche?.avatarHue, photo: maFiche?.avatarUrl },
        { uid: compte.uid, nom, avatarHue: fiche?.avatarHue, avatarUrl: fiche?.avatarUrl },
        corps,
      );
      setTexte('');
      setSucces(`Le message est dans la boîte de ${nom}, à votre nom.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  };

  const faits: { icone: React.ComponentType<{ size?: number }>; libelle: string; valeur: string }[] = [
    { icone: Mail,         libelle: 'Courriel',   valeur: compte.email || '—' },
    { icone: Phone,        libelle: 'Téléphone',  valeur: compte.phone || '—' },
    { icone: Languages,    libelle: 'Langue',     valeur: compte.lang || '—' },
    { icone: MapPin,       libelle: 'Ville',      valeur: fiche?.ville || '—' },
    { icone: CalendarDays, libelle: 'Inscrit le', valeur: fmtDate(compte.createdAt) },
    { icone: Ticket,       libelle: 'Origine',    valeur: compte.origine === 'zeffy' ? 'Importé de Zeffy' : 'Inscription au site' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(4, 8, 11, 0.74)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche de ${nom}`}
        className="admin-card-strong w-full max-w-2xl p-6 md:p-7 my-auto"
      >
        {/* ── L'en-tête : qui on regarde ── */}
        <header className="flex items-start gap-4">
          <div
            aria-hidden
            className="shrink-0 w-12 h-12 flex items-center justify-center font-display title-medieval text-lg overflow-hidden"
            style={{
              borderRadius: 15,
              color: 'var(--admin-brass-hi)',
              background: 'color-mix(in oklab, var(--admin-accent), transparent 88%)',
              border: '1px solid var(--admin-accent-line)',
            }}
          >
            {fiche?.avatarUrl
              ? <img src={fiche.avatarUrl} alt="" className="w-full h-full object-cover" />
              : nom.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display title-medieval text-xl truncate inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
              {nom}
              {fiche?.verifie && <BadgeCheck size={16} className="shrink-0" color="#4c8ef7" fill="#F4EFE3" />}
            </h2>
            <p className="font-sans text-xs truncate" style={{ color: 'var(--admin-text-soft)' }}>
              {compte.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer la fiche"
            className="shrink-0 p-1.5 transition-colors"
            style={{ borderRadius: 10, color: 'var(--admin-text-soft)' }}
          >
            <X size={16} />
          </button>
        </header>

        <div className="admin-seam my-5" />

        {/* ── Ce que le festival sait ── */}
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {faits.map(({ icone: Icone, libelle, valeur }) => (
            <div key={libelle} className="min-w-0">
              <dt className="font-sans uppercase tracking-[0.24em] text-[10px] mb-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {libelle}
              </dt>
              <dd className="font-sans text-sm truncate inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
                <Icone size={12} />{valeur}
              </dd>
            </div>
          ))}
        </dl>

        {(compte.hasBenevoleApp || compte.hasVendorApp || (fiche?.tags || []).length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {compte.hasBenevoleApp && <Badge tone="info"><HandHeart size={10} className="inline mr-1 -mt-0.5" />Candidature bénévole</Badge>}
            {compte.hasVendorApp   && <Badge tone="info"><ShoppingBag size={10} className="inline mr-1 -mt-0.5" />Candidature marchande</Badge>}
            {(fiche?.tags || []).map((t) => (
              <Badge key={t}><Tag size={10} className="inline mr-1 -mt-0.5" />{t}</Badge>
            ))}
          </div>
        )}

        {fiche?.devise && (
          <p className="admin-prose mt-4">{fiche.devise}</p>
        )}

        <div className="admin-seam my-5" />

        {/* ── Les fonctions ── */}
        <h3 className="font-display title-medieval text-lg mb-1.5" style={{ color: 'var(--admin-text)' }}>
          Ses fonctions au festival
        </h3>
        <p className="admin-prose mb-4">
          Cochez tout ce que cette personne porte. Une même personne cumule souvent plusieurs
          chapeaux, bénévole le samedi et marchande le dimanche, et ses pastilles paraissent
          sous son nom partout sur le site. Tout le monde garde « Membre ».
        </p>

        {chargement ? (
          <p className="font-sans text-xs inline-flex items-center gap-2" style={{ color: 'var(--admin-text-soft)' }}>
            <Loader2 size={13} className="animate-spin" /> La fiche arrive.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {ROLES_MEMBRE.map((r) => {
                const pris = choix.includes(r);
                const fige = r === 'membre';
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => cocher(r)}
                    disabled={fige || busy}
                    aria-pressed={pris}
                    className="px-3 py-1.5 font-sans uppercase tracking-[0.16em] text-[10px] transition-colors disabled:cursor-default"
                    style={{
                      borderRadius: 15,
                      color: pris ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
                      background: pris ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)' : 'transparent',
                      border: `1px solid ${pris ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
                      opacity: fige ? 0.75 : 1,
                    }}
                  >
                    {LIBELLE_ROLE[r].FR}
                  </button>
                );
              })}
            </div>

            {/* La trace du dernier changement, telle qu'elle dort sur la fiche. */}
            {fiche?.rolesParEmail && (
              <p className="font-sans text-[11px] mt-3" style={{ color: 'var(--admin-text-mute)' }}>
                Dernier changement par {fiche.rolesParEmail}
                {fiche.rolesLe ? `, le ${fmtDate(fiche.rolesLe)}` : ''}.
              </p>
            )}

            {/* Le garde-fou de la fonction d'administrateur. */}
            {garde ? (
              <div
                className="mt-5 p-5"
                style={{
                  borderRadius: 15,
                  background: 'color-mix(in oklab, var(--admin-accent), transparent 93%)',
                  border: '1px solid var(--admin-accent-line)',
                  boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
                }}
              >
                <div className="flex items-start gap-3.5">
                  <TriangleAlert size={18} style={{ color: 'var(--admin-brass-hi)' }} className="shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
                      Donner la fonction d’administrateur à {nom}
                    </p>
                    <p className="admin-prose mt-1.5">
                      La pastille « Admin · Modérateur » paraîtra sous son nom devant tout le
                      registre, et son nom entrera dans le bandeau de l’équipe. Les clés de
                      l’espace admin, elles, se donnent ailleurs, dans l’écran des rôles.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <PrimaryButton type="button" onClick={() => void enregistrer()} disabled={busy}>
                        <Save size={13} className="inline mr-1.5 -mt-0.5" />
                        Oui, donner la fonction
                      </PrimaryButton>
                      <GhostButton type="button" onClick={() => setGarde(false)}>Annuler</GhostButton>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <PrimaryButton type="button" onClick={demanderEnregistrement} disabled={!aChange || busy}>
                  {busy
                    ? <><Loader2 size={13} className="inline mr-1.5 -mt-0.5 animate-spin" /> Enregistrement</>
                    : <><Save size={13} className="inline mr-1.5 -mt-0.5" /> Enregistrer les fonctions</>}
                </PrimaryButton>
                {!aChange && (
                  <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                    Rien n’a changé depuis le dernier enregistrement.
                  </span>
                )}
              </div>
            )}
          </>
        )}

        <div className="admin-seam my-5" />

        {/* ── Lui écrire ── */}
        <h3 className="font-display title-medieval text-lg mb-1.5" style={{ color: 'var(--admin-text)' }}>
          Lui écrire
        </h3>
        {cestMoi ? (
          <p className="admin-prose">C’est votre propre compte : le message vous serait adressé à vous.</p>
        ) : (
          <>
            <p className="admin-prose mb-3">
              Le message arrive dans la boîte de réception de {nom}, au même endroit que ses
              autres conversations, et il est signé de votre nom, {monNom}. Elle vous répond
              directement.
            </p>
            <Textarea
              value={texte}
              rows={4}
              maxLength={LONGUEUR_MAX}
              onChange={(e) => { setTexte(e.target.value); setSucces(null); }}
              placeholder="Bonjour, nous préparons l’horaire du samedi et nous aimerions savoir à quelle heure vous comptez arriver."
            />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <PrimaryButton type="button" onClick={() => void envoyer()} disabled={!texte.trim() || envoi}>
                {envoi
                  ? <><Loader2 size={13} className="inline mr-1.5 -mt-0.5 animate-spin" /> Envoi en cours</>
                  : <><Send size={13} className="inline mr-1.5 -mt-0.5" /> Envoyer</>}
              </PrimaryButton>
              <span className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                {texte.length} / {LONGUEUR_MAX}
              </span>
            </div>
          </>
        )}

        {erreur && <p className="admin-prose mt-4" style={{ color: '#FCA5B0' }}>{erreur}</p>}
        {succes && (
          <p className="admin-prose mt-4 inline-flex items-start gap-2" style={{ color: '#5FD3A2' }}>
            <CircleCheck size={15} className="shrink-0 mt-1" />
            <span>{succes}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default FicheCompte;
