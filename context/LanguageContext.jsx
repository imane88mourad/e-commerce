'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { locales, getDirection, rtlLocales } from '@/lib/i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback for components rendered outside the provider
    return {
      locale: 'en',
      direction: 'ltr',
      isRTL: false,
      changeLocale: () => {},
      t: (key) => {
        // Simple fallback: return key path as-is
        const keys = key.split('.');
        let value = locales['en'];
        for (const k of keys) {
          if (value && typeof value === 'object') value = value[k];
          else return key;
        }
        return value !== undefined ? value : key;
      },
      tObject: (key) => {
        const keys = key.split('.');
        let value = locales['en'];
        for (const k of keys) {
          if (value && typeof value === 'object') value = value[k];
          else return null;
        }
        return value;
      },
    };
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [direction, setDirection] = useState('ltr');

  // Load saved locale on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && locales[savedLocale]) {
      setLocale(savedLocale);
      setDirection(getDirection(savedLocale));
    }
  }, []);

  // Update direction when locale changes
  useEffect(() => {
    const dir = getDirection(locale);
    setDirection(dir);
    
    // Update HTML attributes
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    
    // Add/remove RTL class for Tailwind
    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [locale]);

  const changeLocale = useCallback((newLocale) => {
    if (locales[newLocale]) {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let value = locales[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    // Return non-string values (arrays, objects) directly
    if (typeof value !== 'string') {
      return value;
    }
    
    // Replace parameters like {count}
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }, [locale]);

  // Helper to get an object from translations (e.g., t.slider for array)
  const tObject = useCallback((key) => {
    const keys = key.split('.');
    let value = locales[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  }, [locale]);

  const isRTL = rtlLocales.includes(locale);

  const value = {
    locale,
    direction,
    isRTL,
    changeLocale,
    t,
    tObject,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
