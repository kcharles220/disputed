import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './public/locales/en-US/common.json';
import ptCommon from './public/locales/pt-PT/common.json';

const normalize = (lng?: string) => {
  if (!lng) return 'en-US';
  const low = lng.toLowerCase();
  if (low.startsWith('pt')) return 'pt-PT';
  if (low.startsWith('en')) return 'en-US';
  return 'en-US';
};

const detected =
  typeof window !== 'undefined' && typeof navigator !== 'undefined'
    ? navigator.language
    : process.env.NEXT_PUBLIC_DEFAULT_LANG || 'en-US';

const initialLng = normalize(detected);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { common: enCommon },
      'pt-PT': { common: ptCommon },
    },
    supportedLngs: ['en-US', 'pt-PT'],
    fallbackLng: 'en-US',
    lng: initialLng, // force normalized initial language
    ns: ['common'],
    defaultNS: 'common',
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'cookie', 'htmlTag'],
      caches: ['localStorage'],
      // ensure detector outputs full locales
      convertDetectedLanguage: normalize as any,
    },
    interpolation: { escapeValue: false },
    debug: false,
  });

// Optional helper so callers always set full locales
export const changeLanguageNormalized = (lng: string) => i18n.changeLanguage(normalize(lng));

export default i18n;