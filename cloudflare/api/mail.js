// The few emails BabyMatch sends, only to people who typed their address in the app:
//   confirm  "is this address yours?" (the link also opens the list on the device that taps it)
//   login    "open my list here" (asked for from a device that lost it)
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

// Written the way a person would say it; each language on its own terms, not a translation grid.
const TEXT = {
  es: {
    hi: n => (n ? `Hola, ${n}:` : 'Hola:'),
    confirm: ['Confirma tu correo para guardar tu lista', 'Abre este enlace para confirmar tu correo y dejar guardada tu lista de nombres:', 'El enlace sirve dos días. Si no lo has pedido tú, no hagas nada.'],
    login: ['Tu lista de BabyMatch', 'Abre este enlace en el móvil donde quieras ver tu lista:', 'Sirve dos días y abre tu lista, así que no lo reenvíes.'],
    joined: p => [`${p} ya está en BabyMatch contigo`, `${p} ha abierto tu invitación. A partir de ahora ven los nombres que les gustan a los dos:`, ''],
    matches: (p, n) => [n === 1 ? 'Tienen un nombre nuevo en común' : `Tienen ${n} nombres nuevos en común`, n === 1 ? `A ${p} y a ti les gusta el mismo nombre. Míralo aquí:` : `A ${p} y a ti les gustan ${n} nombres más. Míralos aquí:`, ''],
    partner: 'Tu pareja', off: 'Para dejar de recibir estos avisos, abre este enlace:',
  },
  en: {
    hi: n => (n ? `Hi ${n},` : 'Hi,'),
    confirm: ['Confirm your email to save your list', 'Open this link to confirm your email and keep your list of names safe:', 'The link works for two days. If you did not ask for this, ignore it.'],
    login: ['Your BabyMatch list', 'Open this link on the phone where you want your list:', 'It works for two days and opens your list, so do not forward it.'],
    joined: p => [`${p} has joined you on BabyMatch`, `${p} opened your invitation. From now on you both see the names you both like:`, ''],
    matches: (p, n) => [n === 1 ? 'You have a new name in common' : `You have ${n} new names in common`, n === 1 ? `You and ${p} like the same name. See it here:` : `You and ${p} like ${n} more names. See them here:`, ''],
    partner: 'Your partner', off: 'To stop getting these emails, open this link:',
  },
  fr: {
    hi: n => (n ? `Bonjour ${n},` : 'Bonjour,'),
    confirm: ['Confirmez votre e-mail pour garder votre liste', 'Ouvrez ce lien pour confirmer votre e-mail et garder votre liste de prénoms :', 'Le lien est valable deux jours. Si vous n’avez rien demandé, ignorez ce message.'],
    login: ['Votre liste BabyMatch', 'Ouvrez ce lien sur le téléphone où vous voulez retrouver votre liste :', 'Il est valable deux jours et ouvre votre liste : ne le transférez pas.'],
    joined: p => [`${p} vous a rejoint sur BabyMatch`, `${p} a ouvert votre invitation. Vous voyez désormais les prénoms qui vous plaisent à tous les deux :`, ''],
    matches: (p, n) => [n === 1 ? 'Vous avez un nouveau prénom en commun' : `Vous avez ${n} nouveaux prénoms en commun`, n === 1 ? `${p} et vous aimez le même prénom. Il est ici :` : `${p} et vous aimez ${n} prénoms de plus. Ils sont ici :`, ''],
    partner: 'Votre partenaire', off: 'Pour ne plus recevoir ces messages, ouvrez ce lien :',
  },
  de: {
    hi: n => (n ? `Hallo ${n},` : 'Hallo,'),
    confirm: ['Bestätige deine E-Mail, um deine Liste zu sichern', 'Öffne diesen Link, um deine E-Mail zu bestätigen und deine Namensliste zu sichern:', 'Der Link gilt zwei Tage. Wenn du das nicht angefordert hast, musst du nichts tun.'],
    login: ['Deine BabyMatch-Liste', 'Öffne diesen Link auf dem Handy, auf dem du deine Liste sehen willst:', 'Er gilt zwei Tage und öffnet deine Liste, leite ihn also nicht weiter.'],
    joined: p => [`${p} ist jetzt mit dir bei BabyMatch`, `${p} hat deine Einladung geöffnet. Ab jetzt seht ihr die Namen, die euch beiden gefallen:`, ''],
    matches: (p, n) => [n === 1 ? 'Ihr habt einen neuen gemeinsamen Namen' : `Ihr habt ${n} neue gemeinsame Namen`, n === 1 ? `${p} und dir gefällt derselbe Name. Hier ist er:` : `${p} und dir gefallen ${n} weitere Namen. Hier sind sie:`, ''],
    partner: 'Dein Partner', off: 'Wenn du diese E-Mails nicht mehr bekommen möchtest, öffne diesen Link:',
  },
  it: {
    hi: n => (n ? `Ciao ${n},` : 'Ciao,'),
    confirm: ['Conferma la tua email per salvare la lista', 'Apri questo link per confermare la tua email e tenere al sicuro la tua lista di nomi:', 'Il link vale due giorni. Se non l’hai chiesto tu, non fare nulla.'],
    login: ['La tua lista di BabyMatch', 'Apri questo link sul telefono dove vuoi vedere la tua lista:', 'Vale due giorni e apre la tua lista, quindi non inoltrarlo.'],
    joined: p => [`${p} è su BabyMatch con te`, `${p} ha aperto il tuo invito. Da adesso vedete i nomi che piacciono a tutti e due:`, ''],
    matches: (p, n) => [n === 1 ? 'Avete un nuovo nome in comune' : `Avete ${n} nuovi nomi in comune`, n === 1 ? `A te e a ${p} piace lo stesso nome. Eccolo:` : `A te e a ${p} piacciono altri ${n} nomi. Eccoli:`, ''],
    partner: 'Il tuo partner', off: 'Per non ricevere più questi avvisi, apri questo link:',
  },
  pt: {
    hi: n => (n ? `Olá, ${n}:` : 'Olá:'),
    confirm: ['Confirma o teu email para guardar a tua lista', 'Abre esta ligação para confirmar o teu email e deixar guardada a tua lista de nomes:', 'A ligação funciona durante dois dias. Se não foste tu a pedir, não faças nada.'],
    login: ['A tua lista do BabyMatch', 'Abre esta ligação no telemóvel onde queres ver a tua lista:', 'Funciona durante dois dias e abre a tua lista, por isso não a reencaminhes.'],
    joined: p => [`${p} já está no BabyMatch contigo`, `${p} abriu o teu convite. A partir de agora veem os nomes de que os dois gostam:`, ''],
    matches: (p, n) => [n === 1 ? 'Têm um nome novo em comum' : `Têm ${n} nomes novos em comum`, n === 1 ? `Tu e ${p} gostam do mesmo nome. Está aqui:` : `Tu e ${p} gostam de mais ${n} nomes. Estão aqui:`, ''],
    partner: 'O teu par', off: 'Para deixares de receber estes avisos, abre esta ligação:',
  },
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** kind: confirm | login | joined | matches. `off` is the "stop writing to me" link, left out of the first two. */
export function compose(kind, lang, { name = '', partner = '', count = 0, link, off = '' }) {
  const T = TEXT[lang] || TEXT.en
  const who = partner || T.partner
  const [subject, line, after] = kind === 'joined' ? T.joined(who) : kind === 'matches' ? T.matches(who, count) : T[kind]
  const text = [T.hi(name), '', line, link, ...(after ? ['', after] : []), ...(off ? ['', T.off, off] : []), '', 'BabyMatch · babymatch.app'].join('\n')
  const html = `<div style="font:16px/1.5 system-ui,sans-serif;color:#222;max-width:32rem">
<p>${esc(T.hi(name))}</p><p>${esc(line)}</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:12px 20px;background:#222;color:#fff;border-radius:8px;text-decoration:none">${esc(subject)}</a></p>
<p style="word-break:break-all;color:#555;font-size:14px">${esc(link)}</p>${after ? `<p>${esc(after)}</p>` : ''}
${off ? `<p style="color:#777;font-size:13px">${esc(T.off)} <a href="${esc(off)}" style="color:#777">${esc(off)}</a></p>` : ''}
<p style="color:#777;font-size:13px">BabyMatch · babymatch.app</p></div>`
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
