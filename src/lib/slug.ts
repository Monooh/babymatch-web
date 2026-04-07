export function nameToSlug(name: string): string {
  return name.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
export function genderLabel(g: string) { return g==='f'?'Niña':g==='m'?'Niño':'Unisex' }
export function popularityStars(n: number): string {
  const s = Math.round((n/100)*5); return '\u2605'.repeat(s)+'\u2606'.repeat(5-s)
}
