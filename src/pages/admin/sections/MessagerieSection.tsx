import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Send, Users, User, UserCheck, Tag, Plus, Check, X,
  History, TriangleAlert, Loader2, CircleCheck,
} from 'lucide-react';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, EmptyState, Badge, fmtDate } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listerMembres, filtrerMembres, lireFiche, listerEtiquettes, creerEtiquette,
  marquerMembres, membresParRole, membresParTag, normaliserTag,
  ROLES_MEMBRE, LIBELLE_ROLE, rolesAffiches, LONGUEUR_TAG,
  type Membre, type RoleMembre,
} from '../../../firebase/ordre';
import { LONGUEUR_MAX } from '../../../firebase/moderation';
import {
  ecrireAUnMembre, envoyerEnNombre, resumerEnvoi, suivreEnvois,
  FESTIVAL_NOM, FESTIVAL_UID, PLAFOND_REGISTRE,
  type EnvoiMasse,
} from '../../../firebase/messagerieAdmin';

// ─── La messagerie de l'équipe ───────────────────────────────────────
// Alex, 2026-08-24 : d'ici, l'équipe écrit dans la boîte de réception
// des membres. Trois portées, une seule liste.
//
//   • Une personne. Le message part au nom de celle qui l'écrit, dans
//     le fil ordinaire des deux, celui de /messages.
//   • Les personnes cochées. La liste se filtre par nom, par fonction
//     et par étiquette de groupe, et le tout se coche d'un geste.
//   • Tout le registre.
//
// Alex, 2026-09-01 : le même geste dépose les deux livraisons, le
// message dans l'espace client et la lettre à l'adresse du compte.
// Tous les envois passent donc par la Cloud Function
// `messagerieDeMasse`, y compris celui à une seule personne : le
// navigateur ne fait qu'appeler et regarder l'avancement monter. Un
// panneau de confirmation rappelle le compte exact avant que quoi que
// ce soit parte, et chaque envoi laisse sa trace dans l'historique au
// bas de la page.

type Portee = 'une' | 'cochees' | 'tous';

const PORTEES: { id: Portee; libelle: string; icone: React.ComponentType<{ size?: number }> }[] = [
  { id: 'une',     libelle: 'Une personne',          icone: User },
  { id: 'cochees', libelle: 'Les personnes cochées', icone: UserCheck },
  { id: 'tous',    libelle: 'Tout le registre',      icone: Users },
];

/** La jauge d'un des deux temps de l'envoi. Le même filet de laiton que
 *  partout ailleurs dans l'admin, écrit une fois plutôt que deux. */
