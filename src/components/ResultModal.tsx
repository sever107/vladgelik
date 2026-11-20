import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { CARS } from '../game/catalog';
import type { UpgradeAttempt } from '../game/types';
import './history.css';

interface ResultModalProps {
  result: UpgradeAttempt | null;
  onClose: () => void;
  imageSrc?: string;
}

const numberFormat = new Intl.NumberFormat('ru-RU');

export function ResultModal({ result, onClose, imageSrc }: ResultModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (result && !dialog.open) dialog.showModal();
    if (!result && dialog.open) dialog.close();
    if (!result) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [result]);

  const car = result ? CARS.find((item) => item.id === result.targetId) : undefined;

  return (
    <dialog
      ref={dialogRef}
      className={`modal-root ${result?.success ? 'modal-success' : 'modal-failure'}`}
      aria-labelledby="upgrade-result-title"
      aria-describedby="upgrade-result-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {result && car && (
        <motion.div
          key={result.id}
          className="modal-surface"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94, y: reducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="modal-close" aria-label="Закрыть результат" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
          {result.success && !reducedMotion && (
            <div className="modal-particles" aria-hidden="true">
              {Array.from({ length: 22 }, (_, index) => {
                const angle = (index / 22) * Math.PI * 2;
                const distance = 135 + (index % 4) * 30;
                return (
                  <motion.i
                    key={index}
                    className={index % 3 === 0 ? 'modal-particle-gold' : ''}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                      x: [0, Math.cos(angle) * distance, Math.cos(angle) * distance * 1.15],
                      y: [0, Math.sin(angle) * distance, Math.sin(angle) * distance + 75],
                      opacity: [0, 0.9, 0],
                      scale: [0, 1, 0.4],
                      rotate: index * 47,
                    }}
                    transition={{ duration: 1.8 + (index % 3) * 0.2, delay: 0.12 + (index % 5) * 0.03, times: [0, 0.25, 1] }}
                  />
                );
              })}
            </div>
          )}
          <div className="modal-result-symbol" aria-hidden="true">
            {result.success ? <Check size={29} strokeWidth={2.5} /> : <X size={29} strokeWidth={2.5} />}
          </div>
          <p className="modal-eyebrow">РЕЗУЛЬТАТ УЛУЧШЕНИЯ</p>
          <h2 id="upgrade-result-title">{result.success ? 'УЛУЧШЕНИЕ УСПЕШНО' : 'УЛУЧШЕНИЕ НЕ УДАЛОСЬ'}</h2>
          {result.success ? (
            <>
              {imageSrc && (
                <motion.div
                  className="modal-car-stage"
                  initial={{ scale: reducedMotion ? 1 : 0.78, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0.1 : 0.8, delay: reducedMotion ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img src={imageSrc} alt={car.name} />
                </motion.div>
              )}
              <div className={`modal-car-details ${!imageSrc ? 'modal-no-image' : ''}`}>
                <span className="modal-quality">{car.quality}</span>
                <h3>{car.name}</h3>
                <p>{numberFormat.format(car.price)} <span>монет</span></p>
              </div>
              <p id="upgrade-result-description" className="modal-description"><ShieldCheck size={16} aria-hidden="true" /> Автомобиль добавлен в ваш инвентарь</p>
            </>
          ) : (
            <div className="modal-loss-content">
              <div className="modal-loss-orbit" aria-hidden="true"><RotateCcw size={42} strokeWidth={1.2} /></div>
              <h3>Следующая попытка — новый шанс</h3>
              <p id="upgrade-result-description">{car.name} не добавлен в инвентарь. «Ничего» остаётся доступным, а шанс следующего улучшения — 50%.</p>
            </div>
          )}
          <button className="modal-continue" onClick={onClose} autoFocus>
            {result.success ? 'ПРОДОЛЖИТЬ' : 'ПОПРОБОВАТЬ ЕЩЁ'}
          </button>
          <span className="modal-bottom-note">Бесплатный симулятор · Виртуальные предметы</span>
        </motion.div>
      )}
    </dialog>
  );
}
