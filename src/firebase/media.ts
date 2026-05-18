// Media library — Firebase Storage list + upload.
// Admin MediasSection reads the `media/` prefix for the gallery grid
// and uploads new files from the Téléverser button.

import {
  ref, listAll, getDownloadURL, getMetadata, uploadBytes,
} from 'firebase/storage';
import { storage } from '../firebase';

export interface MediaItem {
  id:      string;   // Storage full path
  src:     string;   // download URL
  alt:     string;   // filename without extension
  folder:  string;   // parent path segment (e.g. "home", "musique")
  sizeKb:  number;
}

const MEDIA_ROOT = 'media';

// Recursively list all items under `media/` in Storage.
// For each item we fetch the download URL and metadata (for file size).
// Returns [] when Storage is not configured.
export async function listMediaLibrary(): Promise<MediaItem[]> {
  if (!storage) return [];

  const rootRef = ref(storage, MEDIA_ROOT);
  const result  = await listAll(rootRef);

  // Also list one level of prefixes (sub-folders like media/home/)
  const subListResults = await Promise.all(
    result.prefixes.map((prefix) => listAll(prefix)),
  );

  const allItems = [
    ...result.items,
    ...subListResults.flatMap((r) => r.items),
  ];

  const settled = await Promise.allSettled(
    allItems.map(async (item) => {
      const [src, meta] = await Promise.all([
        getDownloadURL(item),
        getMetadata(item),
      ]);
      // folder = immediate parent segment (last prefix before filename)
      const parts  = item.fullPath.split('/');
      const folder = parts.length > 2 ? parts[parts.length - 2] : MEDIA_ROOT;
      // alt = filename without extension
      const filename = parts[parts.length - 1];
      const alt      = filename.replace(/\.[^.]+$/, '');
      const sizeKb   = meta.size ? Math.round(meta.size / 1024) : 0;
      return { id: item.fullPath, src, alt, folder, sizeKb } satisfies MediaItem;
    }),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<MediaItem> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// Upload a single file into `media/{folder}/{timestamp}-{filename}`.
// Returns the resulting MediaItem (with freshly resolved download URL).
export async function uploadMediaItem(file: File, folder: string): Promise<MediaItem> {
  if (!storage) throw new Error('Firebase Storage not configured');

  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path      = `${MEDIA_ROOT}/${folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  const snapshot  = await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'public,max-age=31536000',
  });

  const [src, meta] = await Promise.all([
    getDownloadURL(snapshot.ref),
    getMetadata(snapshot.ref),
  ]);

  const alt    = safeName.replace(/\.[^.]+$/, '');
  const sizeKb = meta.size ? Math.round(meta.size / 1024) : 0;
  return { id: path, src, alt, folder, sizeKb };
}
