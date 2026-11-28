// The few emails BabyMatch sends, only to people who typed their address in the app:
//   confirm  "is this address yours?" (the link also opens the list on the device that taps it)
//   login    "open my list here" (asked for from a device that lost it)
//   code     the six-digit code that opens an account (new or not), with a link that does the same in one tap
//   joined   "your partner opened your invitation"
//   matches  "you two have new names in common" (at most one a day, and only while the person is away)
//
// Sending needs a provider, and none is required to run the rest: with neither binding below the app hides
// everything about email. Cloudflare Email Sending (binding EMAIL, Workers Paid) or Resend (secret RESEND_API_KEY).

const FROM = { email: 'hola@babymatch.app', name: 'BabyMatch' }

export const mailOn = env => !!(env.EMAIL || env.RESEND_API_KEY || env.DEV_ORIGIN)
export const cleanEmail = v => {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length <= 120 && /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/.test(e) ? e : null
}

// Written the way a person would say it; each language on its own terms, not a translation grid, and in the form
// of address its dictionary uses (src/i18n/dict): "tú" and "ustedes" in Spanish, "tu" in French and Italian, "du" in
// German, Brazilian "você" in Portuguese.
// Each kind: [subject (also the headline), what it is about, small print]. cta: the button, per kind.
const TEXT = {
  es: {
    hi: n => (n ? `Hola, ${n}:` : 'Hola:'),
    confirm: ['Confirma tu correo para guardar tu lista', 'Toca el botón para confirmar tu correo y dejar guardada tu lista de nombres.', 'El enlace sirve dos días. Si no lo has pedido tú, no hagas nada.'],
    login: ['Tu lista de BabyMatch', 'Toca el botón en el móvil donde quieras ver tu lista.', 'El enlace sirve dos días y abre tu lista, así que no lo reenvíes.'],
    panel: ['Tu enlace para el panel de BabyMatch', 'Toca el botón en el dispositivo donde quieras ver las cifras de uso.', 'El enlace sirve veinte minutos y una sola vez. Si no lo has pedido tú, no hagas nada.'],
    joined: p => [`${p} ya está en BabyMatch contigo`, `${p} ha abierto tu invitación. A partir de ahora ven los nombres que les gustan a los dos.`, ''],
    matches: (p, n) => [n === 1 ? 'Tienen un nombre nuevo en común' : `Tienen ${n} nombres nuevos en común`, n === 1 ? `A ${p} y a ti les gusta el mismo nombre.` : `A ${p} y a ti les gustan ${n} nombres más.`, ''],
    code: c => [`${c} es tu código de BabyMatch`, 'Escribe este código en BabyMatch para entrar en tu cuenta.', 'El código sirve 20 minutos. Si no lo has pedido tú, no hagas nada.'],
    cta: { code: 'Entrar sin código', confirm: 'Confirmar mi correo', login: 'Abrir mi lista', panel: 'Abrir el panel', joined: 'Ver nuestros nombres', matches: 'Ver los nombres' },
    partner: 'Tu pareja', alt: 'Si el botón no funciona, copia este enlace en el navegador:',
    why: 'Recibes estos avisos porque guardaste tu lista con esta dirección.', off: 'Dejar de recibirlos',
  },
  en: {
    hi: n => (n ? `Hi ${n},` : 'Hi,'),
    confirm: ['Confirm your email to save your list', 'Tap the button to confirm your email and keep your list of names safe.', 'The link works for two days. If you did not ask for this, ignore it.'],
    login: ['Your BabyMatch list', 'Tap the button on the phone where you want your list.', 'The link works for two days and opens your list, so do not forward it.'],
    joined: p => [`${p} has joined you on BabyMatch`, `${p} opened your invitation. From now on you both see the names you both like.`, ''],
    matches: (p, n) => [n === 1 ? 'You have a new name in common' : `You have ${n} new names in common`, n === 1 ? `You and ${p} like the same name.` : `You and ${p} like ${n} more names.`, ''],
    code: c => [`${c} is your BabyMatch code`, 'Type this code in BabyMatch to get into your account.', 'The code works for 20 minutes. If you did not ask for this, ignore it.'],
    cta: { code: 'Sign in without the code', confirm: 'Confirm my email', login: 'Open my list', joined: 'See our names', matches: 'See the names' },
    partner: 'Your partner', alt: 'If the button does not work, copy this link into your browser:',
    why: 'You get these emails because you saved your list with this address.', off: 'Stop these emails',
  },
  fr: {
    hi: n => (n ? `Bonjour ${n},` : 'Bonjour,'),
    confirm: ['Confirme ton e-mail pour garder ta liste', 'Touche le bouton pour confirmer ton e-mail et garder ta liste de prénoms.', 'Le lien est valable deux jours. Si tu n’as rien demandé, ignore ce message.'],
    login: ['Ta liste BabyMatch', 'Touche le bouton sur le téléphone où tu veux retrouver ta liste.', 'Le lien est valable deux jours et ouvre ta liste : ne le transfère pas.'],
    joined: p => [`${p} t’a rejoint sur BabyMatch`, `${p} a ouvert ton invitation. Vous voyez désormais les prénoms qui vous plaisent à tous les deux.`, ''],
    matches: (p, n) => [n === 1 ? 'Vous avez un nouveau prénom en commun' : `Vous avez ${n} nouveaux prénoms en commun`, n === 1 ? `${p} et toi aimez le même prénom.` : `${p} et toi aimez ${n} prénoms de plus.`, ''],
    code: c => [`${c} est ton code BabyMatch`, 'Saisis ce code dans BabyMatch pour accéder à ton compte.', 'Le code est valable 20 minutes. Si tu n’as rien demandé, ignore ce message.'],
    cta: { code: 'Entrer sans le code', confirm: 'Confirmer mon e-mail', login: 'Ouvrir ma liste', joined: 'Voir nos prénoms', matches: 'Voir les prénoms' },
    partner: 'Ton partenaire', alt: 'Si le bouton ne marche pas, copie ce lien dans ton navigateur :',
    why: 'Tu reçois ces messages parce que tu as enregistré ta liste avec cette adresse.', off: 'Ne plus les recevoir',
  },
  de: {
    hi: n => (n ? `Hallo ${n},` : 'Hallo,'),
    confirm: ['Bestätige deine E-Mail, um deine Liste zu sichern', 'Tippe auf den Button, um deine E-Mail zu bestätigen und deine Namensliste zu sichern.', 'Der Link gilt zwei Tage. Wenn du das nicht angefordert hast, musst du nichts tun.'],
    login: ['Deine BabyMatch-Liste', 'Tippe auf den Button auf dem Handy, auf dem du deine Liste sehen willst.', 'Der Link gilt zwei Tage und öffnet deine Liste, leite ihn also nicht weiter.'],
    joined: p => [`${p} ist jetzt mit dir bei BabyMatch`, `${p} hat deine Einladung geöffnet. Ab jetzt seht ihr die Namen, die euch beiden gefallen.`, ''],
    matches: (p, n) => [n === 1 ? 'Ihr habt einen neuen gemeinsamen Namen' : `Ihr habt ${n} neue gemeinsame Namen`, n === 1 ? `${p} und dir gefällt derselbe Name.` : `${p} und dir gefallen ${n} weitere Namen.`, ''],
    code: c => [`${c} ist dein BabyMatch-Code`, 'Gib diesen Code in BabyMatch ein, um in dein Konto zu kommen.', 'Der Code gilt 20 Minuten. Wenn du das nicht angefordert hast, musst du nichts tun.'],
    cta: { code: 'Ohne Code anmelden', confirm: 'E-Mail bestätigen', login: 'Meine Liste öffnen', joined: 'Unsere Namen ansehen', matches: 'Namen ansehen' },
    partner: 'Dein Partner', alt: 'Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:',
    why: 'Du bekommst diese E-Mails, weil du deine Liste mit dieser Adresse gesichert hast.', off: 'Abbestellen',
  },
  it: {
    hi: n => (n ? `Ciao ${n},` : 'Ciao,'),
    confirm: ['Conferma la tua email per salvare la lista', 'Tocca il pulsante per confermare la tua email e tenere al sicuro la tua lista di nomi.', 'Il link vale due giorni. Se non l’hai chiesto tu, non fare nulla.'],
    login: ['La tua lista di BabyMatch', 'Tocca il pulsante sul telefono dove vuoi vedere la tua lista.', 'Il link vale due giorni e apre la tua lista, quindi non inoltrarlo.'],
    joined: p => [`${p} è su BabyMatch con te`, `${p} ha aperto il tuo invito. Da adesso vedete i nomi che piacciono a tutti e due.`, ''],
    matches: (p, n) => [n === 1 ? 'Avete un nuovo nome in comune' : `Avete ${n} nuovi nomi in comune`, n === 1 ? `A te e a ${p} piace lo stesso nome.` : `A te e a ${p} piacciono altri ${n} nomi.`, ''],
    code: c => [`${c} è il tuo codice di BabyMatch`, 'Scrivi questo codice su BabyMatch per entrare nel tuo account.', 'Il codice vale 20 minuti. Se non l’hai chiesto tu, non fare nulla.'],
    cta: { code: 'Entra senza codice', confirm: 'Conferma la mia email', login: 'Apri la mia lista', joined: 'Vedi i nostri nomi', matches: 'Vedi i nomi' },
    partner: 'Il tuo partner', alt: 'Se il pulsante non funziona, copia questo link nel browser:',
    why: 'Ricevi questi avvisi perché hai salvato la tua lista con questo indirizzo.', off: 'Non riceverli più',
  },
  pt: {
    hi: n => (n ? `Olá, ${n}!` : 'Olá!'),
    confirm: ['Confirme seu e-mail para salvar sua lista', 'Toque no botão para confirmar seu e-mail e deixar sua lista de nomes salva.', 'O link vale por dois dias. Se não foi você que pediu, é só ignorar.'],
    login: ['Sua lista do BabyMatch', 'Toque no botão no celular em que você quer ver sua lista.', 'O link vale por dois dias e abre a sua lista, então não encaminhe.'],
    joined: p => [`${p} já está no BabyMatch com você`, `${p} abriu seu convite. A partir de agora vocês veem os nomes de que os dois gostam.`, ''],
    matches: (p, n) => [n === 1 ? 'Vocês têm um nome novo em comum' : `Vocês têm ${n} nomes novos em comum`, n === 1 ? `Você e ${p} gostam do mesmo nome.` : `Você e ${p} gostam de mais ${n} nomes.`, ''],
    code: c => [`${c} é o seu código do BabyMatch`, 'Digite este código no BabyMatch para entrar na sua conta.', 'O código vale por 20 minutos. Se não foi você que pediu, é só ignorar.'],
    cta: { code: 'Entrar sem o código', confirm: 'Confirmar meu e-mail', login: 'Abrir minha lista', joined: 'Ver nossos nomes', matches: 'Ver os nomes' },
    partner: 'Seu parceiro', alt: 'Se o botão não funcionar, copie este link no navegador:',
    why: 'Você recebe estes avisos porque salvou sua lista com este endereço.', off: 'Parar de receber',
  },
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// The look of the site, in what email programs understand: the warm paper, the ink, the yellow button with its
// darker lower edge. Colours are the hex of the tokens in src/styles/tokens.css. Chillax (the site's typeface) loads
// where the mail program allows web fonts (Apple Mail does); elsewhere the rounded system face stands in.
const C = { paper: '#f7f5ec', card: '#fcfbf6', rule: '#d7d4c9', edge: '#d2c6aa', ink: '#12161c', ink2: '#272c32', muted: '#565b63', accent: '#f7d21a', accentDeep: '#c9a000' }
const FONT = "Chillax,ui-rounded,'SF Pro Rounded',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const SITE = 'https://babymatch.app'

/** kind: confirm | login | code | joined | matches | panel (the owner's way into the usage panel, Spanish only). `off` is the "stop writing to me" link, left out of the first two. */
export function compose(kind, lang, { name = '', partner = '', count = 0, code = '', link, off = '' }) {
  const T = TEXT[lang] || TEXT.en
  const who = partner || T.partner
  const [subject, line, after] = kind === 'joined' ? T.joined(who) : kind === 'matches' ? T.matches(who, count) : kind === 'code' ? T.code(code) : T[kind]
  const cta = T.cta[kind]
  const text = [T.hi(name), '', line, ...(code ? ['', code] : []), '', `${cta}: ${link}`, ...(after ? ['', after] : []), ...(off ? ['', T.why, `${T.off}: ${off}`] : []), '', 'BabyMatch · babymatch.app'].join('\n')
  const p = (cls, color, size, content, extra = '') => `<p class="${cls}" style="margin:0 0 14px;font:500 ${size}px/1.5 ${FONT};color:${color};${extra}">${content}</p>`
  const html = `<!doctype html>
<html lang="${TEXT[lang] ? lang : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<style>
@import url('https://api.fontshare.com/v2/css?f[]=chillax@500,600&display=swap');
@media (max-width:520px){.pad{padding:30px 22px 26px!important}.h1{font-size:26px!important}}
@media (prefers-color-scheme:dark){.bg{background:#12161c!important}.card{background:#1c2128!important;border-color:#333a43!important}.ink{color:#f7f5ec!important}.ink2{color:#dedbd0!important}.muted,.muted a{color:#a4a8ae!important}}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(line)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${C.paper}">
<tr><td align="center" style="padding:28px 14px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
<tr><td style="padding:0 6px 18px">
<a href="${SITE}" style="text-decoration:none"><img src="${SITE}/icon-192.png" width="40" height="40" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:11px"><span class="ink" style="display:inline-block;vertical-align:middle;padding-left:10px;font:600 20px/1 ${FONT};color:${C.ink};letter-spacing:-0.01em">BabyMatch</span></a>
</td></tr>
<tr><td class="card pad" style="background:${C.card};border:1px solid ${C.rule};border-bottom:5px solid ${C.edge};border-radius:24px;padding:36px 32px 30px">
<h1 class="ink h1" style="margin:0 0 16px;font:600 30px/1.1 ${FONT};letter-spacing:-0.015em;color:${C.ink}">${esc(subject)}</h1>
${p('ink2', C.ink2, 17, esc(T.hi(name)), 'margin-bottom:6px;')}
${p('ink2', C.ink2, 17, esc(line), 'margin-bottom:26px;')}
${code ? `<p class="ink" style="margin:0 0 26px;font:600 40px/1 ${FONT};letter-spacing:0.18em;color:${C.ink}">${esc(code)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:16px;background:${C.accent}">
<a href="${esc(link)}" style="display:inline-block;padding:17px 28px 15px;border-radius:16px;background:${C.accent};border-bottom:5px solid ${C.accentDeep};font:600 17px/1.1 ${FONT};color:${C.ink};text-decoration:none">${esc(cta)}</a>
</td></tr></table>
${after ? p('muted', C.muted, 14, esc(after), 'margin:24px 0 0;') : ''}
${p('muted', C.muted, 13, `${esc(T.alt)}<br><a href="${esc(link)}" style="color:${C.muted};word-break:break-all">${esc(link)}</a>`, 'margin:20px 0 0;')}
</td></tr>
<tr><td class="muted" style="padding:20px 8px 0;font:500 13px/1.6 ${FONT};color:${C.muted}">
${off ? `${esc(T.why)} <a href="${esc(off)}" style="color:${C.muted};text-decoration:underline">${esc(T.off)}</a>.<br>` : ''}BabyMatch · <a href="${SITE}" style="color:${C.muted};text-decoration:underline">babymatch.app</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return { subject, text, html }
}

/** Sends one email. Never throws: an email that fails must not break the request that caused it. */
export async function send(env, to, mail) {
  try {
    if (env.EMAIL) {
      await env.EMAIL.send({ to, from: FROM, subject: mail.subject, text: mail.text, html: mail.html })
      return true
    }
    if (env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${FROM.name} <${FROM.email}>`, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
      })
      if (!res.ok) console.error('mail', res.status, (await res.text()).slice(0, 200))
      return res.ok
    }
    if (env.DEV_ORIGIN) {
      // Local development: nothing leaves the machine; the tests read what would have been sent.
      const box = (globalThis.__outbox ||= [])
      box.push({ to, subject: mail.subject, text: mail.text })
      if (box.length > 50) box.shift()
      return true
    }
  } catch (e) {
    console.error('mail', e && e.message ? e.message : e)
  }
  return false
}
