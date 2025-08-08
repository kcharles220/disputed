import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './public/locales/en-US/common.json';
import ptPT from './public/locales/pt-PT/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { common: enUS },
      'pt-PT': { common: ptPT },
    },
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator', 'htmlTag', 'localStorage'],
      caches: ['localStorage'],
      // Custom language detection that normalizes browser locales
      convertDetectedLanguage: (lng: string) => {
        // Normalize detected languages to our supported locales
        if (lng.startsWith('en')) return 'en-US';
        if (lng.startsWith('pt')) return 'pt-PT';
        return 'en-US'; // fallback
      }
    },
  });

export default i18n;