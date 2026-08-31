import React, { useEffect, useState } from 'react';
import { BellRing, Mail, Check } from 'lucide-react';
import { definirPref, suivreFiche, alerteActive, FAMILLES_ALERTES, type AlertesMembre } from '../../firebase/ordre';

// ─── AlertesPanel : ce que la personne accepte de recevoir ────────────
// Alex, 2026-08-28 : « par défaut, les gens reçoivent tout, et ils
// peuvent décocher jusqu'à ne garder que l'essentiel, qui ne se
// décoche jamais. » Cette page ne fait qu'ÉCRIRE les drapeaux dans
// membres/{uid}.prefs.alertes (voir AlertesMembre, src/firebase/
// ordre.ts) : RIEN n'envoie encore de courriel selon ces drapeaux.
//
// CÔTÉ ENVOI, À FAIRE PLUS TARD : `messagerieDeMasse` (functions/
// index.js) doit sauter un destinataire dont le drapeau visé est
// éteint. La fiche du membre (collection `membres`) porte déjà
// `prefs.alertes`, lisible par la fonction avec le SDK admin — il n'y
// a qu'à filtrer AVANT d'envoyer. Ligne exacte à ajouter, juste avant
// l'envoi à chaque destinataire (le nom du drapeau dépend du type
// d'envoi choisi dans l'admin, ex. `annonces` pour une annonce,
// `infolettre` pour la lettre) :
//
//   if (membre.prefs?.alertes?.[typeDeLenvoi] === false) continue; // décoché, on saute
//
// `essentielles` n'est pas un drapeau dans `alertes` : il n'existe
// nulle part à éteindre, donc aucun filtre à écrire pour lui — un
// envoi essentiel (billet, sécurité, horaire, réponse de l'équipe)
// part toujours, sans vérifier `prefs.alertes` du tout.

const TEXTES: Record<keyof AlertesMembre, { FR: [string, string]; EN: [string, string] }> = {
  messages:     { FR: ['Messages privés', 'Un membre vous écrit.'], EN: ['Private messages', 'A member writes to you.'] },
  commentaires: { FR: ['Réponses à vos billets', 'Quelqu’un répond sous ce que vous avez écrit.'], EN: ['Replies to your posts', 'Someone answers under what you wrote.'] },
  mentions:     { FR: ['Mentions', 'Quelqu’un vous écrit avec l’arobase.'], EN: ['Mentions', 'Someone writes to you with the at-sign.'] },
  amities:      { FR: ['Amitiés', 'Demande reçue et amitié acceptée.'], EN: ['Friendships', 'A request received, a friendship accepted.'] },
  defis:        { FR: ['Défis', 'Un défi vous attend, ou c’est votre tour de jouer.'], EN: ['Challenges', 'A challenge awaits you, or it’s your turn to play.'] },
  badges:       { FR: ['Badges gagnés', 'Un badge vient s’ajouter à votre collection.'], EN: ['Badges earned', 'A badge joins your collection.'] },
  guildes:      { FR: ['Guildes', 'Ce qui bouge dans vos guildes.'], EN: ['Guilds', 'What moves in your guilds.'] },
  mur:          { FR: ['Le mur social', 'Les billets du mur du festival.'], EN: ['The social wall', 'Posts on the festival wall.'] },
  annonces:     { FR: ['Annonces de l’équipe', 'Le babillard officiel du festival.'], EN: ['Team announcements', 'The festival’s official board.'] },
  souk:         { FR: ['Le Souk', 'Une réponse à un objet que vous avez mis en vente.'], EN: ['The Souk', 'A reply to an item you listed.'] },
  festival:     { FR: ['Programmation et rappels', 'Les rappels avant l’édition.'], EN: ['Programme and reminders', 'Reminders before the edition.'] },
  infolettre:   { FR: ['L’infolettre', 'La lettre du festival, de temps en temps.'], EN: ['The newsletter', 'The festival’s letter, now and then.'] },
};

const TOUS_LES_DRAPEAUX = FAMILLES_ALERTES.flatMap((f) => f.cles);

