// ─── La politique d'annulation du festival ───────────────────────────
// Alex, 2026-09-12 : « une politique aucune annulation à partir du
// moment de l'achat, non remboursable. J'ai besoin que ce soit écrit à
// plusieurs endroits : là où on achète les billets avant de se rendre
// sur Zeffy, dans un avis épinglé, et sur toutes les communications qui
// ont rapport au billet, en petit fine print à la fin de chaque
// communication, partout, partout. »
//
// Ce fichier est la SEULE source du texte. Chaque endroit qui l'affiche
// l'importe d'ici : la page Billets, la porte avant Zeffy, l'avis
// épinglé de l'espace membre, la FAQ et le pied de chaque infolettre.
// Le serveur (functions/index.js) en porte une copie textuelle sous le
// même nom, parce qu'il ne lit pas ce dossier : si une phrase change
// ici, elle change là-bas aussi.
//
// Trois longueurs, pour trois usages :
//   • `etiquette` · deux ou trois mots, sur la carte d'un billet;
//   • `courte`    · la phrase du fine print, au pied d'un courriel;
//   • `longue`    · le paragraphe de l'encart et de l'avis épinglé.

export const POLITIQUE_ANNULATION = {
  titreFR: 'Politique d’annulation',
  titreEN: 'Cancellation policy',

  etiquetteFR: 'Achat définitif, non remboursable',
  etiquetteEN: 'Final sale, non-refundable',

  courteFR:
    'Politique d’annulation : tout achat est définitif dès le moment où il est fait, et aucune annulation ni aucun remboursement n’est possible, quelle qu’en soit la raison.',
  courteEN:
    'Cancellation policy: every purchase is final from the moment it is made, and no cancellation or refund is possible, whatever the reason.',

  longueFR:
    'Tout achat fait auprès du Festival Médiéval de Montpellier est définitif dès le moment où il est conclu, que ce soit un billet d’une journée, une passe de fin de semaine, un emplacement de camping ou une place au banquet. Aucune annulation n’est acceptée et aucun remboursement n’est accordé, quelle qu’en soit la raison, parce que chaque billet vendu engage déjà les dépenses du festival, des artistes aux marmites. Prenez le temps de vérifier vos dates et vos quantités avant de confirmer votre paiement.',
  longueEN:
    'Every purchase made from the Festival Médiéval de Montpellier is final from the moment it is completed, whether it is a one-day ticket, a weekend pass, a camping pitch or a seat at the banquet. No cancellation is accepted and no refund is granted, whatever the reason, because every ticket sold already commits the festival’s spending, from the performers to the cooking pots. Take a moment to check your dates and quantities before you confirm your payment.',
} as const;

/** La phrase du fine print, dans la langue demandée. */
export const finePrintAnnulation = (lang: 'FR' | 'EN'): string =>
  lang === 'FR' ? POLITIQUE_ANNULATION.courteFR : POLITIQUE_ANNULATION.courteEN;
