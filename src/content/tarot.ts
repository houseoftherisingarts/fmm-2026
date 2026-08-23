// ─── Le Tarot de Marseille ──────────────────────────────────────────
// Les 78 lames, leurs noms et leurs lectures, à l'endroit comme à
// l'envers. Le jeu est celui de Lequart (Paris), scanné et versé au
// domaine public sur Wikimedia Commons : aucune image sous droits ne
// circule ici.
//
// Les lectures suivent la tradition des livrets qui accompagnaient les
// jeux : arithmologie pour les nombres (l'as commence, le deux met en
// rapport, le trois féconde, le quatre stabilise, le cinq dérange, le
// six accorde, le sept met à l'épreuve, le huit fait tenir, le neuf
// achève, le dix déborde et repart), tempérament pour les couleurs
// (bâtons = le feu et l'ouvrage, coupes = l'eau et le cœur, épées =
// l'air et la parole tranchante, deniers = la terre et le bien).

export type Couleur = 'batons' | 'coupes' | 'epees' | 'deniers';

export interface Lame {
  /** Code du fichier image : /tarot/<code>.webp */
  code:   string;
  nomFR:  string;
  nomEN:  string;
  majeure: boolean;
  couleur?: Couleur;
  /** Le chiffre : 0-21 pour les majeures, 1-14 pour les mineures. */
  rang:   number;
  droitFR:    string;  droitEN:    string;
  renverseFR: string;  renverseEN: string;
}

