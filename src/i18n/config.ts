export const LOCALES = ['es', 'en', 'fr', 'de', 'it', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://babymatch.app').replace(/\/$/, '')
export const SITE_NAME = 'BabyMatch'

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v)
}

/** Localised URL segments: /es/nombres/lucia, /en/names/lucia, /fr/prenoms/lucia… */
export const SEGMENTS: Record<Locale, { names: string; lists: string; privacy: string }> = {
  es: { names: 'nombres', lists: 'listas', privacy: 'privacidad' },
  en: { names: 'names', lists: 'lists', privacy: 'privacy' },
  fr: { names: 'prenoms', lists: 'listes', privacy: 'confidentialite' },
  de: { names: 'vornamen', lists: 'listen', privacy: 'datenschutz' },
  it: { names: 'nomi', lists: 'liste', privacy: 'privacy' },
  pt: { names: 'nomes', lists: 'listas', privacy: 'privacidade' },
}

export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português',
}

/** BCP 47 tags used in hreflang and og:locale. */
export const HREFLANG: Record<Locale, string> = { es: 'es', en: 'en', fr: 'fr', de: 'de', it: 'it', pt: 'pt' }
export const OG_LOCALE: Record<Locale, string> = {
  es: 'es_ES', en: 'en_US', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', pt: 'pt_PT',
}

/** Cultures whose names feel native to each site language (drives the default deck and "popular" lists). */
export const LOCALE_CULTURES: Record<Locale, string[]> = {
  es: ['spanish', 'basque', 'catalan', 'galician'],
  en: ['english', 'irish', 'scottish', 'welsh'],
  fr: ['french'],
  de: ['german'],
  it: ['italian'],
  pt: ['portuguese'],
}

export const paths = {
  home: (l: Locale) => `/${l}`,
  app: (l: Locale) => `/${l}/app`,
  names: (l: Locale) => `/${l}/${SEGMENTS[l].names}`,
  name: (l: Locale, slug: string) => `/${l}/${SEGMENTS[l].names}/${slug}`,
  lists: (l: Locale) => `/${l}/${SEGMENTS[l].lists}`,
  list: (l: Locale, slug: string) => `/${l}/${SEGMENTS[l].lists}/${slug}`,
  privacy: (l: Locale) => `/${l}/${SEGMENTS[l].privacy}`,
}
