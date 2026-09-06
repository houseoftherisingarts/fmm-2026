import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Landmark, Loader2, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { addLocale } from '../lib/locale';
import { PieceGuilde } from '../components/guilde/SoldePieces';
import { Cadre, Jauge, champ, messageErreur } from '../components/guilde/Tresor';
import { listerMesGuildes, motDeLaForme, PIECE_DEFAUT, type Guilde, type PointTaux } from '../firebase/guildes';
import { suivreMaBourseGuilde, resteAChanger, PLAFOND_CHANGE_JOUR, type BourseGuilde } from '../firebase/guildeMonnaie';
import {
  suivreToutesLesGuildesPubliques, guildeChangerCroise, guildeTresorTransferer,
  tauxDe, tauxCroise, valeurTresorDe, apercuChangeCroise, type GuildeCotee, type Cote,
} from '../firebase/guildeChange';
import type { Lang } from '../content';

// ─── Le bureau de change ─────────────────────────────────────────────
// Addendum 2 du 6 septembre 2026, ordre 11. Toutes les pièces de groupe
// au même tableau, d'un bord à l'autre : la pièce, son cours en
// Montpellois, son cours dans ma pièce de référence, les actifs, le
// trésor, sa valeur, sa part et trente jours de courbe. Dessous, le
// comptoir : convertir mes pièces d'un groupe à l'autre sur sept
// colonnes, et, pour un chef, transférer une fortune de trésor à trésor
// sur cinq. Le tableau se lit sans compte; le comptoir sert les membres.
//
// Rien ici n'écrit un solde : les deux callables de guildeChange.ts
// bougent l'argent, la page lit et demande.

const BOUTON = 'inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50';
const ROUILLE = '#E08A6E';
const PALE = { color: 'rgba(var(--sk-parchment-rgb),0.5)' };

/** Ce qu'il faut d'une guilde pour la coter : la fiche publique, ou
 *  ma propre guilde quand le miroir n'est pas encore écrit. */
type Cotee = Cote & Pick<Guilde, 'id' | 'nom' | 'monnaie'>;

const sigleDe = (g: Pick<Guilde, 'monnaie'>): string => g.monnaie?.sigle || 'PCE';

const BureauDeChangePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, isAdmin, openSignIn } = useAuth();
  const fr = lang === 'FR';
  const uid = user?.uid;

  const [guildes, setGuildes] = useState<GuildeCotee[]>([]);
  useEffect(() => suivreToutesLesGuildesPubliques(setGuildes), []);

  // Mes groupes disent où je suis membre et où je suis chef; ma bourse
  // dans chacun dit ce que je peux changer.
  const [miennes, setMiennes] = useState<Guilde[]>([]);
  useEffect(() => {
    if (!uid) { setMiennes([]); return; }
    let vivant = true;
    listerMesGuildes(uid).then((l) => { if (vivant) setMiennes(l); }).catch(() => {});
    return () => { vivant = false; };
  }, [uid]);

  const [bourses, setBourses] = useState<Record<string, BourseGuilde>>({});
  useEffect(() => {
    if (!uid) return;
    const arrets = miennes.map((g) =>
      suivreMaBourseGuilde(g.id, uid, (b) => setBourses((prev) => ({ ...prev, [g.id]: b }))));
    return () => arrets.forEach((a) => a());
  }, [miennes, uid]);

  const coteDe = useMemo(() => {
    const m: Record<string, Cotee> = {};
    for (const g of miennes) m[g.id] = g;
    for (const g of guildes) m[g.id] = g;
    return m;
  }, [guildes, miennes]);

  // La part du trésor vient du serveur; à défaut elle se calcule ici
  // sur la somme des valeurs (ordre 12).
  const total = guildes.reduce((s, g) => s + valeurTresorDe(g), 0);
  const partDe = (g: Cote) => g.partTresor ?? (total > 0 ? valeurTresorDe(g) / total : 0);

  const [refChoisie, setRefChoisie] = useState('');
  const ref = coteDe[refChoisie] || coteDe[miennes[0]?.id] || guildes[0];

  const sourcesFortune: Cotee[] = isAdmin
    ? guildes
    : miennes.filter((g) => uid && g.admins.includes(uid)).map((g) => coteDe[g.id]);

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={fr ? 'Bureau de change' : 'Exchange bureau'} noindex />
      <PageHeader
        eyebrow={fr ? 'L’Ordre' : 'The Order'}
        titleA={fr ? 'Bureau de change' : 'Exchange bureau'}
        intro={fr
          ? 'Le cours de chaque pièce de groupe, et le comptoir pour passer de l’une à l’autre.'
          : 'The rate of every group coin, and the counter to move from one to another.'}
        orbImage={PIECE_DEFAUT}
        orbLabel={fr ? 'La pièce des groupes' : 'The group coin'}
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 px-5 md:px-10 xl:px-16 space-y-5">

          {/* ── Le tableau des cours, d'un bord à l'autre ── */}
          <Cadre titre={fr ? 'Le cours des pièces' : 'Coin rates'} icone={<Landmark size={12} />}>
            <div className="flex items-center justify-between gap-3 flex-wrap -mt-1 mb-4">
              <p className="font-editorial text-sm text-ivory-soft">
                <span className="text-brass tabular-nums font-medium">{guildes.length}</span>{' '}
                {fr ? (guildes.length > 1 ? 'pièces cotées' : 'pièce cotée') : (guildes.length > 1 ? 'coins quoted' : 'coin quoted')}
              </p>
              {guildes.length > 1 && (
                <label className="inline-flex items-center gap-3 font-sans uppercase tracking-[0.2em] text-[10px]" style={PALE}>
                  {fr ? 'Ma pièce de référence' : 'My reference coin'}
                  <select
                    value={ref?.id || ''} onChange={(e) => setRefChoisie(e.target.value)}
                    className="px-3 py-1.5 rounded-card font-sans text-sm text-ivory normal-case tracking-normal"
                    style={champ}
                  >
                    {guildes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                  </select>
                </label>
              )}
            </div>

            {guildes.length === 0 ? (
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                {fr ? 'Aucune pièce n’est cotée pour l’instant.' : 'No coin is quoted yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      {[
                        fr ? 'Pièce' : 'Coin',
                        fr ? 'Cours' : 'Rate',
                        ref ? `${fr ? 'En' : 'In'} ${sigleDe(ref)}` : '',
                        fr ? 'Actifs' : 'Active',
                        fr ? 'Trésor' : 'Treasury',
                        fr ? 'Valeur' : 'Value',
                        fr ? 'Part du trésor' : 'Treasury share',
                        fr ? '30 jours' : '30 days',
                      ].map((t, i) => (
                        <th
                          key={i} scope="col"
                          className={`pb-3 font-sans uppercase tracking-[0.2em] text-[9px] font-normal whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'} ${i > 0 ? 'pl-5' : ''}`}
                          style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)', borderBottom: '1px solid rgba(var(--sk-parchment-rgb),0.14)' }}
                        >
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guildes.map((g) => {
                      const taux = tauxDe(g);
                      const estRef = g.id === ref?.id;
                      const membre = miennes.some((m) => m.id === g.id);
                      const part = partDe(g);
                      return (
                        <tr
                          key={g.id}
                          style={{
                            borderTop: '1px solid rgba(var(--sk-parchment-rgb),0.1)',
                            background: estRef ? 'rgba(var(--sk-gilt-rgb),0.06)' : undefined,
                          }}
                        >
                          <td className="py-3 pr-4">
                            <Link
                              to={g.slug ? addLocale(`/${g.slug}`, lang) : addLocale(`/guildes/${g.id}`, lang)}
                              className="inline-flex items-center gap-3 group"
                            >
                              <PieceGuilde guilde={g} size={36} />
                              <span className="min-w-0">
                                <span className="block font-display text-base text-ivory leading-tight group-hover:text-brass transition-colors">{g.nom}</span>
                                <span className="block font-sans uppercase tracking-[0.18em] text-[9px] mt-0.5" style={PALE}>
                                  {motDeLaForme(g.forme, lang)}
                                  {membre && <span style={{ color: 'var(--sk-gilt)' }}> · {fr ? 'membre' : 'member'}</span>}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 pl-5 text-right font-sans text-sm text-ivory tabular-nums whitespace-nowrap">
                            1 {sigleDe(g)} = <span className="font-display text-lg">{taux}</span> M
                          </td>
                          <td className="py-3 pl-5 text-right font-sans text-sm text-ivory tabular-nums whitespace-nowrap">
                            {ref && !estRef ? `${tauxCroise(taux, tauxDe(ref))} ${sigleDe(ref)}` : <span style={PALE}>·</span>}
                          </td>
                          <td className="py-3 pl-5 text-right font-sans text-sm text-ivory tabular-nums">{g.nbActifs ?? 0}</td>
                          <td className="py-3 pl-5 text-right font-sans text-sm text-ivory tabular-nums whitespace-nowrap">
                            {Math.round(g.tresor ?? 0)} <span className="text-[10px] uppercase tracking-[0.18em]" style={PALE}>{sigleDe(g)}</span>
                          </td>
                          <td className="py-3 pl-5 text-right font-sans text-sm text-ivory tabular-nums whitespace-nowrap">
                            {valeurTresorDe(g)} <span className="text-[10px] uppercase tracking-[0.18em]" style={PALE}>M</span>
                          </td>
                          <td className="py-3 pl-5 text-right">
                            <span className="inline-flex items-center gap-3">
                              <Jauge part={part} className="w-20" />
                              <span className="font-sans text-sm text-ivory tabular-nums w-10 text-right">{Math.round(part * 100)} %</span>
                            </span>
                          </td>
                          <td className="py-3 pl-5 text-right">
                            <Etincelle historique={g.tauxHistorique} taux={taux} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Cadre>

          {/* ── Le comptoir : sept colonnes pour convertir, cinq pour le trésor ── */}
          {!user ? (
            <div className="glass-light rounded-lg-card p-6 md:p-8 flex items-center justify-between gap-5 flex-wrap">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed min-w-0 flex-1">
                {fr
                  ? 'Le comptoir sert les membres connectés. Le tableau des cours, lui, se lit sans compte.'
                  : 'The counter serves signed-in members. The rate board reads without an account.'}
              </p>
              <button type="button" onClick={openSignIn} className={BOUTON}>
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {miennes.length === 0 ? (
                  <Cadre titre={fr ? 'Convertir mes pièces' : 'Convert my coins'} icone={<ArrowLeftRight size={12} />}>
                    <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                      {fr
                        ? 'Vous n’êtes membre d’aucun groupe. Le comptoir s’ouvre dès que vous en rejoignez un.'
                        : 'You are not a member of any group. The counter opens as soon as you join one.'}
                    </p>
                    <Link to={addLocale('/guildes', lang)} className={`${BOUTON} mt-4`}>
                      {fr ? 'Voir les guildes' : 'See the guilds'}
                    </Link>
                  </Cadre>
                ) : (
                  <FormulaireCroise miennes={miennes} bourses={bourses} coteDe={coteDe} lang={lang} />
                )}
              </div>
              <div className="lg:col-span-5">
                {sourcesFortune.length > 0
                  ? <FormulaireFortune sources={sourcesFortune} guildes={guildes} lang={lang} />
                  : <Regles lang={lang} />}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

// ─── Trente jours de cours, en un trait ──────────────────────────────
const Etincelle: React.FC<{ historique?: PointTaux[]; taux: number }> = ({ historique, taux }) => {
  const serie = (historique || []).slice(-30).map((p) => p.taux);
  while (serie.length < 2) serie.push(taux);
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const pas = 100 / (serie.length - 1);
  const enY = (t: number) => (max === min ? 12 : 22 - ((t - min) / (max - min)) * 20);
  const d = serie.map((t, i) => `${i === 0 ? 'M' : 'L'}${(i * pas).toFixed(1)},${enY(t).toFixed(1)}`).join(' ');
  const delta = serie[serie.length - 1] - serie[0];
  return (
    <span className="inline-flex items-center gap-2 justify-end">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-24 h-6" aria-hidden>
        <path
          d={d} fill="none" stroke="var(--sk-gilt)" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="font-sans text-[10px] tabular-nums w-12 text-right" style={{ color: delta < 0 ? ROUILLE : 'var(--sk-gilt)' }}>
        {delta > 0 ? '+' : ''}{delta.toFixed(3)}
      </span>
    </span>
  );
};

// ─── Convertir mes pièces ────────────────────────────────────────────
const FormulaireCroise: React.FC<{
  miennes: Guilde[];
  bourses: Record<string, BourseGuilde>;
  coteDe: Record<string, Cotee>;
  lang: Lang;
}> = ({ miennes, bourses, coteDe, lang }) => {
  const fr = lang === 'FR';
  const sources = miennes.filter((g) => (bourses[g.id]?.solde ?? 0) > 0);
  const [deChoisie, setDeChoisie] = useState('');
  const [versChoisie, setVersChoisie] = useState('');
  const [montant, setMontant] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const deId = (sources.some((g) => g.id === deChoisie) ? deChoisie : sources[0]?.id) || '';
  const cibles = miennes.filter((g) => g.id !== deId);
  const versId = (cibles.some((g) => g.id === versChoisie) ? versChoisie : cibles[0]?.id) || '';
  const de = coteDe[deId];
  const vers = coteDe[versId];

  const n = Math.max(0, Math.floor(Number(montant) || 0));
  const solde = bourses[deId]?.solde ?? 0;
  const reste = resteAChanger(bourses[deId] ?? null);
  const apercu = de && vers ? apercuChangeCroise(n, tauxDe(de), tauxDe(vers)) : { frais: 0, montpellois: 0, recu: 0 };
  const trop = n > reste;
  const pasAssez = n > solde;
  const videCote = n > 0 && apercu.recu <= 0;
  const bloque = !de || !vers || n <= 0 || trop || pasAssez || videCote;

  const changer = async () => {
    if (!de || !vers) return;
    setBusy(true); setErreur(null); setFait(null);
    try {
      const r = await guildeChangerCroise({ deGuildeId: de.id, versGuildeId: vers.id, montant: n });
      setMontant('');
      const recu = r?.recu ?? apercu.recu;
      setFait(fr
        ? `Fait. ${recu} ${sigleDe(vers)} sont dans votre bourse chez ${vers.nom}.`
        : `Done. ${recu} ${sigleDe(vers)} are in your purse at ${vers.nom}.`);
    } catch (e) {
      setErreur(messageErreur(e, fr));
    } finally { setBusy(false); }
  };

  const remettre = () => { setFait(null); setErreur(null); };

  return (
    <Cadre titre={fr ? 'Convertir mes pièces' : 'Convert my coins'} icone={<ArrowLeftRight size={12} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'De' : 'From'}</span>
          <select
            value={deId} onChange={(e) => { setDeChoisie(e.target.value); remettre(); }}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ}
          >
            {sources.length === 0 && <option value="">{fr ? 'Aucune bourse garnie' : 'No purse with coins'}</option>}
            {sources.map((g) => (
              <option key={g.id} value={g.id}>{g.nom} · {bourses[g.id]?.solde ?? 0} {sigleDe(g)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Vers' : 'To'}</span>
          <select
            value={versId} onChange={(e) => { setVersChoisie(e.target.value); remettre(); }}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ}
          >
            {cibles.length === 0 && <option value="">{fr ? 'Aucun autre groupe' : 'No other group'}</option>}
            {cibles.map((g) => <option key={g.id} value={g.id}>{g.nom} · {sigleDe(g)}</option>)}
          </select>
        </label>
      </div>

      <label className="block mt-3">
        <span className="block witcher-stat-label mb-1.5">{fr ? 'Pièces à convertir' : 'Coins to convert'}</span>
        <input
          type="number" min={0} inputMode="numeric" value={montant}
          onChange={(e) => { setMontant(e.target.value); remettre(); }}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory tabular-nums" style={champ}
        />
      </label>

      {de && vers && (
        <>
          <div className="flex items-baseline justify-between gap-3 mt-4 mb-1">
            <span className="font-sans uppercase tracking-[0.2em] text-[9px]" style={PALE}>
              {fr ? 'Vous recevez' : 'You receive'}
            </span>
            <span className="font-display text-2xl text-ivory tabular-nums inline-flex items-center gap-2">
              {apercu.recu} <PieceGuilde guilde={vers} size={20} /> {sigleDe(vers)}
            </span>
          </div>
          <p className="font-sans text-[11px] leading-relaxed" style={PALE}>
            {fr
              ? `Cinq pour cent restent au trésor de ${de.nom}, soit ${apercu.frais} ${sigleDe(de)}. Les ${apercu.montpellois} M qui en sortent passent au cours de ${vers.nom} (1 ${sigleDe(de)} = ${tauxCroise(tauxDe(de), tauxDe(vers))} ${sigleDe(vers)}).`
              : `Five percent stays in ${de.nom}’s treasury, that is ${apercu.frais} ${sigleDe(de)}. The ${apercu.montpellois} M coming out then pass at ${vers.nom}’s rate (1 ${sigleDe(de)} = ${tauxCroise(tauxDe(de), tauxDe(vers))} ${sigleDe(vers)}).`}
            {' '}
            {fr
              ? `Il vous reste ${reste} ${sigleDe(de)} à changer aujourd’hui sur ${PLAFOND_CHANGE_JOUR}.`
              : `You have ${reste} ${sigleDe(de)} left to exchange today out of ${PLAFOND_CHANGE_JOUR}.`}
          </p>
        </>
      )}

      {trop && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{fr ? 'Ce change dépasse votre plafond du jour.' : 'This exchange goes over your daily cap.'}</p>}
      {pasAssez && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{fr ? 'Votre bourse ne contient pas assez de pièces.' : 'Your purse does not hold that many coins.'}</p>}
      {videCote && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{fr ? 'Ce montant ne rapporte rien au change. Montez-le.' : 'That amount yields nothing. Raise it.'}</p>}
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}
      {fait && <p className="mt-2 font-sans text-xs" style={{ color: 'var(--sk-gilt)' }}>{fait}</p>}

      <div className="flex justify-end mt-4">
        <button type="button" onClick={changer} disabled={busy || bloque} className={BOUTON}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowLeftRight size={13} />}
          {fr ? 'Convertir' : 'Convert'}
        </button>
      </div>
    </Cadre>
  );
};

// ─── Transférer une fortune, de trésor à trésor ──────────────────────
// Un chef de A (ou l'équipe) verse au trésor de B, aux deux cours du
// jour, sans frais.
const FormulaireFortune: React.FC<{ sources: Cotee[]; guildes: GuildeCotee[]; lang: Lang }> = ({ sources, guildes, lang }) => {
  const fr = lang === 'FR';
  const [deChoisie, setDeChoisie] = useState('');
  const [versChoisie, setVersChoisie] = useState('');
  const [montant, setMontant] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const de = sources.find((g) => g.id === deChoisie) || sources[0];
  const cibles = guildes.filter((g) => g.id !== de?.id);
  const vers = cibles.find((g) => g.id === versChoisie) || cibles[0];

  const n = Math.max(0, Math.floor(Number(montant) || 0));
  const tresor = Math.round(de?.tresor ?? 0);
  const apercu = de && vers ? apercuChangeCroise(n, tauxDe(de), tauxDe(vers), true) : { frais: 0, montpellois: 0, recu: 0 };
  const videCote = n > 0 && apercu.recu <= 0;
  const bloque = !de || !vers || n <= 0 || n > tresor || videCote;

  const transferer = async () => {
    if (!de || !vers) return;
    setBusy(true); setErreur(null); setFait(null);
    try {
      const r = await guildeTresorTransferer({ deGuildeId: de.id, versGuildeId: vers.id, montant: n, note: note.trim() || undefined });
      setMontant(''); setNote('');
      const recu = r?.recu ?? apercu.recu;
      setFait(fr
        ? `Fait. Le trésor de ${vers.nom} a reçu ${recu} ${sigleDe(vers)}.`
        : `Done. ${vers.nom}’s treasury received ${recu} ${sigleDe(vers)}.`);
    } catch (e) {
      setErreur(messageErreur(e, fr));
    } finally { setBusy(false); }
  };

  return (
    <Cadre titre={fr ? 'Transférer une fortune' : 'Move a fortune'} icone={<Send size={12} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Du trésor de' : 'From the treasury of'}</span>
          <select
            value={de?.id || ''} onChange={(e) => { setDeChoisie(e.target.value); setFait(null); }}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ}
          >
            {sources.map((g) => <option key={g.id} value={g.id}>{g.nom} · {Math.round(g.tresor ?? 0)} {sigleDe(g)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Au trésor de' : 'To the treasury of'}</span>
          <select
            value={vers?.id || ''} onChange={(e) => { setVersChoisie(e.target.value); setFait(null); }}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ}
          >
            {cibles.length === 0 && <option value="">{fr ? 'Aucun autre groupe' : 'No other group'}</option>}
            {cibles.map((g) => <option key={g.id} value={g.id}>{g.nom} · {sigleDe(g)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Combien' : 'How much'}</span>
          <input
            type="number" min={0} inputMode="numeric" value={montant}
            onChange={(e) => { setMontant(e.target.value); setFait(null); }}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory tabular-nums" style={champ}
          />
        </label>
        <label className="block">
          <span className="block witcher-stat-label mb-1.5">{fr ? 'Pour quoi' : 'What for'}</span>
          <input
            value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder={fr ? 'La dette du tournoi' : 'The tournament debt'}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40" style={champ}
          />
        </label>
      </div>

      {de && vers && (
        <>
          <div className="flex items-baseline justify-between gap-3 mt-4 mb-1">
            <span className="font-sans uppercase tracking-[0.2em] text-[9px]" style={PALE}>
              {fr ? `Le trésor de ${vers.nom} reçoit` : `${vers.nom}’s treasury receives`}
            </span>
            <span className="font-display text-2xl text-ivory tabular-nums inline-flex items-center gap-2">
              {apercu.recu} <PieceGuilde guilde={vers} size={20} /> {sigleDe(vers)}
            </span>
          </div>
          <p className="font-sans text-[11px] leading-relaxed" style={PALE}>
            {fr
              ? `Aucun frais. ${n} ${sigleDe(de)} font ${apercu.montpellois} M au cours de ${de.nom}, puis passent au cours de ${vers.nom}.`
              : `No fee. ${n} ${sigleDe(de)} make ${apercu.montpellois} M at ${de.nom}’s rate, then pass at ${vers.nom}’s rate.`}
          </p>
        </>
      )}

      {n > tresor && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{fr ? 'Le trésor ne contient pas autant.' : 'The treasury does not hold that much.'}</p>}
      {videCote && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{fr ? 'Ce montant ne rapporte rien au change. Montez-le.' : 'That amount yields nothing. Raise it.'}</p>}
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: ROUILLE }}>{erreur}</p>}
      {fait && <p className="mt-2 font-sans text-xs" style={{ color: 'var(--sk-gilt)' }}>{fait}</p>}

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="font-sans text-[11px] inline-flex items-center gap-1.5" style={PALE}>
          {fr ? 'Disponible :' : 'Available:'} {tresor} {de && <PieceGuilde guilde={de} size={13} />}
        </span>
        <button type="button" onClick={transferer} disabled={busy || bloque} className={BOUTON}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {fr ? 'Transférer' : 'Transfer'}
        </button>
      </div>
    </Cadre>
  );
};

// ─── Les règles du comptoir, pour qui ne tient pas de trésor ─────────
const Regles: React.FC<{ lang: Lang }> = ({ lang }) => {
  const fr = lang === 'FR';
  const lignes = fr
    ? [
      'Un change vers une autre pièce passe par le Montpellois et laisse cinq pour cent au trésor du groupe de départ.',
      `Le plafond est de ${PLAFOND_CHANGE_JOUR} pièces par jour et par personne, tous changes confondus.`,
      'Il faut être membre du groupe d’arrivée pour recevoir sa pièce.',
      'Le cours de chaque pièce monte avec ses membres actifs et avec la part de son trésor.',
    ]
    : [
      'A change into another coin goes through the Montpellois and leaves five percent to the departure group’s treasury.',
      `The cap is ${PLAFOND_CHANGE_JOUR} coins a day per person, all exchanges combined.`,
      'You must be a member of the arrival group to receive its coin.',
      'Each coin’s rate rises with its active members and with its share of the treasury.',
    ];
  return (
    <Cadre titre={fr ? 'Les règles du comptoir' : 'House rules'} icone={<Landmark size={12} />}>
      <ol className="space-y-3">
        {lignes.map((l, i) => (
          <li key={i} className="flex gap-3 font-editorial text-sm text-ivory-soft leading-relaxed">
            <span className="font-display text-base tabular-nums shrink-0" style={{ color: 'var(--sk-gilt)' }}>{i + 1}</span>
            {l}
          </li>
        ))}
      </ol>
    </Cadre>
  );
};

export default BureauDeChangePage;
