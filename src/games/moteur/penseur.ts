// ─── Le penseur : ce que les pages de jeu appellent ─────────────────
// Alex, 2026-09-01 : « il faut que l'IA réfléchisse aux règles,
// apprenne les règles, fasse plusieurs parties en arrière-plan. »
//
// Le penseur est la porte unique entre une page de jeu et la réflexion
// de la machine. Il tient un seul travailleur vivant, il l'ouvre au
// premier besoin, il l'enterre proprement quand la page se démonte, et
// il sait se passer de lui.
//
// Trois choses qu'il fait et qui ne se voient pas :
//
//   il réfléchit pendant le tour de l'adversaire. `anticiper` lance la
//   recherche sur la position courante dès que la main passe au joueur
//   humain, et la mémoire du travailleur garde les réponses aux coups
//   les plus probables. Le coup suivant de la machine part alors
//   sur-le-champ, au lieu de faire attendre deux secondes et demie;
//
//   il annule. Une demande neuve enterre la précédente, et la promesse
//   abandonnée se résout sur `null` plutôt que d'être rejetée : une page
//   qui change de partie n'a pas à attraper une erreur pour un coup dont
//   elle ne veut plus;
//
//   il se replie. Un navigateur sans Web Worker, un rendu hors du
//   navigateur ou un travailleur qui refuse de démarrer ne bloquent
//   rien : le coup se calcule alors ici même, exactement comme avant, et
//   la promesse est déjà tenue quand elle revient.
//
// Aucune horloge ne tourne dans ce fichier. Il n'y a ni `setInterval`
// ni sondage : la réponse arrive par un message, et rien ne reste à
// nettoyer sinon le travailleur lui-même.

import {
  coupSynchrone,
  type JeuPlateau, type OptionsReflexion, type ReponseTravailleur,
} from './travailleur';
import { NIVEAUX, type Niveau } from './niveaux';

export type { JeuPlateau, OptionsReflexion } from './travailleur';

/** Une demande en vol : son numéro, et de quoi la tenir dans les deux
 *  cas, celui où le travailleur répond et celui où il abandonne. */
interface Attente {
  id: number;
  tenir: (coup: unknown) => void;
  /** Le même coup, calculé ici, quand le travailleur a échoué. */
  repli: () => unknown;
}

export class Penseur {
  /** Le seul travailleur vivant. Il naît au premier besoin. */
  private travailleur: Worker | null = null;

  /** Vrai quand aucun travailleur ne peut démarrer. On ne réessaie plus :
   *  un navigateur qui a dit non une fois dira non toutes les fois. */
  private sansTravailleur = false;

  /** Les demandes sont numérotées à partir de un. Le zéro est réservé
   *  aux réflexions anticipées, qui ne répondent à personne. */
  private prochainId = 1;

  private attente: Attente | null = null;

  private ferme = false;

  /**
   * Le coup que la machine joue sur cette position, à cette marche.
   *
   * La promesse se tient toujours, et elle rend `null` quand il n'y a
   * rien à jouer ou quand la demande a été enterrée par une autre.
   */
  demanderCoup<C = unknown>(
    jeu: JeuPlateau, variante: string, etat: unknown, niveau: Niveau,
    o: OptionsReflexion = {},
  ): Promise<C | null> {
    this.oublier();
    const repli = () => coupSynchrone(jeu, variante, etat, niveau, o);
    if (this.ferme) return Promise.resolve(null);

    const w = this.ouvrir();
    if (!w) return Promise.resolve(repli() as C | null);

    const id = this.prochainId++;
    const promesse = new Promise<C | null>((tenir) => {
      this.attente = { id, tenir: (coup) => tenir(coup as C | null), repli };
    });
    try {
      w.postMessage({ id, jeu, variante, etat, niveau, graine: o.graine, noeudsMax: o.noeudsMax });
    } catch {
      // L'état n'a pas passé le clonage structuré. Le coup se calcule
      // ici plutôt que de laisser la page sans réponse, et le
      // travailleur reste en place pour les autres demandes.
      this.attente = null;
      return Promise.resolve(repli() as C | null);
    }
    return promesse;
  }

  /**
   * Réfléchir pendant que l'autre réfléchit. À appeler dès que la main
   * passe au joueur humain, avec la position qu'il a devant lui.
   *
   * Rien ne se passe sans travailleur : chercher ici gèlerait la page
   * pendant le tour du joueur, ce qui est exactement le contraire du
   * but. Rien ne se passe non plus aux marches qui ne pensent pas
   * d'avance, où la recherche est de toute façon instantanée.
   */
  anticiper(
    jeu: JeuPlateau, variante: string, etat: unknown, niveau: Niveau,
    o: OptionsReflexion = {},
  ): void {
    if (this.ferme || !NIVEAUX[niveau].pense) return;
    const w = this.ouvrir();
    if (!w) return;
    try {
      w.postMessage({ id: 0, jeu, variante, etat, niveau, graine: o.graine, anticipation: true });
    } catch {
      // L'état ne se clone pas : tant pis pour l'avance, la partie
      // continue sans elle.
    }
  }

  /** Coupe la réflexion en cours, celle qui anticipe comprise. À appeler
   *  quand la partie change de position sans que la machine ait joué. */
  arreter(): void {
    this.oublier();
    this.travailleur?.postMessage({ arret: true });
  }

  /** Enterre le travailleur. À appeler au démontage de la page. */
  fermer(): void {
    this.ferme = true;
    this.oublier();
    this.travailleur?.terminate();
    this.travailleur = null;
  }

  /** La demande en vol n'intéresse plus personne. Sa promesse se tient
   *  sur `null` : une page qui a changé de partie ne joue rien. */
  private oublier(): void {
    const a = this.attente;
    this.attente = null;
    a?.tenir(null);
  }

  private ouvrir(): Worker | null {
    if (this.travailleur) return this.travailleur;
    if (this.sansTravailleur || this.ferme) return null;
    if (typeof Worker === 'undefined') {
      this.sansTravailleur = true;
      return null;
    }
    try {
      const w = new Worker(new URL('./travailleur.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent) => this.recevoir(e.data as ReponseTravailleur);
      // Un travailleur qui tombe ne doit pas emporter la partie avec
      // lui : la demande en vol se calcule ici, et les suivantes aussi.
      w.onerror = () => this.abandonner();
      w.onmessageerror = () => this.abandonner();
      this.travailleur = w;
      return w;
    } catch {
      this.sansTravailleur = true;
      return null;
    }
  }

  private recevoir(r: ReponseTravailleur): void {
    const a = this.attente;
    // Une réponse d'anticipation porte le numéro zéro, et une demande
    // enterrée porte un numéro périmé. Ni l'une ni l'autre ne réveille
    // une page.
    if (!a || a.id !== r.id) return;
    this.attente = null;
    if (r.erreur) { a.tenir(a.repli()); return; }
    a.tenir(r.coup ?? null);
  }

  private abandonner(): void {
    const a = this.attente;
    this.attente = null;
    this.sansTravailleur = true;
    this.travailleur?.terminate();
    this.travailleur = null;
    a?.tenir(a.repli());
  }
}

/** Un penseur tout neuf. Une page en garde un seul, dans une `ref`, et
 *  appelle `fermer()` au démontage. */
export const nouveauPenseur = (): Penseur => new Penseur();
