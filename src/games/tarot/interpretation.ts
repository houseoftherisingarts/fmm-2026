// ─── La lecture d’ensemble ──────────────────────────────────────────
// Le tapis fini, une voyante ne récite pas les cartes une à une : elle
// recule d’un pas, regarde la forme du tirage et parle. Tout ce qui
// suit se fabrique à partir des lames réellement tombées, de leur
// place et de leur sens, de sorte que deux tirages ne donnent jamais
// le même texte. Aucun paragraphe fixe ne traîne ici.
//
// Posé le 2026-08-23 avec le reste du jeu de la voyante.

import type { Couleur, Lame, Tirage } from '../../content/tarot';

export interface LameTiree {
  lame: Lame;
  renversee: boolean;
}

/**
 * Le texte long d’une lame ramené à ses deux ou trois premières
 * phrases : de quoi tenir dans le panneau qui s’ouvre au survol.
 */
export function resume(t: LameTiree, fr: boolean): string {
  const texte = t.renversee
    ? (fr ? t.lame.renverseFR : t.lame.renverseEN)
    : (fr ? t.lame.droitFR : t.lame.droitEN);
  const phrases = texte.split(/(?<=[.!?…])\s+/);
  let sortie = phrases[0] ?? texte;
  for (let i = 1; i < phrases.length && i < 3 && sortie.length < 200; i++) {
    sortie += ' ' + phrases[i];
  }
  return sortie;
}

// Les petits nombres s’écrivent en toutes lettres, comme dans un livre.
const CHIFFRES_FR = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const CHIFFRES_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const nombre = (n: number, fr: boolean) =>
  (fr ? CHIFFRES_FR : CHIFFRES_EN)[n] ?? String(n);

/** La première lettre en capitale, pour ouvrir une phrase. */
const capitale = (mot: string) => mot.charAt(0).toLocaleUpperCase() + mot.slice(1);

/** La première lettre en minuscule, pour glisser un titre après une préposition. */
const minuscule = (mot: string) => mot.charAt(0).toLocaleLowerCase() + mot.slice(1);

// ── Le terrain de chaque couleur ────────────────────────────────────
const COULEURS: Record<Couleur, {
  nomFR: string; nomEN: string;
  gloseFR: string; gloseEN: string;
  reponseFR: string; reponseEN: string;
}> = {
  batons: {
    nomFR: 'Bâtons', nomEN: 'Wands',
    gloseFR: 'ils apportent le feu, l’ouvrage et l’envie de commencer',
    gloseEN: 'they bring fire, work and the urge to begin',
    reponseFR: 'La réponse arrive par les Bâtons, donc par l’ouvrage et par l’élan. Elle vous renvoie à ce que vos mains peuvent commencer sans attendre la permission de personne.',
    reponseEN: 'The answer comes by way of the Wands, which is to say by work and by drive. It sends you back to what your hands can start without waiting for anyone’s leave.',
  },
  coupes: {
    nomFR: 'Coupes', nomEN: 'Cups',
    gloseFR: 'elles apportent l’eau, le cœur et ce qui vous lie aux autres',
    gloseEN: 'they bring water, the heart and what binds you to other people',
    reponseFR: 'La réponse arrive par les Coupes, donc par le cœur et par les liens. Elle vous renvoie aux gens qui sont dans cette histoire avec vous, et à ce que vous ne leur avez pas encore dit.',
    reponseEN: 'The answer comes by way of the Cups, which is to say by the heart and by its ties. It sends you back to the people who are in this story with you, and to what you have not told them yet.',
  },
  epees: {
    nomFR: 'Épées', nomEN: 'Swords',
    gloseFR: 'elles apportent l’air, la parole et les querelles qu’elle traîne derrière elle',
    gloseEN: 'they bring air, speech and the quarrels that speech drags behind it',
    reponseFR: 'La réponse arrive par les Épées, donc par la parole et par le tranchant. Elle vous renvoie à ce qui doit être dit clairement, même si le dire coûte quelque chose.',
    reponseEN: 'The answer comes by way of the Swords, which is to say by speech and by its edge. It sends you back to what has to be said plainly, even if saying it costs you something.',
  },
  deniers: {
    nomFR: 'Deniers', nomEN: 'Coins',
    gloseFR: 'ils apportent la terre, l’argent et ce que le corps peut porter',
    gloseEN: 'they bring earth, money and what the body is able to carry',
    reponseFR: 'La réponse arrive par les Deniers, donc par la terre et par l’argent. Elle vous renvoie au concret, aux ressources dont vous disposez vraiment et au temps qu’il faudra y mettre.',
    reponseEN: 'The answer comes by way of the Coins, which is to say by earth and by money. It sends you back to the concrete, to the means you actually hold and to the time it will take.',
  },
};

