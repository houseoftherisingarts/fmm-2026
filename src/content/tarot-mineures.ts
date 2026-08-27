// ─── Les cinquante-six arcanes mineurs ──────────────────────────────
// Une mineure se lit par composition : le NOMBRE donne le mouvement,
// la COULEUR donne le terrain. Bâtons, c'est le feu, l'ouvrage et
// l'élan; Coupes, l'eau, le cœur et les liens; Épées, l'air, la parole
// et les conflits; Deniers, la terre, l'argent et le corps.
//
// Les textes ci-dessous sont écrits carte par carte, dans l'esprit des
// livrets d'autrefois : ce que la carte annonce, ce qu'elle demande,
// et ce qu'elle devient quand elle sort renversée.

import type { Lame, Couleur } from './tarotTypes';

const COULEURS: Record<Couleur, { fr: string; en: string; lettre: string }> = {
  batons:  { fr: 'Bâtons',  en: 'Wands',  lettre: 'B' },
  coupes:  { fr: 'Coupes',  en: 'Cups',   lettre: 'C' },
  deniers: { fr: 'Deniers', en: 'Coins',  lettre: 'P' },
  epees:   { fr: 'Épées',   en: 'Swords', lettre: 'S' },
};

const RANGS: Array<{ code: string; rang: number; fr: string; en: string }> = [
  { code: '1',  rang: 1,  fr: 'As',       en: 'Ace' },
  { code: '2',  rang: 2,  fr: 'Deux',     en: 'Two' },
  { code: '3',  rang: 3,  fr: 'Trois',    en: 'Three' },
  { code: '4',  rang: 4,  fr: 'Quatre',   en: 'Four' },
  { code: '5',  rang: 5,  fr: 'Cinq',     en: 'Five' },
  { code: '6',  rang: 6,  fr: 'Six',      en: 'Six' },
  { code: '7',  rang: 7,  fr: 'Sept',     en: 'Seven' },
  { code: '8',  rang: 8,  fr: 'Huit',     en: 'Eight' },
  { code: '9',  rang: 9,  fr: 'Neuf',     en: 'Nine' },
  { code: '10', rang: 10, fr: 'Dix',      en: 'Ten' },
  { code: 'J',  rang: 11, fr: 'Valet',    en: 'Page' },
  { code: 'H',  rang: 12, fr: 'Cavalier', en: 'Knight' },
  { code: 'Q',  rang: 13, fr: 'Reine',    en: 'Queen' },
  { code: 'K',  rang: 14, fr: 'Roi',      en: 'King' },
];

interface Lecture { droitFR: string; droitEN: string; renverseFR: string; renverseEN: string }

