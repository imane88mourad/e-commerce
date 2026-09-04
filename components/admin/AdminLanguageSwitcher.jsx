'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from './ui/icons';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export default function AdminLanguageSwitcher() {
  const { locale, changeLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = languages.find((l) => l.code === locale) || languages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-[color:var(--admin-border)] px-2.5 py-1.5 text-sm text-[color:var(--admin-text)] transition hover:bg-[color:var(--admin-accent-soft)]"
        title="Language"
      >
        <span className="text-base">{current.flag}</span>
        <Icon name="chevronDown" size={14} className={`text-[color:var(--admin-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] shadow-xl">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { changeLocale(lang.code); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-[color:var(--admin-accent-soft)] ${
                locale === lang.code
                  ? 'font-semibold text-[color:var(--admin-accent)]'
                  : 'text-[color:var(--admin-text)]'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && (
                <Icon name="check" size={14} className="ml-auto text-[color:var(--admin-accent)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
