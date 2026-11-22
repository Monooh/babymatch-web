/** Fill {placeholders} in a dictionary string. */
export function t(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}
const NF: Record<string, Intl.NumberFormat> = {}
export function num(n: number, locale: string): string {
  return (NF[locale] ||= new Intl.NumberFormat(locale, { useGrouping: 'always' } as Intl.NumberFormatOptions)).format(n)
}
