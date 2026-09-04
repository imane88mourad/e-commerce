'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { localeNames } from '@/lib/i18n';

const LanguageSwitcher = () => {
  const { locale, changeLocale, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  ];

  const currentLang = languages.find(l => l.code === locale);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-sm border border-gray-300 rounded hover:border-orange-400 transition"
        title="Change language"
      >
        <span>{currentLang?.flag}</span>
        <span className="hidden lg:inline">{currentLang?.name}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLocale(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 transition ${
                locale === lang.code ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {locale === lang.code && (
                <svg className={`w-4 h-4 ${isRTL ? 'mr-auto' : 'ml-auto'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
