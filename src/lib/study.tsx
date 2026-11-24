// The INE study page (/es/datos/nombres-ine) prints the note in docs/prensa/nota-nombres-ine.md as it is, so the
// figures on the site are the ones `node scripts/press-ine.mjs` has checked against the INE files. Nothing is retyped.
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { SITE_URL, STUDY } from '@/i18n/config'

export { STUDY }

export type Table = { caption: string; head: string[]; right: boolean[]; rows: string[][]; note: string | null }
export type Study = { title: string; lead: string; body: string[]; source: string; tables: Table[]; method: string[]; about: string }

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
const bare = (s: string) => s.replace(/^\*\*(.*)\*\*$/, '$1')

let cached: Study | null = null
export function study(): Study {
  if (cached) return cached
  const lines = readFileSync(join(process.cwd(), 'docs/prensa/nota-nombres-ine.md'), 'utf8').split('\n')
  const out: Study = { title: '', lead: '', body: [], source: '', tables: [], method: [], about: '' }
  let section = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (line.startsWith('# ')) { out.title = line.slice(2); continue }
    if (line.startsWith('## ')) { section = line.slice(3); continue }
    if (!section) {
      if (/^\*\*.*\*\*$/.test(line) && !out.lead) out.lead = bare(line)
      else out.body.push(line)
    } else if (section === 'Tablas') {
      if (line.startsWith('|')) {
        const table = out.tables[out.tables.length - 1]
        if (!table.head.length) { table.head = cells(line); table.right = cells(lines[++i]).map(c => c.endsWith(':')) }
        else table.rows.push(cells(line))
      } else if (/^\*\*.*\*\*$/.test(line)) out.tables.push({ caption: bare(line), head: [], right: [], rows: [], note: null })
      else if (!out.tables.length) out.source = line
      else out.tables[out.tables.length - 1].note = line
    } else if (section === 'Metodología') {
      // The last point says where the tables are; on the page itself that is the download list.
      if (line.startsWith('- ') && !line.startsWith('- **Datos.**')) out.method.push(line.slice(2))
    } else if (section === 'Sobre BabyMatch') out.about = line
  }
  if (!out.title || !out.lead || out.body.length < 4 || out.tables.length !== 4 || out.tables.some(t => !t.rows.length) || out.method.length < 5 || !out.about) {
    throw new Error('docs/prensa/nota-nombres-ine.md is not laid out as the study page expects')
  }
  return (cached = out)
}

/** **bold**, [links](url) and `code`. Links to this site become paths, so they also work on a preview address. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] != null) out.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] != null) {
      const own = m[3].startsWith(SITE_URL) || m[3].startsWith('https://babymatch.app')
      const href = own ? m[3].replace(/^https:\/\/babymatch\.app/, '') || '/' : m[3]
      out.push(own ? <a key={k++} href={href}>{m[2]}</a> : <a key={k++} href={href} rel="noopener">{m[2]}</a>)
    } else out.push(<code key={k++}>{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
export const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '')

export type Download = { file: string; label: string; rows: number; kb: number }
const LABELS: [string, string][] = [
  ['tabla-4-nombre-mas-caracteristico-por-provincia.csv', 'El nombre más característico de cada provincia, con el segundo'],
  ['provincias-todos-los-candidatos.csv', 'Todos los nombres que compiten en cada provincia'],
  ['nombres-con-1000-personas-o-mas.csv', 'Todos los nombres con 1.000 personas o más, por edad media y década de nacimiento'],
  ['tabla-1-nombres-de-mujer-mayor-edad-media.csv', 'Nombres de mujer con 20.000 personas o más, de mayor a menor edad media'],
  ['tabla-2-nombres-de-hombre-mayor-edad-media.csv', 'Nombres de hombre con 20.000 personas o más, de mayor a menor edad media'],
  ['tabla-3-nombres-menor-edad-media.csv', 'Nombres con 20.000 personas o más, de menor a mayor edad media'],
]
export function downloads(): Download[] {
  const dir = join(process.cwd(), 'public', STUDY.files)
  return LABELS.map(([file, label]) => {
    const path = join(dir, file)
    return { file, label, rows: readFileSync(path, 'utf8').trimEnd().split('\n').length - 1, kb: Math.max(1, Math.round(statSync(path).size / 1024)) }
  })
}
