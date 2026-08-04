// ─── Une seule musique à la fois ─────────────────────────────────────
// Le site a plusieurs sources sonores : le lecteur de l'en-tête (Master
// of the Feast), le chant de l'intro, la musique du plateau Hnefatafl.
// Deux qui jouent ensemble, c'est une bouillie.
//
// Contrat : avant de lancer sa piste, une source annonce son identifiant.
// Toutes les autres s'arrêtent. Volontairement minuscule et sans état
// partagé : chaque lecteur reste maître de son propre élément <audio>.

const EVT = 'fmm:audio-exclusif';

/** À appeler JUSTE AVANT de lancer sa piste. */
export function annoncerLecture(source: string): void {
  window.dispatchEvent(new CustomEvent(EVT, { detail: source }));
}

/** S'abonne : `arreter` est appelé quand une AUTRE source démarre.
 *  Rend la fonction de désabonnement, à passer au cleanup de l'effet. */
export function ecouterExclusivite(source: string, arreter: () => void): () => void {
  const onEvt = (e: Event) => {
    const qui = (e as CustomEvent<string>).detail;
    if (qui !== source) arreter();
  };
  window.addEventListener(EVT, onEvt);
  return () => window.removeEventListener(EVT, onEvt);
}
