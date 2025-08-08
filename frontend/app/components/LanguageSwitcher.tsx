'use client';

import { useState } from 'react';

const LANGUAGES = [
  { code: 'en-US', label: '🇺🇸 English' },
  { code: 'pt-PT', label: '🇵🇹 Português' },
];

export default function LanguageSwitcher({
  onChange,
  currentLang = 'en-US',
}: {
  onChange?: (lang: string) => void;
  currentLang?: string;
}) {
  const [open, setOpen] = useState(false);

  // Normalize the current language to match our supported languages
  const normalizeLanguage = (lang: string) => {
    if (lang.startsWith('en')) return 'en-US';
    if (lang.startsWith('pt')) return 'pt-PT';
    return 'en-US'; // fallback
  };

  const normalizedCurrentLang = normalizeLanguage(currentLang);

  return (
    <div className="relative inline-block z-50">
      {/* Main Button */}
      <button
        className="group flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch Language"
      >
        <span className="text-xl">
          {LANGUAGES.find(l => l.code === normalizedCurrentLang)?.label.split(' ')[0] || '🌐'}
        </span>
        <span className="hidden sm:inline">
          {LANGUAGES.find(l => l.code === normalizedCurrentLang)?.label.split(' ')[1] || 'Language'}
        </span>
        
        <svg 
          className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth={2} 
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden shadow-lg">
              {LANGUAGES.map((lang, index) => (
                <button
                  key={lang.code}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold transition-all duration-200 hover:bg-white/20 ${
                    normalizedCurrentLang === lang.code 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/90 hover:text-white'
                  } ${index > 0 ? 'border-t border-white/10' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    onChange?.(lang.code);
                  }}
                >
                  <span className="text-xl">
                    {lang.label.split(' ')[0]}
                  </span>
                  <span>
                    {lang.label.split(' ')[1]}
                  </span>
                  
                  {/* Check mark for active language */}
                  {normalizedCurrentLang === lang.code && (
                    <svg className="ml-auto w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}