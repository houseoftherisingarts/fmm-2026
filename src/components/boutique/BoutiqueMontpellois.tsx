import React, { useEffect, useMemo, useState } from 'react';
import { Palette, Disc3, Gift, Music, Ticket, BookOpen, Loader2, ArrowUpRight, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { definirPref, suivreFiche, type SkinMembre } from '../../firebase/ordre';
import { suivreSansPub } from '../../firebase/sansPub';
import { ecouterAvatar, type AvatarChantier } from '../../chantier/avatar';
import {
  suivreMaBourse, acheterCosmetique, acheterAmbiance, rangFortune,
  PRIX_SKIN, PRIX_ALBUM, PRIX_AMBIANCE, type Bourse,
} from '../../firebase/montpellois';
import { listGroupes, type GroupeMusical } from '../../firebase/groupesMusicaux';
import { AMBIANCES } from '../../lib/ambiances';
import { DOS_CARTES } from '../../games/tarot/dos';

// Les dos vendus ici et leur prix; les autres dos (caravane, William) se gagnent.
const PRIX_DOS: Record<string, number> = { salon: 0 };
import { lienBilletterie, ouvrirBilletterie } from '../../lib/billetterie';
import PieceMontpellois from './PieceMontpellois';
import SansPubPanel from '../compte/SansPubPanel';

// ─── BoutiqueMontpellois : la boutique du profil ─────────────────────
// Alex, 2026-08-28 : le solde en tête, puis les vraies places
// (billet du festival, billet du banquet, livre de recettes — en
// dollars, jamais en Montpellois), le paiement « sans publicité »,
// et enfin les skins et ambiances qui s'achètent en Montpellois.
// Les cosmétiques de l'inventaire (masque du corbeau, couronne de
// fleurs, cape étoilée) sont retirés de la vente : ils restent dans
// le catalogue de chantier/objets.ts, juste plus vendus ici.

export const NOMS_SKIN: Record<SkinMembre, { FR: string; EN: string; couleur: string }> = {
  rouge: { FR: 'Rouge d’origine', EN: 'Original red', couleur: '#8B2E2E' },
  bleu:  { FR: 'Bleu et argent',  EN: 'Blue and silver', couleur: '#8FAFD0' },
  vert:  { FR: 'Vert de forêt',   EN: 'Forest green',    couleur: '#7FA982' },
  dore:  { FR: 'Doré du festin',  EN: 'Festival gold',  couleur: '#D8B05A' },
};
const SKINS_ACHETABLES: Array<'bleu' | 'dore'> = ['bleu', 'dore'];
// Les couleurs réelles des skins (src/index.css, html.skin-*), pour
// que la boutique montre le vrai velours et le vrai métal.
const APERCU_SKIN: Record<'bleu' | 'dore', { velours: string; metal: string }> = {
  bleu: { velours: 'linear-gradient(160deg, #0A1322, #050A13)', metal: '#B9C4D2' },
  dore: { velours: 'linear-gradient(160deg, #120D07, #080503)', metal: '#D9B44A' },
};

// Le même appel que le banquet de Nourriture (src/pages/NourriturePage.tsx) :
// une place, le même lien de secours si la fonction serveur tombe.
const LIEN_BANQUET = 'https://us-central1-festivalmedieval.cloudfunctions.net/banquetLien';
const SQUARE_BANQUET = 'https://square.link/u/g0UOU5L3'; // 65 $ + taxes = 74,73 $

const BoutiqueMontpellois: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const uid = user?.uid;

  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [avatar, setAvatar] = useState<AvatarChantier | null>(null);
  const [sansPub, setSansPub] = useState(false);
  const [skinActuel, setSkinActuel] = useState<SkinMembre | undefined>();
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);
  const [groupesCharges, setGroupesCharges] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dejaReclameLocal, setDejaReclameLocal] = useState(false);
  const [banquetEnRoute, setBanquetEnRoute] = useState(false);
  const [banquetEchec, setBanquetEchec] = useState(false);

  useEffect(() => { if (uid) return suivreMaBourse(uid, setBourse); }, [uid]);
  useEffect(() => { if (uid) return ecouterAvatar(uid, setAvatar); }, [uid]);
  useEffect(() => { if (uid) return suivreSansPub(uid, setSansPub); }, [uid]);
  useEffect(() => { if (uid) return suivreFiche(uid, (m) => setSkinActuel(m?.prefs?.skin)); }, [uid]);
  useEffect(() => { listGroupes().then((g) => { setGroupes(g); setGroupesCharges(true); }); }, []);

  async function acheterBanquet() {
    if (!user) return;
    setBanquetEnRoute(true); setBanquetEchec(false);
    try {
      const r = await fetch(LIEN_BANQUET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          places: 1,
          uid: user.uid,
          courriel: user.email || '',
          nom: user.displayName || '',
          retour: window.location.origin + window.location.pathname,
        }),
      });
      const d = await r.json();
      if (!d.url) throw new Error('sans url');
      window.location.href = d.url;
    } catch {
      setBanquetEchec(true);
      setBanquetEnRoute(false);
    }
  }

  // La roue des sept jours (RecompensesQuotidiennes, montée dans App)
  // fait la réclamation et la fanfare : le bouton ne fait que l'ouvrir.
  function reclamer() {
    window.dispatchEvent(new Event('fmm:ouvrir-recompenses'));
    setDejaReclameLocal(true);
  }

  async function acheterDos(id: string) {
    setErreur(null); setEnCours(`dos_${id}`);
    try { await acheterCosmetique(`dos_${id}`); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setEnCours(null); }
  }

  async function acheterUneAmbiance(id: string) {
    setErreur(null); setEnCours(`ambiance_${id}`);
    try { await acheterAmbiance(id); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setEnCours(null); }
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
          <PieceMontpellois size={36} image />
          <div>
            <p className="witcher-stat-label">{fr ? 'Vos Montpellois' : 'Your Montpellois'}</p>
            <p className="font-display title-medieval text-2xl text-ivory">{bourse?.solde ?? 10}</p>
            {(() => {
              const { actuel, prochain } = rangFortune(bourse?.gagne ?? 0);
              return (
                <p className="font-sans text-[11px] mt-0.5" style={{ color: 'rgba(244,239,227,0.55)' }}>
                  {actuel ? (fr ? actuel.nomFR : actuel.nomEN) : (fr ? 'Sans rang encore' : 'No rank yet')}
                  {prochain && (fr
                    ? ` · encore ${prochain.seuil - (bourse?.gagne ?? 0)} pour « ${prochain.nomFR} »`
                    : ` · ${prochain.seuil - (bourse?.gagne ?? 0)} more for “${prochain.nomEN}”`)}
                </p>
              );
            })()}
          </div>
        </div>
        <button
          type="button"
          onClick={reclamer}
          disabled={enCours === 'quotidien' || dejaReclame}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40"
        >
          <Gift size={14} />
          {dejaReclame ? (fr ? 'Déjà réclamée aujourd’hui' : 'Already claimed today') : (fr ? 'Réclamer ma récompense du jour' : 'Claim today’s reward')}
        </button>
      </div>

      {erreur && <p className="font-editorial italic text-xs text-blush">{erreur}</p>}

      {/* La billetterie et la table : les vraies places, en dollars,
          jamais en Montpellois (Alex, 2026-08-28). */}
      <section>
        <p className="witcher-stat-label mb-4"><Ticket size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'La billetterie et la table' : 'Tickets and the table'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Billet du festival : la campagne membre, cinq dollars de
              moins que la campagne publique (voir src/lib/billetterie.ts). */}
          <div className="glass-light rounded-lg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 shrink-0 rounded-md overflow-hidden" style={{ border: '1.5px solid rgba(216,176,90,0.4)' }}>
                <img src="/photos/tournage-2026/cavaliere-charge.webp" alt="" aria-hidden loading="lazy" className="w-full h-full object-cover" />
              </span>
              <div className="min-w-0">
                <p className="font-display title-medieval text-sm text-ivory truncate">{fr ? 'Billet du festival' : 'Festival ticket'}</p>
                <p className="font-editorial italic text-[10px] text-ivory-soft/50">{fr ? 'Votre place pour les trois jours' : 'Your pass for the three days'}</p>
              </div>
            </div>
            <a href={lienBilletterie(Boolean(user))} target="_blank" rel="noopener noreferrer"
               onClick={(e) => { e.preventDefault(); ouvrirBilletterie(Boolean(user)); }}
               className="mt-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card">
              {fr ? 'Voir les billets' : 'See tickets'} <ArrowUpRight size={11} />
            </a>
          </div>

          {/* Billet du banquet : même appel serveur que la page
              Nourriture (LIEN_BANQUET), une place à la fois. */}
          <div className="glass-light rounded-lg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 shrink-0 rounded-md overflow-hidden" style={{ border: '1.5px solid rgba(216,176,90,0.4)' }}>
                <img src="/wix/nourriture/banquet-cercle.webp" alt="" aria-hidden loading="lazy" className="w-full h-full object-cover" />
              </span>
              <div className="min-w-0">
                <p className="font-display title-medieval text-sm text-ivory truncate">{fr ? 'Billet du banquet' : 'Banquet ticket'}</p>
                <p className="font-sans text-sm text-brass font-semibold mt-0.5">74,73 $</p>
              </div>
            </div>
            <button type="button" disabled={banquetEnRoute || !uid} onClick={acheterBanquet}
                    className="mt-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
              {banquetEnRoute ? <Loader2 size={12} className="animate-spin" /> : (fr ? 'Réserver ma place' : 'Book my seat')}
            </button>
            {banquetEchec && (
              <p className="font-editorial text-[11px] text-blush">
                {fr ? 'Le lien direct : ' : 'Direct link: '}
                <a href={import.meta.env.VITE_SQUARE_BANQUET_URL || SQUARE_BANQUET} target="_blank" rel="noopener noreferrer" className="underline text-brass">
                  {fr ? 'payer le banquet' : 'pay for the banquet'}
                </a>
              </p>
            )}
          </div>

          {/* Livre de recettes : pas encore en vente (voir GRIMOIRE_EN_VENTE,
              src/pages/NourriturePage.tsx), même patron « à venir » que les
              albums plus bas. */}
          <div className="glass-light rounded-lg-card overflow-hidden flex flex-col relative">
            <span className="absolute top-2 right-2 z-10 witcher-stat-label bg-midnight-deep/85 px-2 py-1 rounded-card">
              {fr ? 'À venir' : 'Coming soon'}
            </span>
            <div className="aspect-[4/3] bg-midnight-deep/60 relative overflow-hidden">
              <img src="/grimoire/couverture-livre-recettes.webp" alt="" loading="lazy" className="w-full h-full object-cover opacity-70" />
            </div>
            <div className="p-4 flex flex-col gap-2">
              <p className="font-display title-medieval text-sm text-ivory truncate flex items-center gap-1.5"><BookOpen size={13} className="text-brass shrink-0" />{fr ? 'Livre de recettes du festival' : 'Festival recipe book'}</p>
              <span className="font-sans text-sm text-brass font-semibold">9 $ + taxes</span>
              <button type="button" disabled
                      className="mt-1 px-3.5 py-1.5 bg-brass/40 text-midnight-deep/70 font-sans uppercase tracking-wider text-[10px] font-semibold rounded-card cursor-not-allowed">
                {fr ? 'Acheter' : 'Buy'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Retirer les publicités, paiement unique (déplacé du profil, Alex, 2026-08-28). */}
      {uid && <div id="don-sans-pub"><SansPubPanel uid={uid} courriel={user?.email || undefined} lang={lang} /></div>}

      {/* Skins de la plateforme */}
      <section>
        <p className="witcher-stat-label mb-4"><Palette size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Skins de la plateforme' : 'Platform skins'}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SKINS_ACHETABLES.filter((skin) => !(skinsDebloques.includes(skin) || skinActuel === skin)).map((skin) => {
            const info = NOMS_SKIN[skin];
            const aDeja = sansPub;
            return (
              <div key={skin} className="glass-light rounded-lg-card p-4 flex items-center gap-3">
                {/* L'aperçu du skin : son velours et son métal, comme à l'écran (Alex, 2026-08-30). */}
                <span className="w-14 h-14 shrink-0 rounded-md relative overflow-hidden" style={{ background: APERCU_SKIN[skin].velours, border: `1.5px solid ${APERCU_SKIN[skin].metal}` }}>
                  <span className="absolute inset-2 rounded-full" style={{ border: `2px solid ${APERCU_SKIN[skin].metal}`, boxShadow: `0 0 14px ${APERCU_SKIN[skin].metal}66 inset` }} />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45" style={{ background: APERCU_SKIN[skin].metal }} />
                </span>
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

      {/* Les dos de carte du tarot (Alex, 2026-08-30) : le dos du Salon des
          Inconnus est offert; les autres se gagnent aux récompenses
          quotidiennes et ne se vendent pas. Un dos obtenu quitte la
          boutique et vit au coffre. */}
      {DOS_CARTES.some((d) => d.id in PRIX_DOS && !(bourse?.dosTarot || []).includes(d.id)) && (
        <section>
          <p className="witcher-stat-label mb-4"><Layers size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Dos de carte du tarot' : 'Tarot card backs'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOS_CARTES.filter((d) => d.id in PRIX_DOS && !(bourse?.dosTarot || []).includes(d.id)).map((d) => (
              <div key={d.id} className="glass-light rounded-lg-card p-4 flex items-center gap-3">
                <span className="w-14 h-20 shrink-0 rounded-md overflow-hidden" style={{ border: '1.5px solid rgba(216,176,90,0.4)' }}>
                  <img src={d.image} alt="" aria-hidden loading="lazy" className="w-full h-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display title-medieval text-sm text-ivory">{fr ? d.nomFR : d.nomEN}</p>
                  <p className="font-sans text-xs mt-0.5 inline-flex items-center gap-1" style={{ color: '#D8B05A' }}>
                    {PRIX_DOS[d.id] === 0 ? (fr ? 'Offert' : 'Free') : (<><PieceMontpellois size={14} />{PRIX_DOS[d.id]}</>)}
                  </p>
                </div>
                <button type="button" disabled={enCours === `dos_${d.id}` || !uid} onClick={() => acheterDos(d.id)}
                        className="px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
                  {enCours === `dos_${d.id}` ? <Loader2 size={12} className="animate-spin" /> : (fr ? 'Prendre' : 'Take')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ambiances (voir src/lib/ambiances.ts) : les trois du festival
          sont déjà offertes à tous dans le panneau Musique, seules
          celles marquées `gratuite: false` s'achètent ici (Alex,
          2026-08-28). Une piste à ce jour, « Le ménestrel », posée en
          test. */}
      <section>
        <p className="witcher-stat-label mb-2"><Music size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Les ambiances' : 'Ambiences'}</p>
        <p className="font-editorial italic text-xs text-ivory-soft/60 mb-4">
          {fr ? 'Une musique de plus pour l’onglet Profil, à choisir dans le panneau Musique une fois achetée.' : 'One more track for the Profile tab, pick it in the Music panel once bought.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AMBIANCES.filter((a) => !a.gratuite && !(bourse?.ambiances || []).includes(a.id)).map((a) => {
            const possedee = false;
            return (
              <div key={a.id} className="glass-light rounded-lg-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-14 h-14 shrink-0 rounded-md flex items-center justify-center" style={{ background: 'rgba(244,239,227,0.05)', border: '1.5px solid rgba(216,176,90,0.4)' }}>
                    <Music size={22} style={{ color: '#D8B05A' }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-sm text-ivory truncate">{fr ? a.titreFR : a.titreEN}</p>
                    <p className="font-editorial italic text-[10px] text-ivory-soft/50 truncate">{a.credit}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-sans text-sm text-brass font-semibold">
                    <PieceMontpellois size={16} />{PRIX_AMBIANCE}
                  </span>
                  <button type="button" disabled={possedee || enCours === `ambiance_${a.id}` || !uid}
                          onClick={() => acheterUneAmbiance(a.id)}
                          className="px-3.5 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40">
                    {possedee ? (fr ? 'À vous' : 'Yours') : (fr ? 'Acheter' : 'Buy')}
                  </button>
                </div>
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
        {!groupesCharges ? (
          <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Chargement…' : 'Loading…'}</p>
        ) : groupes.length === 0 ? (
          <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Aucun groupe pour le moment.' : 'No bands yet.'}</p>
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
