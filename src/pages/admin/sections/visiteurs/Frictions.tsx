import React, { useMemo } from 'react';
import { Card } from '../../primitives';
import { nb, nomElement, pct, type Resume } from './donnees';

// ─── Accrocs ────────────────────────────────────────────────────────────────
// Tout ce qui signale une visiteuse contrariée : les clics de rage (trois
// clics rapides au même endroit), les clics dans le vide (un clic qui ne
// change rien à la page), les formulaires commencés puis laissés, et les
// erreurs techniques que le navigateur a rencontrées. Chaque ligne mène à la
// carte de la page pour voir l'endroit exact.

const Titre: React.FC<{ children: React.ReactNode; note?: string; icone: string; couleur?: string }> = ({ children, note, icone, couleur = 'text-[#8B4A2F]' }) => (
  <div className="mb-4 flex items-baseline justify-between gap-3">
    <h3 className="flex items-center gap-2.5 font-serif text-lg text-[#293027] dark:text-white"><i className={`fa-solid ${icone} text-sm ${couleur}`} aria-hidden="true" />{children}</h3>
    {note && <span className="text-[11px] text-[#38403a]/50 dark:text-white/45">{note}</span>}
  </div>
);

const Vide: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-[#38403a]/55 dark:text-white/45">{children}</p>;

interface Props { resume: Resume | null; onVoirCarte: (clePage: string) => void }

const Frictions: React.FC<Props> = ({ resume, onVoirCarte }) => {
  const elements = useMemo(() => {
    if (!resume) return { rage: [], morts: [] };
    const rage: { nom: string; page: string; cle: string; n: number }[] = [];
    const morts: { nom: string; page: string; cle: string; n: number }[] = [];
    for (const p of resume.pages) {
      for (const e of Object.values(p.elements)) {
        const nom = nomElement(e);
        if (e.r) rage.push({ nom, page: p.titre || p.path, cle: p.cle, n: e.r });
        if (e.m) morts.push({ nom, page: p.titre || p.path, cle: p.cle, n: e.m });
      }
    }
    const dix = (l: typeof rage) => l.sort((a, b) => b.n - a.n).slice(0, 10);
    const somme = (l: typeof rage) => l.reduce((s, e) => s + e.n, 0);
    const rageDix = dix(rage), mortsDix = dix(morts);
    return {
      rage: rageDix, morts: mortsDix, rageListe: somme(rage), mortsListe: somme(morts),
      rageDixN: somme(rageDix), mortsDixN: somme(mortsDix), rageSuite: rage.length - rageDix.length, mortsSuite: morts.length - mortsDix.length,
    };
  }, [resume]);

  if (!resume) return <div className="h-64 animate-pulse rounded-[20px] bg-white/45" aria-busy="true" />;
  // Les listes gardent les dix liens et boutons les plus touchés : la note
  // sous la liste rend compte du reste, ceux d'après le dixième comme les
  // clics sur une image ou un titre, pour que le total de l'en-tête se
  // retrouve. Tout se voit sur la carte des clics.
  const note = (total: number, dixN: number, listeN: number, suite: number, quoi: string) => {
    const reste = total - dixN;
    if (reste <= 0) return null;
    const ailleurs = Math.max(0, total - listeN);
    const surSuite = reste - ailleurs;
    const parts: string[] = [];
    if (surSuite > 0 && suite > 0) parts.push(`${nb(surSuite)} sur ${suite > 1 ? `${nb(suite)} autres liens ou boutons` : 'un autre lien ou bouton'} que la liste des dix premiers ne montre pas`);
    if (ailleurs > 0) parts.push(`${nb(ailleurs)} sur des zones qui ne sont ni un lien ni un bouton (une image, un titre)`);
    return `Les ${nb(reste)} autres ${quoi} : ${parts.join(', et ')}. La carte des clics les montre.`;
  };
  const noteRage = note(resume.rage, elements.rageDixN || 0, elements.rageListe || 0, elements.rageSuite || 0, 'clics de rage');
  const noteMorts = note(resume.morts, elements.mortsDixN || 0, elements.mortsListe || 0, elements.mortsSuite || 0, 'clics dans le vide');

  const Ligne: React.FC<{ nom: string; page: string; cle: string; n: number; unite: string }> = ({ nom, page, cle, n, unite }) => (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <button type="button" onClick={() => onVoirCarte(cle)} className="min-w-0 text-left hover:text-[#8B4A2F]">
        <span className="block truncate text-[13px] text-[#293027] dark:text-white">{nom}</span>
        <span className="block truncate text-[11px] text-[#38403a]/55 dark:text-white/45">{page}</span>
      </button>
      <span className="shrink-0 text-[12px] tabular-nums text-[#38403a]/70 dark:text-white/60">{nb(n)} {unite}</span>
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <Titre icone="fa-bolt" couleur="text-[#BC4A3C]" note={`${nb(resume.rage)} sur la période`}>Clics de rage</Titre>
        {elements.rage.length ? <ul className="divide-y divide-[#38403a]/10">{elements.rage.map((e, i) => <Ligne key={i} {...e} unite="fois" />)}</ul>
          : <Vide>{resume.rage > 0 ? `Les ${nb(resume.rage)} clics de rage de la période visent des zones qui ne sont ni un lien ni un bouton (une image, un titre) : la carte des clics les montre.` : "Aucun clic de rage : personne ne s'est acharné sur un bouton qui ne répondait pas."}</Vide>}
        {elements.rage.length > 0 && noteRage && <p className="mt-3 text-[12px] text-[#38403a]/55">{noteRage}</p>}
      </Card>
      <Card className="p-6">
        <Titre icone="fa-ban" note={`${nb(resume.morts)} sur la période`}>Clics dans le vide</Titre>
        {elements.morts.length ? <ul className="divide-y divide-[#38403a]/10">{elements.morts.map((e, i) => <Ligne key={i} {...e} unite="fois" />)}</ul>
          : <Vide>Aucun clic dans le vide sur un lien ou un bouton. Les clics sur du texte ordinaire ne sont pas comptés ici.</Vide>}
        {resume.morts > 0 && !elements.morts.length && <p className="mt-3 text-[12px] text-[#38403a]/55">Les {nb(resume.morts)} clics dans le vide de la période visent des zones qui ne sont ni un lien ni un bouton (une image, un titre) : la carte des clics les montre.</p>}
        {elements.morts.length > 0 && noteMorts && <p className="mt-3 text-[12px] text-[#38403a]/55">{noteMorts}</p>}
      </Card>
      <Card className="p-6">
        <Titre icone="fa-pen-to-square" note="commencés puis laissés">Formulaires abandonnés</Titre>
        {resume.formulaires.length ? (
          <ul className="divide-y divide-[#38403a]/10">
            {resume.formulaires.slice(0, 10).map((f, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] text-[#293027] dark:text-white">{f.path}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-[#38403a]/70">{nb(f.soumis)} envoyé{f.soumis > 1 ? 's' : ''} · {nb(f.abandons)} laissé{f.abandons > 1 ? 's' : ''}</span>
                </div>
                <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full bg-[#293027]/[0.07]">
                  <div className="h-full rounded-full bg-[#2D4A3E]" style={{ width: `${Math.min(100, pct(f.soumis, f.debuts))}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-[#38403a]/55">{Math.min(100, pct(f.soumis, f.debuts))} % des {nb(f.debuts)} qui commencent vont au bout{f.dernierChamp ? ` · dernier champ touché avant d'abandonner : ${f.dernierChamp}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : <Vide>Aucun formulaire commencé sur la période.</Vide>}
      </Card>
      <Card className="p-6">
        <Titre icone="fa-bug" couleur={resume.erreursListe.length ? 'text-[#BC4A3C]' : 'text-[#2D4A3E]'} note={`${nb(resume.erreurs)} sur la période`}>Erreurs techniques</Titre>
        {resume.erreursListe.length ? (
          <ul className="divide-y divide-[#38403a]/10">
            {resume.erreursListe.slice(0, 10).map((e, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-[12px] text-[#293027] dark:text-white" title={e.msg}>{e.msg}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-[#38403a]/70">{nb(e.n)} fois</span>
                </div>
                <p className="truncate text-[11px] text-[#38403a]/55">{e.path}{e.src ? ` · ${e.src.split('/').pop()}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : <Vide>Aucune erreur vue par les visiteuses. À transmettre à Vexel s'il en apparaît.</Vide>}
      </Card>
    </div>
  );
};

export default Frictions;
