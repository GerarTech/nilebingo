'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useBingoAudio(language: 'en' | 'am') {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const queueRef = useRef<number[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langRef = useRef(language);
  langRef.current = language;

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false;
      return;
    }
    playingRef.current = true;
    const num = queueRef.current.shift()!;
    const audio = new Audio(`/audio/${langRef.current}/${num}.mp3`);
    audioRef.current = audio;
    audio.onended = () => processQueue();
    audio.onerror = () => { console.warn(`Missing audio: ${num}.mp3`); processQueue(); };
    audio.play().catch(() => processQueue());
  }, []);

  const enqueue = useCallback((num: number) => {
    if (!soundEnabled || !num || num < 1 || num > 75) return;
    queueRef.current.push(num);
    if (!playingRef.current) processQueue();
  }, [soundEnabled, processQueue]);

  const playBingo = useCallback(() => {
    if (!soundEnabled) return;
    playingRef.current = true;
    const audio = new Audio(`/audio/${langRef.current}/Bingo.mp3`);
    audioRef.current = audio;
    audio.onended = () => { playingRef.current = false; processQueue(); };
    audio.onerror = () => { playingRef.current = false; processQueue(); };
    audio.play().catch(() => { playingRef.current = false; processQueue(); });
  }, [soundEnabled, processQueue]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
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

  return { soundEnabled, toggleSound, enqueue, playBingo };
}
