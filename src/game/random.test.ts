import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSpinPlan, isSuccessfulAngle, normalizeAngle, REDUCED_SPIN_DURATION,
  SECTOR_MARGIN, SPIN_DURATION, SUCCESS_THRESHOLD, UINT32_RANGE,
} from './random';
import type { RandomSource } from './random';

const words = (outcome: number, position = 0): RandomSource => (values) => {
  values.set([outcome, position, 123, 456, 789, 1011]);
  return values;
};

afterEach(() => vi.unstubAllGlobals());

describe('independent exact 50% outcome', () => {
  it('divides all 2^32 equiprobable words into two exactly equal sets', () => {
    expect(SUCCESS_THRESHOLD).toBe(2 ** 31);
    expect(UINT32_RANGE - SUCCESS_THRESHOLD).toBe(SUCCESS_THRESHOLD);
    expect(SUCCESS_THRESHOLD / UINT32_RANGE).toBe(0.5);
  });

  it.each([
    [0, true], [1, true], [0x7fff_fffe, true], [0x7fff_ffff, true],
    [0x8000_0000, false], [0x8000_0001, false], [0xffff_fffe, false], [0xffff_ffff, false],
  ])('maps word %i to success %s, including both sides of the boundary', (word, success) => {
    expect(createSpinPlan('gclass', { random: words(word) }).attempt.success).toBe(success);
  });

  it('calls Web Crypto for every attempt and permits consecutive identical outcomes', () => {
    const sequence = [0, 0, 0xffff_ffff, 0xffff_ffff, 0];
    const getRandomValues = vi.fn((values: Uint32Array) => words(sequence.shift()!)(values));
    vi.stubGlobal('crypto', { getRandomValues });
    const outcomes = Array.from({ length: 5 }, () => createSpinPlan('gclass').attempt.success);
    expect(outcomes).toEqual([true, true, false, false, true]);
    expect(getRandomValues).toHaveBeenCalledTimes(5);
    expect(getRandomValues.mock.calls.every(([value]) => value instanceof Uint32Array && value.length === 6)).toBe(true);
  });

  it('does not depend on the car price or target', () => {
    for (const word of [0, 0x7fff_ffff, 0x8000_0000, 0xffff_ffff]) {
      const first = createSpinPlan('gclass', { random: words(word) });
      const second = createSpinPlan('lamborghini', { random: words(word) });
      expect(first.attempt.success).toBe(second.attempt.success);
      expect(first.attempt.angle).toBe(second.attempt.angle);
    }
  });

  it('fails clearly when Web Crypto is unavailable instead of using an unsafe fallback', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => createSpinPlan('gclass')).toThrow('безопасный генератор');
  });
});

describe('animation and outcome are the same precomputed plan', () => {
  it('lands inside the chosen sector over boundary cases and 1,024 distributed positions', () => {
    for (const outcome of [0, 0x8000_0000]) {
      for (let index = 0; index <= 1024; index++) {
        const position = Math.floor((index / 1024) * 0xffff_ffff);
        const plan = createSpinPlan('lamborghini', { startAngle: 315, random: words(outcome, position) });
        const finalAngle = normalizeAngle(plan.endAngle);
        expect(finalAngle).toBeCloseTo(plan.attempt.angle, 9);
        expect(isSuccessfulAngle(finalAngle)).toBe(plan.attempt.success);
        const inSectorAngle = plan.attempt.angle % 180;
        expect(inSectorAngle).toBeGreaterThanOrEqual(SECTOR_MARGIN);
        expect(inSectorAngle).toBeLessThan(180 - SECTOR_MARGIN);
        expect(plan.endAngle - plan.startAngle).toBeGreaterThanOrEqual(7 * 360);
      }
    }
  });

  it('reduces motion without changing the precomputed result', () => {
    const standard = createSpinPlan('gclass', { random: words(0, 9823) });
    const reduced = createSpinPlan('gclass', { random: words(0, 9823), reducedMotion: true });
    expect(standard.duration).toBe(SPIN_DURATION);
    expect(reduced.duration).toBe(REDUCED_SPIN_DURATION);
    expect(standard.attempt.success).toBe(reduced.attempt.success);
    expect(standard.endAngle).toBe(reduced.endAngle);
  });

  it('captures the result, target, timestamp, and identifier before animation begins', () => {
    const plan = createSpinPlan('lamborghini', {
      random: words(0), now: () => new Date('2026-11-20T12:34:56.000Z'),
    });
    expect(plan.attempt).toMatchObject({
      targetId: 'lamborghini', timestamp: '2026-11-20T12:34:56.000Z', success: true,
    });
    expect(plan.attempt.id).toMatch(/^[a-f0-9]{32}$/);
  });
});
