import React, { useMemo, useState } from 'react';
import { Card, GhostButton } from '../../primitives';
import { Anneau, Barres, Courbe, Heures, TEINTES, Tuile } from './graphiques';
import { dateCourte, duree, nb, pct, rafraichirMaintenant, type Resume, nomElement } from './donnees';
import type { Periode } from '../VisiteursSection';
import { Icone } from './Icone';

// ─── Vue d'ensemble ─────────────────────────────────────────────────────────
// Les chiffres qui comptent en haut, la courbe des visites, puis ce que les
// visiteuses regardent (pages), d'où elles viennent (sources), sur quoi elles
// cliquent (éléments) et ce qui accroche (rage, clics morts, erreurs), pour
// que le client lise « ce qui marche et ce qui ne marche pas » sans fouiller.

const Titre: React.FC<{ children: React.ReactNode; note?: string }> = ({ children, note }) => (
  <div className="mb-4 flex items-baseline justify-between gap-3">
    <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">{children}</h3>
    {note && <span className="text-[11px] text-[#ECE5D2]/50 dark:text-white/45">{note}</span>}
  </div>
);

const Squelette: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Chargement des données">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-[20px] bg-white/5 dark:bg-white/5" />)}
    </div>
    <div className="h-64 animate-pulse rounded-[20px] bg-white/5 dark:bg-white/5" />
  </div>
);

interface Props { resume: Resume | null; periode: Periode; onVoirCarte: (clePage: string) => void; onRafraichi: () => void }

