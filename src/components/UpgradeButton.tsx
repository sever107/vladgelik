import { LoaderCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
export function UpgradeButton({ disabled, spinning, onClick }: { disabled: boolean; spinning: boolean; onClick: () => void }) {
  return <motion.button className="upgrade-button" onClick={onClick} disabled={disabled || spinning} whileTap={{ scale: .975 }}>{spinning ? <LoaderCircle className="button-spinner" size={19} /> : <Zap size={19} fill="currentColor" />}<span>{spinning ? 'УЛУЧШАЕМ…' : 'УЛУЧШИТЬ'}</span></motion.button>;
}
