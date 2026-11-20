import { useCallback, useEffect, useRef, useState } from 'react';
import bundledImages from '../assets/cars.json';
import type { TargetId } from '../game/types';

type Images = Partial<Record<TargetId, string>>;
const defaults: Images = Object.fromEntries(Object.entries(bundledImages).filter(([, value]) => typeof value === 'string'));
class ImageUploadError extends Error {}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('vladgelik-images', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { database = undefined; throw error; });
  return database;
}
async function readImages(): Promise<Partial<Record<TargetId, Blob>>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('images', 'readonly');
    const store = transaction.objectStore('images');
    const result: Partial<Record<TargetId, Blob>> = {};
    for (const id of ['gclass', 'lamborghini'] as const) {
      const request = store.get(id);
      request.onsuccess = () => { if (request.result instanceof Blob) result[id] = request.result; };
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
export function useCarImages() {
  const [images, setImages] = useState<Images>(defaults);
  const [imageError, setImageError] = useState('');
  const mounted = useRef(false);
  const ownedUrls = useRef(new Map<TargetId, string>());
  const uploadVersions = useRef<Record<TargetId, number>>({ gclass: 0, lamborghini: 0 });

  const replaceImage = useCallback((id: TargetId, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const previous = ownedUrls.current.get(id);
    ownedUrls.current.set(id, url);
    if (previous) URL.revokeObjectURL(previous);
    // Keep state updaters pure: React may invoke them twice in StrictMode.
    setImages(current => ({ ...current, [id]: url }));
  }, []);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const initialVersions = { ...uploadVersions.current };
    const urls = ownedUrls.current;
    readImages().then(blobs => {
      if (!active) return;
      for (const id of ['gclass', 'lamborghini'] as const) {
        const blob = blobs[id];
        if (blob && initialVersions[id] === uploadVersions.current[id]) replaceImage(id, blob);
      }
    }).catch(() => { /* Bundled photos remain usable without IndexedDB. */ });
    return () => {
      active = false;
      mounted.current = false;
      uploadVersions.current.gclass += 1;
      uploadVersions.current.lamborghini += 1;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [replaceImage]);

  const uploadImage = useCallback(async (id: TargetId, file: File) => {
    const version = ++uploadVersions.current[id];
    const isCurrent = () => mounted.current && uploadVersions.current[id] === version;
    setImageError('');
    try {
      if (file.type !== 'image/png') throw new ImageUploadError('Выберите фотографию в формате PNG.');
      if (file.size > 15 * 1024 * 1024) throw new ImageUploadError('Размер фотографии должен быть меньше 15 МБ.');
      const bitmap = await createImageBitmap(file);
      const validDimensions = bitmap.width >= 100 && bitmap.height >= 100;
      bitmap.close();
      if (!validDimensions) throw new ImageUploadError('Выберите фотографию размером не менее 100 × 100 пикселей.');
      if (!isCurrent()) return;
      const db = await openDatabase();
      if (!isCurrent()) return;
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('images', 'readwrite');
        transaction.objectStore('images').put(file, id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new ImageUploadError('Не удалось сохранить фотографию в браузере.'));
        transaction.onabort = () => reject(new ImageUploadError('Не удалось сохранить фотографию в браузере.'));
      });
      if (isCurrent()) replaceImage(id, file);
    } catch (error) {
      if (isCurrent()) setImageError(error instanceof ImageUploadError
        ? error.message
        : 'Не удалось загрузить фотографию. Проверьте PNG и повторите попытку.');
    }
  }, [replaceImage]);
  return { images, uploadImage, imageError };
}
