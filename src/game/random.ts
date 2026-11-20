import { isTargetId } from './catalog';
import type { SpinPlan, TargetId } from './types';

export const UINT32_RANGE = 0x1_0000_0000;
export const SUCCESS_THRESHOLD = 0x8000_0000;
export const SECTOR_MARGIN = 12;
export const SPIN_DURATION = 5.2;
export const REDUCED_SPIN_DURATION = 0.15;

export type RandomSource = (values: Uint32Array) => Uint32Array;

const secureRandom: RandomSource = (values) => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Этот браузер не поддерживает безопасный генератор случайных чисел.');
  }
  return globalThis.crypto.getRandomValues(values);
};

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function isSuccessfulAngle(angle: number): boolean {
  return normalizeAngle(angle) < 180;
}

export interface SpinOptions {
  startAngle?: number;
  reducedMotion?: boolean;
  random?: RandomSource;
  now?: () => Date;
}

/**
 * One fresh, uniformly distributed 32-bit word decides the outcome.
 * Exactly 2^31 of its 2^32 possible values win. Price and past results
 * never enter this calculation. Separate words choose the angle and ID.
 */
export function createSpinPlan(targetId: TargetId, options: SpinOptions = {}): SpinPlan {
  if (!isTargetId(targetId)) throw new Error('Выберите автомобиль для улучшения.');
  const words = (options.random ?? secureRandom)(new Uint32Array(6));
  const success = words[0] < SUCCESS_THRESHOLD;
  const angle = (success ? 0 : 180) + SECTOR_MARGIN
    + (words[1] / UINT32_RANGE) * (180 - 2 * SECTOR_MARGIN);
  const startAngle = normalizeAngle(options.startAngle ?? 0);
  const forwardOffset = normalizeAngle(angle - startAngle);
  const id = Array.from(words.slice(2), (word) => word.toString(16).padStart(8, '0')).join('');
  return {
    attempt: {
      id,
      timestamp: (options.now ?? (() => new Date()))().toISOString(),
      targetId,
      success,
      angle,
    },
    startAngle,
    endAngle: startAngle + 7 * 360 + forwardOffset,
    duration: options.reducedMotion ? REDUCED_SPIN_DURATION : SPIN_DURATION,
  };
}
