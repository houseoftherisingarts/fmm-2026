import React, { useEffect, useRef, useState } from 'react';
import { Card, GhostButton } from '../../primitives';
import { chargerEnregistrement, chargerEnregistrements, dateLongue, duree, effacerSession, nb, type Session } from './donnees';

// ─── Visites filmées ────────────────────────────────────────────────────────
// La liste des visites enregistrées (une part des visites, tirée au sort,
// réglable dans l'onglet Réglages), avec pour chacune sa date, sa durée, son
// appareil, ses pages et ses accrocs. Le lecteur rrweb rejoue la visite
// telle que la visiteuse l'a vue, sans jamais montrer ce qu'elle a tapé.

const Appareil: React.FC<{ s: Session }> = ({ s }) => (
  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#ECE5D2]/70 dark:text-white/60">
    <i className={`fa-solid ${s.device === 'mobile' ? 'fa-mobile-screen' : s.device === 'tablette' ? 'fa-tablet-screen-button' : 'fa-desktop'} text-[11px]`} aria-hidden="true" />
    {s.device === 'mobile' ? 'Téléphone' : s.device === 'tablette' ? 'Tablette' : 'Ordinateur'}{s.pays ? ` · ${s.pays}` : ''}
  </span>
);

const Badges: React.FC<{ s: Session }> = ({ s }) => (
  <span className="flex flex-wrap gap-1.5">
    {(s.rage || 0) > 0 && <span className="rounded-full bg-[#E27A68]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E27A68]">{s.rage} rage</span>}
    {(s.mort || 0) > 0 && <span className="rounded-full bg-[#ECE5D2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ECE5D2]/70">{s.mort} vide</span>}
    {(s.erreurs || 0) > 0 && <span className="rounded-full bg-[#E27A68]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E27A68]">{s.erreurs} erreur{(s.erreurs || 0) > 1 ? 's' : ''}</span>}
    {s.nouveau && <span className="rounded-full bg-[#8FC5A3]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8FC5A3]">nouvelle</span>}
  </span>
);

const Lecteur: React.FC<{ session: Session; onFermer: () => void }> = ({ session, onFermer }) => {
  const cible = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'vide' | 'erreur'>('chargement');

  useEffect(() => {
    let lecteur: { $destroy?: () => void } | null = null;
    let vivant = true;
    (async () => {
      try {
        const [events, mod] = await Promise.all([
          chargerEnregistrement(session.sid),
          import('rrweb-player'),
        ]);
        await import('rrweb-player/dist/style.css');
        if (!vivant) return;
        if (events.length < 2 || !cible.current) { setEtat('vide'); return; }
        const largeur = Math.min(cible.current.clientWidth, 1100);
        const Player = (mod.default || (mod as any).Player) as any;
        lecteur = new Player({
          target: cible.current,
          props: { events, width: largeur, height: Math.round(largeur * 0.62), autoPlay: true, skipInactive: true, showController: true, speedOption: [1, 2, 4, 8], mouseTail: { strokeStyle: '#BA7B39' } },
        });
        setEtat('pret');
      } catch (e) {
        console.error('[vexelhotjar] lecture', e);
        if (vivant) setEtat('erreur');
      }
    })();
    return () => { vivant = false; try { lecteur?.$destroy?.(); } catch { /* déjà fermé */ } };
  }, [session.sid]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-lg text-[#ECE5D2] dark:text-white">Visite du {dateLongue(session.debut)}</p>
          <p className="text-[12px] text-[#ECE5D2]/60 dark:text-white/55">{duree(session.dureeMs || 0)} · {nb(session.nbPages || 0)} page{(session.nbPages || 0) > 1 ? 's' : ''} · <Appareil s={session} /></p>
        </div>
        <GhostButton type="button" onClick={onFermer}><i className="fa-solid fa-xmark" aria-hidden="true" /> Fermer</GhostButton>
      </div>
      {session.parcours && session.parcours.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] text-[#ECE5D2]/70 dark:text-white/60">
          {session.parcours.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && <i className="fa-solid fa-arrow-right-long text-[10px] text-[#C9A85A]" aria-hidden="true" />}
              <span className="rounded-full bg-white/5 px-2 py-0.5 dark:bg-white/10">{p}</span>
            </React.Fragment>
          ))}
        </p>
      )}
      <div ref={cible} className="vh-lecteur min-h-[200px] overflow-hidden rounded-[16px] bg-[#04080B]/95">
        {etat === 'chargement' && <p className="p-10 text-center text-sm text-[#EEE7DB]/70"><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />Le film se charge</p>}
        {etat === 'vide' && <p className="p-10 text-center text-sm text-[#EEE7DB]/70">Cet enregistrement est trop court pour être rejoué.</p>}
        {etat === 'erreur' && <p className="p-10 text-center text-sm text-[#EEE7DB]/70">Le film n'a pas pu être lu.</p>}
      </div>
    </Card>
  );
};

