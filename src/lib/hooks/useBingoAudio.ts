'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
  } catch {}
  try { const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='); a.volume = 0; a.play().catch(() => {}); } catch {}
}

export function useBingoAudio(_language: 'en' | 'am') {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(true);
  enabledRef.current = soundEnabled;

  const play = useCallback((num: number) => {
    if (!enabledRef.current || !num || num < 1 || num > 75) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const path = `/audio/am/${num}.mp3`;
    console.log('[Audio] play:', path);
    const audio = new Audio(path);
    audio.playbackRate = 1.0;
    audioRef.current = audio;
    audio.onended = () => { console.log('[Audio] ended:', path); audioRef.current = null; };
    audio.onerror = () => { console.warn('[Audio] error:', path); audioRef.current = null; };
    audio.play().then(() => console.log('[Audio] playing:', path)).catch(e => { console.warn('[Audio] rejected:', e.message); audioRef.current = null; });
  }, []);

  const playBingo = useCallback(() => {
    if (!enabledRef.current) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const path = '/audio/am/Bingo.mp3';
    console.log('[Audio] playBingo:', path);
    const audio = new Audio(path);
    audio.playbackRate = 1.0;
    audioRef.current = audio;
    audio.onended = () => { console.log('[Audio] bingo ended:', path); audioRef.current = null; };
    audio.onerror = () => { console.warn('[Audio] bingo error:', path); audioRef.current = null; };
    audio.play().then(() => console.log('[Audio] bingo playing:', path)).catch(e => { console.warn('[Audio] bingo rejected:', e.message); audioRef.current = null; });
  }, []);

  const toggleSound = useCallback(() => {
    unlockAudio();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSoundEnabled(p => { enabledRef.current = !p; return !p; });
  }, []);

  useEffect(() => {
    const handler = () => { unlockAudio(); document.removeEventListener('click', handler, true); };
    document.addEventListener('click', handler, true);
    return () => {
      document.removeEventListener('click', handler, true);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  return { soundEnabled, toggleSound, enqueue: play, playBingo };
}
