import en from './en';
import fr from './fr';
import ar from './ar';
import adminEn from './admin-en';
import adminFr from './admin-fr';
import adminAr from './admin-ar';

export const locales = {
  en: { ...en, admin: adminEn },
  fr: { ...fr, admin: adminFr },
  ar: { ...ar, admin: adminAr },
};

export const adminLocales = {
  en: adminEn,
  fr: adminFr,
  ar: adminAr,
};

export const localeNames = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

export const rtlLocales = ['ar'];

export function getDirection(locale) {
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

export function t(locale, key, params = {}) {
  const keys = key.split('.');
  let value = locales[locale];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  if (typeof value !== 'string') {
    return value;
  }
  
  // Replace parameters like {count}
  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

export default locales;
