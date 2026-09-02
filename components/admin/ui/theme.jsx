'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

export const useAdminTheme = () => useContext(ThemeContext);

export const THEME_KEY = 'quickcart_admin_theme';

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  const toggle = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
