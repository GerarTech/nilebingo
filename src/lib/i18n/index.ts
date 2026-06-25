import { en } from './en';
import { am } from './am';

export type TranslationKey = keyof typeof en;

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? T[K] extends string ? K : never : never }[keyof T]
  : never;

const dictionaries = { en, am } as const;

export type Language = 'en' | 'am';

export function getTranslations(lang: Language) {
  return dictionaries[lang];
}

export function useT(language: Language) {
  const translations = getTranslations(language);
  
  return function t(key: keyof typeof en): string {
    if (language === 'am') {
      return (am as any)[key] ?? (en as any)[key] ?? key;
    }
    return (translations as any)[key] ?? key;
  };
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatCurrency(amount: number, lang: Language): string {
  const label = lang === 'am' ? 'ብር' : 'ETB';
  return `${formatNumber(amount)} ${label}`;
}