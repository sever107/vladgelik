// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTEMPT_PREFIX, persistAttempt, readStoredHistory } from '../game/storage';
import { createSpinPlan } from '../game/random';
import { useUpgradeGame } from './useUpgradeGame';

const mountedRoots = new Set<Root>();

function mountGame() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  let current!: ReturnType<typeof useUpgradeGame>;
  function Harness() {
    current = useUpgradeGame();
    return null;
  }
  act(() => root.render(createElement(Harness)));
  return {
    get current() { return current; },
    unmount() {
      act(() => root.unmount());
      mountedRoots.delete(root);
      container.remove();
    },
  };
}

function mockOutcomes(outcomes: boolean[]) {
  let index = 0;
  const getRandomValues = vi.fn((values: Uint32Array) => {
    const success = outcomes[index] ?? true;
    values.set([success ? 0 : 0xffff_ffff, 0x8000_0000, 0, 0, 0, ++index]);
    return values;
  });
  vi.stubGlobal('crypto', { getRandomValues });
  return getRandomValues;
}

beforeEach(() => {
  localStorage.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  act(() => {
    for (const root of mountedRoots) root.unmount();
  });
  mountedRoots.clear();
  document.body.replaceChildren();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('upgrade lifecycle', () => {
  it('starts with no attempts or won cars', () => {
    const game = mountGame();
    expect(game.current.history).toEqual([]);
    expect(game.current.counts).toEqual({ gclass: 0, lamborghini: 0 });
    expect(game.current.pending).toBeNull();
    expect(game.current.result).toBeNull();
  });

  it('locks repeated clicks synchronously, even before React renders', () => {
    const random = mockOutcomes([true]);
    const game = mountGame();
    act(() => {
      expect(game.current.startUpgrade('gclass')).toBe(true);
      expect(game.current.startUpgrade('lamborghini')).toBe(false);
      expect(game.current.startUpgrade('gclass')).toBe(false);
    });
    expect(random).toHaveBeenCalledTimes(1);
    expect(game.current.pending?.attempt.targetId).toBe('gclass');
    expect(readStoredHistory().history).toHaveLength(1);
    expect(game.current.history).toHaveLength(0);
  });

  it('only finishes the matching animation and counts it exactly once', () => {
    mockOutcomes([true]);
    const game = mountGame();
    act(() => { game.current.startUpgrade('gclass'); });
    const id = game.current.pending!.attempt.id;
    act(() => { game.current.finishUpgrade('wrong-id'); });
    expect(game.current.pending).not.toBeNull();
    act(() => {
      game.current.finishUpgrade(id);
      game.current.finishUpgrade(id);
    });
    expect(game.current.pending).toBeNull();
    expect(game.current.result?.success).toBe(true);
    expect(game.current.history).toHaveLength(1);
    expect(game.current.counts.gclass).toBe(1);
    expect(game.current.stats.successes).toBe(1);
  });

  it('keeps the committed outcome after refresh during animation', () => {
    mockOutcomes([true]);
    const beforeRefresh = mountGame();
    act(() => { beforeRefresh.current.startUpgrade('lamborghini'); });
    const original = beforeRefresh.current.pending!.attempt;
    expect(beforeRefresh.current.counts.lamborghini).toBe(0);
    beforeRefresh.unmount();
    const afterRefresh = mountGame();
    expect(afterRefresh.current.history).toEqual([original]);
    expect(afterRefresh.current.counts.lamborghini).toBe(1);
    expect(afterRefresh.current.stats.total).toBe(1);
    expect(afterRefresh.current.pending).toBeNull();
  });

  it('requires dismissal of the result and permits a fresh independent retry', () => {
    const random = mockOutcomes([true, false]);
    const game = mountGame();
    act(() => { game.current.startUpgrade('gclass'); });
    act(() => { game.current.finishUpgrade(game.current.pending!.attempt.id); });
    act(() => { expect(game.current.startUpgrade('lamborghini')).toBe(false); });
    act(() => {
      game.current.dismissResult();
      expect(game.current.startUpgrade('lamborghini')).toBe(true);
    });
    expect(game.current.pending?.attempt.success).toBe(false);
    act(() => { game.current.finishUpgrade(game.current.pending!.attempt.id); });
    expect(random).toHaveBeenCalledTimes(2);
    expect(game.current.stats).toEqual({ total: 2, successes: 1, failures: 1, gclass: 1, lamborghini: 0 });
  });

  it('restores multiple wins and losses from real completed attempts', () => {
    mockOutcomes([true, true, false, true]);
    const game = mountGame();
    for (const target of ['gclass', 'gclass', 'gclass', 'lamborghini'] as const) {
      act(() => { game.current.startUpgrade(target, true); });
      expect(game.current.pending?.duration).toBe(0.15);
      act(() => { game.current.finishUpgrade(game.current.pending!.attempt.id); });
      act(() => { game.current.dismissResult(); });
    }
    game.unmount();
    const restored = mountGame();
    expect(restored.current.stats).toEqual({ total: 4, successes: 3, failures: 1, gclass: 2, lamborghini: 1 });
    expect(restored.current.history).toHaveLength(4);
  });

  it('merges a storage event from another tab without losing local progress', () => {
    mockOutcomes([true, false]);
    const game = mountGame();
    act(() => { game.current.startUpgrade('gclass'); });
    act(() => { game.current.finishUpgrade(game.current.pending!.attempt.id); });
    const external = createSpinPlan('lamborghini').attempt;
    persistAttempt(external, []);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: ATTEMPT_PREFIX + external.id }));
    });
    expect(game.current.stats.total).toBe(2);
    expect(game.current.stats.failures).toBe(1);
    expect(game.current.counts.gclass).toBe(1);
  });

  it('reports an unavailable crypto source without creating an attempt', () => {
    vi.stubGlobal('crypto', undefined);
    const game = mountGame();
    act(() => { expect(game.current.startUpgrade('gclass')).toBe(false); });
    expect(game.current.error).toContain('безопасный генератор');
    expect(game.current.pending).toBeNull();
    expect(game.current.history).toHaveLength(0);
  });
});
