import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Brand } from './Brand';
import type { SpinPlan } from '../game/types';
import { normalizeAngle, REDUCED_SPIN_DURATION } from '../game/random';

export function UpgradeWheel({ plan, ready, onComplete }: { plan: SpinPlan | null; ready: boolean; onComplete: (id: string) => void }) {
  const rotation = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const [activeSector, setActiveSector] = useState<'success' | 'failure'>('success');
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useMotionValueEvent(rotation, 'change', latest => { setActiveSector(((latest % 360) + 360) % 360 < 180 ? 'success' : 'failure'); });
  useEffect(() => {
    if (!plan) return;
    // Imperative MotionValue animation does not inherit MotionConfig's setting.
    // A short-duration spin must not compress seven revolutions into 150 ms.
    if (reducedMotion || plan.duration <= REDUCED_SPIN_DURATION) {
      rotation.set(normalizeAngle(plan.endAngle));
      const timer = window.setTimeout(() => onCompleteRef.current(plan.attempt.id), REDUCED_SPIN_DURATION * 1000);
      return () => window.clearTimeout(timer);
    }
    rotation.set(plan.startAngle);
    const controls = animate(rotation, plan.endAngle, { duration: plan.duration, ease: [.32, 0, .08, 1], onComplete: () => onCompleteRef.current(plan.attempt.id) });
    return () => controls.stop();
  }, [plan, rotation, reducedMotion]);
  return <div className={`wheel-wrap ${plan ? 'is-spinning' : ''} ${ready ? 'wheel-ready' : ''}`} data-sector={activeSector}>
    <div className="wheel-halo" /><div className="wheel-ticks" />
    <svg className="wheel-ring" viewBox="0 0 360 360" aria-hidden="true"><circle cx="180" cy="180" r="155" fill="none" stroke="#292b30" strokeWidth="17" /><path className="sector sector-success" d="M180 25 A155 155 0 0 1 180 335" fill="none" strokeWidth="10" /><path className="sector sector-failure" d="M180 335 A155 155 0 0 1 180 25" fill="none" strokeWidth="10" /><path d="M180 14v24M180 322v24" stroke="#e9ebef" strokeWidth="3" /><circle cx="180" cy="180" r="134" fill="none" stroke="#303137" strokeWidth="1" /><circle cx="180" cy="180" r="118" fill="none" stroke="#26282d" strokeDasharray="2 9" /></svg>
    <div className="wheel-core"><Brand compact /><span className="wheel-chance">{ready ? '50.00' : '—'}<span>%</span></span><span className="wheel-label">ШАНС УСПЕХА</span><span className="wheel-fixed">{plan ? 'ОПРЕДЕЛЯЕМ РЕЗУЛЬТАТ' : 'ВСЕГДА РАВНЫЕ ШАНСЫ'}</span></div>
    <motion.div className="wheel-pointer" style={{ rotate: rotation }} data-testid="wheel-pointer"><span className="pointer-tip" /><span className="pointer-glow" /></motion.div>
    <div className="wheel-sector-icon sector-icon-success"><Check size={14} /></div><div className="wheel-sector-icon sector-icon-failure"><X size={14} /></div>
  </div>;
}
