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
//   • `longue`    · les trois alinéas de l'encart et de l'avis épinglé
//                   (séparés par une ligne vide), version du 12 sept au
//                   soir : « installations » plutôt que « marmites », et
//                   la seule exception, une journée annulée par le festival.

export const POLITIQUE_ANNULATION = {
  titreFR: 'Politique d’annulation',
  titreEN: 'Cancellation policy',

  etiquetteFR: 'Achat définitif, non remboursable',
  etiquetteEN: 'Final sale, non-refundable',

  courteFR:
    'Politique d’annulation : tout achat est définitif dès la confirmation du paiement, et aucune annulation ni aucun remboursement n’est possible à la demande de l’acheteur, quelle qu’en soit la raison. Seule une journée annulée par le festival lui-même donne lieu à un remboursement.',
  courteEN:
    'Cancellation policy: every purchase is final once the payment is confirmed, and no cancellation or refund is possible at the buyer’s request, for any reason. Only a day cancelled by the festival itself gives rise to a refund.',

  longueFR:
    'Tout achat fait auprès du Festival Médiéval de Montpellier est définitif dès le moment où le paiement est confirmé, qu’il s’agisse d’un billet d’une journée, d’une passe de fin de semaine, d’un emplacement de camping ou d’une place au banquet. Aucune annulation n’est acceptée et aucun remboursement n’est accordé à la demande de l’acheteur, quelle qu’en soit la raison : un changement de plans, un empêchement, la maladie ou la météo ne donnent droit à aucun remboursement ni à aucun crédit, parce que chaque billet vendu engage déjà les dépenses du festival, des artistes aux installations. Le festival se tient dehors, sous la pluie comme au soleil, et un billet d’une journée vaut pour le vendredi, le samedi ou le dimanche, peu importe la date qui y figure.\n\nSi le festival lui-même devait annuler une journée complète, les billets de cette journée seraient remboursés sur le mode de paiement d’origine dans les délais de Zeffy, et c’est la seule situation qui ouvre un remboursement.\n\nEn confirmant votre paiement, vous reconnaissez avoir lu cette politique et vous acceptez que votre achat soit définitif et non remboursable. Prenez le temps de vérifier vos dates et vos quantités avant de payer.',
  longueEN:
    'Every purchase made from the Festival Médiéval de Montpellier is final the moment the payment is confirmed, whether it is a day ticket, a weekend pass, a camping spot or a seat at the banquet. No cancellation is accepted and no refund is granted at the buyer’s request, for any reason: a change of plans, an unforeseen event, illness or weather give no right to a refund or a credit, because every ticket sold already commits the festival’s expenses, from the performers to the grounds. The festival takes place outdoors whatever the weather, and a day ticket is valid for any one of the three days, whatever the printed date.\n\nShould the festival itself cancel a full day, tickets for that day would be refunded to the original payment method within Zeffy’s processing times, and that is the only situation that opens a refund.\n\nBy confirming your payment, you acknowledge that you have read this policy and you agree that your purchase is final and non-refundable. Please check your dates and quantities before paying.',
} as const;

/** La phrase du fine print, dans la langue demandée. */
export const finePrintAnnulation = (lang: 'FR' | 'EN'): string =>
  lang === 'FR' ? POLITIQUE_ANNULATION.courteFR : POLITIQUE_ANNULATION.courteEN;
