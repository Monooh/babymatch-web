// Arrivals at the site, counted without cookies and without storing anything on the device: one anonymous tick when
// a page is opened from somewhere else (a search engine, an assistant, another site, a typed address). Moving around
// inside the site, reloads and crawlers do not count. Read in the panel (/es/panel); see docs/medicion.md.
(function () {
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]
    if (nav && nav.type !== 'navigate') return
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|scan/i.test(navigator.userAgent)) return
    var host = function (h) { return h.replace(/^www\./, '') }
    var ref = ''
    try { ref = document.referrer ? host(new URL(document.referrer).hostname) : '' } catch (e) {}
    if (ref === host(location.hostname)) return
    var parts = location.pathname.split('/').filter(Boolean)
    var sec = parts[1] || ''
    if (sec === 'panel') return
    var is = function (re) { return re.test(ref) }
    var src = !ref ? 'direct'
      : is(/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com|phind\.com|poe\.com|deepseek\.com|mistral\.ai|meta\.ai)$/) ? 'ai'
      : is(/^mail\./) ? 'other'
      : is(/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.[a-z.]+|ecosia\.org|brave\.com|yandex\.[a-z.]+|qwant\.com|startpage\.com|baidu\.com)$/) ? 'search'
      : is(/(^|\.)(facebook\.com|instagram\.com|t\.co|twitter\.com|x\.com|tiktok\.com|pinterest\.[a-z.]+|reddit\.com|linkedin\.com|lnkd\.in|youtube\.com|whatsapp\.com|t\.me|threads\.net|threads\.com|bsky\.app)$/) ? 'social'
      : 'other'
    var land = parts.length <= 1 ? 'home'
      : sec === 'app' ? 'app'
      : /^(nombres|names|prenoms|vornamen|nomi|nomes)$/.test(sec) && parts.length > 2 ? 'name'
      : /^(listas|lists|listes|listen|liste)$/.test(sec) ? 'list'
      : /^(santoral|name-days|fetes|namenstage|onomastici|santos)$/.test(sec) ? 'saints'
      : sec === 'datos' ? 'data'
      : 'other'
    var ev = { visit: 1 }
    ev['src_' + src] = 1
    ev['land_' + land] = 1
    var body = JSON.stringify({ lang: /^[a-z]{2}$/.test(parts[0] || '') ? parts[0] : 'xx', ev: ev })
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/e', body))) {
      fetch('/api/e', { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(function () {})
    }
  } catch (e) {}
})();

// Google Analytics, loaded only after the visitor says yes. Plain script on purpose: name and list pages ship no
// framework code. Until there is a yes, nothing is requested from Google and no cookie is set.
(function () {
  var tag = document.currentScript || document.querySelector('script[data-ga]')
  if (!tag) return
  var id = tag.getAttribute('data-ga')
  if (!id) return
  var KEY = 'babymatch:consent'
  var loaded = false

  function read() { try { return localStorage.getItem(KEY) } catch (e) { return null } }
  function write(v) { try { localStorage.setItem(KEY, v) } catch (e) {} }

  function load() {
    if (loaded) return
    loaded = true
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', id)
    var s = document.createElement('script')
    s.async = true
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id)
    document.head.appendChild(s)
  }

  function ask() {
    if (document.querySelector('.consent')) return
    var box = document.createElement('div')
    box.className = 'consent'
    box.setAttribute('role', 'region')
    box.setAttribute('aria-label', 'Google Analytics')
    var p = document.createElement('p')
    p.textContent = tag.getAttribute('data-text') + ' '
    var more = document.createElement('a')
    more.href = tag.getAttribute('data-privacy')
    more.textContent = tag.getAttribute('data-more')
    p.appendChild(more)
    var row = document.createElement('div')
    row.className = 'consent-row'
    function button(label, value) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn btn--small'
      b.textContent = label
      b.addEventListener('click', function () {
        write(value)
        box.remove()
        if (value === 'yes') load()
        else if (loaded) location.reload() // a yes turned into a no: drop the running tag
      })
      return b
    }
    // Same weight for both answers: refusing must be as easy as accepting.
    row.appendChild(button(tag.getAttribute('data-no'), 'no'))
    row.appendChild(button(tag.getAttribute('data-yes'), 'yes'))
    box.appendChild(p)
    box.appendChild(row)
    document.body.appendChild(box)
  }

  var choice = read()
  if (choice === 'yes') load()
  else if (choice !== 'no') ask()

  // "Change my choice" on the privacy page.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-consent-reset]') : null
    if (t) { e.preventDefault(); ask() }
  })
})()
