import React, { useEffect, useMemo, useState } from 'react';
import { Gem, Palette, Disc3, Gift } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { definirPref, suivreFiche, type SkinMembre } from '../../firebase/ordre';
import { suivreSansPub } from '../../firebase/sansPub';
import { ecouterAvatar, type AvatarChantier } from '../../chantier/avatar';
import { OBJETS_BOUTIQUE, COULEUR_RARETE } from '../../chantier/objets';
import {
  suivreMaBourse, acheterCosmetique, reclamerQuotidien, rangFortune,
  PRIX_SKIN, PRIX_ALBUM, type Bourse,
} from '../../firebase/montpellois';
import { listGroupes, type GroupeMusical } from '../../firebase/groupesMusicaux';
import PieceMontpellois from './PieceMontpellois';

// ─── BoutiqueMontpellois : la grille des cosmétiques achetables ──────
// Alex, 2026-08-28 : le solde en tête, les objets de boutique
// (objets.ts, source: 'boutique'), les trois skins de la plateforme
// (gratuits VIP), puis les albums des groupes — encore « à venir ».

const NOMS_SKIN: Record<SkinMembre, { FR: string; EN: string; couleur: string }> = {
  rouge: { FR: 'Rouge d’origine', EN: 'Original red', couleur: '#8B2E2E' },
  bleu:  { FR: 'Bleu de nuit',    EN: 'Night blue',    couleur: '#2E4A8B' },
  dore:  { FR: 'Doré du festin',  EN: 'Festival gold',  couleur: '#D8B05A' },
};
const SKINS_ACHETABLES: SkinMembre[] = ['bleu', 'dore'];

