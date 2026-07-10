'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useBingoAudio(language: 'en' | 'am') {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const queueRef = useRef<number[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langRef = useRef(language);
  const soundEnabledRef = useRef(soundEnabled);
  langRef.current = language;
  soundEnabledRef.current = soundEnabled;

  const done = useCallback(() => {
    playingRef.current = false;
    if (queueRef.current.length === 0) return;
    playingRef.current = true;
    const num = queueRef.current.shift()!;
    const audio = new Audio(`/audio/${langRef.current}/${num}.mp3`);
    audioRef.current = audio;
    let handled = false;
    const next = () => { if (handled) return; handled = true; done(); };
    audio.onended = next;
    audio.onerror = () => { console.warn(`Missing audio: ${num}.mp3`); next(); };
    audio.play().catch(next);
  }, []);

  const enqueue = useCallback((num: number) => {
    if (!soundEnabledRef.current || !num || num < 1 || num > 75) return;
    queueRef.current.push(num);
    if (!playingRef.current) done();
  }, [done]);

  const playBingo = useCallback(() => {
    if (!soundEnabledRef.current) return;
    playingRef.current = true;
    const audio = new Audio(`/audio/${langRef.current}/Bingo.mp3`);
    audioRef.current = audio;
    let handled = false;
    const next = () => { if (handled) return; handled = true; playingRef.current = false; done(); };
    audio.onended = next;
    audio.onerror = next;
    audio.play().catch(next);
  }, [done]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      soundEnabledRef.current = next;
      if (!next) {
        queueRef.current = [];
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        playingRef.current = false;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      queueRef.current = [];
      playingRef.current = false;
    };
  }, []);

  return { soundEnabled, toggleSound, enqueue, playBingo };
}
