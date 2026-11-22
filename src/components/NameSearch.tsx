'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { IconSearch } from './Icons'
import { fold, type Row } from '@/lib/model'

type Hit = { slug: string; name: string; meaning: string; key: string }

export function NameSearch({ lang, base, placeholder, label, noResults }: {
  lang: string; base: string; placeholder: string; label: string; noResults: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState<Hit[] | null>(null)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement | null>(null)
  const asked = useRef(false)

  const ensure = () => {
    if (asked.current) return
    asked.current = true
    fetch(`/data/names.${lang}.json`).then(r => r.json()).then((rows: Row[]) => {
      setAll(rows.map(r => ({ slug: r[1], name: r[2], meaning: r[9], key: fold(r[2]) })))
    }).catch(() => { asked.current = false })
  }

  const hits = useMemo(() => {
    const k = fold(q.trim())
    if (!k || !all) return []
    const starts = all.filter(h => h.key.startsWith(k))
    const more = starts.length < 8 ? all.filter(h => !h.key.startsWith(k) && h.key.includes(k)) : []
    return [...starts.sort((a, b) => a.key.length - b.key.length || a.key.localeCompare(b.key)), ...more].slice(0, 8)
  }, [q, all])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const show = open && q.trim().length > 0 && all !== null
  return (
    <div className="search" ref={wrap} role="search">
      <IconSearch size={20} />
      <input
        type="search" name="q" autoComplete="off" spellCheck={false} placeholder={placeholder} aria-label={label}
        role="combobox" aria-expanded={show} aria-controls="name-search-results" aria-autocomplete="list"
        value={q}
        onFocus={() => { ensure(); setOpen(true) }}
        onChange={e => { setQ(e.target.value); setOpen(true); setActive(0) }}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false)
          else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); window.location.href = `${base}/${hits[active].slug}` }
        }}
      />
      {show ? (
        <ul className="search-pop" id="name-search-results" role="listbox">
          {hits.length ? hits.map((h, i) => (
            <li key={h.slug} role="presentation">
              <a href={`${base}/${h.slug}`} role="option" aria-selected={i === active}>
                <strong>{h.name}</strong><span>{h.meaning}</span>
              </a>
            </li>
          )) : <li role="presentation"><p className="muted">{noResults}</p></li>}
        </ul>
      ) : null}
    </div>
  )
}
