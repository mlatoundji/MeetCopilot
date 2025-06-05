'use client';

import { useState, useEffect } from 'react';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hydratation initiale du thème
  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
    } else {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mql.matches ? 'dark' : 'light');
    }
  }, []);

  // Application du thème et sauvegarde
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      id="themeToggle"
      className="button-icon"
      title="Toggle Theme"
      onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle; 