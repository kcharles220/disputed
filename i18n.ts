import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './public/locales/en/common.json';
import pt from './public/locales/pt/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      pt: { common: pt },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
  });

export default i18n;