// ── Les vingt-deux majeures ─────────────────────────────────────────
export const MAJEURES: Lame[] = [
  {
    code: 'TT', nomFR: 'Le Mat', nomEN: 'The Fool', majeure: true, rang: 0,
    droitFR: 'Le départ sans bagage. On avance parce qu’il faut avancer, sans savoir où mène la route, et c’est précisément ce qui rend la route possible. Liberté, élan, confiance dans ses pieds.',
    droitEN: 'Departure with no luggage. You walk because walking is what there is to do, not knowing where the road leads, and that is exactly what makes the road possible. Freedom, impulse, trust in your own feet.',
    renverseFR: 'L’errance qui tourne en rond. Fuite, dispersion, refus de choisir un chemin de peur de perdre les autres.',
    renverseEN: 'Wandering that circles back on itself. Flight, scattering, refusing to pick a road for fear of losing the others.',
  },
  {
    code: 'T1', nomFR: 'Le Bateleur', nomEN: 'The Magician', majeure: true, rang: 1,
    droitFR: 'Tous les outils sont déjà sur la table. Le commencement, l’habileté, le tour de main; ce qui manque n’est pas le moyen mais la décision de s’en servir.',
    droitEN: 'Every tool is already on the table. Beginnings, skill, sleight of hand; what is missing is not the means but the decision to use it.',
    renverseFR: 'L’habileté sans but, le bavard qui s’écoute. Promesse brillante et suite qui ne vient pas.',
    renverseEN: 'Skill without a target, the talker in love with his own voice. A shiny promise with no follow-through.',
  },
  {
    code: 'T2', nomFR: 'La Papesse', nomEN: 'The High Priestess', majeure: true, rang: 2,
    droitFR: 'Le livre est ouvert mais elle ne le lit pas à voix haute. Étude, patience, secret gardé; ce qui se sait sans se dire encore.',
    droitEN: 'The book lies open but she does not read it aloud. Study, patience, a kept secret; what is known before it is spoken.',
    renverseFR: 'Le savoir qui se fige, la retenue devenue froideur. Secret qui pèse plus qu’il ne protège.',
    renverseEN: 'Knowledge gone rigid, restraint turned cold. A secret that weighs more than it shields.',
  },
  {
    code: 'T3', nomFR: 'L’Impératrice', nomEN: 'The Empress', majeure: true, rang: 3,
    droitFR: 'L’intelligence qui rayonne et fait pousser. Fécondité, clarté d’esprit, autorité douce qui convainc sans hausser la voix.',
    droitEN: 'Intelligence that radiates and makes things grow. Fertility, clarity, a gentle authority that convinces without raising its voice.',
    renverseFR: 'Le charme employé à séduire plutôt qu’à créer. Vanité, projets nombreux et jamais mûris.',
    renverseEN: 'Charm spent on seduction rather than creation. Vanity, many projects, none ripened.',
  },
  {
    code: 'T4', nomFR: 'L’Empereur', nomEN: 'The Emperor', majeure: true, rang: 4,
    droitFR: 'Le pied posé, la loi tenue. Stabilité, construction, protection de ce qui a été bâti. Ce qui dure a été assis avant d’être élevé.',
    droitEN: 'The foot set down, the law held. Stability, building, protection of what has been built. What lasts was seated before it was raised.',
    renverseFR: 'La rigidité qui prend la place de la force. Autoritarisme, refus du mouvement, pouvoir tenu par habitude.',
    renverseEN: 'Rigidity standing in for strength. Heavy-handedness, refusal to move, power held out of habit.',
  },
  {
    code: 'T5', nomFR: 'Le Pape', nomEN: 'The Hierophant', majeure: true, rang: 5,
    droitFR: 'Celui qui transmet et relie. Enseignement, conseil, alliance; on cherche ici un sens et quelqu’un qui l’a déjà cherché avant nous.',
    droitEN: 'The one who passes on and ties together. Teaching, counsel, alliance; here you look for meaning, and for someone who looked before you.',
    renverseFR: 'Le dogme récité sans être compris. Conformisme, morale de façade, conseil qui ne sert que celui qui le donne.',
    renverseEN: 'Dogma recited without being understood. Conformism, borrowed morals, advice serving only the adviser.',
  },
  {
    code: 'T6', nomFR: 'L’Amoureux', nomEN: 'The Lovers', majeure: true, rang: 6,
    droitFR: 'Le carrefour du cœur. Un lien, un choix, et l’obligation d’en assumer un seul. La carte parle moins d’amour que de décision.',
    droitEN: 'The crossroads of the heart. A bond, a choice, and the duty to hold to one. This card speaks less of love than of deciding.',
    renverseFR: 'L’indécision qui use tout le monde. Tiraillement, tentation, promesse faite à deux endroits.',
    renverseEN: 'Indecision wearing everyone down. Being pulled apart, temptation, a promise made in two places.',
  },
  {
    code: 'T7', nomFR: 'Le Chariot', nomEN: 'The Chariot', majeure: true, rang: 7,
    droitFR: 'On avance, et on tient les rênes. Victoire, voyage, élan maîtrisé. Le triomphe est réel mais il demande à être conduit.',
    droitEN: 'You move, and you hold the reins. Victory, travel, momentum under control. The triumph is real but it has to be steered.',
    renverseFR: 'L’attelage qui tire chacun de son côté. Précipitation, orgueil, route prise sans regarder la carte.',
    renverseEN: 'A team pulling in different directions. Haste, pride, a road taken without looking at the map.',
  },
  {
    code: 'T8', nomFR: 'La Justice', nomEN: 'Justice', majeure: true, rang: 8,
    droitFR: 'La balance et le glaive : mesurer, puis trancher. Équité, contrat, comptes réglés. Ce qui est juste n’est pas toujours ce qui est doux.',
    droitEN: 'Scales and sword: weigh, then cut. Fairness, contracts, accounts settled. What is just is not always what is soft.',
    renverseFR: 'La sentence prononcée d’avance. Rigueur froide, procédure qui écrase, injustice défendue par le règlement.',
    renverseEN: 'A verdict decided in advance. Cold rigour, procedure crushing sense, injustice defended by the rulebook.',
  },
  {
    code: 'T9', nomFR: 'L’Hermite', nomEN: 'The Hermit', majeure: true, rang: 9,
    droitFR: 'La lanterne basse, éclairant trois pas devant. Retrait volontaire, prudence, maturation. On y voit peu mais on y voit vrai.',
    droitEN: 'The lantern held low, lighting three steps ahead. Chosen withdrawal, prudence, ripening. You see little, but what you see is true.',
    renverseFR: 'L’isolement subi. Méfiance, lenteur qui devient refus, sagesse gardée pour soi jusqu’à l’aigreur.',
    renverseEN: 'Isolation endured rather than chosen. Distrust, slowness turning into refusal, wisdom hoarded until it sours.',
  },
  {
    code: 'T10', nomFR: 'La Roue de Fortune', nomEN: 'Wheel of Fortune', majeure: true, rang: 10,
    droitFR: 'Le tour change. Cycle, occasion, coup du sort favorable. Rien de ce qui monte n’a promis de rester en haut.',
    droitEN: 'The turn changes. Cycle, opportunity, a favourable stroke of luck. Nothing that rises ever promised to stay up.',
    renverseFR: 'La roue qui redescend. Répétition, malchance passagère, dépendance aux circonstances.',
    renverseEN: 'The wheel coming back down. Repetition, passing bad luck, dependence on circumstance.',
  },
  {
    code: 'T11', nomFR: 'La Force', nomEN: 'Strength', majeure: true, rang: 11,
    droitFR: 'La gueule tenue à mains nues, sans violence. Courage tranquille, maîtrise de soi, douceur qui vient à bout de ce que la brutalité manque.',
    droitEN: 'The jaws held with bare hands, without violence. Quiet courage, self-mastery, a gentleness that succeeds where force fails.',
    renverseFR: 'La force employée contre soi. Colère retenue trop longtemps, entêtement, énergie dépensée sans objet.',
    renverseEN: 'Strength turned against itself. Anger held too long, stubbornness, energy spent on nothing.',
  },
  {
    code: 'T12', nomFR: 'Le Pendu', nomEN: 'The Hanged Man', majeure: true, rang: 12,
    droitFR: 'Suspendu, la tête en bas, et le monde change de sens. Épreuve acceptée, renversement du regard, temps d’attente qui travaille.',
    droitEN: 'Hung upside down, and the world changes meaning. An ordeal accepted, a reversal of viewpoint, waiting that does its work.',
    renverseFR: 'Le sacrifice inutile. On reste accroché par habitude, on se plaint de la corde qu’on refuse de couper.',
    renverseEN: 'Pointless sacrifice. Still hanging out of habit, complaining about the rope you refuse to cut.',
  },
  {
    code: 'T13', nomFR: 'L’Arcane sans nom', nomEN: 'The Nameless Arcanum', majeure: true, rang: 13,
    droitFR: 'La faux qui fait place nette. Fin nécessaire, mue, nettoyage. On ne l’appelle pas par son nom parce qu’elle n’est pas une punition, mais un passage.',
    droitEN: 'The scythe clearing ground. A necessary end, a moulting, a clean sweep. It goes unnamed because it is not a punishment but a passage.',
    renverseFR: 'Le refus de la fin. On garde ce qui est mort, la coupure se fait quand même, mais en douleur inutile.',
    renverseEN: 'Refusing the end. Keeping what is already dead; the cut happens anyway, with pain added for nothing.',
  },
  {
    code: 'T14', nomFR: 'Tempérance', nomEN: 'Temperance', majeure: true, rang: 14,
    droitFR: 'Verser d’un vase à l’autre sans rien renverser. Circulation, guérison, juste dose, patience qui répare.',
    droitEN: 'Pouring from one vessel to the other without spilling. Circulation, healing, right measure, patience that mends.',
    renverseFR: 'Le mélange qui tourne. Excès, tiédeur, énergie qui stagne faute de trouver son canal.',
    renverseEN: 'A mixture gone wrong. Excess, lukewarmness, energy stagnating for want of a channel.',
  },
  {
    code: 'T15', nomFR: 'Le Diable', nomEN: 'The Devil', majeure: true, rang: 15,
    droitFR: 'La chaîne est lâche, personne ne la retire. Désir, force brute, attachement, talents mis au service de la faim. Puissance réelle, à condition de savoir qui mène.',
    droitEN: 'The chain is loose; nobody takes it off. Desire, raw force, attachment, talent in the service of hunger. Real power, if you know who is leading.',
    renverseFR: 'La chaîne qui se resserre. Dépendance, marché tacite, faiblesse qu’on appelle plaisir.',
    renverseEN: 'The chain tightening. Dependence, an unspoken bargain, weakness renamed pleasure.',
  },
  {
    code: 'T16', nomFR: 'La Maison Dieu', nomEN: 'The Tower', majeure: true, rang: 16,
    droitFR: 'La foudre ouvre le toit. Rupture brutale, vérité qui éclate, orgueil abattu. Ce qui tombe était bâti sur du vide.',
    droitEN: 'Lightning opens the roof. Sudden rupture, truth bursting out, pride brought down. What falls was built on emptiness.',
    renverseFR: 'La secousse évitée de justesse, ou repoussée. On rafistole les murs plutôt que de regarder les fondations.',
    renverseEN: 'The shock narrowly dodged, or postponed. Patching the walls instead of looking at the foundations.',
  },
  {
    code: 'T17', nomFR: 'L’Étoile', nomEN: 'The Star', majeure: true, rang: 17,
    droitFR: 'L’eau rendue à la rivière, à genoux, sans témoin. Espérance, don, apaisement après l’orage. Ce qui se donne revient autrement.',
    droitEN: 'Water given back to the river, kneeling, unwitnessed. Hope, giving, calm after the storm. What is given comes back another way.',
    renverseFR: 'L’espoir qui devient attente passive. Naïveté, se donner sans se garder de quoi tenir.',
    renverseEN: 'Hope curdling into passive waiting. Naïveté, giving away everything you need to stand.',
  },
  {
    code: 'T18', nomFR: 'La Lune', nomEN: 'The Moon', majeure: true, rang: 18,
    droitFR: 'La lumière est là, mais elle ment un peu. Imaginaire, rêves, eaux profondes; on avance à tâtons dans ce qui n’a pas encore de nom.',
    droitEN: 'There is light, but it lies a little. Imagination, dreams, deep waters; you feel your way through what has no name yet.',
    renverseFR: 'Les chiens qui aboient plus fort que la route. Illusion entretenue, angoisse, on prend son trouble pour un présage.',
    renverseEN: 'Dogs barking louder than the road. Illusion kept alive, anxiety, mistaking your own unease for an omen.',
  },
  {
    code: 'T19', nomFR: 'Le Soleil', nomEN: 'The Sun', majeure: true, rang: 19,
    droitFR: 'Deux enfants au grand jour. Clarté, amitié, réussite partagée, joie qui n’a pas besoin d’être expliquée.',
    droitEN: 'Two children in broad daylight. Clarity, friendship, shared success, joy that needs no explaining.',
    renverseFR: 'La lumière qui aveugle. Orgueil, réussite qui isole, chaleur qui devient sécheresse.',
    renverseEN: 'Light that blinds. Pride, success that isolates, warmth turning to drought.',
  },
  {
    code: 'T20', nomFR: 'Le Jugement', nomEN: 'Judgement', majeure: true, rang: 20,
    droitFR: 'La trompette réveille ce qui dormait. Appel, renaissance, décision qui remet quelqu’un debout. On répond ou on se rendort.',
    droitEN: 'The trumpet wakes what was sleeping. A call, a rebirth, a decision that puts someone back on their feet. You answer, or you sleep again.',
    renverseFR: 'L’appel qu’on n’entend pas. Regret, procès refait cent fois, verdict qu’on s’inflige.',
    renverseEN: 'A call gone unheard. Regret, a trial re-argued a hundred times, a verdict you pass on yourself.',
  },
  {
    code: 'T21', nomFR: 'Le Monde', nomEN: 'The World', majeure: true, rang: 21,
    droitFR: 'La danseuse dans sa couronne, les quatre vivants aux angles. Accomplissement, tour bouclé, place trouvée. Ce qui était épars tient ensemble.',
    droitEN: 'The dancer in her wreath, the four living creatures at the corners. Fulfilment, the circle closed, a place found. What was scattered holds together.',
    renverseFR: 'Le tour presque bouclé. Réussite qui traîne, dernier pas jamais fait, monde tenu à distance.',
    renverseEN: 'The circle nearly closed. Success dragging on, the last step never taken, the world held at arm’s length.',
  },
];