const LECTURES: Record<Couleur, Lecture[]> = {
  batons: [
    {
      droitFR: 'L’As de Bâtons est une main qui sort du nuage et tend un bâton vert, encore couvert de feuilles : c’est du bois vivant, pas une arme morte. Il annonce le feu qui prend, l’envie neuve, le chantier qui s’ouvre, l’énergie du premier jour où tout paraît possible. Dans une vie, c’est la commande qu’on décroche, l’idée qui empêche de dormir, le désir qui revient après une longue période plate. Il demande de commencer tout de suite, pendant que le bois est encore vert : les élans qu’on remet à plus tard s’éteignent seuls.',
      droitEN: 'The Ace of Wands is a hand from the cloud holding out a green staff still covered in leaves: living wood, not a dead weapon. It announces the fire catching, a fresh urge, a worksite opening, the energy of the first day when everything looks possible. In a life it is the contract you win, the idea that keeps you awake, desire returning after a long flat stretch. It asks you to start at once, while the wood is still green: impulses put off die on their own.',
      renverseFR: 'L’élan retombe faute de bois. Renversé, l’As montre le projet lancé pour rien, l’envie qui s’éteint dès qu’il faut travailler, ou le contraire : une énergie bloquée qui ne trouve pas où s’employer et rend nerveux. Il peut indiquer un début empêché par quelqu’un ou par une peur. La carte demande de repérer ce qui coupe l’air au feu.',
      renverseEN: 'The impulse drops for want of wood. Reversed, the Ace shows a project launched into nothing, an urge that dies as soon as work is required, or the opposite: blocked energy with nowhere to go, leaving you edgy. It can mark a start prevented by someone or by a fear. The card asks you to spot what is cutting the air off the fire.',
    },
    {
      droitFR: 'Deux bâtons se croisent : deux volontés se mesurent. La carte parle d’une association qui se dessine, d’un partenaire à convaincre, d’un choix entre deux directions de travail. Elle est bonne quand on parle, mauvaise quand on s’arc-boute. Dans une vie, elle marque le moment où un projet cesse d’être solitaire et demande à être négocié.',
      droitEN: 'Two staves cross: two wills size each other up. The card speaks of a partnership taking shape, a partner to convince, a choice between two directions of work. It is good when people talk and bad when they dig in. In a life it marks the moment a project stops being solitary and has to be negotiated.',
      renverseFR: 'Rivalité stérile. Renversé, le Deux montre deux personnes qui se bloquent mutuellement, un bras de fer où chacun perd, ou une association mal accordée dès le départ. Il demande de dire clairement qui décide de quoi.',
      renverseEN: 'Sterile rivalry. Reversed, the Two shows two people jamming each other, an arm-wrestle where both lose, or a partnership badly matched from the start. It asks you to say plainly who decides what.',
    },
    {
      droitFR: 'Trois bâtons plantés, un peu de feuillage : l’ouvrage a pris et il porte. C’est le premier résultat visible, la croissance qui s’installe, la preuve que la chose fonctionne. Dans une vie, elle indique un projet qui dépasse le stade de l’essai, une clientèle qui revient, une réputation qui commence.',
      droitEN: 'Three staves planted, a little foliage: the work has taken and it bears. This is the first visible result, growth settling in, proof that the thing works. In a life it marks a project past the trial stage, customers coming back, a reputation beginning.',
      renverseFR: 'Croissance désordonnée. Renversé, le Trois montre qu’on bâtit plus vite qu’on ne consolide : trop de commandes, pas assez de bras, une expansion qui fragilise. Il demande de renforcer avant d’ajouter.',
      renverseEN: 'Disorderly growth. Reversed, the Three shows building faster than you shore up: too many orders, not enough hands, an expansion that weakens. It asks you to reinforce before adding.',
    },
    {
      droitFR: 'Quatre bâtons dressent une charpente : le chantier tient sur ses pieds. La carte parle d’assise, d’atelier en ordre, de sécurité gagnée par le travail. Elle annonce souvent une étape franchie qu’on peut fêter : local trouvé, équipe formée, saison bouclée.',
      droitEN: 'Four staves raise a frame: the worksite stands. The card speaks of footing, an orderly workshop, safety earned by work. It often announces a milestone worth celebrating: premises found, team formed, season closed.',
      renverseFR: 'La stabilité devient routine. Renversé, le Quatre montre un métier qui tourne sans idée, un confort qui endort, ou une structure trop lourde pour ce qu’elle abrite. Il demande de rallumer le feu sous la charpente.',
      renverseEN: 'Stability turns to routine. Reversed, the Four shows a trade running without ideas, a comfort that dulls, or a structure too heavy for what it shelters. It asks you to relight the fire under the frame.',
    },
    {
      droitFR: 'Cinq bâtons s’entrecroisent en désordre : le grain de sable dans l’ouvrage. La carte annonce une dispute d’atelier, une concurrence, un contretemps qui oblige à revoir la méthode. Elle est utile : elle montre où la structure grince avant qu’elle ne casse.',
      droitEN: 'Five staves tangle: grit in the works. The card announces a workshop quarrel, competition, a setback that forces a change of method. It is useful: it shows where the structure creaks before it breaks.',
      renverseFR: 'Le désordre s’installe. Renversé, le Cinq montre une équipe où chacun tire la couverture, des conflits qui durent parce que personne ne tranche, une énergie dépensée à se battre plutôt qu’à faire. Il demande une règle claire, écrite.',
      renverseEN: 'Disorder settles in. Reversed, the Five shows a team all pulling the blanket, conflicts lasting because nobody decides, energy spent fighting instead of making. It asks for a clear written rule.',
    },
    {
      droitFR: 'Six bâtons s’accordent autour d’une fleur : la cadence est trouvée. La carte parle d’entente de travail, d’aide reçue, d’une victoire partagée avec ceux qui ont porté le projet. Elle annonce souvent une reconnaissance méritée.',
      droitEN: 'Six staves gather around a flower: the rhythm is found. The card speaks of working agreement, help received, a victory shared with those who carried the project. It often announces a deserved recognition.',
      renverseFR: 'Fausse harmonie. Renversé, le Six montre qu’on s’arrange pour éviter la vraie discussion, qu’un mérite est attribué à la mauvaise personne, ou qu’une équipe applaudit ce qu’elle ne croit pas. Il demande de rendre à chacun sa part.',
      renverseEN: 'False harmony. Reversed, the Six shows arrangements made to dodge the real conversation, credit given to the wrong person, or a team applauding what it does not believe. It asks that each be given their share.',
    },
    {
      droitFR: 'Sept bâtons : l’épreuve du métier. Il faut tenir son poste, seul s’il le faut, contre plus nombreux que soi. La carte annonce une position à défendre, un savoir-faire contesté, un moment où céder coûterait plus cher que résister.',
      droitEN: 'Seven staves: the trade puts you to the test. You have to hold your post, alone if need be, against greater numbers. The card announces a position to defend, a skill challenged, a moment when giving in would cost more than holding.',
      renverseFR: 'On tient par orgueil. Renversé, le Sept montre une bataille qu’il fallait quitter, une défense devenue crispation, un épuisement à force de se justifier. Il demande de distinguer ce qui mérite d’être tenu de ce qui ne mérite que d’être lâché.',
      renverseEN: 'Holding on out of pride. Reversed, the Seven shows a battle that should have been left, a defence turned into clenching, exhaustion from constant justifying. It asks you to sort what deserves holding from what deserves letting go.',
    },
    {
      droitFR: 'Huit bâtons rangés en ordre : l’ouvrage tient et se répète. La carte parle de cadence de production, de savoir-faire installé, de messages et de mouvements rapides. Elle annonce souvent une période où les choses arrivent vite et bien.',
      droitEN: 'Eight staves ranged in order: the work holds and repeats. The card speaks of production rhythm, craft settled in, swift messages and movements. It often announces a stretch where things arrive fast and well.',
      renverseFR: 'La répétition devient piétinement. Renversé, le Huit montre un métier qui tourne à vide, des nouvelles qui tardent, un projet ralenti par la lourdeur. Il demande de changer une seule habitude pour débloquer la chaîne.',
      renverseEN: 'Repetition becomes treading water. Reversed, the Eight shows a trade running empty, news that drags, a project slowed by heaviness. It asks you to change one habit to unblock the chain.',
    },
    {
      droitFR: 'Neuf bâtons : on approche du bout et il reste du feu. La carte parle de ténacité, de dernière poussée, de vigilance après une longue lutte. Elle annonce que l’essentiel est acquis, à condition de ne pas relâcher trop tôt.',
      droitEN: 'Nine staves: the end is near and there is fire left. The card speaks of tenacity, a last push, watchfulness after a long fight. It says the essential is won, provided you do not let go too soon.',
      renverseFR: 'Épuisement au dernier virage. Renversé, le Neuf montre la méfiance devenue réflexe, la garde qu’on ne baisse plus même en paix, ou l’abandon à deux pas de l’arrivée. Il demande du repos, pas du renoncement.',
      renverseEN: 'Exhaustion at the last bend. Reversed, the Nine shows wariness turned reflex, a guard never lowered even in peace, or giving up two steps from the finish. It asks for rest, not surrender.',
    },
    {
      droitFR: 'Dix bâtons : la charge est complète, lourde, et il reste une braise pour le feu suivant. La carte parle d’un aboutissement qui pèse : responsabilité assumée, saison terminée, succès qui demande des bras. Elle rappelle qu’on peut déposer une partie du fardeau sans tout perdre.',
      droitEN: 'Ten staves: the load is full, heavy, and one ember remains for the next fire. The card speaks of a completion that weighs: responsibility carried, season finished, success that demands hands. It reminds you that part of the burden can be set down without losing everything.',
      renverseFR: 'Trop porté trop longtemps. Renversé, le Dix montre la surcharge, le refus de déléguer, le dos qui lâche avant le projet. Il demande de nommer ce qu’on peut confier à quelqu’un d’autre dès cette semaine.',
      renverseEN: 'Too much carried too long. Reversed, the Ten shows overload, refusal to delegate, a back giving out before the project does. It asks you to name what you can hand to someone else this week.',
    },
    {
      droitFR: 'Le Valet de Bâtons est l’apprenti plein d’allant, celui qui apporte une nouvelle qui met en marche. La carte parle d’un jeune collaborateur, d’un message qui relance un dossier, d’une curiosité qui vaut la peine d’être suivie. Elle demande de laisser sa chance à ce qui débute.',
      droitEN: 'The Page of Wands is the eager apprentice, the one bringing news that sets things moving. The card speaks of a young collaborator, a message that restarts a file, a curiosity worth following. It asks you to give what is beginning a chance.',
      renverseFR: 'Fougue mal dirigée. Renversé, le Valet brûle l’étape qu’il fallait apprendre, promet ce qu’il ne peut pas tenir, ou s’agite pour se donner l’air occupé. Il demande un cadre et une main sur l’épaule.',
      renverseEN: 'Misdirected zeal. Reversed, the Page skips the step that had to be learned, promises what he cannot keep, or bustles to look busy. He needs a frame and a hand on the shoulder.',
    },
    {
      droitFR: 'Le Cavalier de Bâtons part au galop : départ, course, entreprise qui prend la route. La carte annonce un déménagement, un voyage d’affaires, un projet qu’on lance pour de bon. Elle est excellente pour tout ce qui demande de l’élan et mauvaise pour ce qui demande de la patience.',
      droitEN: 'The Knight of Wands rides off: departure, the race, a venture taking the road. The card announces a move, a business trip, a project properly launched. It is excellent for anything needing momentum and poor for anything needing patience.',
      renverseFR: 'On part trop vite et sans provisions. Renversé, le Cavalier montre l’emportement, la décision prise sur un coup de sang, le projet abandonné en chemin. Il demande une carte et un plan avant de seller.',
      renverseEN: 'Leaving too fast with no supplies. Reversed, the Knight shows rashness, a decision taken in a flare of temper, a project dropped along the way. He asks for a map and a plan before saddling up.',
    },
    {
      droitFR: 'La Reine de Bâtons tient l’atelier et le cœur des gens : autorité chaleureuse, franchise, énergie qui donne envie de suivre. La carte désigne souvent une femme de tête, généreuse et directe, ou cette part de vous qui sait rassembler. Elle demande d’assumer son influence.',
      droitEN: 'The Queen of Wands holds both the workshop and the people: warm authority, frankness, energy that makes others want to follow. The card often points to a strong-minded woman, generous and direct, or the part of you that knows how to gather people. It asks you to own your influence.',
      renverseFR: 'L’autorité se consume. Renversée, la Reine exige plus qu’elle ne soutient, brûle ceux qui suivent, ou s’épuise à porter tout le monde. Elle demande de rendre une partie de la charge et de se laisser aider.',
      renverseEN: 'Authority burns itself out. Reversed, the Queen demands more than she supports, scorches those who follow, or exhausts herself carrying everyone. She needs to hand back part of the load and let herself be helped.',
    },
    {
      droitFR: 'Le Roi de Bâtons est le maître d’œuvre : il décide, il mène, il gouverne le feu au lieu de le subir. La carte annonce une décision d’entreprise, un chef juste et exigeant, une vision qui trouve enfin ses moyens. Elle demande de trancher et d’assumer.',
      droitEN: 'The King of Wands is the master builder: he decides, he leads, he governs the fire instead of enduring it. The card announces a business decision, a fair and demanding leader, a vision finally finding its means. It asks you to cut and carry.',
      renverseFR: 'Le maître devient tyran de son propre chantier. Renversé, le Roi impose au lieu de convaincre, confond l’autorité et l’humeur, ou tient un pouvoir qu’il ne sait plus à quoi employer. Il demande d’écouter ceux qui travaillent.',
      renverseEN: 'The master turns tyrant on his own worksite. Reversed, the King imposes instead of convincing, confuses authority with mood, or holds a power he no longer knows what to do with. He needs to listen to the people doing the work.',
    },
  ],
  coupes: [
    {
      droitFR: 'L’As de Coupes est la source : une coupe ornée, tenue par une main, d’où l’eau ne cesse de sourdre. Il annonce un sentiment neuf, une rencontre, une réconciliation, le cœur qui s’ouvre sans calcul. Dans une vie, c’est le début d’un amour, d’une amitié, d’une paternité, ou la joie simple qui revient après une longue sécheresse. Il demande d’accueillir sans immédiatement mesurer.',
      droitEN: 'The Ace of Cups is the spring: an ornate cup held by a hand, water endlessly welling up. It announces a new feeling, a meeting, a reconciliation, the heart opening without calculation. In a life it is the start of a love, a friendship, a fatherhood, or plain joy returning after a long drought. It asks you to receive without immediately measuring.',
      renverseFR: 'La coupe se renverse. Renversé, l’As montre l’émotion gardée pour soi, la tendresse qui n’ose pas se dire, ou un sentiment qui déborde et noie celui qui le reçoit. Il demande de nommer ce qu’on ressent, simplement, à la bonne personne.',
      renverseEN: 'The cup tips over. Reversed, the Ace shows feeling kept in, tenderness that dares not speak, or a feeling overflowing and drowning the one receiving it. It asks you to name what you feel, plainly, to the right person.',
    },
    {
      droitFR: 'Deux coupes se répondent : c’est le lien. La carte parle d’une entente du cœur, d’un accord entre deux personnes, d’une réconciliation, parfois d’un contrat scellé par l’estime plus que par l’intérêt. Elle demande de la réciprocité : deux coupes, pas une.',
      droitEN: 'Two cups answer each other: this is the bond. The card speaks of an accord of the heart, an agreement between two people, a reconciliation, sometimes a contract sealed by esteem more than interest. It asks for reciprocity: two cups, not one.',
      renverseFR: 'Le lien se déséquilibre. Renversé, le Deux montre l’un qui donne et l’autre qui reçoit, une amitié devenue service, un couple où l’un attend et l’autre décide. Il demande de rétablir l’échange, ou de partir.',
      renverseEN: 'The bond tilts. Reversed, the Two shows one giving and the other receiving, a friendship turned into service, a couple where one waits and the other decides. It asks you to restore the exchange, or leave.',
    },
    {
      droitFR: 'Trois coupes levées : la fête. La carte parle d’amitié célébrée, de bonne nouvelle partagée, de retrouvailles, d’un cercle qui se referme joyeusement. Elle annonce souvent un moment de reconnaissance affective : on est content d’être ensemble et on le dit.',
      droitEN: 'Three cups raised: celebration. The card speaks of friendship celebrated, good news shared, reunion, a circle happily closing. It often announces a moment of emotional recognition: people are glad to be together and say so.',
      renverseFR: 'La fête qui masque. Renversé, le Trois montre qu’on rit pour ne pas parler, qu’un groupe évite un sujet, ou qu’une célébration cache une fatigue. Il demande une conversation vraie, à deux, après la fête.',
      renverseEN: 'A party that hides. Reversed, the Three shows laughter used to avoid speaking, a group dodging a subject, or a celebration covering fatigue. It asks for one real conversation, in private, after the party.',
    },
    {
      droitFR: 'Quatre coupes posées, un cœur au repos et un peu blasé. La carte parle de confort qui endort le désir : tout va bien et rien ne fait envie. Elle annonce souvent une offre qu’on ne voit pas parce qu’on regarde ailleurs.',
      droitEN: 'Four cups set down, a heart at rest and slightly jaded. The card speaks of comfort dulling desire: all is well and nothing appeals. It often announces an offer you do not see because you are looking elsewhere.',
      renverseFR: 'La lassitude s’installe. Renversé, le Quatre montre l’ennui qui devient amertume, l’ingratitude envers ce qu’on a, ou au contraire le réveil : on relève la tête et l’on accepte enfin ce qui était tendu depuis longtemps.',
      renverseEN: 'Weariness settles. Reversed, the Four shows boredom turning to bitterness, ingratitude for what you have, or the opposite: waking up and finally accepting what has long been held out to you.',
    },
    {
      droitFR: 'Cinq coupes, dont plusieurs versées : le chagrin traverse. La carte parle d’une perte, d’une déception, d’un deuil léger; elle rappelle surtout qu’il reste des coupes debout, et qu’on finira par se retourner pour les voir. Elle demande de laisser le chagrin faire son travail sans s’y installer.',
      droitEN: 'Five cups, several of them spilled: grief passes through. The card speaks of a loss, a disappointment, a small mourning; above all it reminds you some cups are still standing, and that you will eventually turn to see them. It asks you to let grief do its work without moving in.',
      renverseFR: 'Le chagrin retenu pourrit. Renversé, le Cinq montre le refus de la consolation offerte, la plainte devenue identité, ou au contraire la sortie du deuil : on ramasse ce qui reste et l’on recommence.',
      renverseEN: 'Held-in grief sours. Reversed, the Five shows comfort refused, complaint turned into identity, or the opposite: coming out of mourning, picking up what remains and starting again.',
    },
    {
      droitFR: 'Six coupes fleuries : le souvenir doux. La carte parle de ce qui vient de loin et fait du bien : une amitié d’enfance, un lieu qu’on retrouve, une générosité sans arrière-pensée. Elle annonce souvent le retour de quelqu’un ou d’un savoir ancien.',
      droitEN: 'Six flowered cups: sweet memory. The card speaks of what comes from far back and does you good: a childhood friendship, a place found again, a generosity with no hidden motive. It often announces the return of someone, or of an old knowledge.',
      renverseFR: 'On vit dans le souvenir. Renversé, le Six montre la nostalgie qui empêche d’habiter le présent, l’idéalisation d’un passé qui n’a pas eu lieu ainsi, ou une dépendance à quelqu’un qu’on connaît depuis trop longtemps pour le voir tel qu’il est.',
      renverseEN: 'Living in the memory. Reversed, the Six shows nostalgia preventing you from inhabiting the present, a past idealised into something it never was, or dependence on someone you have known too long to see clearly.',
    },
    {
      droitFR: 'Sept coupes : trop de choix pour un seul cœur. La carte parle de rêverie, de tentations, de possibles qui se multiplient jusqu’à empêcher toute décision. Elle est féconde pour imaginer et dangereuse pour s’engager. Elle demande d’en choisir une et de renverser les autres.',
      droitEN: 'Seven cups: too many choices for one heart. The card speaks of daydreaming, temptations, possibilities multiplying until no decision can be made. It is fertile for imagining and dangerous for committing. It asks you to pick one and tip the others over.',
      renverseFR: 'On se paie de rêves. Renversé, le Sept montre l’illusion préférée au réel, les projets qui restent à l’état de conversation, ou la fuite dans l’imaginaire quand la vie demande un acte. Il demande une seule décision, aujourd’hui.',
      renverseEN: 'Paying yourself in dreams. Reversed, the Seven shows illusion preferred to reality, projects that never leave the conversation, or escape into fantasy when life asks for an act. It asks for one decision, today.',
    },
    {
      droitFR: 'Huit coupes qu’on laisse derrière soi : le départ mûri. La carte parle de quitter ce qui ne nourrit plus, sans drame et sans reproche. Elle annonce une démission, un déménagement, la fin d’une relation qu’on a longuement pesée. Elle demande de partir proprement, en disant pourquoi.',
      droitEN: 'Eight cups left behind: the ripened departure. The card speaks of leaving what no longer nourishes, without drama or reproach. It announces a resignation, a move, the end of a long-weighed relationship. It asks you to leave cleanly, saying why.',
      renverseFR: 'On revient sur ses pas. Renversé, le Huit montre le retour par peur du vide, la valise défaite dix fois, ou le départ impossible parce qu’on n’a pas encore admis ce qui est mort. Il demande de nommer la raison du départ.',
      renverseEN: 'Retracing your steps. Reversed, the Eight shows a return out of fear of emptiness, a suitcase unpacked ten times, or a departure made impossible because you have not yet admitted what is dead. It asks you to name the reason for leaving.',
    },
    {
      droitFR: 'Neuf coupes alignées : le contentement plein. La carte parle d’un souhait exaucé, d’une table garnie, d’un cœur en paix avec ce qu’il a. Elle est l’une des meilleures du jeu pour tout ce qui touche au bien-être et à la satisfaction méritée.',
      droitEN: 'Nine cups in a row: full contentment. The card speaks of a wish granted, a laid table, a heart at peace with what it has. It is one of the best in the deck for wellbeing and deserved satisfaction.',
      renverseFR: 'Le contentement se referme. Renversé, le Neuf montre la suffisance, le plaisir pris seul, ou l’insatisfaction chronique de qui a tout et n’en jouit pas. Il demande de partager la table.',
      renverseEN: 'Contentment closes in. Reversed, the Nine shows smugness, pleasure taken alone, or the chronic dissatisfaction of someone who has everything and enjoys none of it. It asks you to share the table.',
    },
    {
      droitFR: 'Dix coupes en arc : la joie déborde et rassemble. La carte parle de famille au sens large, de maisonnée, d’alliance heureuse, d’un bonheur qui tient dans la durée parce qu’il est partagé. Elle annonce souvent une réconciliation familiale ou une installation à plusieurs.',
      droitEN: 'Ten cups in an arc: joy overflows and gathers. The card speaks of family in the broad sense, of a household, a happy alliance, a happiness that lasts because it is shared. It often announces a family reconciliation or a home made together.',
      renverseFR: 'L’harmonie de façade. Renversé, le Dix montre les non-dits sous la nappe, une famille qui joue son rôle sans y croire, ou un rêve de foyer qui bute sur le réel. Il demande une parole vraie, même si elle dérange le dîner.',
      renverseEN: 'Harmony for show. Reversed, the Ten shows unsaid things under the tablecloth, a family playing its part without believing it, or a dream of home running into reality. It asks for one true sentence, even if it disturbs dinner.',
    },
    {
      droitFR: 'Le Valet de Coupes apporte une nouvelle tendre : une lettre, une invitation, un aveu. La carte parle d’un jeune cœur, d’une sensibilité qui s’exprime enfin, d’un talent artistique qui se déclare. Elle demande d’accueillir avec délicatesse ce qui se montre pour la première fois.',
      droitEN: 'The Page of Cups brings tender news: a letter, an invitation, a confession. The card speaks of a young heart, of a sensitivity finally speaking, of an artistic gift declaring itself. It asks you to receive gently what is showing itself for the first time.',
      renverseFR: 'Sensiblerie. Renversé, le Valet prend son humeur pour un sentiment, se blesse d’un rien, ou joue la fragilité pour obtenir. Il demande de faire la différence entre émotion et manipulation, chez soi comme chez l’autre.',
      renverseEN: 'Sentimentality. Reversed, the Page mistakes a mood for a feeling, is wounded by nothing, or plays fragility to get his way. It asks you to tell emotion from manipulation, in yourself as in others.',
    },
    {
      droitFR: 'Le Cavalier de Coupes arrive avec une proposition du cœur : une demande, une déclaration, une offre qui touche autant qu’elle engage. La carte annonce une romance, une invitation sincère, un artiste qui vient vous chercher. Elle demande de répondre plutôt que de faire attendre.',
      droitEN: 'The Knight of Cups arrives with an offer of the heart: a request, a declaration, a proposal that moves as much as it commits. The card announces a romance, a sincere invitation, an artist coming to find you. It asks you to answer rather than keep someone waiting.',
      renverseFR: 'Belle parole, promesse légère. Renversé, le Cavalier séduit et repart, confond l’élan et l’engagement, ou attend qu’on lui prouve qu’il est aimable. Il demande des actes, pas des serments.',
      renverseEN: 'Fine words, light promises. Reversed, the Knight charms and rides off, confuses impulse with commitment, or waits to be proven lovable. He needs acts, not vows.',
    },
    {
      droitFR: 'La Reine de Coupes comprend avant qu’on ait parlé : écoute, soin, profondeur, intuition juste. La carte désigne une femme qui accueille sans envahir, une thérapeute, une mère, ou cette part de vous qui sait consoler. Elle demande de faire confiance à ce que vous sentez.',
      droitEN: 'The Queen of Cups understands before you speak: listening, care, depth, accurate intuition. The card points to a woman who welcomes without invading, a therapist, a mother, or the part of you that knows how to comfort. It asks you to trust what you feel.',
      renverseFR: 'On se noie dans l’autre. Renversée, la Reine confond compassion et fusion, porte les peines de tout le monde, ou se laisse envahir jusqu’à ne plus savoir ce qu’elle veut. Elle demande une frontière, tracée doucement.',
      renverseEN: 'Drowning in someone else. Reversed, the Queen confuses compassion with fusion, carries everyone’s sorrows, or is invaded until she no longer knows what she wants. She needs a boundary, gently drawn.',
    },
    {
      droitFR: 'Le Roi de Coupes gouverne sans durcir : bienveillance qui décide quand même, autorité douce, homme de conseil qu’on va voir quand ça va mal. La carte annonce un appui solide, un arbitrage humain, une paternité au sens large. Elle demande d’allier le cœur et la décision.',
      droitEN: 'The King of Cups rules without hardening: kindness that still decides, gentle authority, the man of counsel people go to when things go badly. The card announces solid support, a humane arbitration, fatherhood in the broad sense. It asks you to marry heart and decision.',
      renverseFR: 'Le calme de surface cache la manœuvre. Renversé, le Roi emploie le sentiment comme levier, culpabilise avec douceur, ou noie ses propres peines dans quelque chose. Il demande de dire les choses franchement, une fois.',
      renverseEN: 'Surface calm hides a manoeuvre. Reversed, the King uses feeling as leverage, guilt-trips gently, or drowns his own sorrows in something. He needs to say the thing frankly, once.',
    },
  ],
  epees: [
    {
      droitFR: 'L’As d’Épées est une lame nue, tenue droite, couronnée : c’est l’idée claire, la vérité qu’on prononce, le commencement qui tranche. La carte annonce une décision lucide, un diagnostic, un contrat qui clarifie, une parole qui remet tout à sa place. Elle demande du courage : la clarté fait mal avant de soulager.',
      droitEN: 'The Ace of Swords is a bare blade, held upright, crowned: the clear idea, the truth spoken, the beginning that cuts. The card announces a lucid decision, a diagnosis, a contract that clarifies, a sentence that puts everything back in place. It asks for courage: clarity hurts before it relieves.',
      renverseFR: 'La clarté sert à blesser. Renversé, l’As montre la parole juste dite au mauvais moment, la vérité employée comme arme, ou la confusion qui empêche de trancher. Il demande de vérifier l’intention avant de parler.',
      renverseEN: 'Clarity used to wound. Reversed, the Ace shows the right words at the wrong moment, truth used as a weapon, or a confusion that prevents deciding. It asks you to check the intention before speaking.',
    },
    {
      droitFR: 'Deux épées croisées : le statu quo tenu. La carte parle d’une trêve, d’une décision suspendue, de deux options qui se valent et qu’on n’ose pas départager. Elle est utile un temps : elle empêche la casse. Elle demande une date pour trancher.',
      droitEN: 'Two crossed swords: a standoff held. The card speaks of a truce, a suspended decision, two options of equal weight nobody dares separate. It is useful for a while: it prevents damage. It asks for a date to decide.',
      renverseFR: 'La trêve se rompt. Renversé, le Deux montre la décision prise dans l’émotion, l’accord brisé, ou le refus prolongé de regarder les faits. Il demande de poser les deux options sur la table, par écrit.',
      renverseEN: 'The truce breaks. Reversed, the Two shows a decision taken in the heat of feeling, an agreement broken, or a prolonged refusal to look at the facts. It asks you to put both options on the table, in writing.',
    },
    {
      droitFR: 'Trois épées traversent une fleur : la blessure nette. La carte parle d’un chagrin causé par ce qui a été dit, d’une trahison, d’une séparation. Elle est douloureuse et propre : l’air se dégage après. Elle demande de laisser la plaie à l’air plutôt que de la couvrir.',
      droitEN: 'Three swords pierce a flower: a clean wound. The card speaks of sorrow caused by what was said, a betrayal, a separation. It is painful and clean: the air clears afterwards. It asks you to leave the wound open rather than cover it.',
      renverseFR: 'On retourne le couteau. Renversé, le Trois montre la rancune entretenue, le récit de la blessure raconté cent fois, ou la douleur qu’on refuse de reconnaître et qui sort de travers. Il demande de dire une dernière fois, puis de refermer.',
      renverseEN: 'Turning the knife. Reversed, the Three shows resentment kept warm, the wound retold a hundred times, or pain refused recognition that comes out sideways. It asks you to say it once more, then close.',
    },
    {
      droitFR: 'Quatre épées rangées : le repos du guerrier. La carte parle d’une retraite volontaire, d’un silence nécessaire, d’une convalescence. Elle annonce une pause qui répare, souvent après un conflit. Elle demande de s’arrêter pour de vrai.',
      droitEN: 'Four swords laid down: the warrior’s rest. The card speaks of chosen retreat, necessary silence, convalescence. It announces a pause that repairs, usually after a conflict. It asks you to stop for real.',
      renverseFR: 'Le repos traîne. Renversé, le Quatre montre l’évitement déguisé en repos, le retrait qui dure trop, ou l’impossibilité de se reposer parce que l’esprit continue de se battre. Il demande de fixer la fin du repos.',
      renverseEN: 'Rest drags on. Reversed, the Four shows avoidance dressed as rest, a withdrawal lasting too long, or an inability to rest because the mind keeps fighting. It asks you to set an end to the rest.',
    },
    {
      droitFR: 'Cinq épées : la victoire amère. On a eu raison, on a gagné, et la table est vide. La carte parle d’un conflit gagné au prix d’une relation, d’une humiliation infligée ou subie, d’un orgueil satisfait qui laisse un goût de cendre. Elle demande de se demander ce qu’on voulait vraiment.',
      droitEN: 'Five swords: the bitter victory. You were right, you won, and the table is empty. The card speaks of a conflict won at the cost of a relationship, a humiliation given or taken, a pride satisfied that tastes of ash. It asks what you actually wanted.',
      renverseFR: 'La querelle repart. Renversé, le Cinq montre la revanche préparée, la réconciliation impossible, ou la honte de ce qu’on a dit. Il demande de faire le premier geste, même si l’autre a tort.',
      renverseEN: 'The quarrel restarts. Reversed, the Five shows revenge being prepared, reconciliation blocked, or shame at what was said. It asks you to make the first move, even if the other is in the wrong.',
    },
    {
      droitFR: 'Six épées portées à travers l’eau : la traversée. La carte parle d’un départ vers plus calme, d’un déménagement, d’une convalescence qui avance, d’un passage sans éclat mais réel. Elle demande d’accepter de partir avec un peu de bagage seulement.',
      droitEN: 'Six swords carried across the water: the crossing. The card speaks of a move toward calmer ground, a relocation, a recovery under way, a passage without brilliance but real. It asks you to accept leaving with only a little luggage.',
      renverseFR: 'Le départ est empêché. Renversé, le Six montre qu’on emporte le problème avec soi, qu’un déménagement ne règle rien, ou qu’une aide attendue ne vient pas. Il demande de changer aussi ce qui voyage dans les bagages.',
      renverseEN: 'The departure is blocked. Reversed, the Six shows the problem carried along, a move that settles nothing, or expected help that does not come. It asks you to change what is in the luggage too.',
    },
    {
      droitFR: 'Sept épées : la ruse. La carte parle de stratégie, de discrétion, de ce qu’on obtient par le côté quand on ne l’aura pas de face. Elle peut être habile et légitime; elle peut aussi désigner quelqu’un qui agit dans votre dos. Elle demande de regarder qui joue, et comment.',
      droitEN: 'Seven swords: cunning. The card speaks of strategy, discretion, of what you take from the side when you will not take it head-on. It can be skilful and legitimate; it can also point to someone acting behind your back. It asks you to see who is playing, and how.',
      renverseFR: 'La ruse se retourne. Renversé, le Sept montre le mensonge découvert, la confiance perdue, ou la fatigue de celui qui ne peut plus tenir ses versions. Il demande de dire la vérité pendant qu’elle coûte encore peu.',
      renverseEN: 'Cunning turns back. Reversed, the Seven shows a lie found out, trust lost, or the exhaustion of someone who can no longer keep his versions straight. It asks you to tell the truth while it is still cheap.',
    },
    {
      droitFR: 'Huit épées plantées autour : cerné par ses propres pensées. La carte parle d’une entrave mentale, d’une situation qui paraît sans issue et qui l’est moins qu’il n’y paraît. Les lames n’attachent que ce qu’on croit. Elle demande de vérifier une seule des certitudes qui vous tiennent.',
      droitEN: 'Eight swords planted around: ringed by your own thoughts. The card speaks of a mental bind, of a situation that looks hopeless and is less so than it appears. The blades hold only what you believe. It asks you to test just one of the certainties holding you.',
      renverseFR: 'L’étau se desserre. Renversé, le Huit montre la peur qui perd son autorité, la sortie qu’on aperçoit enfin, ou parfois l’inverse : on se réinstalle dans l’entrave par habitude. Il demande un premier pas, minuscule.',
      renverseEN: 'The vice loosens. Reversed, the Eight shows fear losing its authority, the way out finally visible, or sometimes the opposite: settling back into the bind out of habit. It asks for a first step, tiny.',
    },
    {
      droitFR: 'Neuf épées : la nuit d’insomnie. La carte parle d’angoisse, de rumination, de la peur qui grossit dans le noir. Elle ne prédit pas le malheur : elle décrit la nuit qu’on traverse avant que le jour ne remette les choses à leur taille. Elle demande de la parler à quelqu’un.',
      droitEN: 'Nine swords: the sleepless night. The card speaks of anxiety, rumination, fear swelling in the dark. It does not predict disaster: it describes the night crossed before morning puts things back to their size. It asks you to speak it to someone.',
      renverseFR: 'On sort du cauchemar. Renversé, le Neuf montre le pire imaginé qui n’aura pas lieu, l’angoisse qui se dégonfle, ou parfois une souffrance devenue si familière qu’on ne cherche plus à en sortir. Il demande de l’aide, concrètement.',
      renverseEN: 'Coming out of the nightmare. Reversed, the Nine shows the imagined worst that will not happen, anxiety deflating, or sometimes a suffering grown so familiar you no longer look for the exit. It asks for help, concretely.',
    },
    {
      droitFR: 'Dix épées : la fin franche. Ce cycle est mort, il n’y a plus rien à sauver, et cette certitude est reposante. La carte parle d’un échec net, d’une rupture définitive, d’un dossier clos. Elle annonce aussi que le pire est derrière : quand tout est tombé, on peut enfin se relever.',
      droitEN: 'Ten swords: the frank ending. This cycle is dead, nothing left to save, and that certainty is a relief. The card speaks of a clean failure, a definitive break, a closed file. It also says the worst is behind: once everything has fallen, you can finally get up.',
      renverseFR: 'On s’acharne sur un cadavre. Renversé, le Dix montre la fin refusée, l’énergie dépensée à ranimer ce qui est mort, ou une convalescence qui commence à peine. Il demande d’enterrer proprement et de regarder ailleurs.',
      renverseEN: 'Flogging a corpse. Reversed, the Ten shows an end refused, energy spent reviving what is dead, or a convalescence barely begun. It asks you to bury it properly and look elsewhere.',
    },
    {
      droitFR: 'Le Valet d’Épées observe, l’œil aux aguets : vigilance, curiosité, information à vérifier. La carte parle d’un jeune esprit vif, d’une nouvelle qui demande confirmation, d’un apprentissage intellectuel. Elle demande de la précision.',
      droitEN: 'The Page of Swords watches, eye alert: vigilance, curiosity, information to be checked. The card speaks of a quick young mind, news needing confirmation, an intellectual apprenticeship. It asks for precision.',
      renverseFR: 'La curiosité tourne à l’espionnage. Renversé, le Valet rapporte, déforme, écoute aux portes, ou juge sans savoir. Il demande de vérifier avant de répéter.',
      renverseEN: 'Curiosity turns to snooping. Reversed, the Page carries tales, distorts, listens at doors, or judges without knowing. He needs to check before repeating.',
    },
    {
      droitFR: 'Le Cavalier d’Épées fonce, lame haute : décision rapide, conflit assumé, franchise qui ne s’excuse pas. La carte annonce une action nette, une confrontation nécessaire, un esprit qui va droit au but. Elle demande de viser juste avant de charger.',
      droitEN: 'The Knight of Swords charges, blade high: quick decision, conflict taken on, frankness that does not apologise. The card announces a clean action, a necessary confrontation, a mind that goes straight to the point. It asks you to aim before charging.',
      renverseFR: 'La charge aveugle. Renversé, le Cavalier casse plus qu’il ne règle : parole blessante, décision brutale, guerre déclarée à quelqu’un qui n’était pas l’ennemi. Il demande de compter jusqu’à demain.',
      renverseEN: 'A blind charge. Reversed, the Knight breaks more than he settles: wounding words, a brutal decision, war declared on someone who was not the enemy. He needs to count to tomorrow.',
    },
    {
      droitFR: 'La Reine d’Épées voit clair et ne se raconte pas d’histoires : jugement sûr, franchise qui aide, lucidité gagnée par l’expérience, souvent par une perte. La carte désigne une femme qu’on consulte pour la vérité, non pour la douceur. Elle demande de regarder la situation sans complaisance.',
      droitEN: 'The Queen of Swords sees clearly and tells herself no stories: sure judgement, frankness that helps, lucidity earned by experience, often by a loss. The card points to a woman you consult for truth, not for comfort. It asks you to look at the situation without indulgence.',
      renverseFR: 'La lucidité devient froideur. Renversée, la Reine coupe les liens comme elle coupe court, se protège par le sarcasme, ou juge tout le monde à l’aune de sa propre blessure. Elle demande de laisser une porte ouverte.',
      renverseEN: 'Lucidity turns cold. Reversed, the Queen cuts bonds the way she cuts conversations short, protects herself with sarcasm, or measures everyone by her own wound. She needs to leave one door open.',
    },
    {
      droitFR: 'Le Roi d’Épées : la loi et la raison. Arbitrage, conseil éclairé, autorité de l’esprit; c’est l’avocat, le juge, le médecin, celui dont on suit l’avis parce qu’il est fondé. La carte annonce une décision qui s’appuie sur des faits. Elle demande de la rigueur et de l’honnêteté intellectuelle.',
      droitEN: 'The King of Swords: law and reason. Arbitration, informed counsel, authority of mind; the lawyer, the judge, the physician, the one whose advice you follow because it is grounded. The card announces a decision resting on facts. It asks for rigour and intellectual honesty.',
      renverseFR: 'La raison au service du pouvoir. Renversé, le Roi argumente pour avoir raison, coupe les cheveux en quatre, ou juge sans cœur. Il demande de se souvenir que derrière le dossier il y a des gens.',
      renverseEN: 'Reason in the service of power. Reversed, the King argues to win, splits hairs, or judges without heart. He needs reminding that behind the file there are people.',
    },
  ],
  deniers: [
    {
      droitFR: 'L’As de Deniers est une pièce pleine, tenue dans une main : le grain qu’on peut semer. La carte annonce une occasion concrète, de l’argent qui entre, un contrat, une santé qui se raffermit, un terrain à cultiver. C’est la plus terre à terre des promesses, et la plus fiable. Elle demande de semer plutôt que de contempler.',
      droitEN: 'The Ace of Coins is a full disc held in a hand: the seed you can sow. The card announces a concrete opportunity, money coming in, a contract, health firming up, ground to cultivate. It is the most down-to-earth of promises, and the most reliable. It asks you to sow rather than admire.',
      renverseFR: 'L’occasion passe. Renversé, l’As montre l’offre laissée filer, l’argent attendu qui tarde, ou un début pris sans y croire. Il demande de vérifier les chiffres et de répondre avant la fin de la semaine.',
      renverseEN: 'The opportunity passes. Reversed, the Ace shows an offer let go, awaited money that drags, or a start taken without belief. It asks you to check the figures and answer before the week is out.',
    },
    {
      droitFR: 'Deux deniers qui roulent, reliés par un ruban : l’équilibre à tenir. La carte parle de deux affaires menées de front, d’une trésorerie qui demande de l’adresse, d’une souplesse nécessaire. Elle est favorable si l’on accepte de jongler un temps.',
      droitEN: 'Two coins rolling, joined by a ribbon: a balance to hold. The card speaks of two matters carried at once, of cash flow demanding dexterity, of a needed suppleness. It is favourable if you accept juggling for a while.',
      renverseFR: 'On jongle et l’on laisse tomber. Renversé, le Deux montre la trésorerie tendue, la double vie épuisante, ou l’incapacité à choisir entre deux engagements. Il demande d’en poser un.',
      renverseEN: 'Juggling and dropping. Reversed, the Two shows stretched cash, an exhausting double life, or an inability to choose between two commitments. It asks you to set one down.',
    },
    {
      droitFR: 'Trois deniers : le travail bien fait, reconnu. La carte parle de compétence, de commande obtenue, d’un métier qui paie enfin. Elle annonce souvent une collaboration où chacun apporte son savoir-faire. Elle demande de facturer à sa juste valeur.',
      droitEN: 'Three coins: good work, recognised. The card speaks of competence, a commission won, a trade that finally pays. It often announces a collaboration where each brings a craft. It asks you to charge what it is worth.',
      renverseFR: 'Ouvrage bâclé ou mal payé. Renversé, le Trois montre la reconnaissance qui manque, le travail livré à perte, ou la qualité sacrifiée au délai. Il demande de renégocier ou de refuser.',
      renverseEN: 'Work rushed or underpaid. Reversed, the Three shows missing recognition, work delivered at a loss, or quality sacrificed to a deadline. It asks you to renegotiate or refuse.',
    },
    {
      droitFR: 'Quatre deniers tenus serrés : garder son bien. La carte parle d’épargne, de prudence, de patrimoine qu’on protège après l’avoir gagné. Elle est bonne pour consolider, mauvaise pour entreprendre. Elle demande de distinguer la prudence de la peur.',
      droitEN: 'Four coins held tight: keeping your own. The card speaks of savings, prudence, property protected after being earned. It is good for consolidating, poor for venturing. It asks you to tell prudence from fear.',
      renverseFR: 'La main se referme trop. Renversé, le Quatre montre l’avarice, la peur de manquer qui empêche de vivre, ou une dépense soudaine qui vide ce qu’on avait mis de côté. Il demande d’ouvrir la main d’un doigt.',
      renverseEN: 'The hand closes too tight. Reversed, the Four shows miserliness, a fear of lack that prevents living, or a sudden expense emptying what was set aside. It asks you to open one finger.',
    },
    {
      droitFR: 'Cinq deniers : le froid dehors. La carte parle d’un manque réel, d’un coup dur matériel, d’une santé qui flanche, d’une solitude devant l’argent. Elle rappelle surtout qu’il y a une porte éclairée à côté et qu’il faut frapper : demander de l’aide est le geste que la carte demande.',
      droitEN: 'Five coins: cold outside. The card speaks of real lack, a material blow, failing health, loneliness in front of money. Above all it reminds you there is a lit door nearby and you must knock: asking for help is what the card asks.',
      renverseFR: 'On sort du creux, lentement. Renversé, le Cinq montre la fin d’une période difficile, l’aide enfin acceptée, ou au contraire l’enfermement dans la précarité par honte. Il demande de nommer le besoin à haute voix.',
      renverseEN: 'Coming out of the trough, slowly. Reversed, the Five shows the end of a hard stretch, help finally accepted, or the opposite: staying stuck in precarity out of shame. It asks you to name the need out loud.',
    },
    {
      droitFR: 'Six deniers : la juste répartition. La carte parle d’un don, d’un paiement, d’une entraide qui remet les comptes droits. Elle annonce souvent un soutien reçu ou accordé, une bourse, un salaire attendu. Elle demande de donner sans humilier et de recevoir sans se rabaisser.',
      droitEN: 'Six coins: fair sharing. The card speaks of a gift, a payment, mutual aid that squares the books. It often announces support received or given, a grant, an awaited wage. It asks you to give without humiliating and to receive without lowering yourself.',
      renverseFR: 'Le don crée une dette. Renversé, le Six montre la générosité intéressée, l’aide qui achète, ou un déséquilibre où l’un donne toujours et l’autre attend. Il demande de clarifier ce qui est prêté et ce qui est donné.',
      renverseEN: 'A gift that creates a debt. Reversed, the Six shows generosity with strings, help that buys, or an imbalance where one always gives and the other waits. It asks you to clarify what is lent and what is given.',
    },
    {
      droitFR: 'Sept deniers : la pause avant la récolte. La carte parle de patience, du temps qu’il faut laisser à ce qu’on a semé, de l’évaluation à mi-parcours. Elle annonce un résultat qui vient, mais pas encore. Elle demande de ne pas arracher pour voir si ça pousse.',
      droitEN: 'Seven coins: the pause before harvest. The card speaks of patience, of the time you must give what you sowed, of a mid-course assessment. It announces a result on its way, but not yet. It asks you not to pull the plant up to see if it is growing.',
      renverseFR: 'L’impatience gâche la récolte. Renversé, le Sept montre l’abandon juste avant le fruit, l’investissement retiré trop tôt, ou l’inverse : l’acharnement sur un champ stérile. Il demande d’évaluer froidement le rendement.',
      renverseEN: 'Impatience spoils the harvest. Reversed, the Seven shows giving up just before the fruit, an investment pulled too soon, or the opposite: stubbornly working a sterile field. It asks for a cold look at the yield.',
    },
    {
      droitFR: 'Huit deniers : l’ouvrage à l’établi. La carte parle d’apprentissage, de répétition jusqu’à la maîtrise, de l’humilité du métier. Elle annonce une formation, un emploi régulier, une compétence qui s’installe pour de bon. Elle demande d’y retourner demain.',
      droitEN: 'Eight coins: work at the bench. The card speaks of apprenticeship, repetition until mastery, the humility of a craft. It announces a training, a steady job, a skill settling in for good. It asks you to come back to it tomorrow.',
      renverseFR: 'La besogne sans horizon. Renversé, le Huit montre le travail machinal, le savoir-faire employé sans joie, ou la formation abandonnée en route. Il demande de retrouver à quoi sert ce qu’on fait.',
      renverseEN: 'Toil with no horizon. Reversed, the Eight shows mechanical work, craft used joylessly, or training abandoned midway. It asks you to find again what the work is for.',
    },
    {
      droitFR: 'Neuf deniers : le jardin qui donne. La carte parle d’aisance méritée, d’autonomie, du plaisir tranquille de jouir de ce qu’on a bâti seul. Elle annonce une sécurité matérielle réelle et une liberté qui va avec. Elle demande d’en profiter sans culpabilité.',
      droitEN: 'Nine coins: the garden yielding. The card speaks of deserved ease, independence, the quiet pleasure of enjoying what you built yourself. It announces real material security and the freedom that comes with it. It asks you to enjoy it without guilt.',
      renverseFR: 'On confond confort et sécurité. Renversé, le Neuf montre une aisance qui repose sur un fil, une dépendance dorée, ou un jardin qu’on néglige en croyant qu’il pousse tout seul. Il demande de retourner à l’entretien.',
      renverseEN: 'Comfort mistaken for security. Reversed, the Nine shows ease resting on a thread, a gilded dependence, or a garden neglected in the belief that it grows by itself. It asks you to go back to the tending.',
    },
    {
      droitFR: 'Dix deniers : la maison et la lignée. La carte parle de patrimoine, d’héritage, de ce qui se transmet plus loin que soi : une entreprise familiale, une maison, un savoir. Elle annonce une stabilité qui dépasse une seule vie. Elle demande de penser à ceux qui viendront après.',
      droitEN: 'Ten coins: house and lineage. The card speaks of inheritance, patrimony, of what passes beyond you: a family business, a house, a knowledge. It announces a stability larger than one life. It asks you to think of those coming after.',
      renverseFR: 'L’héritage pèse. Renversé, le Dix montre une querelle d’argent en famille, une maison qui coûte plus qu’elle ne donne, ou le poids d’une tradition qu’on porte sans l’avoir choisie. Il demande de séparer ce qui est à soi de ce qui est à la famille.',
      renverseEN: 'Inheritance weighs. Reversed, the Ten shows a family money quarrel, a house costing more than it gives, or the weight of a tradition carried without choosing it. It asks you to separate what is yours from what is the family’s.',
    },
    {
      droitFR: 'Le Valet de Deniers étudie sa pièce : l’élève appliqué. La carte parle d’un apprentissage concret, des premières économies, d’un jeune qui apprend un métier de ses mains. Elle annonce une offre modeste mais solide. Elle demande de la régularité.',
      droitEN: 'The Page of Coins studies his disc: the diligent student. The card speaks of concrete learning, first savings, a young person learning a trade by hand. It announces a modest but solid offer. It asks for regularity.',
      renverseFR: 'Application sans direction. Renversé, le Valet amasse sans projet, étudie sans pratiquer, ou remet toujours le premier vrai pas. Il demande un objectif chiffré et une date.',
      renverseEN: 'Diligence without direction. Reversed, the Page hoards with no plan, studies without practising, or keeps postponing the first real step. He needs a figure and a date.',
    },
    {
      droitFR: 'Le Cavalier de Deniers avance au pas, lourd et sûr : constance, fiabilité, travail livré comme promis. La carte annonce une progression lente mais certaine, un partenaire sur qui compter, un revenu régulier. Elle demande de la patience et de la parole tenue.',
      droitEN: 'The Knight of Coins moves at a walk, heavy and sure: constancy, reliability, work delivered as promised. The card announces slow but certain progress, a partner you can count on, a steady income. It asks for patience and a kept word.',
      renverseFR: 'La lenteur devient inertie. Renversé, le Cavalier n’avance plus : routine, refus du changement, projet qui s’enlise faute d’élan. Il demande un coup de talon.',
      renverseEN: 'Slowness turns to inertia. Reversed, the Knight stops moving: routine, refusal of change, a project bogged down for want of momentum. He needs a heel to the flank.',
    },
    {
      droitFR: 'La Reine de Deniers fait fructifier et nourrit : sens pratique, générosité solide, art de gérer une maison ou une affaire sans en faire un drame. La carte désigne une femme qui sait compter et qui nourrit quand même. Elle demande de prendre soin du concret.',
      droitEN: 'The Queen of Coins makes things grow and feeds people: practical sense, solid generosity, the art of running a house or a business without drama. The card points to a woman who knows how to count and feeds people anyway. It asks you to take care of the concrete.',
      renverseFR: 'On confond soin et contrôle. Renversée, la Reine surveille, compte les parts, ou se sacrifie au point de s’oublier. Elle demande de laisser les autres se servir eux-mêmes.',
      renverseEN: 'Care mistaken for control. Reversed, the Queen watches, counts the portions, or sacrifices herself to the point of vanishing. She needs to let others serve themselves.',
    },
    {
      droitFR: 'Le Roi de Deniers est le bâtisseur de fortune : sûreté matérielle, parole tenue en affaires, patience de celui qui a construit pierre par pierre. La carte annonce un appui financier, un investisseur sérieux, un métier qui devient patrimoine. Elle demande de tenir ses engagements à la lettre.',
      droitEN: 'The King of Coins is the builder of fortune: material safety, a word kept in business, the patience of someone who built stone by stone. The card announces financial backing, a serious investor, a trade becoming an estate. It asks you to keep your commitments to the letter.',
      renverseFR: 'La richesse devient la mesure de tout. Renversé, le Roi confond valeur et prix, tient les gens par l’argent, ou s’enferme dans la peur de perdre ce qu’il a bâti. Il demande de se souvenir de ce que l’argent devait servir.',
      renverseEN: 'Wealth becomes the measure of everything. Reversed, the King confuses worth with price, holds people by money, or shuts himself in fear of losing what he built. He needs to remember what the money was for.',
    },
  ],
};

function bâtir(): Lame[] {
  const out: Lame[] = [];
  (Object.keys(COULEURS) as Couleur[]).forEach((coul) => {
    RANGS.forEach((r, i) => {
      const l = LECTURES[coul][i];
      // « Huit de Épées » n'existe pas : la voyelle prend l'élision.
      const liaison = COULEURS[coul].fr === 'Épées' ? 'd’' : 'de ';
      out.push({
        code: `${r.code}${COULEURS[coul].lettre}`,
        nomFR: `${r.fr} ${liaison}${COULEURS[coul].fr}`,
        nomEN: `${r.en} of ${COULEURS[coul].en}`,
        majeure: false,
        couleur: coul,
        rang: r.rang,
        droitFR: l.droitFR, droitEN: l.droitEN,
        renverseFR: l.renverseFR, renverseEN: l.renverseEN,
      });
    });
  });
  return out;
}

export const MINEURES: Lame[] = bâtir();
