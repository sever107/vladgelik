import { Check, Infinity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
export function EmptyItem({ small = false }: { small?: boolean }) { return <div className={`empty-item ${small ? 'empty-item-small' : ''}`} aria-hidden="true"><div className="empty-orbit" /><div className="empty-orbit second" /><span>∅</span><i /><i /></div>; }
export function SourceItemCard({ selected, disabled, onSelect }: { selected: boolean; disabled: boolean; onSelect: () => void }) {
  return <div className="selection-column"><div className="selection-label"><span className="step-index">01</span> ИСХОДНЫЙ ПРЕДМЕТ <span className="label-line" /></div><motion.button className={`hero-item source-item ${selected ? 'is-selected' : ''}`} onClick={onSelect} disabled={disabled} aria-pressed={selected} aria-label="Выбрать исходный предмет Ничего" whileTap={{ scale: .985 }}>
    <div className="item-topline"><span className="quality quality-neutral">БАЗОВЫЙ</span>{selected ? <span className="selected-mark"><Check size={15} /></span> : <Plus size={19} />}</div><EmptyItem /><div className="hero-item-details"><span className="eyebrow">{selected ? 'ВАШ ВЫБОР' : 'ВЫБЕРИТЕ ПРЕДМЕТ'}</span><h2>Ничего</h2><p className="item-price">0 <span>монет</span></p></div><div className="item-footnote"><Infinity size={15} /><span>Доступно всегда</span><span className="small-line" /></div>
  </motion.button><p className="selection-description">Всё начинается с малого.</p></div>;
}
