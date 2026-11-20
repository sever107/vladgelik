import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, CircleHelp, Info, ShieldCheck, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { Header } from './components/Header';
import { SourceItemCard } from './components/SourceItemCard';
import { TargetItemCard } from './components/TargetItemCard';
import { UpgradeWheel } from './components/UpgradeWheel';
import { UpgradeButton } from './components/UpgradeButton';
import { Inventory } from './components/Inventory';
import { ItemsCatalog } from './components/ItemsCatalog';
import { ResultModal } from './components/ResultModal';
import { UpgradeHistory } from './components/UpgradeHistory';
import { Statistics } from './components/Statistics';
import { SoundSettings } from './components/SoundSettings';
import { Brand } from './components/Brand';
import { useUpgradeGame } from './hooks/useUpgradeGame';
import { useSound } from './hooks/useSound';
import { useCarImages } from './hooks/useCarImages';
import { CARS } from './game/catalog';
import type { TargetId } from './game/types';

export default function App() {
  const game = useUpgradeGame();
  const sound = useSound();
  const { images, uploadImage, imageError } = useCarImages();
  const reducedMotion = useReducedMotion();
  const [sourceSelected, setSourceSelected] = useState(false);
  const [targetId, setTargetId] = useState<TargetId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rules = useRef<HTMLDialogElement>(null);
  const spinningRef = useRef(false);
  const target = CARS.find(item => item.id === targetId) ?? null;
  const locked = !!game.pending || !!game.result;
  const ready = sourceSelected && !!targetId;
  const cue = () => { void sound.unlock().then(() => sound.play('select')); };
  function selectSource() { if (locked) return; setSourceSelected(true); cue(); }
  function selectTarget(id: TargetId) { if (locked) return; setTargetId(id); cue(); }
  function startUpgrade() {
    if (!ready || !targetId) return;
    const unlocked = sound.unlock();
    if (game.startUpgrade(targetId, !!reducedMotion)) {
      spinningRef.current = true;
      void unlocked.then(() => { if (spinningRef.current) sound.startSpin(reducedMotion ? 150 : 5200); });
    }
  }
  function finishUpgrade(id: string) {
    if (!game.pending || game.pending.attempt.id !== id) return;
    spinningRef.current = false;
    sound.stopSpin();
    sound.play(game.pending.attempt.success ? 'win' : 'lose');
    game.finishUpgrade(id);
  }
  return <><Header onSettings={() => { cue(); setSettingsOpen(true); }} /><main className="main-shell" id="upgrade">
    <motion.div className="page-heading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}><div><div className="section-eyebrow"><span /> ВАША СЛЕДУЮЩАЯ СТУПЕНЬ</div><h1>УЛУЧШЕНИЕ<span>.</span></h1><p>Начните с ничего. Заберите больше.</p></div><button className="help-button" onClick={() => { cue(); rules.current?.showModal(); }}><CircleHelp size={17} /> Как это работает</button></motion.div>
    <motion.section className="upgrade-arena" aria-label="Улучшение предмета" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .08 }}>
      <div className="arena-top"><span><span className="tiny-dot yellow" /> РЕЖИМ УЛУЧШЕНИЯ</span><span className="arena-fair"><ShieldCheck size={14} /> Честный шанс — 50%</span></div>
      <div className="upgrade-stage"><SourceItemCard selected={sourceSelected} disabled={locked} onSelect={selectSource} /><div className="wheel-column"><UpgradeWheel plan={game.pending} ready={!!targetId} onComplete={finishUpgrade} /><div className="wheel-legend"><span><i className="legend-success" /> Успех 50%</span><span><i className="legend-failure" /> Неудача 50%</span></div><UpgradeButton disabled={!ready} spinning={!!game.pending} onClick={startUpgrade} /><div className="upgrade-hint" aria-live="polite">{game.pending ? 'Дождитесь остановки индикатора' : !sourceSelected ? 'Выберите «Ничего» в инвентаре' : !targetId ? 'Выберите автомобиль для улучшения' : 'Бесплатная попытка · 0 монет'}</div></div><TargetItemCard item={target} imageSrc={target ? images[target.id] : undefined} /></div>
      <div className="arena-bottom"><span><BadgeCheck size={15} /> Каждая попытка независима</span><span><Sparkles size={15} /> Предмет «Ничего» остаётся с вами</span><button onClick={sound.toggle} aria-label={sound.enabled ? 'Выключить звук' : 'Включить звук'}>{sound.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}{sound.enabled ? 'Звук включён' : 'Звук выключен'}</button></div>
    </motion.section>
    {(game.error || game.storageWarning) && <div className="storage-warning" role="alert"><Info size={19} /><span>{game.error || game.storageWarning}</span></div>}
    <motion.div className="collections-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .18 }}><Inventory selected={sourceSelected} disabled={locked} onSelect={selectSource} counts={game.counts} images={images} /><ItemsCatalog selected={targetId} disabled={locked} onSelect={selectTarget} images={images} /></motion.div>
    <Statistics stats={game.stats} /><UpgradeHistory history={game.history} />
    <footer className="site-footer"><Brand /><p>Бесплатный симулятор. Без ставок и покупок.<br /><span>Виртуальные предметы не имеют реальной ценности.</span></p><span className="footer-local"><ShieldCheck size={15} /> Прогресс в вашем браузере</span></footer>
  </main><SoundSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} enabled={sound.enabled} onToggle={sound.toggle} images={images} onUpload={uploadImage} error={imageError} disabled={locked} /><ResultModal result={game.result} onClose={() => { sound.play('click'); game.dismissResult(); }} imageSrc={game.result ? images[game.result.targetId] : undefined} />
    <dialog ref={rules} className="settings-dialog rules-dialog" aria-labelledby="rules-title" onClick={event => { if (event.target === event.currentTarget) rules.current?.close(); }}><div className="settings-content"><div className="settings-heading"><h2 id="rules-title">КАК ЭТО РАБОТАЕТ</h2><button className="icon-button" onClick={() => rules.current?.close()} aria-label="Закрыть правила"><X size={19} /></button></div><ol className="rules-list"><li><strong>Выберите «Ничего»</strong><p>Бесплатный исходный предмет. Он всегда остаётся в вашем инвентаре.</p></li><li><strong>Выберите автомобиль</strong><p>Mercedes-Benz G-Class или Lamborghini. Для обеих целей шанс — ровно 50%.</p></li><li><strong>Нажмите «УЛУЧШИТЬ»</strong><p>При успехе автомобиль пополнит коллекцию. При неудаче можно сразу попробовать снова.</p></li></ol><div className="rules-note"><ShieldCheck size={21} /><p>Результат каждой попытки определяется независимо с помощью криптографического генератора браузера. Серия побед или неудач не меняет шанс следующей попытки.</p></div><p className="settings-note">Это бесплатный симулятор без реальных ставок, покупок и обмена виртуальных предметов.</p><button className="settings-done" onClick={() => rules.current?.close()}>ПОНЯТНО</button></div></dialog>
  </>;
}
