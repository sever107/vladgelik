import { useMemo, useState } from 'react';
import { Check, ChevronDown, History, X } from 'lucide-react';
import { CARS } from '../game/catalog';
import type { UpgradeAttempt } from '../game/types';
import './history.css';

interface UpgradeHistoryProps { history: UpgradeAttempt[] }
type Filter = 'all' | 'success' | 'failure';
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'success', label: 'Успех' },
  { id: 'failure', label: 'Неудача' },
];
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const PAGE_SIZE = 6;

export function UpgradeHistory({ history }: UpgradeHistoryProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const attempts = useMemo(() => history
    .filter((attempt) => filter === 'all' || attempt.success === (filter === 'success'))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [history, filter]);
  const visible = attempts.slice(0, visibleCount);

  return (
    <section className="history-panel" aria-labelledby="history-title">
      <div className="history-heading">
        <div className="history-title-wrap"><History size={19} aria-hidden="true" /><h2 id="history-title">ИСТОРИЯ УЛУЧШЕНИЙ</h2><span className="history-count">{history.length}</span></div>
        <div className="history-filters" role="group" aria-label="Фильтр истории по результату">
          {filters.map((item) => (
            <button
              key={item.id}
              className={filter === item.id ? 'history-filter-active' : ''}
              aria-pressed={filter === item.id}
              onClick={() => { setFilter(item.id); setVisibleCount(PAGE_SIZE); }}
            >{item.label}</button>
          ))}
        </div>
      </div>
      {attempts.length ? (
        <>
          <div className="history-table-wrap">
            <table className="history-table">
              <thead><tr><th scope="col">ДАТА И ВРЕМЯ</th><th scope="col">ИСХОДНЫЙ ПРЕДМЕТ</th><th scope="col">ЦЕЛЕВОЙ ПРЕДМЕТ</th><th scope="col">ШАНС</th><th scope="col">РЕЗУЛЬТАТ</th></tr></thead>
              <tbody>
                {visible.map((attempt) => {
                  const car = CARS.find((item) => item.id === attempt.targetId);
                  const date = new Date(attempt.timestamp);
                  return (
                    <tr key={attempt.id}>
                      <td className="history-date-cell"><time dateTime={attempt.timestamp}>{dateFormat.format(date)}<span>{timeFormat.format(date)}</span></time></td>
                      <td className="history-source-cell"><span className="history-empty-symbol" aria-hidden="true">∅</span>Ничего</td>
                      <td className="history-target-cell">{car?.name ?? (attempt.targetId === 'gclass' ? 'Mercedes-Benz G-Class' : 'Lamborghini')}</td>
                      <td className="history-chance-cell">50.00<span>%</span></td>
                      <td className="history-result-cell"><span className={`history-status ${attempt.success ? 'history-status-success' : 'history-status-failure'}`}>{attempt.success ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}{attempt.success ? 'Успех' : 'Неудача'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="history-footer">
            <span>Показано {visible.length} из {attempts.length}</span>
            {visibleCount < attempts.length && <button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Показать ещё <ChevronDown size={15} aria-hidden="true" /></button>}
          </div>
        </>
      ) : (
        <div className="history-empty" role="status">
          <History size={27} strokeWidth={1.5} aria-hidden="true" />
          <h3>{history.length ? 'Таких улучшений пока нет' : 'Ваша история начинается здесь'}</h3>
          <p>{history.length ? 'Выберите другой фильтр, чтобы увидеть остальные попытки.' : 'Выберите автомобиль и выполните первое улучшение.'}</p>
        </div>
      )}
    </section>
  );
}
