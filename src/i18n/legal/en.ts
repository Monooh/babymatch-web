import type { Legal } from './index'

const legal: Legal = {
  updated: 'Last updated: {date}',

  notice: {
    title: 'Legal notice',
    desc: 'Who is behind BabyMatch and the legal terms of the site.',
    lead: 'Who answers for this site and the rules it runs under.',
    sections: [
      {
        h: 'Who runs the site',
        p: [
          'As required by article 10 of Spanish Law 34/2002 on information society services and electronic commerce, babymatch.app is a project run by:',
          ['Owner: {name}, self-employed', 'Tax ID (NIF): {nif}', 'Address: {address}', 'Contact: {email}'],
        ],
      },
      {
        h: 'What BabyMatch is',
        p: [
          'BabyMatch is a free site for choosing a baby name. It gathers name pages with meaning, origin, name day and official figures, and an app where two people mark the names they like and see which ones they share.',
          'Use of the site is covered by the [terms of use]({termsUrl}), the [privacy policy]({privacyUrl}) and the [cookie policy]({cookiesUrl}).',
        ],
      },
      {
        h: 'Intellectual property',
        p: [
          'The texts, design, code, logo and the BabyMatch name belong to the owner. The usage figures for each name come from public statistics offices, credited on the page where they appear, and keep their own licence.',
          'You may quote the content and link to it with credit. Copying the site in bulk or reusing it commercially needs written permission.',
        ],
      },
      {
        h: 'Liability',
        p: [
          'Information about names is given as a guide. It is checked with care but may contain mistakes, and it does not replace what your country’s civil registry says about which names can be registered.',
          'The site links to third-party pages. The owner is not responsible for their content or for how they handle your data.',
        ],
      },
      {
        h: 'Governing law',
        p: ['This site is governed by Spanish law. If you are a consumer, any dispute will be heard by the courts where you live.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Who is responsible for your data',
        p: ['The data controller is {name}, who runs BabyMatch. Full details are in the [legal notice]({noticeUrl}). For anything about your data, write to {email}.'],
      },
      {
        h: 'What the data is used for, and on what legal basis',
        p: [
          [
            'Saving your list, joining it with your partner’s and running the votes you open: this is the service you ask for when you use the app (article 6(1)(b) GDPR).',
            'Sending you emails about your list, only if you give your address: your consent, which you can withdraw at any time (article 6(1)(a)).',
            'Counting visits and usage anonymously and protecting the site from abuse: a legitimate interest in knowing whether the site works and keeping it safe (article 6(1)(f)).',
            'Google Analytics, only if you accept it: your consent (article 6(1)(a)).',
          ],
          'No automated decisions are made about you and no profiles are built.',
        ],
      },
      {
        h: 'Who else is involved',
        p: [
          [
            'Cloudflare, Inc. hosts the site and the database and protects them from attacks. To do so it processes the IP address of each visit.',
            'Resend, Inc. sends the emails, if you give your address.',
            'Stripe Payments Europe, Ltd. takes the payment for Premium, if you buy it. It receives your payment details; BabyMatch never sees or stores them: it only keeps the confirmation of the payment and the email you give when paying, to give you your access back.',
            'Google Ireland Ltd. provides Google Analytics, if you accept it.',
          ],
          'Cloudflare and Resend are based in the United States. Transfers rely on the EU-US Data Privacy Framework or, failing that, on the European Commission’s standard contractual clauses. Your data is not sold or passed on to anyone else.',
        ],
      },
      {
        h: 'How long it is kept',
        p: [
          'Your list is kept until you delete it with “Erase everything”. While it exists, the backup keeps earlier versions for 30 days at most. Links sent by email expire after two days. Google Analytics cookies last up to two years, or until you delete them.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can ask for access to your data, have it corrected or erased, object to its use, restrict it or take it with you in a readable format. Write to {email}. Because BabyMatch does not require a sign-up, the email of your account or the link to your list may be needed to tell which one is yours.',
          'If you think your data has been mishandled, you can complain to the [Spanish Data Protection Agency](https://www.aepd.es) or to the authority in your country.',
        ],
      },
      {
        h: 'Children',
        p: ['BabyMatch is meant for adults. No data is knowingly collected from children.'],
      },
      {
        h: 'Changes',
        p: ['If this policy changes, the new version will be published on this page with its date.'],
      },
    ],
  },

  cookies: {
    title: 'Cookie policy',
    desc: 'Which cookies BabyMatch uses, what they are for and how to change your choice.',
    lead: 'BabyMatch uses very few cookies, and none for advertising.',
    change: 'Change my analytics choice',
    sections: [
      {
        h: 'What a cookie is',
        p: ['A small file a website saves in your browser so it can recognise it later. The browser’s local storage does a similar job and is explained here in the same way.'],
      },
      {
        h: 'First-party cookies, strictly necessary',
        p: [
          'They are only created when you start using the app. Your list cannot be saved without them, which is why they need no consent.',
          [
            'bm_s: holds the key that recognises your list on the server. Lasts 400 days from your last visit.',
            'bm_u: tells the app that this browser already has a saved list. Lasts 400 days.',
          ],
        ],
      },
      {
        h: 'Local storage',
        p: [
          'Your browser also keeps, under names that start with “babymatch:”, your list of names, your analytics choice and, if you vote in someone else’s vote, a random identifier and the first name you gave. They stay there until you delete them.',
        ],
      },
      {
        h: 'Measurement cookies, only if you accept',
        p: [
          'If you accept the notice, Google Analytics, from Google Ireland Ltd., is loaded to learn how many people visit the site and which pages they read. It sets the cookies _ga and _ga_RYQMVXMSTY, which last up to two years. If you decline, nothing is requested from Google and none of these cookies is set.',
        ],
      },
      {
        h: 'What is not here',
        p: ['There are no advertising cookies and no social media pixels, and your activity on other sites is not tracked.'],
      },
      {
        h: 'How to change your choice',
        p: [
          'You can accept or decline analytics at any time with the button below. First-party cookies can be deleted from your browser settings or with “Erase everything” in the app menu, which also deletes your list. More in the [privacy policy]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of use',
    desc: 'The rules for using BabyMatch: what it offers, what you can expect and what you cannot.',
    lead: 'By using babymatch.app you accept these terms. They are few and written to be understood.',
    sections: [
      {
        h: 'Who provides the service',
        p: ['BabyMatch is provided by {name}. Details are in the [legal notice]({noticeUrl}).'],
      },
      {
        h: 'The service',
        p: [
          'BabyMatch can be used for free and without signing up. Your list is saved in your browser and in a copy on the server so you do not lose it. If you want, you can create an account with your email, with no password, to open your list from any device.',
          'The free version has a limited number of likes and superlikes a day. The site may change, add or remove features.',
        ],
      },
      {
        h: 'BabyMatch Premium',
        p: [
          'Premium removes the daily limits on likes and superlikes. It costs €9.99 (taxes included) and is paid once: it is not a subscription and does not renew.',
          'It covers you and the person you have joined your list with, for as long as you stay joined. If you separate the lists, Premium stays with whoever paid.',
          'The payment is handled by Stripe. Access starts as soon as the payment is confirmed; by paying you agree that it starts immediately and that, once it is active, the 14-day right of withdrawal no longer applies.',
          'If you have paid and Premium is not active, write to {email} and we will sort it out or refund you.',
        ],
      },
      {
        h: 'Your list and your links',
        p: [
          'The link that invites your partner joins your two lists, and a vote link lets anyone who opens it vote. You decide who gets them. “Erase everything” deletes your list and your votes for good.',
        ],
      },
      {
        h: 'Fair use',
        p: [
          [
            'Do not try to reach other people’s lists or votes.',
            'Do not download the site in bulk or flood it with automated requests.',
            'Do not type offensive or unlawful content into text fields, such as the name you vote under.',
          ],
          'If these rules are broken, access may be blocked or the content removed.',
        ],
      },
      {
        h: 'Information about names',
        p: [
          'Meanings, origins, name days and figures are given as a guide and may contain mistakes. Before registering a name, check the rules of your country’s civil registry.',
        ],
      },
      {
        h: 'Links and recommendations',
        p: [
          'The site may link to third-party sites and products. Some links may be affiliate links: if you buy through them, BabyMatch earns a commission at no cost to you. When that is the case, it will be stated next to the link.',
        ],
      },
      {
        h: 'Liability',
        p: [
          'The service is provided as it is. Every effort is made to keep it running and never lose a list, but it is not guaranteed to be available at all times or free of errors. None of this limits the rights the law gives you as a consumer.',
        ],
      },
      {
        h: 'Changes and governing law',
        p: [
          'These terms may be updated; the version in force is the one published on this page. They are governed by Spanish law. If you are a consumer, any dispute will be heard by the courts where you live.',
        ],
      },
    ],
  },
}

export default legal
