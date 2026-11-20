import { useCallback, useEffect, useRef, useState } from 'react';
import { SoundEngine, type SoundType } from '../audio/sound';

const SOUND_KEY = 'vladgelik:sound:v1';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSound() {
  const [enabled, setEnabled] = useState(readEnabled);
  const enabledRef = useRef(enabled);
  const engineRef = useRef<SoundEngine | null>(null);

  const engine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new SoundEngine();
      engineRef.current.setEnabled(enabledRef.current);
    }
    return engineRef.current;
  }, []);

  const unlock = useCallback(async () => {
    await engine().unlock();
  }, [engine]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    const audio = engine();
    audio.setEnabled(next);
    try {
      localStorage.setItem(SOUND_KEY, String(next));
    } catch {
      // Sound remains usable when browser storage is disabled or exhausted.
    }
    if (next) void audio.unlock().then(() => audio.play('select'));
  }, [engine]);

  const play = useCallback((type: SoundType) => engineRef.current?.play(type), []);
  const startSpin = useCallback((durationMs: number) => engineRef.current?.startSpin(durationMs), []);
  const stopSpin = useCallback(() => engineRef.current?.stopSpin(), []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SOUND_KEY && event.key !== null) return;
      const next = readEnabled();
      enabledRef.current = next;
      setEnabled(next);
      engineRef.current?.setEnabled(next);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return { enabled, toggle, unlock, play, startSpin, stopSpin };
}