/**
 * L’interprétation du tirage entier, en quatre ou cinq paragraphes.
 * Le dernier ne paraît que si une question a été posée. Un tirage
 * incomplet ne rend rien du tout.
 */
export function interpretation(
  tirage: Tirage,
  tirees: Array<LameTiree | undefined>,
  question: string,
  fr: boolean,
): string[] {
  const posees = tirees.slice(0, tirage.positions.length);
  if (posees.length < tirage.positions.length || posees.some((x) => !x)) return [];
  const lames = posees as LameTiree[];

  const nom = (i: number) => (fr ? lames[i].lame.nomFR : lames[i].lame.nomEN);
  const titre = (i: number) => (fr ? tirage.positions[i].titreFR : tirage.positions[i].titreEN);
  const total = lames.length;
  const dernier = total - 1;

  const paragraphes: string[] = [];

  // ── L’ouverture, propre à chaque tirage ───────────────────────────
  if (tirage.id === 'une') {
    paragraphes.push(fr
      ? `Une seule lame est tombée, et c’est ${nom(0)}. Elle tient la lecture entière, sans voisine pour l’adoucir ni pour la contredire, et voilà ce qui rend le tirage d’une carte aussi net.`
      : `A single card has fallen, and it is ${nom(0)}. It holds the whole reading, with no neighbour to soften it or argue with it, and that is what makes the one-card draw so plain.`);
  } else if (tirage.id === 'trois') {
    paragraphes.push(fr
      ? `La première place, celle du passé, porte ${nom(0)}. Le présent est tenu par ${nom(1)}, et c’est ${nom(2)} qui referme la ligne du côté de l’avenir. Votre regard va de gauche à droite comme va le temps, et chaque lame éclaire celle qui la suit.`
      : `The first place, the one that holds the past, carries ${nom(0)}. The present falls to ${nom(1)}, and ${nom(2)} closes the line on the side of what is coming. Your eye travels from left to right the way time does, and each card lights the one after it.`);
  } else {
    paragraphes.push(fr
      ? `La croix s’est ouverte sur ${nom(0)}, et ${nom(1)} est venue se coucher en travers pour la contrarier. Les quatre lames qui les entourent racontent d’où vient l’affaire et vers quoi elle penche, tandis que la colonne de droite dit comment tout cela peut se terminer.`
      : `The cross opened on ${nom(0)}, and ${nom(1)} came to lie across it and work against it. The four cards around them tell where the matter comes from and which way it leans, while the right-hand column says how the whole thing can end.`);
  }

  // ── La matière : ce que les majeures et les couleurs annoncent ────
  const majeures = lames.filter((x) => x.lame.majeure);
  const compte: Partial<Record<Couleur, number>> = {};
  for (const x of lames) if (x.lame.couleur) compte[x.lame.couleur] = (compte[x.lame.couleur] ?? 0) + 1;
  const dominante = (Object.entries(compte) as Array<[Couleur, number]>)
    .sort((a, b) => b[1] - a[1])[0];

  let matiere = '';
  if (majeures.length === total) {
    matiere = fr
      ? `Toutes vos lames sont des arcanes majeurs, et cela se voit rarement. Le tirage ne parle donc pas de la semaine qui vient : il parle d’un mouvement de fond, de ceux qui se décident longtemps avant que vous les remarquiez.`
      : `Every one of your cards is a major arcanum, and that is a rare sight. The draw is not speaking about the week ahead: it speaks of a deep movement, the kind that settles long before you notice it.`;
  } else if (majeures.length === 0) {
    matiere = fr
      ? `Aucun arcane majeur n’est sorti, et vous pouvez y voir une bonne nouvelle. Votre affaire se joue à hauteur d’homme, dans les gestes ordinaires, là où vous gardez la main.`
      : `Not one major arcanum came out, and you may take that as good news. Your matter is playing out at human height, in ordinary gestures, where the hand stays yours.`;
  } else if (majeures.length === 1) {
    const seul = fr ? majeures[0].lame.nomFR : majeures[0].lame.nomEN;
    matiere = fr
      ? `Un seul arcane majeur est sorti, ${seul}, et il donne le ton à toutes les autres. Les mineures diront le détail, tandis que lui dit de quoi il est question.`
      : `Only one major arcanum came out, ${seul}, and it sets the tone for all the rest. The minor cards will give you the detail, while this one names the subject.`;
  } else {
    matiere = fr
      ? `${capitale(nombre(majeures.length, true))} arcanes majeurs se sont invités sur le tapis, et cela pèse dans la balance. Les majeures nomment les grands passages d’une vie, ceux que vous traversez plus que vous ne les choisissez.`
      : `${capitale(nombre(majeures.length, false))} major arcana have invited themselves onto the cloth, and that carries weight. The majors name the great crossings of a life, the ones you go through rather than choose.`;
  }

  if (dominante && dominante[1] >= 2) {
    const c = COULEURS[dominante[0]];
    matiere += fr
      ? ` Les ${c.nomFR} reviennent ${nombre(dominante[1], true)} fois, et ${c.gloseFR}.`
      : ` The ${c.nomEN} come back ${nombre(dominante[1], false)} times, and ${c.gloseEN}.`;
  } else if (total - majeures.length >= 2) {
    matiere += fr
      ? ` Les couleurs se partagent le tapis sans qu’aucune ne l’emporte, ce qui arrive quand une question touche plusieurs terrains à la fois.`
      : ` The suits share the cloth with none of them winning out, which happens when a question touches several grounds at once.`;
  }
  paragraphes.push(matiere);

  // ── Les lames renversées ──────────────────────────────────────────
  const renversees = lames
    .map((x, i) => ({ ...x, i }))
    .filter((x) => x.renversee);

  if (renversees.length === 0) {
    paragraphes.push(fr
      ? `Aucune lame n’est sortie renversée. La route se lit donc sans détour, et ce que les images vous montrent, elles vous le montrent franchement.`
      : `No card came out reversed. The road reads straight through, and what the pictures show you, they show you honestly.`);
  } else if (renversees.length === total && total > 1) {
    paragraphes.push(fr
      ? `Chaque lame est sortie renversée, et cela arrive rarement. Une carte renversée garde son mouvement et le retourne vers vous, empêché ou rentré. Le tirage entier vous demande donc de lever quelque chose avant que la suite se mette en marche.`
      : `Every card came out reversed, and that is a rare thing. A reversed card keeps its movement and turns it back on you, held up or drawn inward. The whole draw is asking you to lift something before the rest can get moving.`);
  } else if (renversees.length === 1) {
    const r = renversees[0];
    paragraphes.push(fr
      ? `${nom(r.i)} est la seule lame renversée du tirage, à la place que la tradition appelle ${titre(r.i)}. Une carte renversée garde son mouvement et le retourne vers vous. C’est là, précisément là, que vous aurez à pousser un peu.`
      : `${nom(r.i)} is the only reversed card in the draw, in the place tradition calls ${titre(r.i)}. A reversed card keeps its movement and turns it back on you, and that is exactly where you will have to push a little.`);
  } else {
    const noms = renversees.map((r) => nom(r.i));
    // Au-delà de trois noms, la liste devient un empilement de virgules :
    // le compte suffit alors, et les cartes se lisent une à une sur le tapis.
    const liste = noms.length > 3
      ? ''
      : (fr
        ? `, soit ${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
        : `, namely ${noms.slice(0, -1).join(', ')} and ${noms[noms.length - 1]}`);
    paragraphes.push(fr
      ? `${capitale(nombre(renversees.length, true))} lames sur ${nombre(total, true)} sont sorties renversées${liste}. Une carte renversée garde son mouvement et le retourne vers vous, empêché ou rentré, et ces places-là sont celles où votre tirage résiste.`
      : `${capitale(nombre(renversees.length, false))} cards out of ${nombre(total, false)} came out reversed${liste}. A reversed card keeps its movement and turns it back on you, held up or drawn inward, and those places are where your draw puts up a fight.`);
  }

  // ── La marche vers la fin ─────────────────────────────────────────
  if (tirage.id === 'une') {
    paragraphes.push(fr
      ? `Une carte seule se relit volontiers quelques heures plus tard, quand le jour a passé dessus. ${nom(0)} garde presque toujours une deuxième chose à dire, et elle la dit à qui revient la regarder.`
      : `A single card is worth reading again a few hours later, once the day has passed over it. ${nom(0)} nearly always keeps a second thing to say, and it says it to whoever comes back to look.`);
  } else if (tirage.id === 'trois') {
    paragraphes.push(fr
      ? `La route entière tient entre votre première lame et la dernière. ${nom(2)} donne la pente plutôt que la fin, et si vous ne changez rien à votre pas, c’est elle qui aura le dernier mot.`
      : `The whole road is held between your first card and your last. ${nom(2)} gives the slope rather than the ending, and if you change nothing in your stride, it will have the last word.`);
  } else {
    paragraphes.push(fr
      ? `La croix se referme sur ${nom(9)}, et c’est là que le chemin aboutit. L’issue indique où mène la route pour peu que vous la teniez jusqu’au bout, et rien n’y est écrit d’avance.`
      : `The cross closes on ${nom(9)}, and that is where the road arrives. The outcome shows where it leads provided you hold to it, and nothing there is written in advance.`);
  }

  // ── La question, si elle a été posée ──────────────────────────────
  const demande = question.trim().slice(0, 240);
  if (demande) {
    const cle = lames[dernier];
    let reponse = fr
      ? `Vous aviez demandé : « ${demande} » Le tirage vous répond par ${nom(dernier)}, tombée à la place de ${minuscule(titre(dernier))}.`
      : `You had asked: “${demande}” The draw answers you with ${nom(dernier)}, fallen in the place of ${minuscule(titre(dernier))}.`;

    if (cle.lame.majeure) {
      reponse += fr
        ? ` Un arcane majeur vous répond, et les majeures ne répondent jamais petitement. Ce que vous demandez touche à un passage de votre vie, et le tirage le traite comme tel.`
        : ` A major arcanum is answering you, and the majors never answer in small coin. What you are asking touches a crossing in your life, and the draw treats it as one.`;
    } else if (cle.lame.couleur) {
      const c = COULEURS[cle.lame.couleur];
      reponse += ' ' + (fr ? c.reponseFR : c.reponseEN);
    }

    reponse += cle.renversee
      ? (fr
        ? ` Elle sort renversée, ce qui ne vous ferme rien : le chemin existe, il demande seulement qu’un obstacle soit levé avant.`
        : ` It comes out reversed, which closes nothing on you: the road is there, it only asks that an obstacle be lifted first.`)
      : (fr
        ? ` Elle sort à l’endroit, ce qui vous autorise à la prendre au mot.`
        : ` It comes out upright, which gives you leave to take it at its word.`);

    paragraphes.push(reponse);
  }

  return paragraphes;
}
