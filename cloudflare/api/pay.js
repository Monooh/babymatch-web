// BabyMatch Premium: one payment through Stripe Checkout. The Worker only needs a Stripe key that can create and read
// Checkout sessions (`npx wrangler secret put STRIPE_KEY`); without it the app has no limits and never mentions paying.
//
// There is no webhook. The session id is kept on the person; when they come back from the payment page, or the next
// time the app asks, the Worker reads that session from Stripe and believes only what Stripe says about it.

export const PRICE_CENTS = 999
export const CURRENCY = 'eur'
const STRIPE = 'https://api.stripe.com/v1'
const LANGS = new Set(['es', 'en', 'fr', 'de', 'it', 'pt'])

/** Local development has no Stripe key: payments are made up and "paid" through /api/_pay (see worker.js). */
export const devPay = env => !env.STRIPE_KEY && !!env.DEV_ORIGIN
export const payOn = env => !!env.STRIPE_KEY || devPay(env)

// What the buyer reads next to the pay button. Access starts at once, so the 14-day withdrawal right ends there (EU).
const CONSENT = {
  es: 'El acceso Premium se activa al momento. Al pagar aceptas que, una vez activado, no se aplica el derecho de desistimiento.',
  en: 'Premium access starts immediately. By paying you agree that, once it is active, the right of withdrawal no longer applies.',
  fr: 'L’accès Premium est activé immédiatement. En payant, tu acceptes qu’une fois activé, le droit de rétractation ne s’applique plus.',
  de: 'Der Premium-Zugang wird sofort aktiviert. Mit der Zahlung stimmst du zu, dass das Widerrufsrecht nach der Aktivierung erlischt.',
  it: 'L’accesso Premium si attiva subito. Pagando accetti che, una volta attivato, il diritto di recesso non si applica più.',
  pt: 'O acesso Premium é ativado na hora. Ao pagar, você aceita que, depois de ativado, o direito de arrependimento deixa de se aplicar.',
}

function paidDev() {
  if (!globalThis.__paid) globalThis.__paid = new Set()
  return globalThis.__paid
}
export const markDevPaid = ref => paidDev().add(ref)

/** Start a payment for this person. Returns { id, url } or null when Stripe refused. */
export async function checkout(env, user, { lang, back }) {
  const l = LANGS.has(lang) ? lang : 'en'
  if (devPay(env)) {
    const id = 'dev_' + crypto.randomUUID().replace(/-/g, '')
    return { id, url: back + '#paid' }
  }
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
    'line_items[0][price_data][product_data][name]': 'BabyMatch Premium',
    client_reference_id: user.id,
    'metadata[user]': user.id,
    success_url: back + '#paid',
    cancel_url: back,
    locale: l,
    'custom_text[submit][message]': CONSENT[l],
  })
  if (user.email && user.email_ok) form.set('customer_email', user.email)
  const res = await fetch(STRIPE + '/checkout/sessions', {
    method: 'POST', body: form,
    headers: { Authorization: 'Bearer ' + env.STRIPE_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || !data.id || !data.url) {
    console.error('stripe checkout', res.status, data && data.error ? data.error.message : '')
    return null
  }
  return { id: data.id, url: data.url }
}

/** Was that session paid, by this person? Returns { paid, email } (email as given to Stripe). */
export async function paid(env, user, ref) {
  if (!ref) return { paid: false }
  if (devPay(env)) return { paid: paidDev().has(ref), email: null }
  if (!/^cs_[A-Za-z0-9_]+$/.test(ref)) return { paid: false }
  const res = await fetch(STRIPE + '/checkout/sessions/' + ref, { headers: { Authorization: 'Bearer ' + env.STRIPE_KEY } })
  const s = await res.json().catch(() => null)
  if (!res.ok || !s) return { paid: false }
  // The session is one this Worker created (its id was kept on the person, and it carries their id twice), so the price
  // is ours. Stripe may show and charge it in the buyer's own currency (9.50 CHF for 9.99 EUR), so the currency and the
  // amount of the session are not compared with ours.
  const ok = s.mode === 'payment' && s.payment_status === 'paid' && s.client_reference_id === user.id && !!s.metadata && s.metadata.user === user.id
  return { paid: ok, email: ok && s.customer_details && typeof s.customer_details.email === 'string' ? s.customer_details.email : null }
}
