import React, { useEffect, useState } from 'react';
import { Card, GhostButton, Input, Label, PrimaryButton, ToggleSwitch, Textarea } from '../../primitives';
import { chargerReglages, enregistrerReglages, chargerExclusions, ajouterExclusion, retirerExclusion, monAdresse, EXCLUSIONS_MAX, type AdresseExclue } from './donnees';
import { REGLAGES_DEFAUT, type ReglagesVexelHotjar } from '../../../../vexelhotjar';
import { exclureMoi, mesureExclue } from '../../../../vexelhotjar/tracker';
import { Icone } from './Icone';

// ─── Réglages ───────────────────────────────────────────────────────────────
// La mesure s'allume et s'éteint ici, la part des visites filmées se choisit
// au curseur, et les adresses à ignorer se tapent une par ligne. Le site lit
// ces réglages à chaque chargement, donc un changement prend effet pour les
// prochaines visites, sans rien redéployer. La carte « Hors compte » tient
// le client à l'écart des chiffres : par navigateur (drapeau posé à la
// connexion à l'admin) et par adresse IP (vh_prive/exclusions, que le
// collecteur relit toutes les cinq minutes).

const Reglages: React.FC = () => {
  const [r, setR] = useState<ReglagesVexelHotjar | null>(null);
  const [exclure, setExclure] = useState('');
  const [etat, setEtat] = useState<'repos' | 'sauve' | 'fait'>('repos');
  const [moiExclu, setMoiExclu] = useState(() => mesureExclue());
  const [ips, setIps] = useState<AdresseExclue[]>([]);
  const [ipActuelle, setIpActuelle] = useState('');
  const [noteIp, setNoteIp] = useState('');

  useEffect(() => {
    chargerReglages().then(x => { setR(x); setExclure((x.exclure || []).join('\n')); }).catch(() => setR(REGLAGES_DEFAUT));
    chargerExclusions().then(setIps).catch(() => {});
    monAdresse().then(setIpActuelle).catch(() => {});
  }, []);

  const basculerMoi = (exclu: boolean) => { exclureMoi(exclu); setMoiExclu(exclu); };
  const ajouterIp = async (e: AdresseExclue) => { setIps(l => [...l, e]); await ajouterExclusion(e).catch(() => {}); };
  const retirerIp = async (e: AdresseExclue) => { setIps(l => l.filter(x => x.ip !== e.ip)); await retirerExclusion(e).catch(() => {}); };
  const dejaExclue = !!ipActuelle && ips.some(e => e.ip === ipActuelle);
  const pleine = ips.length >= EXCLUSIONS_MAX;
  const exclureActuelle = () => ajouterIp({ ip: ipActuelle, note: noteIp.trim(), ajoutee: Date.now() }).then(() => setNoteIp(''));

  const enregistrer = async () => {
    if (!r) return;
    setEtat('sauve');
    const liste = exclure.split('\n').map(s => s.trim()).filter(Boolean);
    await enregistrerReglages({ actif: r.actif, echantillonReplay: r.echantillonReplay, exclure: liste }).catch(() => {});
    setEtat('fait');
    window.setTimeout(() => setEtat('repos'), 2500);
  };

  if (!r) return <div className="h-64 animate-pulse rounded-[20px] bg-white/5" aria-busy="true" />;
  const part = Math.round((r.echantillonReplay || 0) * 100);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">La mesure des visites</h3>
              <p className="mt-1 max-w-xl text-sm text-[#ECE5D2]/70 dark:text-white/60">
                Quand elle est allumée, le site note les pages vues, les clics, le défilement et les accrocs des visiteuses qui ont accepté les témoins.
                Éteinte, plus rien ne part du site, et les chiffres déjà recueillis restent lisibles ici.
              </p>
            </div>
            <ToggleSwitch checked={r.actif} onChange={v => setR({ ...r, actif: v })} label={r.actif ? 'Allumée' : 'Éteinte'} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">Visites filmées</h3>
          <p className="mt-1 max-w-xl text-sm text-[#ECE5D2]/70 dark:text-white/60">
            Une visite sur {part ? Math.round(100 / part) : '∞'} est filmée au hasard, pour la rejouer dans l'onglet Visites filmées. Ce qui se tape dans un champ est masqué avant même de quitter le navigateur.
            Une part plus grande donne plus de films et coûte un peu plus d'espace; vingt-cinq pour cent suffit largement pour voir ce qui se passe.
          </p>
          <div className="mt-5 flex items-center gap-4">
            <input type="range" min={0} max={100} step={5} value={part} onChange={e => setR({ ...r, echantillonReplay: Number(e.target.value) / 100 })} className="w-full accent-[var(--admin-accent)]" aria-label="Part des visites filmées" />
            <span className="w-16 shrink-0 text-right font-serif text-2xl tabular-nums text-[#ECE5D2] dark:text-white">{part} %</span>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">Adresses à ignorer</h3>
          <p className="mt-1 mb-3 max-w-xl text-sm text-[#ECE5D2]/70 dark:text-white/60">Une adresse par ligne. Tout ce qui commence par l'une d'elles n'est ni compté ni filmé; l'administration y est déjà.</p>
          <Label>Adresses</Label>
          <Textarea rows={4} value={exclure} onChange={e => setExclure(e.target.value)} placeholder={'/admin\n/compte'} />
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">Hors compte : vous et votre équipe</h3>
          <p className="mt-1 max-w-xl text-sm text-[#ECE5D2]/70 dark:text-white/60">
            Vos propres visites fausseraient les chiffres. Le navigateur où vous ouvrez l'administration sort de la mesure dès la première connexion, et il en reste sorti même déconnectée; l'adresse IP de la maison ou du bureau couvre en plus le téléphone et la tablette qui passent par le même réseau.
          </p>
          <div className="mt-5 flex items-start justify-between gap-6 border-t border-[#ECE5D2]/10 pt-5">
            <div>
              <p className="text-sm text-[#ECE5D2] dark:text-white">Ce navigateur</p>
              <p className="text-[12px] text-[#ECE5D2]/55 dark:text-white/45">{moiExclu ? 'Pas compté, ni par la mesure, ni par le Pixel, ni par Google.' : 'Compté comme une visiteuse ordinaire.'}</p>
            </div>
            <div className="shrink-0"><ToggleSwitch checked={moiExclu} onChange={basculerMoi} label={moiExclu ? 'Pas compté' : 'Compté'} /></div>
          </div>
          <div className="mt-5 border-t border-[#ECE5D2]/10 pt-5">
            <p className="text-sm text-[#ECE5D2] dark:text-white">Adresses IP jamais comptées</p>
            {ips.length ? (
              <ul className="mt-2 divide-y divide-[#ECE5D2]/10">
                {ips.map(e => (
                  <li key={e.ip} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-[13px] text-[#ECE5D2] dark:text-white"><span className="font-mono">{e.ip}</span>{e.note ? <span className="text-[#ECE5D2]/60 dark:text-white/50"> · {e.note}</span> : null}</span>
                    <GhostButton type="button" className="shrink-0 !px-3 !py-1.5 !text-[10px]" onClick={() => retirerIp(e)} aria-label={`Retirer ${e.ip}`}>Retirer</GhostButton>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-[12px] text-[#ECE5D2]/55 dark:text-white/45">Aucune adresse pour l'instant.</p>}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-0 grow">
                <Label>Votre adresse en ce moment{ipActuelle ? ` : ${ipActuelle}` : ''}</Label>
                <Input value={noteIp} onChange={e => setNoteIp(e.target.value)} placeholder="Une note, par exemple : la maison" disabled={!ipActuelle || dejaExclue || pleine} />
              </div>
              <PrimaryButton type="button" onClick={exclureActuelle} disabled={!ipActuelle || dejaExclue || pleine}>{dejaExclue ? 'Déjà hors compte' : pleine ? `Liste pleine (${EXCLUSIONS_MAX})` : 'Exclure cette adresse'}</PrimaryButton>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <PrimaryButton type="button" onClick={enregistrer} disabled={etat === 'sauve'}>{etat === 'sauve' ? 'Enregistrement…' : 'Enregistrer les réglages'}</PrimaryButton>
          {etat === 'fait' && <span className="text-sm text-[#8FC5A3]"><Icone nom="fa-check" className="mr-1.5" />Enregistré, en vigueur pour les prochaines visites.</span>}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ECE5D2]/55">Ce qui est gardé, et combien de temps</p>
          <ul className="space-y-2 text-[13px] leading-relaxed text-[#ECE5D2]/75 dark:text-white/65">
            <li>Les chiffres par jour et les cartes de chaleur se gardent un peu plus d'un an.</li>
            <li>Les visites et leurs films s'effacent d'eux-mêmes après quatre-vingt-dix jours, ou plus tôt d'un clic sur la corbeille.</li>
            <li>Aucune adresse IP de visiteuse n'est conservée et aucun nom n'est rattaché à une visite; l'identifiant de visiteuse est un nombre tiré au hasard dans son navigateur. Les seules adresses gardées sont les vôtres, posées ici pour être ignorées.</li>
          </ul>
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ECE5D2]/55">Pour marquer un objectif</p>
          <p className="text-[13px] leading-relaxed text-[#ECE5D2]/75 dark:text-white/65">
            Chaque départ vers la caisse (un billet, un repas, une livraison au kiosque, la boutique, des Montpellois ou le site sans publicité) compte comme gros objectif, et l'engagement qui revient (l'infolettre, un compte créé) compte comme petit succès. Un nouveau bouton se marque avec <code className="rounded bg-[#ECE5D2]/10 px-1 py-0.5 font-mono text-[12px]">data-vh-objectif="nom"</code> et <code className="rounded bg-[#ECE5D2]/10 px-1 py-0.5 font-mono text-[12px]">data-vh-niveau="gros"</code> : c'est un geste de Vexel, à demander dans « Demander un changement ».
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Reglages;