const BoutiqueMontpellois: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const uid = user?.uid;

  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [avatar, setAvatar] = useState<AvatarChantier | null>(null);
  const [sansPub, setSansPub] = useState(false);
  const [skinActuel, setSkinActuel] = useState<SkinMembre | undefined>();
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dejaReclameLocal, setDejaReclameLocal] = useState(false);

  useEffect(() => { if (uid) return suivreMaBourse(uid, setBourse); }, [uid]);
  useEffect(() => { if (uid) return ecouterAvatar(uid, setAvatar); }, [uid]);
  useEffect(() => { if (uid) return suivreSansPub(uid, setSansPub); }, [uid]);
  useEffect(() => { if (uid) return suivreFiche(uid, (m) => setSkinActuel(m?.prefs?.skin)); }, [uid]);
  useEffect(() => { listGroupes().then(setGroupes); }, []);

  const possedes = useMemo(() => {
    if (!avatar) return new Set<string>();
    const equipes = Object.values(avatar.equipe).filter((id): id is string => !!id);
    return new Set([...avatar.sac, ...equipes]);
  }, [avatar]);

  async function reclamer() {
    setErreur(null); setEnCours('quotidien');
    try {
      await reclamerQuotidien();
      setDejaReclameLocal(true);
    } catch (e) {
      setDejaReclameLocal(true);
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(null);
    }
  }

  async function acheterObjet(id: string) {
    setErreur(null); setEnCours(id);
    try {
      await acheterCosmetique(id);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(null);
    }
  }

  async function acheterSkin(skin: SkinMembre) {
    if (!uid) return;
    setErreur(null); setEnCours(`skin_${skin}`);
    try {
      if (!sansPub) await acheterCosmetique(`skin_${skin}`);
      await definirPref(uid, 'skin', skin);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(null);
    }
  }

  const skinsDebloques = avatar?.skinsDebloques || [];

  // La date de la dernière réclamation dit déjà si c'est fait pour
  // aujourd'hui, sans attendre un clic raté (Alex, 2026-08-28).
  const dejaReclame = useMemo(() => {
    const d = bourse?.dernierQuotidien;
    const date = d && typeof (d as { toDate?: () => Date }).toDate === 'function' ? (d as { toDate: () => Date }).toDate() : null;
    return dejaReclameLocal || (!!date && date.toDateString() === new Date().toDateString());
  }, [bourse, dejaReclameLocal]);

  return (
    <div className="space-y-10">
      {/* Solde */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-light rounded-lg-card p-5">
        <div className="flex items-center gap-3">
          <PieceMontpellois size={36} />
          <div>
            <p className="witcher-stat-label">{fr ? 'Vos Montpellois' : 'Your Montpellois'}</p>
            <p className="font-display title-medieval text-2xl text-ivory">{bourse?.solde ?? 10}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={reclamer}
          disabled={enCours === 'quotidien' || dejaReclame}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40"
        >
          <Gift size={14} />
          {dejaReclame ? (fr ? 'Déjà réclamée aujourd’hui' : 'Already claimed today') : (fr ? 'Réclamer ma pièce du jour' : 'Claim today’s coin')}
        </button>
      </div>

      {erreur && <p className="font-editorial italic text-xs text-blush">{erreur}</p>}

      {/* Cosmétiques */}
      <section>
        <p className="witcher-stat-label mb-4"><Gem size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Cosmétiques' : 'Cosmetics'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OBJETS_BOUTIQUE.map((o) => {
            const aDeja = possedes.has(o.id);
            return (
              <div key={o.id} className="glass-light rounded-lg-card p-4 flex flex-col gap-3" style={{ border: `1px solid ${COULEUR_RARETE[o.rarete]}55` }}>
                <div className="flex items-center gap-3">
                  <span className="w-14 h-14 shrink-0 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(244,239,227,0.05)', border: `1.5px solid ${COULEUR_RARETE[o.rarete]}` }}>
                    <span style={{ width: 30, height: 30, borderRadius: 6, background: o.couleur }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-sm text-ivory truncate">{fr ? o.nom.FR : o.nom.EN}</p>
                    <p className="font-sans text-[10px] uppercase tracking-widest" style={{ color: COULEUR_RARETE[o.rarete] }}>{o.rarete}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-sans text-sm text-brass font-semibold">
                    <PieceMontpellois size={16} />{o.prix}
                  </span>
                  <button type="button" disabled={aDeja || enCours === o.id || !uid}
                          onClick={() => acheterObjet(o.id)}
                          className="px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
                    {aDeja ? (fr ? 'À vous' : 'Yours') : (fr ? 'Acheter' : 'Buy')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Skins de la plateforme */}
      <section>
        <p className="witcher-stat-label mb-4"><Palette size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Skins de la plateforme' : 'Platform skins'}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SKINS_ACHETABLES.map((skin) => {
            const info = NOMS_SKIN[skin];
            const aDeja = sansPub || skinsDebloques.includes(skin) || skinActuel === skin;
            return (
              <div key={skin} className="glass-light rounded-lg-card p-4 flex items-center gap-3">
                <span className="w-14 h-14 shrink-0 rounded-md" style={{ background: info.couleur, border: '1.5px solid rgba(244,239,227,0.25)' }} />
                <div className="min-w-0 flex-1">
                  <p className="font-display title-medieval text-sm text-ivory truncate">{fr ? info.FR : info.EN}</p>
                  <p className="inline-flex items-center gap-1.5 font-sans text-sm text-brass font-semibold mt-1">
                    {sansPub ? (fr ? 'Gratuit · VIP' : 'Free · VIP') : (<><PieceMontpellois size={14} />{PRIX_SKIN[skin]}</>)}
                  </p>
                </div>
                <button type="button" disabled={aDeja || enCours === `skin_${skin}` || !uid}
                        onClick={() => acheterSkin(skin)}
                        className="px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40 shrink-0">
                  {aDeja ? (fr ? 'À vous' : 'Yours') : (fr ? 'Acheter' : 'Buy')}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Albums des groupes */}
      <section>
        <p className="witcher-stat-label mb-2"><Disc3 size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Les albums' : 'Albums'}</p>
        <p className="font-editorial italic text-xs text-ivory-soft/60 mb-4">
          {fr ? 'Achetez l’album d’un groupe : ses musiques deviennent une ambiance possible du site, dans votre espace.' : 'Buy a band’s album: its music becomes a possible site ambience in your space.'}
        </p>
        {groupes.length === 0 ? (
          <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Chargement…' : 'Loading…'}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupes.map((g) => (
              <div key={g.id} className="glass-light rounded-lg-card overflow-hidden flex flex-col relative">
                <span className="absolute top-2 right-2 z-10 witcher-stat-label bg-midnight-deep/85 px-2 py-1 rounded-card">
                  {fr ? 'À venir' : 'Coming soon'}
                </span>
                <div className="aspect-[4/3] bg-midnight-deep/60 relative overflow-hidden">
                  {g.photoUrl ? (
                    <img src={g.photoUrl} alt={g.nom} className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ivory-soft/30"><Disc3 size={28} /></div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <p className="font-display title-medieval text-sm text-ivory truncate">{g.nom}</p>
                  <span className="inline-flex items-center gap-1.5 font-sans text-sm text-brass font-semibold">
                    <PieceMontpellois size={14} />{PRIX_ALBUM}
                  </span>
                  <button type="button" disabled
                          className="mt-1 px-3.5 py-1.5 bg-brass/40 text-midnight-deep/70 font-sans uppercase tracking-wider text-[10px] font-semibold rounded-card cursor-not-allowed">
                    {fr ? 'Acheter' : 'Buy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BoutiqueMontpellois;
