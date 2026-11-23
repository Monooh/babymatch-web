/** Fill {placeholders} in a dictionary string. {count|name|names} picks the first word when count is exactly 1. */
export function t(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (m, k, one, many) => {
    if (!(k in vars)) return m
    return one === undefined ? String(vars[k]) : String(vars[k]) === '1' ? one : many
  })
}
const NF: Record<string, Intl.NumberFormat> = {}
export function num(n: number, locale: string): string {
  return (NF[locale] ||= new Intl.NumberFormat(locale, { useGrouping: 'always' } as Intl.NumberFormatOptions)).format(n)
}
