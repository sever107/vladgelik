import { describe, expect, it } from 'vitest';
import {
  ATTEMPT_PREFIX, isUpgradeAttempt, persistAttempt, readStoredHistory,
  STORAGE_DAMAGED, STORAGE_UNAVAILABLE,
} from './storage';
import type { StoragePort } from './storage';
import { deriveStats, mergeHistory } from './selectors';
import type { UpgradeAttempt } from './types';

class MemoryStorage implements StoragePort {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function attempt(index: number, success = true, targetId: UpgradeAttempt['targetId'] = 'gclass'): UpgradeAttempt {
  return {
    id: index.toString(16).padStart(32, '0'),
    timestamp: new Date(Date.UTC(2026, 10, 20, 0, 0, index)).toISOString(),
    targetId,
    success,
    angle: success ? 90 : 270,
  };
}

describe('durable immutable attempt journal', () => {
  it('starts empty without creating fake history', () => {
    expect(readStoredHistory(new MemoryStorage())).toEqual({ history: [], warning: null });
  });

  it('restores successful and failed attempts after a fresh read', () => {
    const storage = new MemoryStorage();
    const win = attempt(1);
    const loss = attempt(2, false, 'lamborghini');
    persistAttempt(win, [], storage);
    persistAttempt(loss, [win], storage);
    expect(readStoredHistory(storage)).toEqual({ history: [loss, win], warning: null });
  });

  it('does not duplicate an attempt when completion or persistence is repeated', () => {
    const storage = new MemoryStorage();
    const win = attempt(1);
    persistAttempt(win, [], storage);
    persistAttempt(win, [win], storage);
    expect(storage.length).toBe(1);
    expect(readStoredHistory(storage).history).toEqual([win]);
  });

  it('preserves attempts from independent tabs with stale in-memory histories', () => {
    const storage = new MemoryStorage();
    const first = attempt(1);
    const second = attempt(2, true, 'lamborghini');
    // Both tabs initially saw an empty history; unique keys avoid overwrite.
    persistAttempt(first, [], storage);
    persistAttempt(second, [], storage);
    expect(readStoredHistory(storage).history).toEqual([second, first]);
  });

  it('recovers valid records while leaving corrupt data intact for possible recovery', () => {
    const storage = new MemoryStorage();
    const valid = attempt(1);
    persistAttempt(valid, [], storage);
    storage.setItem(ATTEMPT_PREFIX + 'broken', '{');
    storage.setItem('unrelated.settings', 'this is not game data');
    expect(readStoredHistory(storage)).toEqual({ history: [valid], warning: STORAGE_DAMAGED });
    expect(storage.getItem(ATTEMPT_PREFIX + 'broken')).toBe('{');
  });

  it('rejects impossible records instead of inventing inventory', () => {
    const valid = attempt(1);
    for (const patch of [
      { targetId: 'porsche' }, { timestamp: 'invalid' }, { id: '' },
      { angle: 360 }, { angle: -1 }, { angle: Number.NaN },
      { angle: 270, success: true }, { success: 'true' },
    ]) {
      expect(isUpgradeAttempt({ ...valid, ...patch })).toBe(false);
    }
  });

  it('preserves the current session and reports quota failures', () => {
    const storage = new MemoryStorage();
    const first = attempt(1);
    persistAttempt(first, [], storage);
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const second = attempt(2);
    expect(persistAttempt(second, [first], storage)).toEqual({
      history: [second, first], warning: STORAGE_UNAVAILABLE,
    });
  });

  it('retries unsaved records when storage becomes writable again', () => {
    const storage = new MemoryStorage();
    const inMemoryOnly = attempt(1);
    const next = attempt(2);
    persistAttempt(next, [inMemoryOnly], storage);
    expect(readStoredHistory(storage).history).toEqual([next, inMemoryOnly]);
  });
});

describe('statistics and inventory are derived solely from history', () => {
  it('starts every counter at zero', () => {
    expect(deriveStats([])).toEqual({ total: 0, successes: 0, failures: 0, gclass: 0, lamborghini: 0 });
  });

  it('counts multiple cars and excludes failed attempts from inventory', () => {
    const history = [attempt(1), attempt(2), attempt(3), attempt(4, true, 'lamborghini'), attempt(5, false), attempt(6, false, 'lamborghini')];
    expect(deriveStats(history)).toEqual({ total: 6, successes: 4, failures: 2, gclass: 3, lamborghini: 1 });
  });

  it('merges unique records chronologically without changing prior outcomes', () => {
    const first = attempt(1);
    const changed = { ...first, success: false, angle: 270 };
    const second = attempt(2);
    expect(mergeHistory([first], [changed, second])).toEqual([second, first]);
  });
});
