// ─── La compression des vidéos, avant l'envoi ────────────────────────
// Alex, 2026-08-28 : « pour la bande passante, il faut que les gens qui
// mettent des vidéos et des photos les compressent, avec le service que
// nous utilisons ». Les photos passent déjà par `versWebp` (canvas du
// navigateur, WebP). La vidéo suit le même principe : elle se relit
// dans une balise cachée, se redessine à 720 pixels de haut au plus, et
// MediaRecorder la réécrit en WebM à débit borné. Aucune librairie de
// plus à charger, et rien ne quitte l'appareil avant d'avoir maigri.

export const VIDEO_HAUTEUR_MAX = 720;
export const VIDEO_DEBIT = 1_500_000;      // 1,5 Mbit/s : net et léger
export const VIDEO_DUREE_MAX = 90;         // secondes
/** En dessous de ce poids, la vidéo part telle quelle. */
export const VIDEO_DEJA_LEGERE = 8 * 1024 * 1024;

export interface VideoCompressee {
  fichier: File;
  /** Vrai quand la vidéo est repartie telle quelle. */
  intacte: boolean;
}

const peutEnregistrer = (): boolean =>
  typeof window !== 'undefined'
  && typeof MediaRecorder !== 'undefined'
  && typeof HTMLCanvasElement.prototype.captureStream === 'function';

/**
 * Rend une vidéo allégée. `onProgres` reçoit une fraction de 0 à 1.
 * Si le navigateur ne sait pas réencoder, le fichier revient intact et
 * l'appelant décide quoi en dire.
 */
export async function compresserVideo(
  fichier: File,
  onProgres?: (fraction: number) => void,
): Promise<VideoCompressee> {
  if (fichier.size <= VIDEO_DEJA_LEGERE || !peutEnregistrer()) {
    return { fichier, intacte: true };
  }

  const video = document.createElement('video');
  video.src = URL.createObjectURL(fichier);
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Cette vidéo ne se lit pas.'));
    });

    if (video.duration > VIDEO_DUREE_MAX) {
      throw new Error(`La vidéo dépasse ${VIDEO_DUREE_MAX} secondes. Coupez-la avant de l’envoyer.`);
    }

    const echelle = Math.min(1, VIDEO_HAUTEUR_MAX / (video.videoHeight || VIDEO_HAUTEUR_MAX));
    const toile = document.createElement('canvas');
    toile.width = Math.round((video.videoWidth || 1280) * echelle);
    toile.height = Math.round((video.videoHeight || 720) * echelle);
    const pinceau = toile.getContext('2d');
    if (!pinceau) return { fichier, intacte: true };

    const flux = toile.captureStream(30) as MediaStream;
    // Le son voyage avec l'image quand le navigateur veut bien le donner.
    try {
      const avecSon = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      avecSon?.getAudioTracks().forEach((piste) => flux.addTrack(piste));
    } catch { /* sans son, tant pis */ }

    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const enregistreur = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: VIDEO_DEBIT });
    const morceaux: BlobPart[] = [];
    enregistreur.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };

    const fini = new Promise<void>((resolve) => { enregistreur.onstop = () => resolve(); });
    enregistreur.start(500);
    await video.play();

    let arret = false;
    const dessiner = () => {
      if (arret) return;
      pinceau.drawImage(video, 0, 0, toile.width, toile.height);
      if (video.duration) onProgres?.(Math.min(1, video.currentTime / video.duration));
      requestAnimationFrame(dessiner);
    };
    dessiner();

    await new Promise<void>((resolve) => { video.onended = () => resolve(); });
    arret = true;
    enregistreur.stop();
    await fini;

    const blob = new Blob(morceaux, { type: 'video/webm' });
    // Un réencodage plus lourd que l'original ne sert personne.
    if (blob.size >= fichier.size) return { fichier, intacte: true };
    const nom = fichier.name.replace(/\.[^.]+$/, '') + '.webm';
    return { fichier: new File([blob], nom, { type: 'video/webm' }), intacte: false };
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}