const Interrupteur: React.FC<{ actif: boolean; onClick: () => void; label: string; disabled?: boolean }> = ({ actif, onClick, label, disabled }) => (
  <button
    type="button" role="switch" aria-checked={actif} disabled={disabled} onClick={onClick}
    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0 disabled:opacity-60"
    style={{ background: actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.18)' }}
    aria-label={label}
  >
    <span className="absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full transition-transform"
          style={{ background: 'var(--sk-parchment)', transform: actif ? 'translateX(20px)' : 'translateX(2px)' }} />
  </button>
);

const AlertesPanel: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [alertes, setAlertes] = useState<AlertesMembre | undefined>(undefined);

  useEffect(() => suivreFiche(uid, (m) => setAlertes(m?.prefs?.alertes)), [uid]);

  const ecrire = (patch: AlertesMembre) => {
    const suite = { ...alertes, ...patch };
    setAlertes(suite);
    void definirPref(uid, 'alertes', suite);
  };

  const toutRecevoir = () => ecrire(Object.fromEntries(TOUS_LES_DRAPEAUX.map((c) => [c, true])) as AlertesMembre);
  const essentielSeulement = () => ecrire(Object.fromEntries(TOUS_LES_DRAPEAUX.map((c) => [c, false])) as AlertesMembre);

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">
        <BellRing size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Alertes' : 'Alerts'}
      </p>
      <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
        {fr ? 'Ce que vous recevez par courriel' : 'What you receive by email'}
      </h2>
      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
        {fr
          ? 'Tout est activé par défaut. Décochez ce qui ne vous intéresse plus : les communications essentielles restent, quoi qu’il arrive.'
          : 'Everything is on by default. Turn off what no longer interests you: essential communications stay on, no matter what.'}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button type="button" onClick={toutRecevoir}
                className="px-3.5 py-2 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                style={{ color: 'var(--sk-gilt)', background: 'rgba(var(--sk-gilt-rgb),0.14)', border: '1px solid rgba(var(--sk-gilt-rgb),0.5)' }}>
          {fr ? 'Tout recevoir' : 'Receive everything'}
        </button>
        <button type="button" onClick={essentielSeulement}
                className="px-3.5 py-2 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                style={{ color: 'rgba(var(--sk-parchment-rgb),0.7)', background: 'transparent', border: '1px solid rgba(var(--sk-parchment-rgb),0.18)' }}>
          {fr ? 'Garder l’essentiel seulement' : 'Keep only the essentials'}
        </button>
      </div>

      <div className="space-y-6">
        {FAMILLES_ALERTES.map((famille) => (
          <div key={famille.titreFR}>
            <span className="witcher-stat-label mb-2 block">{fr ? famille.titreFR : famille.titreEN}</span>
            <div className="space-y-3">
              {famille.cles.map((cle) => {
                const [nom, explication] = fr ? TEXTES[cle].FR : TEXTES[cle].EN;
                return (
                  <div key={cle} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-sans text-sm text-ivory-soft">{nom}</p>
                      <p className="font-editorial italic text-xs text-ivory-soft/50">{explication}</p>
                    </div>
                    <Interrupteur actif={alerteActive(alertes, cle)} onClick={() => ecrire({ [cle]: !alerteActive(alertes, cle) })} label={nom} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Essentielles : toujours cochée, jamais décochable. */}
        <div className="pt-4 border-t border-ivory-soft/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 inline-flex items-start gap-1.5">
              <Mail size={13} className="text-brass shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm text-ivory-soft">{fr ? 'Communications essentielles' : 'Essential communications'}</p>
                <p className="font-editorial italic text-xs text-ivory-soft/50">
                  {fr
                    ? 'Vos billets, la sécurité, un changement d’horaire, une réponse de l’équipe à votre demande : toujours envoyées.'
                    : 'Your tickets, safety, a schedule change, the team’s reply to your request: always sent.'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] font-sans uppercase tracking-[0.16em]" style={{ color: 'var(--sk-gilt)' }}>
              <Check size={13} /> {fr ? 'Toujours' : 'Always'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlertesPanel;
