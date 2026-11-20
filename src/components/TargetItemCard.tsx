import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Crosshair } from 'lucide-react';
import type { CarItem } from '../game/types';
export function TargetItemCard({ item, imageSrc }: { item: CarItem | null; imageSrc?: string }) {
  return <div className="selection-column target-column"><div className="selection-label"><span className="step-index">02</span> ЦЕЛЬ УЛУЧШЕНИЯ <span className="label-line" /></div><div className={`hero-item target-item ${item ? 'has-target' : ''}`}><AnimatePresence mode="wait"><motion.div className="target-content" key={item?.id ?? 'empty'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
    <div className="item-topline"><span className="quality quality-gold">{item ? item.quality : 'ВАША СЛЕДУЮЩАЯ ЦЕЛЬ'}</span><ArrowUpRight size={18} /></div>
    {item ? <><div className={`hero-car ${!imageSrc ? 'without-image' : ''}`}>{imageSrc && <img src={imageSrc} alt={item.name} draggable={false} />}{!imageSrc && <span className="awaiting-image">Фотография пока не добавлена</span>}</div><div className="hero-item-details"><span className="eyebrow">{item.id === 'gclass' ? 'MERCEDES-BENZ' : 'LAMBORGHINI'}</span><h2>{item.id === 'gclass' ? 'G-Class' : 'Lamborghini'}</h2><p className="item-price">{item.price.toLocaleString('ru-RU')} <span>монет</span></p></div></> : <div className="target-empty"><Crosshair size={48} strokeWidth={1} /><h2>ВЫБЕРИТЕ ПРЕДМЕТ</h2><p>Выберите автомобиль<br />в каталоге ниже</p></div>}
    <div className="item-footnote"><span className="rarity-dot" /><span>{item ? 'Предмет коллекции' : 'Два автомобиля. Ваш выбор.'}</span><span className="small-line" /></div>
  </motion.div></AnimatePresence></div><p className="selection-description">Большие цели. Равные шансы.</p></div>;
}
