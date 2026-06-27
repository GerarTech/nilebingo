'use client';

import { getColumnLabel } from '../server/bingo';

const AMHARIC_NUMBERS: Record<number, string> = {
  1: 'አንድ', 2: 'ሁለት', 3: 'ሶስት', 4: 'አራት', 5: 'አምስት',
  6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አስር',
  11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሶስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
  16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሃያ',
  21: 'ሃያ አንድ', 22: 'ሃያ ሁለት', 23: 'ሃያ ሶስት', 24: 'ሃያ አራት', 25: 'ሃያ አምስት',
  26: 'ሃያ ስድስት', 27: 'ሃያ ሰባት', 28: 'ሃያ ስምንት', 29: 'ሃያ ዘጠኝ', 30: 'ሰላሳ',
  31: 'ሰላሳ አንድ', 32: 'ሰላሳ ሁለት', 33: 'ሰላሳ ሶስት', 34: 'ሰላሳ አራት', 35: 'ሰላሳ አምስት',
  36: 'ሰላሳ ስድስት', 37: 'ሰላሳ ሰባት', 38: 'ሰላሳ ስምንት', 39: 'ሰላሳ ዘጠኝ', 40: 'አርባ',
  41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሶስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
  46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
  51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሶስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
  56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስልሳ',
  61: 'ስልሳ አንድ', 62: 'ስልሳ ሁለት', 63: 'ስልሳ ሶስት', 64: 'ስልሳ አራት', 65: 'ስልሳ አምስት',
  66: 'ስልሳ ስድስት', 67: 'ስልሳ ሰባት', 68: 'ስልሳ ስምንት', 69: 'ስልሳ ዘጠኝ', 70: 'ሰባ',
  71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሶስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት',
};

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (typeof window === 'undefined') return;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch {
      // Silently fail
    }
  }
}

export async function speakNumber(num: number, lang: 'en' | 'am') {
  if (typeof window === 'undefined') return;
  const label = getColumnLabel(num);
  if (lang === 'en') {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${label} ${num}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    try {
      const letterAudio = new Audio(`/audio/am/${label}.mp3`);
      await letterAudio.play();
      letterAudio.addEventListener('ended', async () => {
        const audioParts: string[] = [];
        if (num <= 9) {
          audioParts.push(`/audio/am/${num}.mp3`);
        } else if (num % 10 === 0) {
          audioParts.push(`/audio/am/${num}.mp3`);
        } else {
          const base = Math.floor(num / 10) * 10;
          const unit = num % 10;
          audioParts.push(`/audio/am/${base}.mp3`);
          audioParts.push(`/audio/am/${unit}.mp3`);
        }
        for (const audioPath of audioParts) {
          try {
            const audio = new Audio(audioPath);
            await audio.play();
            await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }));
          } catch {
            // Skip missing files
          }
        }
      }, { once: true });
    } catch {
      // Silent fail
    }
  }
}
