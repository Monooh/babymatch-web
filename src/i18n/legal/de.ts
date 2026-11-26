import type { Legal } from './index'

const legal: Legal = {
  updated: 'Zuletzt aktualisiert: {date}',

  notice: {
    title: 'Impressum',
    desc: 'Wer hinter BabyMatch steht und welche rechtlichen Regeln für die Website gelten.',
    lead: 'Wer für diese Website verantwortlich ist und nach welchen Regeln sie läuft.',
    sections: [
      {
        h: 'Anbieter der Website',
        p: [
          'Angaben gemäß § 5 DDG und Artikel 10 des spanischen Gesetzes 34/2002 über Dienste der Informationsgesellschaft und den elektronischen Geschäftsverkehr:',
          ['Betreiber: {name}, selbstständig tätig', 'Steuernummer (NIF): {nif}', 'Anschrift: {address}', 'Kontakt: {email}'],
        ],
      },
      {
        h: 'Was BabyMatch ist',
        p: [
          'BabyMatch ist eine kostenlose Website, die bei der Wahl eines Babynamens hilft. Sie bietet Namensseiten mit Bedeutung, Herkunft, Namenstag und amtlichen Zahlen und eine App, in der zwei Personen die Namen markieren, die ihnen gefallen, und sehen, bei welchen sie übereinstimmen.',
          'Für die Nutzung der Website gelten die [Nutzungsbedingungen]({termsUrl}), die [Datenschutzerklärung]({privacyUrl}) und die [Cookie-Richtlinie]({cookiesUrl}).',
        ],
      },
      {
        h: 'Geistiges Eigentum',
        p: [
          'Texte, Design, Code, Logo und der Name BabyMatch gehören dem Betreiber. Die Zahlen zur Häufigkeit der einzelnen Namen stammen von öffentlichen Statistikämtern, die auf der jeweiligen Seite genannt werden, und behalten ihre eigene Lizenz.',
          'Du darfst die Inhalte zitieren und verlinken, wenn du die Quelle nennst. Die Website massenhaft zu kopieren oder gewerblich weiterzuverwenden, ist ohne schriftliche Erlaubnis nicht gestattet.',
        ],
      },
      {
        h: 'Haftung',
        p: [
          'Die Angaben zu den Namen dienen der Orientierung. Sie werden sorgfältig geprüft, können aber Fehler enthalten. Sie ersetzen nicht, was das Standesamt in deinem Land dazu sagt, welche Namen eingetragen werden können.',
          'Die Website verlinkt auf Seiten Dritter. Der Betreiber haftet weder für deren Inhalte noch dafür, wie sie mit deinen Daten umgehen.',
        ],
      },
      {
        h: 'Anwendbares Recht',
        p: ['Für diese Website gilt spanisches Recht. Wenn du Verbraucher bist, sind für Streitigkeiten die Gerichte an deinem Wohnsitz zuständig.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Verantwortlicher für deine Daten',
        p: ['Verantwortlicher ist {name}, Betreiber von BabyMatch. Die vollständigen Angaben stehen im [Impressum]({noticeUrl}). Bei allem, was deine Daten betrifft, schreib an {email}.'],
      },
      {
        h: 'Wofür die Daten genutzt werden und auf welcher Rechtsgrundlage',
        p: [
          [
            'Deine Liste speichern, sie mit der deines Partners verbinden und die Abstimmungen verwalten, die du startest: Das ist der Dienst, den du mit der Nutzung der App anforderst (Art. 6 Abs. 1 Buchst. b DSGVO).',
            'Dir E-Mails zu deiner Liste schicken, nur wenn du deine Adresse angibst: deine Einwilligung, die du jederzeit widerrufen kannst (Art. 6 Abs. 1 Buchst. a).',
            'Besuche und Nutzung anonym zählen und die Website vor Missbrauch schützen: berechtigtes Interesse daran, zu wissen, ob die Website funktioniert, und sie sicher zu halten (Art. 6 Abs. 1 Buchst. f).',
            'Google Analytics, nur wenn du zustimmst: deine Einwilligung (Art. 6 Abs. 1 Buchst. a).',
          ],
          'Es werden keine automatisierten Entscheidungen über dich getroffen und keine Profile erstellt.',
        ],
      },
      {
        h: 'Wer sonst noch beteiligt ist',
        p: [
          [
            'Cloudflare, Inc. hostet die Website und die Datenbank und schützt sie vor Angriffen. Dafür verarbeitet Cloudflare die IP-Adresse jedes Besuchs.',
            'Resend, Inc. verschickt die E-Mails, wenn du deine Adresse angibst.',
            'Google Ireland Ltd. stellt Google Analytics bereit, wenn du zustimmst.',
          ],
          'Cloudflare und Resend haben ihren Sitz in den USA. Die Übermittlungen stützen sich auf den EU-US-Datenschutzrahmen oder, falls dieser nicht greift, auf die Standardvertragsklauseln der Europäischen Kommission. Deine Daten werden nicht verkauft und an niemanden sonst weitergegeben.',
        ],
      },
      {
        h: 'Wie lange sie gespeichert werden',
        p: [
          'Deine Liste bleibt gespeichert, bis du sie mit „Alles löschen“ löschst. Solange es sie gibt, bewahrt die Sicherungskopie frühere Versionen höchstens 30 Tage auf. Links, die per E-Mail verschickt werden, laufen nach zwei Tagen ab. Die Cookies von Google Analytics halten bis zu zwei Jahre oder bis du sie löschst.',
        ],
      },
      {
        h: 'Deine Rechte',
        p: [
          'Du kannst Auskunft über deine Daten verlangen, sie berichtigen oder löschen lassen, ihrer Nutzung widersprechen, sie einschränken oder die Daten in einem lesbaren Format mitnehmen. Schreib an {email}. Da BabyMatch keine Anmeldung verlangt, kann der Link zu deiner Liste nötig sein, um zu erkennen, welche deine ist.',
          'Wenn du meinst, dass mit deinen Daten nicht richtig umgegangen wurde, kannst du dich bei der [spanischen Datenschutzbehörde (AEPD)](https://www.aepd.es) oder bei der Behörde in deinem Land beschweren.',
        ],
      },
      {
        h: 'Minderjährige',
        p: ['BabyMatch ist für Erwachsene gedacht. Daten von Minderjährigen werden nicht wissentlich erhoben.'],
      },
      {
        h: 'Änderungen',
        p: ['Wenn sich diese Erklärung ändert, wird die neue Fassung mit Datum auf dieser Seite veröffentlicht.'],
      },
    ],
  },

  cookies: {
    title: 'Cookie-Richtlinie',
    desc: 'Welche Cookies BabyMatch verwendet, wozu sie dienen und wie du deine Auswahl änderst.',
    lead: 'BabyMatch verwendet nur sehr wenige Cookies und keine für Werbung.',
    change: 'Meine Analyse-Auswahl ändern',
    sections: [
      {
        h: 'Was ein Cookie ist',
        p: ['Eine kleine Datei, die eine Website in deinem Browser speichert, um ihn später wiederzuerkennen. Der lokale Speicher des Browsers erfüllt einen ähnlichen Zweck und wird hier genauso erklärt.'],
      },
      {
        h: 'Eigene Cookies, notwendig',
        p: [
          'Sie werden erst angelegt, wenn du die App zu nutzen beginnst. Ohne sie lässt sich deine Liste nicht speichern, deshalb ist keine Einwilligung nötig.',
          [
            'bm_s: speichert den Schlüssel, an dem der Server deine Liste erkennt. Hält 400 Tage ab deinem letzten Besuch.',
            'bm_u: zeigt der App, dass in diesem Browser schon eine Liste gespeichert ist. Hält 400 Tage.',
          ],
        ],
      },
      {
        h: 'Lokaler Speicher',
        p: [
          'In deinem Browser liegen außerdem unter Namen, die mit „babymatch:“ beginnen, deine Namensliste, deine Analyse-Auswahl und, wenn du bei der Abstimmung einer anderen Person mitstimmst, eine zufällige Kennung und der Vorname, den du angegeben hast. Sie bleiben dort, bis du sie löschst.',
        ],
      },
      {
        h: 'Mess-Cookies, nur wenn du zustimmst',
        p: [
          'Wenn du dem Hinweis zustimmst, wird Google Analytics von Google Ireland Ltd. geladen, um zu sehen, wie viele Menschen die Website besuchen und welche Seiten sie lesen. Es setzt die Cookies _ga und _ga_RYQMVXMSTY, die bis zu zwei Jahre halten. Wenn du ablehnst, wird nichts von Google abgerufen und keines dieser Cookies gesetzt.',
        ],
      },
      {
        h: 'Was es hier nicht gibt',
        p: ['Es gibt keine Werbe-Cookies und keine Social-Media-Pixel, und deine Aktivität auf anderen Websites wird nicht verfolgt.'],
      },
      {
        h: 'So änderst du deine Auswahl',
        p: [
          'Du kannst die Analyse jederzeit mit dem Button unten akzeptieren oder ablehnen. Die eigenen Cookies löschst du in den Einstellungen deines Browsers oder mit „Alles löschen“ im App-Menü, das auch deine Liste löscht. Mehr dazu in der [Datenschutzerklärung]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Nutzungsbedingungen',
    desc: 'Die Regeln für die Nutzung von BabyMatch: was es bietet, was du erwarten kannst und was nicht.',
    lead: 'Mit der Nutzung von babymatch.app akzeptierst du diese Bedingungen. Es sind wenige, und sie sind so geschrieben, dass man sie versteht.',
    sections: [
      {
        h: 'Wer den Dienst anbietet',
        p: ['BabyMatch wird von {name} angeboten. Die Angaben stehen im [Impressum]({noticeUrl}).'],
      },
      {
        h: 'Der Dienst',
        p: [
          'BabyMatch ist kostenlos und verlangt keine Anmeldung. Deine Liste wird in deinem Browser gespeichert und als Kopie auf dem Server, damit du sie nicht verlierst.',
          'Die Website kann Funktionen ändern, hinzufügen oder entfernen. Sollte eine davon künftig kostenpflichtig werden, wird das klar angezeigt, bevor du etwas bezahlst.',
        ],
      },
      {
        h: 'Deine Liste und deine Links',
        p: [
          'Der Link, mit dem du deinen Partner einlädst, verbindet eure beiden Listen, und über den Link zu einer Abstimmung kann jeder abstimmen, der ihn öffnet. Du entscheidest, wem du sie schickst. Mit „Alles löschen“ löschst du deine Liste und deine Abstimmungen endgültig.',
        ],
      },
      {
        h: 'Faire Nutzung',
        p: [
          [
            'Versuche nicht, auf Listen oder Abstimmungen anderer Personen zuzugreifen.',
            'Lade die Website nicht massenhaft herunter und überlaste sie nicht mit automatischen Anfragen.',
            'Schreib keine beleidigenden oder rechtswidrigen Inhalte in Textfelder, etwa in den Namen, unter dem du abstimmst.',
          ],
          'Bei Verstößen gegen diese Regeln kann der Zugang gesperrt oder der Inhalt gelöscht werden.',
        ],
      },
      {
        h: 'Die Angaben zu den Namen',
        p: [
          'Bedeutungen, Herkunft, Namenstage und Zahlen dienen der Orientierung und können Fehler enthalten. Bevor du einen Namen eintragen lässt, prüfe die Regeln des Standesamts in deinem Land.',
        ],
      },
      {
        h: 'Links und Empfehlungen',
        p: [
          'Die Website kann auf Websites und Produkte Dritter verlinken. Manche Links können Affiliate-Links sein: Wenn du darüber etwas kaufst, erhält BabyMatch eine Provision, ohne dass dir Kosten entstehen. In diesem Fall wird das neben dem Link angegeben.',
        ],
      },
      {
        h: 'Haftung',
        p: [
          'Der Dienst wird so angeboten, wie er ist. Es wird alles getan, damit er immer läuft und keine Liste verloren geht, aber es wird nicht garantiert, dass er jederzeit verfügbar oder fehlerfrei ist. Nichts davon schränkt die Rechte ein, die dir das Gesetz als Verbraucher gibt.',
        ],
      },
      {
        h: 'Änderungen und anwendbares Recht',
        p: [
          'Diese Bedingungen können aktualisiert werden; es gilt die Fassung, die auf dieser Seite veröffentlicht ist. Für sie gilt spanisches Recht. Wenn du Verbraucher bist, sind für Streitigkeiten die Gerichte an deinem Wohnsitz zuständig.',
        ],
      },
    ],
  },
}

export default legal
