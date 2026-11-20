import { Activity, CarFront, Check, Flag, X } from 'lucide-react';
import type { GameStats } from '../game/types';
import './history.css';

interface StatisticsProps { stats: GameStats }
const format = new Intl.NumberFormat('ru-RU');

export function Statistics({ stats }: StatisticsProps) {
  const items = [
    { label: 'Всего попыток', value: stats.total, Icon: Activity, color: 'neutral' },
    { label: 'Успешных улучшений', value: stats.successes, Icon: Check, color: 'green' },
    { label: 'Неудачных улучшений', value: stats.failures, Icon: X, color: 'red' },
    { label: 'Выиграно Геликов', value: stats.gclass, Icon: CarFront, color: 'neutral' },
    { label: 'Выиграно Ламборгини', value: stats.lamborghini, Icon: Flag, color: 'gold' },
  ];
  return (
    <section className="stats-panel" aria-labelledby="statistics-title">
      <div className="stats-heading"><h2 id="statistics-title">СТАТИСТИКА</h2><span>Только ваши результаты</span></div>
      <div className="stats-grid">
        {items.map(({ label, value, Icon, color }) => (
          <div className={`stats-item stats-${color}`} key={label}>
            <div className="stats-item-top"><span>{label}</span><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></div>
            <strong>{format.format(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
