import { de, type Translations } from './de.js';
import { en } from './en.js';

type Locale = 'de' | 'en';

const translations: Record<Locale, Translations> = { de, en };

let currentLocale = $state<Locale>('de');

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('freelancebill-locale', locale);
  }
}

export function initLocale() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('freelancebill-locale') as Locale | null;
    if (saved && translations[saved]) {
      currentLocale = saved;
    }
  }
}

export function t(path: string): string {
  const keys = path.split('.');
  let result: unknown = translations[currentLocale];
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === 'string' ? result : path;
}