const Avancement: React.FC<{ titre: string; fait: number; total: number }> = ({ titre, fait, total }) => (
  <div>
    <p className="font-sans text-[11px] uppercase tracking-[0.24em] mb-2" style={{ color: 'var(--admin-text-soft)' }}>
      {titre}
    </p>
    <div style={{ height: 4, borderRadius: 999, background: 'rgba(4, 8, 12, 0.62)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.round((fait / Math.max(1, total)) * 100)}%`,
          background: 'linear-gradient(90deg, var(--admin-brass-lo), var(--admin-brass-hi))',
          transition: 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  </div>
);

const TOUTES_FONCTIONS = '__toutes__';
const TOUTES_ETIQUETTES = '__toutes__';

const MessagerieSection: React.FC = () => {
  const { user } = useAuth();

  const [membres, setMembres]       = useState<Membre[]>([]);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);

  const [portee, setPortee] = useState<Portee>('une');
  const [terme, setTerme]   = useState('');
  const [fonction, setFonction]   = useState<string>(TOUTES_FONCTIONS);
  const [etiquette, setEtiquette] = useState<string>(TOUTES_ETIQUETTES);
  const [coches, setCoches] = useState<Set<string>>(new Set());

  const [texte, setTexte]     = useState('');
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi]     = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);
  const [succes, setSucces]   = useState<string | null>(null);

  const [nouvelleEtiquette, setNouvelleEtiquette] = useState('');
  const [etiquetteChoisie, setEtiquetteChoisie]   = useState('');
  const [marquage, setMarquage] = useState(false);

  const [envois, setEnvois] = useState<EnvoiMasse[]>([]);
  const [envoiSuivi, setEnvoiSuivi] = useState<string | null>(null);

  // L'identité de la personne qui écrit : son nom, sa teinte et sa
  // photo viennent de sa propre fiche du registre quand elle en a une,
  // et de son compte sinon. Jamais un identifiant : le membre doit lire
  // un nom dans sa boîte.
  const [maFiche, setMaFiche] = useState<Membre | null>(null);
  const monNom = (maFiche?.nom || '').trim()
    || (user?.displayName || '').trim()
    || (user?.email || '').split('@')[0]
    || 'L’équipe du festival';

  useEffect(() => {
    let mort = false;
    Promise.all([listerMembres(PLAFOND_REGISTRE, true), listerEtiquettes()])
      .then(([liste, tags]) => {
        if (mort) return;
        setMembres(liste);
        setEtiquettes(tags);
      })
      .catch((e) => { if (!mort) setErreur(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!mort) setChargement(false); });
    return () => { mort = true; };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    lireFiche(user.uid).then(setMaFiche).catch(() => setMaFiche(null));
  }, [user?.uid]);

  useEffect(() => suivreEnvois(setEnvois), []);

  // ── Le filtrage : le nom, la fonction et l'étiquette se cumulent ──
  // Le registre vraiment joignable : ni la personne qui écrit, ni le
  // compte d'affichage du festival, qui ne reçoit rien.
  const joignables = useMemo(
    () => membres.filter((m) => m.uid && m.uid !== user?.uid && m.uid !== FESTIVAL_UID),
    [membres, user?.uid],
  );

  const trouves = useMemo(() => {
    let liste = joignables;
    if (fonction !== TOUTES_FONCTIONS) liste = membresParRole(liste, fonction as RoleMembre);
    if (etiquette !== TOUTES_ETIQUETTES) liste = membresParTag(liste, etiquette);
    return filtrerMembres(liste, terme);
  }, [joignables, terme, fonction, etiquette]);

  const nbCoches = coches.size;
  const destinataires = portee === 'tous' ? joignables.length : nbCoches;

  const seul = portee === 'une' && nbCoches === 1
    ? membres.find((m) => m.uid === [...coches][0]) ?? null
    : null;

  // La phrase qui décrit la cible, gardée telle quelle dans l'historique.
  const cible = portee === 'tous'
    ? 'Tout le registre'
    : [
        fonction !== TOUTES_FONCTIONS ? `fonction ${LIBELLE_ROLE[fonction as RoleMembre].FR}` : null,
        etiquette !== TOUTES_ETIQUETTES ? `étiquette ${etiquette}` : null,
      ].filter(Boolean).join(', ') || 'Sélection à la main';

  const basculer = (uid: string) => {
    setSucces(null); setConfirme(false);
    setCoches((c) => {
      if (portee === 'une') return c.has(uid) ? new Set() : new Set([uid]);
      const suivant = new Set(c);
      if (suivant.has(uid)) suivant.delete(uid); else suivant.add(uid);
      return suivant;
    });
  };

  const toutCocher = () => {
    setConfirme(false);
    setCoches(new Set(trouves.map((m) => m.uid)));
  };
  const toutDecocher = () => { setConfirme(false); setCoches(new Set()); };

  const changerPortee = (p: Portee) => {
    setPortee(p);
    setConfirme(false); setSucces(null); setErreur(null);
    // Passer à « une personne » avec quinze cases cochées serait un
    // piège : la sélection retombe à la dernière cochée, ou à rien.
    if (p === 'une') setCoches((c) => (c.size > 1 ? new Set() : c));
  };

  // ── Les étiquettes de groupe ──────────────────────────────────────
  const etiqueter = async (poser: boolean) => {
    const tag = normaliserTag(etiquetteChoisie);
    if (!tag || !nbCoches) return;
    setMarquage(true); setErreur(null); setSucces(null);
    try {
      const uids = [...coches];
      await marquerMembres(uids, tag, poser);
      setMembres((liste) => liste.map((m) => {
        if (!coches.has(m.uid)) return m;
        const tags = new Set(m.tags || []);
        if (poser) tags.add(tag); else tags.delete(tag);
        return { ...m, tags: [...tags].sort((a, b) => a.localeCompare(b, 'fr')) };
      }));
      if (poser && !etiquettes.includes(tag)) setEtiquettes((t) => [...t, tag].sort((a, b) => a.localeCompare(b, 'fr')));
      setSucces(poser
        ? `L’étiquette « ${tag} » est collée sur ${uids.length} fiche${uids.length > 1 ? 's' : ''}.`
        : `L’étiquette « ${tag} » est retirée de ${uids.length} fiche${uids.length > 1 ? 's' : ''}.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setMarquage(false);
    }
  };

  const creerLEtiquette = async () => {
    const tag = normaliserTag(nouvelleEtiquette);
    if (!tag) return;
    setMarquage(true); setErreur(null);
    try {
      await creerEtiquette(tag);
      setEtiquettes((t) => (t.some((x) => x.toLowerCase() === tag.toLowerCase()) ? t : [...t, tag].sort((a, b) => a.localeCompare(b, 'fr'))));
      setEtiquetteChoisie(tag);
      setNouvelleEtiquette('');
      setSucces(`L’étiquette « ${tag} » existe. Coche des membres et colle-la sur leurs fiches.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setMarquage(false);
    }
  };

  // ── L'envoi ───────────────────────────────────────────────────────
  const pretAEnvoyer = texte.trim().length > 0 && destinataires > 0 && !envoi;

  const demanderConfirmation = () => {
    setErreur(null); setSucces(null);
    if (!pretAEnvoyer) return;
    // Une lettre à une seule personne part sans cérémonie. Dès qu'elle
    // en vise plusieurs, le panneau redemande le geste.
    if (destinataires === 1 && portee === 'une') void envoyer();
    else setConfirme(true);
  };

  const envoyer = async () => {
    setEnvoi(true); setErreur(null); setSucces(null); setConfirme(false);
    try {
      if (portee === 'une' && seul) {
        const resultat = await ecrireAUnMembre(seul, texte);
        setEnvoiSuivi(resultat.envoiId);
        setSucces(resumerEnvoi(resultat, (seul.nom || 'ce membre').trim()));
      } else {
        const resultat = await envoyerEnNombre({
          portee: portee === 'tous' ? 'tous' : 'selection',
          uids: portee === 'tous' ? undefined : [...coches],
          texte,
          cible,
        });
        setEnvoiSuivi(resultat.envoiId);
        setSucces(resumerEnvoi(resultat));
      }
      setTexte('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  };

  const enCours = envois.find((e) => e.id === envoiSuivi && e.statut === 'en cours');

  return (
    <div className="space-y-7">
      {/* Ce que fait cette page, en deux phrases, sans carte autour :
          c'est de la prose, pas un panneau de contrôle. */}
      <div className="max-w-[68ch]">
        <p className="admin-prose">
          Écris à une personne du registre, à un groupe que tu coches, ou à tout le monde d’un
          seul coup. Chaque envoi dépose deux choses : le message dans la boîte de réception du
          membre, au même endroit que les conversations qu’il a déjà, et une lettre à l’adresse
          de son compte, aux couleurs du festival, avec un bouton qui le ramène ici pour
          répondre.
        </p>
        <p className="admin-prose mt-3">
          Un message à une seule personne part <strong>à ton nom</strong>, et la lettre porte ton
          adresse en « répondre à ». Dès qu’il vise un groupe, il part au nom du festival, parce
          que trois cents membres n’ont pas à recevoir une lettre signée d’un prénom qu’ils ne
          connaissent pas.
        </p>
        <p className="admin-prose mt-3">
          Un membre qui n’a pas d’adresse au dossier reçoit quand même le message dans son
          espace. Celui qui a éteint cette alerte dans son compte le reçoit aussi, et lui seul
          décide s’il veut la lettre par-dessus.
        </p>
      </div>

      {/* ── La portée ── */}
      <div className="flex flex-wrap gap-2">
        {PORTEES.map(({ id, libelle, icone: Icone }) => {
          const actif = portee === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => changerPortee(id)}
              aria-pressed={actif}
              className="inline-flex items-center gap-2 px-4 py-2.5 font-sans uppercase tracking-[0.2em] text-[10px] transition-colors"
              style={{
                borderRadius: 15,
                color: actif ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
                background: actif
                  ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)'
                  : 'rgba(196, 214, 230, 0.03)',
                border: `1px solid ${actif ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
                boxShadow: actif ? 'inset 0 1px 0 var(--admin-sheen)' : 'none',
              }}
            >
              <Icone size={13} />
              {libelle}
            </button>
          );
        })}
      </div>

      {/* ── Le registre ── */}
      {portee === 'tous' ? (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Users size={20} style={{ color: 'var(--admin-accent)' }} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
                {destinataires} membre{destinataires > 1 ? 's' : ''} au registre
              </p>
              <p className="admin-prose mt-1.5">
                Le même texte partira dans le fil de chacune de ces personnes, au nom du festival.
                Ta propre fiche reste en dehors du compte.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="relative flex-1 min-w-[220px]">
              <Label>Chercher</Label>
              <Search
                size={14}
                className="absolute left-3 bottom-[0.72rem]"
                style={{ color: 'var(--admin-text-mute)' }}
              />
              <Input
                value={terme}
                onChange={(e) => setTerme(e.target.value)}
                placeholder="Nom, ville ou description"
                className="pl-9"
              />
            </div>
            <div className="min-w-[170px]">
              <Label>Fonction</Label>
              <select
                value={fonction}
                onChange={(e) => setFonction(e.target.value)}
                className="admin-input"
              >
                <option value={TOUTES_FONCTIONS}>Toutes les fonctions</option>
                {ROLES_MEMBRE.map((r) => (
                  <option key={r} value={r}>{LIBELLE_ROLE[r].FR}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[170px]">
              <Label>Étiquette</Label>
              <select
                value={etiquette}
                onChange={(e) => setEtiquette(e.target.value)}
                className="admin-input"
              >
                <option value={TOUTES_ETIQUETTES}>Toutes les étiquettes</option>
                {etiquettes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-seam mb-4" />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
              {trouves.length} personne{trouves.length > 1 ? 's' : ''} à l’écran
              {nbCoches > 0 && (
                <span style={{ color: 'var(--admin-brass-hi)' }}>
                  {' · '}{nbCoches} coché{nbCoches > 1 ? 'es' : 'e'}
                </span>
              )}
            </p>
            {portee === 'cochees' && (
              <div className="flex items-center gap-2">
                <GhostButton type="button" onClick={toutCocher} disabled={!trouves.length}>
                  <Check size={12} /> Tout cocher
                </GhostButton>
                <GhostButton type="button" onClick={toutDecocher} disabled={!nbCoches}>
                  <X size={12} /> Tout décocher
                </GhostButton>
              </div>
            )}
          </div>

          {chargement ? (
            <EmptyState icon={Loader2}>Le registre arrive.</EmptyState>
          ) : trouves.length === 0 ? (
            <EmptyState icon={Search}>Personne ne correspond à ce filtre.</EmptyState>
          ) : (
            <ul
              className="space-y-1.5 overflow-y-auto admin-nav-scroll"
              style={{ maxHeight: 460 }}
            >
              {trouves.map((m) => {
                const pris = coches.has(m.uid);
                const fonctions = rolesAffiches(m.roles).filter((r) => r !== 'membre');
                return (
                  <li key={m.uid}>
                    <button
                      type="button"
                      onClick={() => basculer(m.uid)}
                      aria-pressed={pris}
                      className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left transition-colors"
                      style={{
                        borderRadius: 15,
                        background: pris
                          ? 'color-mix(in oklab, var(--admin-accent), transparent 91%)'
                          : 'transparent',
                        border: `1px solid ${pris ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
                      }}
                    >
                      <span
                        aria-hidden
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 18, height: 18,
                          borderRadius: portee === 'une' ? 999 : 6,
                          border: `1px solid ${pris ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
                          background: pris ? 'var(--admin-accent)' : 'transparent',
                          color: '#080D11',
                        }}
                      >
                        {pris && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[0.95rem] truncate" style={{ color: 'var(--admin-text)' }}>
                          {(m.nom || '').trim() || 'Sans nom'}
                        </span>
                        {(fonctions.length > 0 || (m.tags || []).length > 0 || m.ville) && (
                          <span className="block font-sans text-[10px] uppercase tracking-[0.16em] truncate mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                            {[
                              m.ville,
                              ...fonctions.map((r) => LIBELLE_ROLE[r].FR),
                              ...(m.tags || []),
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── Les étiquettes de groupe ── */}
          {portee === 'cochees' && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--admin-groove)', boxShadow: '0 -1px 0 var(--admin-sheen) inset' }}>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} style={{ color: 'var(--admin-accent)' }} />
                <h3 className="font-display title-medieval text-base" style={{ color: 'var(--admin-text)' }}>
                  Étiquettes de groupe
                </h3>
              </div>
              <p className="admin-prose mb-4">
                Une étiquette range des gens ensemble sans rien changer à leurs droits : viking,
                pirate, villageois, saltimbanque, client, municipalité. Coche des membres, choisis
                une étiquette, et elle se colle sur toutes les fiches d’un coup.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px]">
                  <Label>Étiquette à poser</Label>
                  <select
                    value={etiquetteChoisie}
                    onChange={(e) => setEtiquetteChoisie(e.target.value)}
                    className="admin-input"
                  >
                    <option value="">Choisir</option>
                    {etiquettes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <GhostButton
                  type="button"
                  disabled={!etiquetteChoisie || !nbCoches || marquage}
                  onClick={() => void etiqueter(true)}
                >
                  <Check size={12} /> Coller aux {nbCoches || 0} cochées
                </GhostButton>
                <GhostButton
                  type="button"
                  disabled={!etiquetteChoisie || !nbCoches || marquage}
                  onClick={() => void etiqueter(false)}
                >
                  <X size={12} /> Retirer
                </GhostButton>
                <div className="min-w-[200px] flex-1">
                  <Label>Nouvelle étiquette</Label>
                  <div className="flex gap-2">
                    <Input
                      value={nouvelleEtiquette}
                      maxLength={LONGUEUR_TAG}
                      onChange={(e) => setNouvelleEtiquette(e.target.value)}
                      placeholder="saltimbanque"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void creerLEtiquette(); } }}
                    />
                    <GhostButton
                      type="button"
                      disabled={!normaliserTag(nouvelleEtiquette) || marquage}
                      onClick={() => void creerLEtiquette()}
                    >
                      <Plus size={12} /> Créer
                    </GhostButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Le message ── */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h3 className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
            Le message
          </h3>
          <span className="font-sans text-[11px]" style={{ color: texte.length > LONGUEUR_MAX ? '#FCA5B0' : 'var(--admin-text-mute)' }}>
            {texte.length} / {LONGUEUR_MAX}
          </span>
        </div>

        <p className="admin-prose mb-4">
          {portee === 'une' && seul && (
            <>Ce message ira dans la boîte de <strong>{(seul.nom || 'ce membre').trim()}</strong> et par courriel à l’adresse de son compte, signé de ton nom, {monNom}.</>
          )}
          {portee === 'une' && !seul && (
            <>Coche un nom dans le registre, puis écris.</>
          )}
          {portee === 'cochees' && (
            <>Ce message ira dans la boîte et dans le courriel des <strong>{nbCoches}</strong> personne{nbCoches > 1 ? 's' : ''} cochée{nbCoches > 1 ? 's' : ''}, au nom du festival.</>
          )}
          {portee === 'tous' && (
            <>Ce message ira dans la boîte et dans le courriel des <strong>{destinataires}</strong> membres du registre, au nom du festival.</>
          )}
        </p>

        <Textarea
          value={texte}
          rows={7}
          maxLength={LONGUEUR_MAX}
          onChange={(e) => { setTexte(e.target.value); setConfirme(false); setSucces(null); }}
          placeholder="Bonjour, nous préparons l’horaire du samedi et nous aimerions savoir à quelle heure vous comptez arriver."
        />

        {/* ── Le garde-fou ──
            Un panneau dans la page, jamais une boîte du navigateur : le
            compte exact est écrit noir sur or, et le geste se redemande. */}
        {confirme ? (
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
                  {destinataires} personne{destinataires > 1 ? 's' : ''} vont recevoir ce message
                </p>
                <p className="admin-prose mt-1.5">
                  Il arrivera dans leur boîte de réception et par courriel à l’adresse de leur
                  compte, signé {FESTIVAL_NOM}, et rien ne le rappellera une fois parti. La
                  portée retenue est : {cible.toLowerCase()}.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <PrimaryButton type="button" onClick={() => void envoyer()} disabled={envoi}>
                    <Send size={13} className="inline mr-1.5 -mt-0.5" />
                    Envoyer aux {destinataires} personnes
                  </PrimaryButton>
                  <GhostButton type="button" onClick={() => setConfirme(false)}>
                    Annuler
                  </GhostButton>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 mt-5">
            <PrimaryButton type="button" onClick={demanderConfirmation} disabled={!pretAEnvoyer}>
              {envoi
                ? <><Loader2 size={13} className="inline mr-1.5 -mt-0.5 animate-spin" /> Envoi en cours</>
                : <><Send size={13} className="inline mr-1.5 -mt-0.5" /> Envoyer</>}
            </PrimaryButton>
            {destinataires === 0 && (
              <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                Aucun destinataire n’est retenu.
              </span>
            )}
          </div>
        )}

        {/* L'avancement, tiré du document d'historique que la fonction
            met à jour à chaque lot. Les fils s'écrivent en premier et en
            quelques secondes; les lettres suivent, au rythme du serveur
            de courriel, et c'est la seconde barre qui prend le temps. */}
        {enCours && (
          <div className="mt-5 space-y-3">
            <Avancement
              titre={`${enCours.faits} fil${enCours.faits > 1 ? 's' : ''} sur ${enCours.destinataires}`}
              fait={enCours.faits}
              total={enCours.destinataires}
            />
            {(enCours.lettresPrevues ?? 0) > 0 && (
              <Avancement
                titre={`${enCours.lettres ?? 0} lettre${(enCours.lettres ?? 0) > 1 ? 's' : ''} sur ${enCours.lettresPrevues}`}
                fait={enCours.lettres ?? 0}
                total={enCours.lettresPrevues ?? 0}
              />
            )}
          </div>
        )}

        {erreur && (
          <p className="admin-prose mt-4" style={{ color: '#FCA5B0' }}>{erreur}</p>
        )}
        {succes && (
          <p className="admin-prose mt-4 inline-flex items-start gap-2" style={{ color: '#5FD3A2' }}>
            <CircleCheck size={15} className="shrink-0 mt-1" />
            <span>{succes}</span>
          </p>
        )}
      </Card>

      {/* ── L'historique ── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <History size={15} style={{ color: 'var(--admin-accent)' }} />
          <h3 className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
            Ce qui est parti
          </h3>
        </div>
        <p className="admin-prose mb-4">
          Chaque envoi laisse sa trace ici, celui à une seule personne comme celui à tout le
          registre : qui l’a écrit, quand, à quelle portée, le texte exact, et le compte des
          messages posés puis des lettres parties.
        </p>

        {envois.length === 0 ? (
          <Card><EmptyState icon={History}>Aucun envoi pour le moment.</EmptyState></Card>
        ) : (
          <ul className="space-y-2.5">
            {envois.map((e) => (
              <li key={e.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 mb-2.5">
                    <p className="font-display text-[0.95rem]" style={{ color: 'var(--admin-text)' }}>
                      {e.parNom}
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] ml-3" style={{ color: 'var(--admin-text-mute)' }}>
                        {fmtDate(e.envoyeLe, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{e.cible}</Badge>
                      <Badge tone={e.statut === 'terminé' ? 'accepted' : e.statut === 'échoué' ? 'rejected' : 'pending'}>
                        {e.faits} / {e.destinataires} messages
                      </Badge>
                      {(e.lettresPrevues ?? 0) > 0 && (
                        <Badge tone={(e.lettresEchouees ?? 0) > 0 ? 'rejected' : 'accepted'}>
                          {e.lettres ?? 0} / {e.lettresPrevues} lettres
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="admin-prose" style={{ whiteSpace: 'pre-wrap' }}>{e.texte}</p>
                  {e.erreur && (
                    <p className="font-sans text-xs mt-2" style={{ color: '#FCA5B0' }}>{e.erreur}</p>
                  )}
                  {e.erreurCourriel && (
                    <p className="font-sans text-xs mt-2" style={{ color: '#FCA5B0' }}>
                      Les messages sont posés, mais le serveur de courriel n’a pas répondu : {e.erreurCourriel}
                    </p>
                  )}
                  {!!e.adressesEchouees?.length && (
                    <p className="font-sans text-xs mt-2" style={{ color: '#FCA5B0' }}>
                      Adresses refusées : {e.adressesEchouees.map((a) => a.courriel).join(', ')}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default MessagerieSection;
