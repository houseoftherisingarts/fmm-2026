// Vendor media uploads — logo + main photo to Firebase Storage.
// Files land at vendors/{uid}/{kind}.{ext} so Jesse and the public
// kiosk page can reference a stable URL even after re-uploads.

import {
  ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '../firebase';

export type VendorMediaKind = 'logo' | 'main';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
}

export interface UploadHandle {
  promise: Promise<string>;            // resolves to download URL
  cancel: () => void;
}

const extFromMime = (mime: string): string => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'bin';
};

export const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export function uploadVendorMedia(
  uid: string,
  kind: VendorMediaKind,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): UploadHandle {
  if (!storage) {
    return {
      promise: Promise.reject(new Error('Firebase Storage not configured')),
      cancel: () => {},
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      promise: Promise.reject(new Error(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`)),
      cancel: () => {},
    };
  }
  const ext  = extFromMime(file.type) || (file.name.split('.').pop() || 'bin');
  const path = `vendors/${uid}/${kind}.${ext}`;
  const task = uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'public,max-age=31536000,immutable',
  });

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => {
        if (!onProgress) return;
        onProgress({
          bytesTransferred: snap.bytesTransferred,
          totalBytes: snap.totalBytes,
          percent: snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0,
        });
      },
      reject,
      async () => {
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (e) { reject(e); }
      },
    );
  });

  return { promise, cancel: () => task.cancel() };
}
