import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSpinPlan, normalizeAngle } from '../game/random';
import { deriveStats, mergeHistory } from '../game/selectors';
import { ATTEMPT_PREFIX, persistAttempt, readStoredHistory } from '../game/storage';
import type { SpinPlan, TargetId, UpgradeAttempt } from '../game/types';

export function useUpgradeGame() {
  const [initial] = useState(readStoredHistory);
  const [committedHistory, setCommittedHistory] = useState(initial.history);
  const historyRef = useRef(initial.history);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [pending, setPending] = useState<SpinPlan | null>(null);
  const pendingRef = useRef<SpinPlan | null>(null);
  const [result, setResult] = useState<UpgradeAttempt | null>(null);
  const resultRef = useRef<UpgradeAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && !event.key.startsWith(ATTEMPT_PREFIX)) return;
      const saved = readStoredHistory();
      const merged = mergeHistory(saved.history, historyRef.current);
      historyRef.current = merged;
      setCommittedHistory(merged);
      setStorageWarning(saved.warning);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const startUpgrade = useCallback((targetId: TargetId, reducedMotion = false): boolean => {
    // Refs lock synchronously, before React has time to render a disabled button.
    if (pendingRef.current || resultRef.current) return false;
    try {
      const plan = createSpinPlan(targetId, { startAngle: angleRef.current, reducedMotion });
      pendingRef.current = plan;
      const saved = persistAttempt(plan.attempt, historyRef.current);
      historyRef.current = saved.history;
      setCommittedHistory(saved.history);
      setStorageWarning(saved.warning);
      setError(null);
      setPending(plan);
      return true;
    } catch (cause) {
      pendingRef.current = null;
      setError(cause instanceof Error ? cause.message : 'Не удалось запустить улучшение. Повторите попытку.');
      return false;
    }
  }, []);

  const finishUpgrade = useCallback((id: string) => {
    const plan = pendingRef.current;
    if (!plan || plan.attempt.id !== id) return;
    angleRef.current = normalizeAngle(plan.endAngle);
    pendingRef.current = null;
    resultRef.current = plan.attempt;
    setPending(null);
    setResult(plan.attempt);
  }, []);

  const dismissResult = useCallback(() => {
    resultRef.current = null;
    setResult(null);
  }, []);

  // Committing before animation makes refresh safe; reveal only after it lands.
  const history = useMemo(
    () => pending ? committedHistory.filter((attempt) => attempt.id !== pending.attempt.id) : committedHistory,
    [committedHistory, pending],
  );
  const stats = useMemo(() => deriveStats(history), [history]);
  const counts = useMemo(() => ({ gclass: stats.gclass, lamborghini: stats.lamborghini }), [stats]);

  return { history, stats, counts, pending, result, error, storageWarning, startUpgrade, finishUpgrade, dismissResult };
}