const VueEnsemble: React.FC<Props> = ({ resume, periode, onVoirCarte, onRafraichi }) => {
  const [rafraichit, setRafraichit] = useState(false);
  const [mot, setMot] = useState<string | null>(null);

  const rafraichir = async () => {
    setRafraichit(true); setMot(null);
    try {
      const { lots: n, occupe } = await rafraichirMaintenant();
      setMot(occupe ? "L'horloge fond déjà les lots : les chiffres arrivent dans quelques minutes." : n ? `${nb(n)} lot${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} aux chiffres.` : 'Tout était déjà à jour.');
      onRafraichi();
    } catch (e: any) {
      setMot(e?.message || 'Le rafraîchissement a échoué.');
    } finally { setRafraichit(false); }
  };

  const elements = useMemo(() => {
    if (!resume) return [];
    const tous: { nom: string; n: number; detail: string; cle: string }[] = [];
    for (const p of resume.pages) {
      for (const e of Object.values(p.elements)) {
        if (!e.n) continue;
        tous.push({ nom: nomElement(e), n: e.n, detail: p.path, cle: p.cle });
      }
    }
    return tous.sort((a, b) => b.n - a.n).slice(0, 8);
  }, [resume]);

  if (!resume) return <Squelette />;

  const vide = resume.vues === 0;
  const dureeMoy = resume.fins ? resume.dureeMs / Math.max(1, resume.sessions) : 0;
  const pagesParVisite = resume.sessions ? resume.vues / resume.sessions : 0;
  const accrocs = resume.pages
    .map(p => ({ ...p, score: p.rage * 3 + p.morts }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const peuLues = resume.pages
    .filter(p => p.scrollN >= 5)
    .map(p => ({ ...p, moitie: pct(p.scroll.b50 || 0, p.scrollN) }))
    .sort((a, b) => a.moitie - b.moitie)
    .slice(0, 5);
  // Les gros objectifs sont les transactions, les petits succès l'engagement
  // qui revient; les deux sortent des mêmes boutons marqués et des mêmes appels.
  const gros = resume.objectifs.filter(o => o.niveau === 'gros').slice(0, 8);
  const petits = resume.objectifs.filter(o => o.niveau !== 'gros').slice(0, 8);
  const totalGros = gros.reduce((n, o) => n + o.n, 0);

  return (
    <div className="space-y-6">
      {vide && (
        <Card className="min-w-0 p-6">
          <p className="font-serif text-xl text-[#ECE5D2] dark:text-white">Aucune visite mesurée sur ces {periode.jours} jours.</p>
          <p className="mt-2 max-w-2xl text-sm text-[#ECE5D2]/70 dark:text-white/60">
            La mesure commence dès qu'une visiteuse accepte les témoins sur le site, et les chiffres se mettent à jour toutes les quinze minutes.
            Le bouton ci-dessous force la mise à jour tout de suite.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <GhostButton type="button" onClick={rafraichir} disabled={rafraichit}><Icone nom="fa-rotate" className={`${rafraichit ? 'animate-spin' : ''}`} /> Rafraîchir maintenant</GhostButton>
            {mot && <span className="text-xs text-[#ECE5D2]/60">{mot}</span>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Tuile etiquette="Visites" valeur={nb(resume.sessions)} note={`${nb(resume.nouveaux)} nouvelles visiteuses`} icone="fa-person-walking" />
        <Tuile etiquette="Pages vues" valeur={nb(resume.vues)} note={`${pagesParVisite.toFixed(1)} pages par visite`} icone="fa-file-lines" />
        <Tuile etiquette="Temps moyen" valeur={duree(dureeMoy)} note="par visite" icone="fa-hourglass-half" />
        <Tuile etiquette="Rebond" valeur={`${pct(resume.rebonds, resume.fins)} %`} note="une seule page vue" icone="fa-arrow-turn-up" accent={pct(resume.rebonds, resume.fins) > 60 ? 'text-[#E27A68]' : 'text-[#C9A85A]'} />
        <Tuile etiquette="Clics" valeur={nb(resume.clics)} note={`${nb(resume.rage)} de rage · ${nb(resume.morts)} dans le vide`} icone="fa-arrow-pointer" />
        <Tuile etiquette="Erreurs" valeur={nb(resume.erreurs)} note="erreurs techniques vues" icone="fa-bug" accent={resume.erreurs ? 'text-[#E27A68]' : 'text-[#8FC5A3]'} />
      </div>

      <Card className="min-w-0 p-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">Visites par jour</h3>
          <div className="flex items-center gap-3">
            {mot && <span className="text-[11px] text-[#ECE5D2]/55">{mot}</span>}
            <button type="button" onClick={rafraichir} disabled={rafraichit} className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C9A85A] hover:underline disabled:opacity-50">
              <Icone nom="fa-rotate" className={`mr-1.5 ${rafraichit ? 'animate-spin' : ''}`} />Rafraîchir
            </button>
          </div>
        </div>
        <Courbe nomSerie="visites" points={resume.jours.map(j => ({ x: j.jour, y: j.sessions, etiquette: dateCourte(j.jour) }))} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-6">
          <Titre note="cliquez pour voir la carte">Pages les plus vues</Titre>
          <Barres lignes={resume.pages.slice(0, 8).map(p => ({ nom: p.titre || p.path, n: p.vues, detail: p.vues ? duree(p.dureeMs / p.vues) : '', onClick: () => onVoirCarte(p.cle) }))} unite=" vues" />
        </Card>
        <Card className="min-w-0 p-6">
          <Titre>Ce qui reçoit le plus de clics</Titre>
          {elements.length ? (
            <Barres lignes={elements.map(e => ({ nom: e.nom, n: e.n, detail: e.detail, onClick: () => onVoirCarte(e.cle) }))} unite=" clics" couleur={TEINTES.bleu} />
          ) : <p className="text-sm text-[#ECE5D2]/55">Aucun clic sur un lien ou un bouton pour l'instant.</p>}
        </Card>
        <Card className="min-w-0 p-6">
          <Titre>D'où viennent les visites</Titre>
          {resume.sources.length ? (
            <Barres lignes={resume.sources.slice(0, 7).map(s => ({ nom: s.nom, n: s.n }))} unite=" visites" couleur={TEINTES.prune} />
          ) : <p className="text-sm text-[#ECE5D2]/55">Les sources apparaissent avec les premières visites.</p>}
          {resume.campagnes.length > 0 && (
            <div className="mt-5 border-t border-[#ECE5D2]/10 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ECE5D2]/50">Campagnes (utm)</p>
              <Barres lignes={resume.campagnes.slice(0, 5).map(c => ({ nom: `${c.source}${c.campagne ? ' · ' + c.campagne : ''}`, n: c.n }))} unite=" visites" couleur={TEINTES.prune} />
            </div>
          )}
        </Card>
        <Card className="min-w-0 p-6">
          <Titre>Appareils et heures</Titre>
          <Anneau parts={[
            { nom: 'Ordinateur', n: resume.appareils.ordinateur, couleur: TEINTES.cuivre },
            { nom: 'Mobile', n: resume.appareils.mobile, couleur: TEINTES.bleu },
            { nom: 'Tablette', n: resume.appareils.tablette, couleur: TEINTES.prune },
          ]} />
          <div className="mt-5">
            <Heures valeurs={resume.heures} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 border-[#E27A68]/20 p-6">
          <Titre note="rage et clics dans le vide">Où ça accroche</Titre>
          {accrocs.length ? (
            <ul className="divide-y divide-[#ECE5D2]/10">
              {accrocs.map(p => (
                <li key={p.cle} className="flex items-center justify-between gap-3 py-2.5">
                  <button type="button" onClick={() => onVoirCarte(p.cle)} className="min-w-0 truncate text-left text-[13px] text-[#ECE5D2] hover:text-[#C9A85A] dark:text-white">{p.titre || p.path}</button>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1.5 text-[11px] tabular-nums text-[#ECE5D2]/60">
                    {p.rage > 0 && <span className="whitespace-nowrap rounded-full bg-[#E27A68]/10 px-2 py-0.5 text-[#E27A68]">{nb(p.rage)} rage</span>}
                    {p.morts > 0 && <span className="whitespace-nowrap rounded-full bg-[#ECE5D2]/10 px-2 py-0.5">{nb(p.morts)} dans le vide</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-[#ECE5D2]/55">Aucun clic de rage ni clic dans le vide sur la période : les pages répondent.</p>}
        </Card>
        <Card className="min-w-0 p-6">
          <Titre note="part des visites qui passent la moitié">Pages qu'on lit peu</Titre>
          {peuLues.length ? (
            <Barres lignes={peuLues.map(p => ({ nom: p.titre || p.path, n: p.moitie, onClick: () => onVoirCarte(p.cle) }))} unite=" %" max={100} couleur="#8F9779" />
          ) : <p className="text-sm text-[#ECE5D2]/55">Il faut au moins cinq visites d'une page pour mesurer jusqu'où elle se lit.</p>}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-6">
          <Titre note={gros.length ? `${nb(totalGros)} sur ${nb(resume.sessions)} visites` : 'achats, billets, paiements'}>Gros objectifs</Titre>
          {gros.length ? <Barres lignes={gros.map(o => ({ nom: o.nom, n: o.n }))} unite=" fois" />
            : <p className="text-sm text-[#ECE5D2]/55">Aucune transaction sur la période. Un paiement commencé et un achat confirmé comptent ici, chacun sous son nom.</p>}
        </Card>
        <Card className="min-w-0 p-6">
          <Titre note="l'engagement qui revient">Petits succès</Titre>
          {petits.length ? <Barres lignes={petits.map(o => ({ nom: o.nom, n: o.n }))} unite=" fois" couleur={TEINTES.bleu} />
            : <p className="text-sm text-[#ECE5D2]/55">Aucun engagement sur la période. Chaque inscription à l'infolettre et chaque compte créé s'ajoutent ici.</p>}
        </Card>
      </div>
    </div>
  );
};

export default VueEnsemble;
