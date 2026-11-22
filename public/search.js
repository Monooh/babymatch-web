// Name search for the site header. Plain script on purpose: name and list pages ship no framework code.
(function () {
  var box = document.querySelector('.search[data-lang]')
  if (!box) return
  var input = box.querySelector('input')
  var pop = box.querySelector('.search-pop')
  var base = box.getAttribute('data-base')
  var names = null, asked = false, hits = [], active = 0

  function fold(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd')
      .replace(/[ıİ]/g, 'i').replace(/[þÞ]/g, 'th').replace(/[ðÐ]/g, 'd').replace(/[œŒ]/g, 'oe').toLowerCase()
  }
  function load() {
    if (asked) return
    asked = true
    fetch('/data/names.' + box.getAttribute('data-lang') + '.json')
      .then(function (r) { return r.json() })
      .then(function (rows) {
        names = rows.map(function (r) { return { slug: r[1], name: r[2], meaning: r[9], key: fold(r[2]) } })
        render()
      })
      .catch(function () { asked = false })
  }
  function close() { pop.hidden = true; input.setAttribute('aria-expanded', 'false') }
  function render() {
    var q = fold(input.value.trim())
    if (!q || !names) return close()
    var starts = names.filter(function (h) { return h.key.indexOf(q) === 0 })
      .sort(function (a, b) { return a.key.length - b.key.length || (a.key < b.key ? -1 : 1) })
    var more = starts.length < 8 ? names.filter(function (h) { return h.key.indexOf(q) > 0 }) : []
    hits = starts.concat(more).slice(0, 8)
    if (active >= hits.length) active = 0
    pop.textContent = ''
    if (!hits.length) {
      var li = document.createElement('li'), p = document.createElement('p')
      li.setAttribute('role', 'presentation'); p.className = 'muted'; p.textContent = box.getAttribute('data-none')
      li.appendChild(p); pop.appendChild(li)
    }
    hits.forEach(function (h, i) {
      var li = document.createElement('li'), a = document.createElement('a')
      var strong = document.createElement('strong'), span = document.createElement('span')
      li.setAttribute('role', 'presentation')
      a.href = base + '/' + h.slug; a.setAttribute('role', 'option'); a.setAttribute('aria-selected', String(i === active))
      strong.textContent = h.name; span.textContent = h.meaning
      a.appendChild(strong); a.appendChild(span); li.appendChild(a); pop.appendChild(li)
    })
    pop.hidden = false
    input.setAttribute('aria-expanded', 'true')
  }
  input.addEventListener('focus', function () { load(); render() })
  input.addEventListener('input', function () { active = 0; load(); render() })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, hits.length - 1); render() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render() }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); window.location.href = base + '/' + hits[active].slug }
  })
  document.addEventListener('mousedown', function (e) { if (!box.contains(e.target)) close() })
})()
