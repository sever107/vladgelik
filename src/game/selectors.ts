import type { GameStats, UpgradeAttempt } from './types';

export function deriveStats(history: readonly UpgradeAttempt[]): GameStats {
  const stats: GameStats = { total: history.length, successes: 0, failures: 0, gclass: 0, lamborghini: 0 };
  for (const attempt of history) {
    if (attempt.success) {
      stats.successes += 1;
      stats[attempt.targetId] += 1;
    } else {
      stats.failures += 1;
    }
  }
  return stats;
}

/** Records are immutable. The first copy of an ID is authoritative. */
export function mergeHistory(...histories: readonly (readonly UpgradeAttempt[])[]): UpgradeAttempt[] {
  const unique = new Map<string, UpgradeAttempt>();
  for (const history of histories) {
    for (const attempt of history) {
      if (!unique.has(attempt.id)) unique.set(attempt.id, attempt);
    }
  }
  return [...unique.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));
}
