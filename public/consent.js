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