const Enregistrements: React.FC = () => {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [ouverte, setOuverte] = useState<Session | null>(null);
  const [filtre, setFiltre] = useState<'toutes' | 'accrocs' | 'longues'>('toutes');

  const recharger = () => chargerEnregistrements().then(setSessions).catch(() => setSessions([]));
  useEffect(() => { recharger(); }, []);

  const effacer = async (s: Session) => {
    if (!window.confirm('Effacer cette visite et son film ? Le geste est définitif.')) return;
    await effacerSession(s.sid).catch(() => {});
    if (ouverte?.sid === s.sid) setOuverte(null);
    recharger();
  };

  const visibles = (sessions || []).filter(s => {
    if (filtre === 'accrocs') return (s.rage || 0) + (s.mort || 0) + (s.erreurs || 0) > 0;
    if (filtre === 'longues') return (s.dureeMs || 0) >= 60_000;
    return true;
  });

  return (
    <div className="space-y-5">
      {ouverte && <Lecteur session={ouverte} onFermer={() => setOuverte(null)} />}
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE5D2]/10 px-5 py-4">
          <p className="font-serif text-lg text-[#ECE5D2] dark:text-white">{sessions ? `${nb(visibles.length)} visite${visibles.length > 1 ? 's' : ''} filmée${visibles.length > 1 ? 's' : ''}` : 'Chargement'}</p>
          <div className="flex gap-1 rounded-full border border-[#ECE5D2]/10 bg-white/5 p-1" role="group" aria-label="Filtre">
            {([['toutes', 'Toutes'], ['accrocs', 'Avec accrocs'], ['longues', 'Plus d\'une minute']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFiltre(id)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${filtre === id ? 'bg-[#C9A85A] text-[#0B1116]' : 'text-[#ECE5D2]/65 hover:bg-white/10'}`}>{label}</button>
            ))}
          </div>
        </div>
        {sessions && !visibles.length && (
          <p className="px-5 py-10 text-center text-sm text-[#ECE5D2]/60">
            {sessions.length ? 'Aucune visite ne correspond à ce filtre.' : 'Aucune visite filmée pour l\'instant. La part des visites enregistrées se règle dans l\'onglet Réglages; les films arrivent quelques minutes après la visite.'}
          </p>
        )}
        <ul className="divide-y divide-[#ECE5D2]/10">
          {visibles.map(s => (
            <li key={s.sid} className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 ${ouverte?.sid === s.sid ? 'bg-[#C9A85A]/10' : ''}`}>
              <button type="button" onClick={() => setOuverte(s)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-left">
                <span className="w-44 shrink-0 text-[13px] text-[#ECE5D2] dark:text-white">{dateLongue(s.debut)}</span>
                <span className="w-20 shrink-0 text-[12px] tabular-nums text-[#ECE5D2]/70 dark:text-white/60">{duree(s.dureeMs || 0)}</span>
                <span className="w-16 shrink-0 text-[12px] tabular-nums text-[#ECE5D2]/70 dark:text-white/60">{nb(s.nbPages || 0)} page{(s.nbPages || 0) > 1 ? 's' : ''}</span>
                <Appareil s={s} />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#ECE5D2]/60 dark:text-white/50">{s.entree || ''}</span>
                <Badges s={s} />
              </button>
              <span className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => setOuverte(s)} className="rounded-full bg-[#C9A85A] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B1116] hover:bg-[#8C7335]"><i className="fa-solid fa-play mr-1.5" aria-hidden="true" />Regarder</button>
                <button type="button" onClick={() => effacer(s)} aria-label="Effacer cette visite" title="Effacer cette visite" className="h-8 w-8 rounded-full text-[#ECE5D2]/40 hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-trash-can text-[12px]" aria-hidden="true" /></button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default Enregistrements;
