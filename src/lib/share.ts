// The first kind of invitation: the list of liked name ids packed into the link itself. New invitations are a short
// code joined on the server (src/lib/sync.ts); this stays so that links already sent keep opening.
const VERSION = 1

function toB64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function encodeInvite(name: string, ids: number[]): string {
  const nm = new TextEncoder().encode(name.trim().slice(0, 30)).slice(0, 60)
  const bytes: number[] = [VERSION, nm.length, ...nm]
  let prev = 0
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    let d = id - prev
    prev = id
    while (d >= 0x80) { bytes.push((d & 0x7f) | 0x80); d >>>= 7 }
    bytes.push(d)
  }
  return toB64Url(new Uint8Array(bytes))
}

export function decodeInvite(code: string): { name: string; ids: number[] } | null {
  try {
    const b = fromB64Url(code)
    if (b[0] !== VERSION) return null
    const len = b[1]
    const name = new TextDecoder().decode(b.slice(2, 2 + len)).replace(/[\u0000-\u001f<>]/g, '').slice(0, 30)
    const ids: number[] = []
    let prev = 0, cur = 0, shift = 0
    for (let i = 2 + len; i < b.length; i++) {
      cur |= (b[i] & 0x7f) << shift
      if (b[i] & 0x80) { shift += 7; continue }
      prev += cur; ids.push(prev); cur = 0; shift = 0
      if (ids.length > 5000) break
    }
    return { name, ids }
  } catch { return null }
}