// ── Les cinquante-six mineures ──────────────────────────────────────
// La lecture d'une mineure se compose : le NOMBRE dit le mouvement, la
// COULEUR dit le terrain. Les textes ci-dessous sont déjà composés pour
// chaque lame, mais gardent cette charpente, ce qui les rend lisibles
// même à qui découvre le jeu.

const COULEURS: Record<Couleur, { fr: string; en: string; lettre: string }> = {
  batons:  { fr: 'Bâtons',  en: 'Wands',      lettre: 'B' },
  coupes:  { fr: 'Coupes',  en: 'Cups',       lettre: 'C' },
  deniers: { fr: 'Deniers', en: 'Coins',      lettre: 'P' },
  epees:   { fr: 'Épées',   en: 'Swords',     lettre: 'S' },
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

// Les lectures, couleur par couleur, du 1 au Roi.
const LECTURES: Record<Couleur, Array<{ droitFR: string; droitEN: string; renverseFR: string; renverseEN: string }>> = {
  batons: [
    { droitFR: 'Le feu qui prend. Une envie neuve, un chantier qui s’ouvre, l’énergie du premier jour.', droitEN: 'The fire catching. A fresh urge, a worksite opening, first-day energy.', renverseFR: 'L’élan qui retombe faute de bois. Projet lancé pour rien.', renverseEN: 'The impulse dropping for want of wood. A project launched into nothing.' },
    { droitFR: 'Deux forces qui se mesurent. Association possible, ou bras de fer selon qui parle.', droitEN: 'Two forces sizing each other up. A partnership, or an arm-wrestle, depending who speaks.', renverseFR: 'Rivalité stérile, deux volontés qui se bloquent.', renverseEN: 'Sterile rivalry, two wills jamming each other.' },
    { droitFR: 'L’ouvrage prend forme et porte. Croissance, premier résultat visible.', droitEN: 'The work takes shape and bears. Growth, the first visible result.', renverseFR: 'Croissance désordonnée, on bâtit plus vite qu’on ne consolide.', renverseEN: 'Disorderly growth, building faster than you shore up.' },
    { droitFR: 'Le chantier tient sur ses quatre pieds. Assise, atelier en ordre, sécurité gagnée.', droitEN: 'The worksite stands on four legs. Footing, an orderly workshop, hard-won safety.', renverseFR: 'La stabilité devient routine, le feu couve sous la cendre.', renverseEN: 'Stability turning into routine, fire smouldering under ash.' },
    { droitFR: 'Le grain de sable dans l’ouvrage. Contretemps, dispute d’atelier, remise en question utile.', droitEN: 'Grit in the works. A setback, a workshop quarrel, a useful question raised.', renverseFR: 'Le désordre s’installe, chacun tire la couverture.', renverseEN: 'Disorder settles in, everyone pulling the blanket.' },
    { droitFR: 'L’ouvrage s’accorde. Entente de travail, aide reçue, cadence trouvée.', droitEN: 'The work falls into rhythm. Working agreement, help received, a found cadence.', renverseFR: 'Fausse harmonie, on s’arrange pour éviter la vraie discussion.', renverseEN: 'False harmony, arrangements made to dodge the real conversation.' },
    { droitFR: 'L’épreuve du métier. Il faut tenir son poste, seul s’il le faut.', droitEN: 'The trade puts you to the test. Hold your post, alone if need be.', renverseFR: 'On tient par orgueil un poste qu’il fallait quitter.', renverseEN: 'Holding a post out of pride when leaving was the move.' },
    { droitFR: 'L’ouvrage tient et se répète. Solidité, cadence de production, savoir-faire installé.', droitEN: 'The work holds and repeats. Solidity, production rhythm, craft settled in.', renverseFR: 'La répétition devient piétinement. Le métier tourne sans idée.', renverseEN: 'Repetition becomes treading water. The craft runs with no idea.' },
    { droitFR: 'Presque au bout, et il reste du feu. Dernière poussée, ténacité.', droitEN: 'Nearly there, and there is fire left. Last push, tenacity.', renverseFR: 'Épuisement au dernier virage. On se raidit au lieu de finir.', renverseEN: 'Exhaustion at the last bend. Stiffening instead of finishing.' },
    { droitFR: 'La charge complète, et une braise pour le prochain feu. Aboutissement lourd mais fécond.', droitEN: 'The full load, plus an ember for the next fire. A heavy but fertile completion.', renverseFR: 'Trop porté trop longtemps. Surcharge, il faut déposer une partie du fardeau.', renverseEN: 'Too much carried too long. Overload; part of the burden must be set down.' },
    { droitFR: 'Le Valet de Bâtons : l’apprenti plein d’allant. Nouvelle qui met en marche, jeunesse au travail.', droitEN: 'Page of Wands: the eager apprentice. News that sets you moving, youth at work.', renverseFR: 'Fougue mal dirigée, on brûle l’étape qu’il fallait apprendre.', renverseEN: 'Misdirected zeal, skipping the step that had to be learned.' },
    { droitFR: 'Le Cavalier de Bâtons : le départ, la course, l’entreprise qui prend la route.', droitEN: 'Knight of Wands: departure, the ride, the venture taking the road.', renverseFR: 'On part trop vite et sans provisions. Emportement.', renverseEN: 'Leaving too fast with no supplies. Rashness.' },
    { droitFR: 'La Reine de Bâtons : celle qui tient l’atelier et le cœur des gens. Autorité chaleureuse.', droitEN: 'Queen of Wands: she who holds both the workshop and the people. Warm authority.', renverseFR: 'Autorité qui se consume, exigence qui brûle ceux qui suivent.', renverseEN: 'Authority burning itself out, demands that scorch the people following.' },
    { droitFR: 'Le Roi de Bâtons : le maître d’œuvre. Décision, entreprise menée, feu gouverné.', droitEN: 'King of Wands: the master builder. Decision, an enterprise carried, fire governed.', renverseFR: 'Le maître devient tyran de son propre chantier.', renverseEN: 'The master turning tyrant on his own worksite.' },
  ],
  coupes: [
    { droitFR: 'La source. Un sentiment neuf, une rencontre, le cœur qui s’ouvre sans calcul.', droitEN: 'The spring. A new feeling, a meeting, the heart opening without calculation.', renverseFR: 'La coupe se renverse : émotion gardée, tendresse qui n’ose pas.', renverseEN: 'The cup tips: feeling kept in, tenderness that dares not.' },
    { droitFR: 'Deux qui se répondent. Lien, réconciliation, accord du cœur.', droitEN: 'Two answering each other. A bond, a reconciliation, an accord of the heart.', renverseFR: 'Le lien se déséquilibre, l’un donne et l’autre reçoit.', renverseEN: 'The bond tilts: one gives, the other receives.' },
    { droitFR: 'La joie partagée, la fête, l’amitié qui se célèbre.', droitEN: 'Shared joy, celebration, friendship raised in a toast.', renverseFR: 'La fête qui masque. On rit pour ne pas parler.', renverseEN: 'A party that hides. Laughing so as not to speak.' },
    { droitFR: 'Le cœur au repos, un peu blasé. Confort, mais l’envie s’endort.', droitEN: 'The heart at rest, a little jaded. Comfort, but desire dozing off.', renverseFR: 'La lassitude s’installe, on ne voit plus ce qu’on a.', renverseEN: 'Weariness settles; you stop seeing what you have.' },
    { droitFR: 'Le chagrin qui traverse. Perte, deuil léger, il reste des coupes debout.', droitEN: 'Grief passing through. A loss, a small mourning; some cups are still standing.', renverseFR: 'Le chagrin retenu qui pourrit. On refuse la consolation offerte.', renverseEN: 'Grief held in and souring. Refusing the comfort offered.' },
    { droitFR: 'Le souvenir doux, les retrouvailles, ce qui vient de loin et fait du bien.', droitEN: 'A sweet memory, a reunion, something from far back that does you good.', renverseFR: 'On vit dans le souvenir plutôt que dans le jour présent.', renverseEN: 'Living in the memory instead of the day at hand.' },
    { droitFR: 'Trop de choix pour un seul cœur. Rêverie, tentations, il faudra trancher.', droitEN: 'Too many choices for one heart. Daydreaming, temptations; a cut will be needed.', renverseFR: 'On se paie de rêves. Illusion préférée au réel.', renverseEN: 'Paying yourself in dreams. Illusion preferred to the real.' },
    { droitFR: 'Quitter ce qui ne nourrit plus, sans drame. Départ mûri.', droitEN: 'Leaving what no longer nourishes, without drama. A ripened departure.', renverseFR: 'On revient sur ses pas par peur du vide.', renverseEN: 'Retracing your steps out of fear of the void.' },
    { droitFR: 'Le contentement plein. Souhait exaucé, table garnie, cœur en paix.', droitEN: 'Full contentment. A wish granted, a laid table, a heart at peace.', renverseFR: 'Le contentement se referme sur lui-même. Suffisance.', renverseEN: 'Contentment closing in on itself. Smugness.' },
    { droitFR: 'La joie qui déborde et rassemble. Famille, maisonnée, alliance heureuse.', droitEN: 'Joy overflowing and gathering people. Family, household, a happy alliance.', renverseFR: 'L’harmonie de façade, les non-dits sous la nappe.', renverseEN: 'Harmony for show, unsaid things under the tablecloth.' },
    { droitFR: 'Le Valet de Coupes : la nouvelle tendre, le message qui touche.', droitEN: 'Page of Cups: the tender news, the message that lands.', renverseFR: 'Sensiblerie, on prend son humeur pour un sentiment.', renverseEN: 'Sentimentality, mistaking a mood for a feeling.' },
    { droitFR: 'Le Cavalier de Coupes : celui qui vient avec une proposition du cœur.', droitEN: 'Knight of Cups: the one arriving with an offer of the heart.', renverseFR: 'Belle parole, promesse légère. Le cavalier repart aussi vite.', renverseEN: 'Fine words, light promises. The knight rides off just as fast.' },
    { droitFR: 'La Reine de Coupes : celle qui comprend avant qu’on ait parlé. Écoute, soin, profondeur.', droitEN: 'Queen of Cups: she who understands before you speak. Listening, care, depth.', renverseFR: 'On se noie dans l’autre. Émotivité qui submerge le jugement.', renverseEN: 'Drowning in someone else. Emotion swamping judgement.' },
    { droitFR: 'Le Roi de Coupes : gouverner sans durcir. Bienveillance qui décide quand même.', droitEN: 'King of Cups: ruling without hardening. Kindness that still decides.', renverseFR: 'Le calme de surface cache la manœuvre. Sentiment employé comme levier.', renverseEN: 'Surface calm hiding a manoeuvre. Feeling used as leverage.' },
  ],
  epees: [
    { droitFR: 'La lame nue : une idée claire, une vérité dite, un commencement qui tranche.', droitEN: 'The bare blade: a clear idea, a truth spoken, a beginning that cuts.', renverseFR: 'La clarté employée à blesser. Parole juste, moment mal choisi.', renverseEN: 'Clarity used to wound. The right words at the wrong moment.' },
    { droitFR: 'Deux lames croisées, statu quo tenu. Trêve, décision suspendue.', droitEN: 'Two blades crossed, a standoff held. Truce, a decision suspended.', renverseFR: 'La trêve se rompt. On tranche dans l’émotion.', renverseEN: 'The truce breaks. Cutting in the heat of feeling.' },
    { droitFR: 'La blessure nette. Chagrin causé par ce qui a été dit, mais l’air se dégage après.', droitEN: 'A clean wound. Sorrow caused by what was said, though the air clears after.', renverseFR: 'On retourne le couteau. Rancune entretenue.', renverseEN: 'Turning the knife. Resentment kept warm.' },
    { droitFR: 'Le repos du guerrier. Retraite volontaire, silence, convalescence.', droitEN: 'The warrior’s rest. Chosen retreat, silence, convalescence.', renverseFR: 'Le repos qui traîne devient fuite. On reste couché trop longtemps.', renverseEN: 'Rest dragging into avoidance. Lying down too long.' },
    { droitFR: 'La victoire amère. On a raison, on a gagné, et la table est vide.', droitEN: 'A bitter victory. You were right, you won, and the table is empty.', renverseFR: 'La querelle repart. Humiliation infligée ou subie.', renverseEN: 'The quarrel restarts. Humiliation given or taken.' },
    { droitFR: 'La traversée. On quitte un lieu difficile vers plus calme, sans fanfare.', droitEN: 'The crossing. Leaving a hard place for a calmer one, without fanfare.', renverseFR: 'Le départ empêché. On emporte le problème avec soi.', renverseEN: 'A departure blocked. Carrying the problem along with you.' },
    { droitFR: 'La ruse. Stratégie, discrétion, prendre par le côté ce qu’on n’aura pas de face.', droitEN: 'Cunning. Strategy, discretion, taking from the side what you will not take head-on.', renverseFR: 'La ruse se retourne. Mensonge découvert, confiance perdue.', renverseEN: 'Cunning turning back. A lie found out, trust lost.' },
    { droitFR: 'Cerné par ses propres pensées. Entrave mentale, mais les lames n’attachent que ce qu’on croit.', droitEN: 'Ringed by your own thoughts. Mental bind, though the blades hold only what you believe.', renverseFR: 'On desserre l’étau. La peur perd son autorité.', renverseEN: 'The vice loosens. Fear loses its authority.' },
    { droitFR: 'La nuit d’insomnie. Angoisse, rumination; le jour se lèvera quand même.', droitEN: 'The sleepless night. Anxiety, rumination; morning comes regardless.', renverseFR: 'On sort du cauchemar. Le pire imaginé n’aura pas lieu.', renverseEN: 'Coming out of the nightmare. The worst imagined will not happen.' },
    { droitFR: 'La fin franche. Ce cycle est mort, il n’y a plus rien à sauver, et c’est reposant.', droitEN: 'A frank ending. This cycle is dead, nothing left to save, and that is a relief.', renverseFR: 'On s’acharne sur un cadavre. Fin refusée.', renverseEN: 'Flogging a corpse. An end refused.' },
    { droitFR: 'Le Valet d’Épées : l’œil aux aguets. Vigilance, nouvelle à vérifier.', droitEN: 'Page of Swords: the watchful eye. Vigilance, news worth checking.', renverseFR: 'La curiosité tourne à l’espionnage. Parole rapportée.', renverseEN: 'Curiosity turning into snooping. Words carried back.' },
    { droitFR: 'Le Cavalier d’Épées : celui qui fonce et tranche. Décision rapide, conflit assumé.', droitEN: 'Knight of Swords: he who charges and cuts. Quick decision, conflict taken on.', renverseFR: 'La charge aveugle. On casse plus qu’on ne règle.', renverseEN: 'A blind charge. Breaking more than you settle.' },
    { droitFR: 'La Reine d’Épées : lucidité sans complaisance. Jugement sûr, franchise qui aide.', droitEN: 'Queen of Swords: lucidity without indulgence. Sure judgement, frankness that helps.', renverseFR: 'La lucidité devient froideur. On coupe les liens comme on coupe court.', renverseEN: 'Lucidity turning cold. Cutting bonds the way you cut a conversation short.' },
    { droitFR: 'Le Roi d’Épées : la loi et la raison. Arbitrage, conseil éclairé, autorité de l’esprit.', droitEN: 'King of Swords: law and reason. Arbitration, informed counsel, authority of mind.', renverseFR: 'La raison au service du pouvoir. Argutie, jugement sans cœur.', renverseEN: 'Reason serving power. Hair-splitting, judgement without heart.' },
  ],
  deniers: [
    { droitFR: 'Le grain dans la main. Occasion concrète, argent qui entre, terre à semer.', droitEN: 'The seed in hand. A concrete opportunity, money coming in, ground to sow.', renverseFR: 'L’occasion laissée passer, ou saisie sans y croire.', renverseEN: 'An opportunity let go, or taken without belief.' },
    { droitFR: 'Deux deniers qui roulent. Équilibre à tenir, deux affaires menées de front.', droitEN: 'Two coins rolling. A balance to hold, two matters carried at once.', renverseFR: 'On jongle et on laisse tomber. Trésorerie tendue.', renverseEN: 'Juggling and dropping. Cash stretched thin.' },
    { droitFR: 'Le travail bien fait, reconnu. Compétence, commande obtenue, métier qui paie.', droitEN: 'Good work, recognised. Competence, a commission won, a trade that pays.', renverseFR: 'Ouvrage bâclé ou mal payé. Reconnaissance qui manque.', renverseEN: 'Work rushed or underpaid. Recognition missing.' },
    { droitFR: 'Tenir son bien. Épargne, prudence, on garde ce qu’on a mis du temps à gagner.', droitEN: 'Holding your own. Savings, prudence, keeping what took time to earn.', renverseFR: 'La main se referme trop. Avarice, peur de manquer.', renverseEN: 'The hand closing too tight. Miserliness, fear of lack.' },
    { droitFR: 'Le froid dehors. Manque, coup dur matériel, il faut demander de l’aide.', droitEN: 'Cold outside. Lack, a material blow; help must be asked for.', renverseFR: 'On sort du creux, lentement. La porte était ouverte depuis un moment.', renverseEN: 'Coming out of the trough, slowly. The door had been open a while.' },
    { droitFR: 'La juste répartition. Don, paiement, entraide qui remet les comptes droits.', droitEN: 'Fair sharing. A gift, a payment, mutual aid that squares the books.', renverseFR: 'Le don qui crée une dette. Générosité intéressée.', renverseEN: 'A gift creating a debt. Generosity with strings.' },
    { droitFR: 'La pause avant la récolte. Patience, on regarde pousser ce qu’on a semé.', droitEN: 'The pause before harvest. Patience, watching what you sowed come up.', renverseFR: 'L’impatience gâche la récolte. On arrache avant terme.', renverseEN: 'Impatience spoiling the harvest. Pulling up too soon.' },
    { droitFR: 'L’ouvrage à l’établi. Apprentissage, ouvrage répété jusqu’à la maîtrise.', droitEN: 'Work at the bench. Apprenticeship, repetition until mastery.', renverseFR: 'La besogne sans horizon. On travaille sans savoir pourquoi.', renverseEN: 'Toil with no horizon. Working without knowing why.' },
    { droitFR: 'Le jardin qui donne. Aisance méritée, autonomie, plaisir du bien acquis.', droitEN: 'The garden yielding. Deserved ease, independence, pleasure in what you earned.', renverseFR: 'On confond confort et sécurité. Le jardin demande encore du soin.', renverseEN: 'Mistaking comfort for security. The garden still needs tending.' },
    { droitFR: 'La maison et la lignée. Patrimoine, héritage, ce qui se transmet plus loin que soi.', droitEN: 'House and lineage. Inheritance, patrimony, what passes on beyond you.', renverseFR: 'L’héritage qui pèse. Querelle d’argent en famille.', renverseEN: 'Inheritance as a weight. A money quarrel in the family.' },
    { droitFR: 'Le Valet de Deniers : l’élève appliqué. Apprentissage, économies qui commencent.', droitEN: 'Page of Coins: the diligent student. Learning, the first savings.', renverseFR: 'Application sans direction. On amasse sans projet.', renverseEN: 'Diligence with no direction. Hoarding with no plan.' },
    { droitFR: 'Le Cavalier de Deniers : le pas lourd et sûr. Constance, on livre ce qu’on promet.', droitEN: 'Knight of Coins: the heavy, sure step. Constancy, delivering what you promise.', renverseFR: 'Lenteur qui devient inertie. Le cheval ne repart plus.', renverseEN: 'Slowness turning to inertia. The horse will not start again.' },
    { droitFR: 'La Reine de Deniers : celle qui fait fructifier et nourrit. Sens pratique, générosité solide.', droitEN: 'Queen of Coins: she who makes things grow and feeds people. Practical sense, solid generosity.', renverseFR: 'On confond soin et contrôle. Générosité qui surveille.', renverseEN: 'Mistaking care for control. Generosity that keeps watch.' },
    { droitFR: 'Le Roi de Deniers : le bâtisseur de fortune. Sûreté matérielle, parole tenue en affaires.', droitEN: 'King of Coins: the builder of fortune. Material safety, a word kept in business.', renverseFR: 'La richesse devient mesure de tout. Rigidité du possédant.', renverseEN: 'Wealth as the measure of everything. The rigidity of the owner.' },
  ],
};

function mineures(): Lame[] {
  const out: Lame[] = [];
  (Object.keys(COULEURS) as Couleur[]).forEach((coul) => {
    RANGS.forEach((r, i) => {
      const l = LECTURES[coul][i];
      // « Huit de Épées » n'existe pas : la couleur qui commence par
      // une voyelle prend l'élision.
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

export const MINEURES: Lame[] = mineures();
export const JEU: Lame[] = [...MAJEURES, ...MINEURES];

// ── Les tirages ─────────────────────────────────────────────────────
export interface Position { titreFR: string; titreEN: string; sensFR: string; sensEN: string }

export interface Tirage {
  id: 'une' | 'trois' | 'croix';
  nomFR: string; nomEN: string;
  texteFR: string; texteEN: string;
  positions: Position[];
}

export const TIRAGES: Tirage[] = [
  {
    id: 'une',
    nomFR: 'Une carte', nomEN: 'One card',
    texteFR: 'La question du jour, une seule réponse. Le tirage le plus honnête : il ne laisse pas de place aux arrangements.',
    texteEN: 'One question, one answer. The most honest draw: it leaves no room for bargaining.',
    positions: [
      { titreFR: 'La carte du jour', titreEN: 'The card of the day', sensFR: 'Ce qui domine, maintenant.', sensEN: 'What rules, right now.' },
    ],
  },
  {
    id: 'trois',
    nomFR: 'Trois cartes', nomEN: 'Three cards',
    texteFR: 'Le fil du temps : d’où ça vient, où ça en est, où ça va. Le tirage de tous les jours.',
    texteEN: 'The thread of time: where it comes from, where it stands, where it goes. The everyday draw.',
    positions: [
      { titreFR: 'Ce qui précède', titreEN: 'What came before', sensFR: 'La racine de la situation, ce qui l’a mise en route.', sensEN: 'The root of the situation, what set it going.' },
      { titreFR: 'Ce qui est', titreEN: 'What is', sensFR: 'L’état présent, ce avec quoi il faut compter.', sensEN: 'The present state, what must be reckoned with.' },
      { titreFR: 'Ce qui vient', titreEN: 'What comes', sensFR: 'La pente naturelle, si rien ne change.', sensEN: 'The natural slope, if nothing changes.' },
    ],
  },
  {
    id: 'croix',
    nomFR: 'La croix celtique', nomEN: 'The Celtic cross',
    texteFR: 'Dix cartes, le tirage long. On y regarde la situation, ce qui la barre, ce qui la porte, et ce qu’en pensent les autres.',
    texteEN: 'Ten cards, the long draw. It looks at the situation, what blocks it, what carries it, and what others make of it.',
    positions: [
      { titreFR: 'La situation', titreEN: 'The situation', sensFR: 'Le cœur de l’affaire, tel qu’il est.', sensEN: 'The heart of the matter, as it stands.' },
      { titreFR: 'Ce qui barre', titreEN: 'What crosses it', sensFR: 'L’obstacle, ou l’aide qui prend la forme d’un obstacle.', sensEN: 'The obstacle, or the help wearing an obstacle’s face.' },
      { titreFR: 'La racine', titreEN: 'The root', sensFR: 'Ce qui travaille en dessous, souvent sans être dit.', sensEN: 'What works underneath, usually unspoken.' },
      { titreFR: 'Le passé récent', titreEN: 'The recent past', sensFR: 'Ce qui vient de se dénouer et pèse encore.', sensEN: 'What has just untied itself and still weighs.' },
      { titreFR: 'Ce qui couronne', titreEN: 'What crowns it', sensFR: 'Le but visé, ou ce qu’on croit viser.', sensEN: 'The aim, or what you believe you are aiming at.' },
      { titreFR: 'Le proche avenir', titreEN: 'The near future', sensFR: 'Ce qui va se présenter dans les jours qui viennent.', sensEN: 'What will show up in the days ahead.' },
      { titreFR: 'Vous', titreEN: 'You', sensFR: 'Votre position réelle dans l’affaire, pas celle que vous racontez.', sensEN: 'Your real position in the matter, not the one you narrate.' },
      { titreFR: 'L’entourage', titreEN: 'The surroundings', sensFR: 'Ce que les autres apportent, ou font peser.', sensEN: 'What others bring, or make heavier.' },
      { titreFR: 'L’espoir et la crainte', titreEN: 'Hope and fear', sensFR: 'Ce qu’on souhaite et ce qu’on redoute, souvent la même lame.', sensEN: 'What you wish for and what you dread, often the same card.' },
      { titreFR: 'L’issue', titreEN: 'The outcome', sensFR: 'Là où mène le chemin, si le chemin est tenu.', sensEN: 'Where the road leads, if the road is held.' },
    ],
  },
];
