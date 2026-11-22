import type { Locale } from '../config'
import type { Dict } from './en'
import en from './en'
import es from './es'
import fr from './fr'
import de from './de'
import it from './it'
import pt from './pt'

const DICTS: Record<Locale, Dict> = { en, es, fr, de, it, pt }
export const getDict = (l: Locale): Dict => DICTS[l]
export type { Dict }
