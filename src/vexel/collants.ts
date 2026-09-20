/**
 * Les douze finitions du collant Vexel, écrites une seule fois.
 *
 * Ce fichier vit en deux copies strictement identiques : la source dans
 * `_vexel-base/src/vexel/collants.ts`, la copie de travail dans
 * `vexel-site/src/lib/compte/collants.ts`. `scripts/verif-collants.ts` du
 * site échoue si les deux cessent de se ressembler au caractère près.
 *
 * Une finition, c'est quatre choses : le fond du collant (un dégradé ou un
 * aplat, prêt pour `background`), l'encre du texte, le liseré qui cerne le
 * collant, et un drapeau `reflet` qui n'anime le voile irisé que sur l'irisé
 * et l'arc-en-ciel. Chaque finition porte aussi la formule à partir de
 * laquelle elle s'ouvre : Base ouvre les six unis et le bronze, Hybride
 * ajoute l'argent, l'or et le saphir, Signature ajoute l'irisé et
 * l'arc-en-ciel.
 */

export type FormuleCollant = 'base' | 'hybride' | 'signature';

export type FiniId =
  | 'irise'
  | 'arc-en-ciel'
  | 'or'
  | 'argent'
  | 'bronze'
  | 'saphir'
  | 'noir'
  | 'blanc'
  | 'rouge'
  | 'bleu'
  | 'vert'
  | 'violet';

export interface Fini {
  id: FiniId;
  nom: string;
  /** Le fond du collant, un dégradé ou un aplat, prêt pour `background`. */
  fond: string;
  /** La couleur du texte. */
  encre: string;
  /** Le liseré qui cerne le collant, un dégradé foil ou un aplat. */
  lisere: string;
  /** Anime le reflet foil (irisé et arc-en-ciel seulement). */
  reflet: boolean;
  formuleMin: FormuleCollant;
}

export const FINIS: Fini[] = [
  { id: 'irise', nom: 'Irisé', fond: 'linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%)', encre: '#ffffff', lisere: 'linear-gradient(120deg, #ff9ecb, #ffe08a, #9bffcf, #8ad4ff, #c9a4ff, #ff9ecb)', reflet: true, formuleMin: 'signature' },
  { id: 'arc-en-ciel', nom: 'Arc-en-ciel', fond: 'linear-gradient(100deg, #ff4d4d 0%, #ff9f43 20%, #ffd93d 40%, #3ddc84 60%, #4dabf7 80%, #b37bff 100%)', encre: '#ffffff', lisere: 'linear-gradient(100deg, #ff4d4d, #ff9f43, #ffd93d, #3ddc84, #4dabf7, #b37bff)', reflet: true, formuleMin: 'signature' },
  { id: 'or', nom: 'Or', fond: 'linear-gradient(180deg, #f7e7b0 0%, #d9a51c 50%, #f2d47a 100%)', encre: '#2b1d00', lisere: 'linear-gradient(180deg, #f7e7b0, #d9a51c, #f2d47a)', reflet: false, formuleMin: 'hybride' },
  { id: 'argent', nom: 'Argent', fond: 'linear-gradient(180deg, #f2f3f5 0%, #b7bcc4 50%, #dcdde1 100%)', encre: '#20242a', lisere: 'linear-gradient(180deg, #f2f3f5, #b7bcc4, #dcdde1)', reflet: false, formuleMin: 'hybride' },
  { id: 'bronze', nom: 'Bronze', fond: 'linear-gradient(180deg, #e6b98a 0%, #a96a35 50%, #d29a62 100%)', encre: '#2a1607', lisere: 'linear-gradient(180deg, #e6b98a, #a96a35, #d29a62)', reflet: false, formuleMin: 'base' },
  { id: 'saphir', nom: 'Saphir', fond: 'linear-gradient(135deg, #0b2a6f 0%, #1e5bd6 100%)', encre: '#ffffff', lisere: '#7fb0ff', reflet: false, formuleMin: 'hybride' },
  { id: 'noir', nom: 'Noir', fond: '#050505', encre: '#ffffff', lisere: '#ffffff', reflet: false, formuleMin: 'base' },
  { id: 'blanc', nom: 'Blanc', fond: '#f5f5f5', encre: '#050505', lisere: '#050505', reflet: false, formuleMin: 'base' },
  { id: 'rouge', nom: 'Rouge', fond: '#a61b26', encre: '#ffffff', lisere: '#ff5a63', reflet: false, formuleMin: 'base' },
  { id: 'bleu', nom: 'Bleu', fond: '#1b3f8f', encre: '#ffffff', lisere: '#4d7fd6', reflet: false, formuleMin: 'base' },
  { id: 'vert', nom: 'Vert', fond: '#1f7a46', encre: '#ffffff', lisere: '#4bb879', reflet: false, formuleMin: 'base' },
  { id: 'violet', nom: 'Violet', fond: '#5b2d8f', encre: '#ffffff', lisere: '#8f6bd6', reflet: false, formuleMin: 'base' },
];

/** L'irisé est la finition des sites déjà en ligne : le repli par défaut ne change rien. */
export const FINI_DEFAUT: FiniId = 'irise';

export const RANG_FORMULE: Record<FormuleCollant, number> = { base: 0, hybride: 1, signature: 2 };

/** Les finitions que la formule ouvre, dans l'ordre du catalogue. */
export function finisPermis(formule: FormuleCollant): Fini[] {
  return FINIS.filter((f) => RANG_FORMULE[f.formuleMin] <= RANG_FORMULE[formule]);
}

/** Vrai quand la finition nommée est ouverte par la formule. */
export function finiPermis(id: string, formule: FormuleCollant): boolean {
  return finisPermis(formule).some((f) => f.id === id);
}

/** La finition nommée par `id`, ou l'irisé quand rien ne correspond. */
export function finiDe(id: string | undefined): Fini {
  return FINIS.find((f) => f.id === id) ?? FINIS.find((f) => f.id === FINI_DEFAUT) ?? FINIS[0];
}
