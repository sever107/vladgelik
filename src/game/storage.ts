import { isTargetId } from './catalog';
import { isSuccessfulAngle } from './random';
import { mergeHistory } from './selectors';
import type { UpgradeAttempt } from './types';

/** One immutable key per attempt prevents simultaneous tabs overwriting each other. */
export const ATTEMPT_PREFIX = 'vladgelik.attempt.v1.';
export const STORAGE_UNAVAILABLE = 'Прогресс не сохранён: хранилище браузера недоступно. Не закрывайте страницу.';
export const STORAGE_DAMAGED = 'Часть сохранённых данных повреждена. Доступная история восстановлена.';

export interface StoragePort {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StoredHistory {
  history: UpgradeAttempt[];
  warning: string | null;
}

export function getBrowserStorage(): StoragePort | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function isUpgradeAttempt(value: unknown): value is UpgradeAttempt {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && /^[a-f0-9]{32}$/.test(record.id)
    && typeof record.timestamp === 'string'
    && Number.isFinite(Date.parse(record.timestamp))
    && new Date(record.timestamp).toISOString() === record.timestamp
    && isTargetId(record.targetId)
    && typeof record.success === 'boolean'
    && typeof record.angle === 'number' && Number.isFinite(record.angle)
    && record.angle >= 0 && record.angle < 360
    && isSuccessfulAngle(record.angle) === record.success;
}

export function readStoredHistory(storage: StoragePort | undefined = getBrowserStorage()): StoredHistory {
  if (!storage) return { history: [], warning: STORAGE_UNAVAILABLE };
  const history: UpgradeAttempt[] = [];
  let warning: string | null = null;
  try {
    // Snapshot keys before reading, so a concurrent insertion cannot shift indexes.
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null && key.startsWith(ATTEMPT_PREFIX));
    for (const key of keys) {
      try {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        const value: unknown = JSON.parse(raw);
        if (isUpgradeAttempt(value) && key === ATTEMPT_PREFIX + value.id) history.push(value);
        else warning = STORAGE_DAMAGED;
      } catch {
        warning = STORAGE_DAMAGED;
      }
    }
  } catch {
    warning = STORAGE_UNAVAILABLE;
  }
  return { history: mergeHistory(history), warning };
}

/** Append is idempotent. A failed write leaves the current session playable. */
export function persistAttempt(
  attempt: UpgradeAttempt,
  knownHistory: readonly UpgradeAttempt[],
  storage: StoragePort | undefined = getBrowserStorage(),
): StoredHistory {
  const stored = readStoredHistory(storage);
  const history = mergeHistory(stored.history, knownHistory, [attempt]);
  if (!storage) return { history, warning: STORAGE_UNAVAILABLE };
  try {
    // Retry any previously failed records as well as the new one.
    for (const record of history) {
      const key = ATTEMPT_PREFIX + record.id;
      if (storage.getItem(key) === null) storage.setItem(key, JSON.stringify(record));
    }
    return { history, warning: stored.warning };
  } catch {
    return { history, warning: STORAGE_UNAVAILABLE };
  }
}
