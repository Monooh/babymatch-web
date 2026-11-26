import type { Legal } from './index'

const legal: Legal = {
  updated: 'Ultimo aggiornamento: {date}',

  notice: {
    title: 'Note legali',
    desc: 'Chi c’è dietro BabyMatch e le condizioni legali del sito.',
    lead: 'Chi risponde di questo sito e con quali regole funziona.',
    sections: [
      {
        h: 'Titolare del sito',
        p: [
          'Come richiede l’articolo 10 della legge spagnola 34/2002 sui servizi della società dell’informazione e sul commercio elettronico, ecco chi gestisce babymatch.app:',
          ['Titolare: {name}, lavoratore autonomo', 'Codice fiscale spagnolo (NIF): {nif}', 'Indirizzo: {address}', 'Contatto: {email}'],
        ],
      },
      {
        h: 'Che cos’è BabyMatch',
        p: [
          'BabyMatch è un sito gratuito per scegliere il nome del bebè. Raccoglie schede dei nomi con significato, origine, onomastico e dati ufficiali, e un’app in cui due persone segnano i nomi che preferiscono e scoprono quali hanno in comune.',
          'L’uso del sito è regolato dalle [condizioni d’uso]({termsUrl}), dall’[informativa sulla privacy]({privacyUrl}) e dall’[informativa sui cookie]({cookiesUrl}).',
        ],
      },
      {
        h: 'Proprietà intellettuale',
        p: [
          'I testi, la grafica, il codice, il logo e il nome BabyMatch appartengono al titolare. I dati sulla diffusione di ogni nome provengono da istituti pubblici di statistica, citati nella pagina in cui compaiono, e mantengono la propria licenza.',
          'Puoi citare i contenuti e linkarli indicando la fonte. Non è consentito copiare il sito in blocco né riutilizzarlo a fini commerciali senza un permesso scritto.',
        ],
      },
      {
        h: 'Responsabilità',
        p: [
          'Le informazioni sui nomi sono indicative. Vengono controllate con cura, ma possono contenere errori e non sostituiscono quello che stabilisce l’ufficio di stato civile del tuo paese sui nomi che si possono registrare.',
          'Il sito contiene link a pagine di terzi. Il titolare non risponde dei loro contenuti né di come trattano i tuoi dati.',
        ],
      },
      {
        h: 'Legge applicabile',
        p: ['Questo sito è regolato dalla legge spagnola. Se sei un consumatore, eventuali controversie saranno decise dal tribunale del luogo in cui vivi.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Titolare del trattamento dei tuoi dati',
        p: ['Il titolare del trattamento è {name}, che gestisce BabyMatch. I suoi dati completi sono nelle [note legali]({noticeUrl}). Per qualsiasi cosa che riguardi i tuoi dati, scrivi a {email}.'],
      },
      {
        h: 'A cosa servono i dati e su quale base giuridica',
        p: [
          [
            'Salvare la tua lista, unirla a quella del tuo partner e gestire le votazioni che apri: è il servizio che chiedi quando usi l’app (art. 6, par. 1, lett. b del GDPR).',
            'Mandarti email sulla tua lista, solo se indichi il tuo indirizzo: il tuo consenso, che puoi revocare quando vuoi (art. 6, par. 1, lett. a).',
            'Contare visite e utilizzo in forma anonima e proteggere il sito dagli abusi: l’interesse legittimo a sapere se il sito funziona e a mantenerlo sicuro (art. 6, par. 1, lett. f).',
            'Google Analytics, solo se lo accetti: il tuo consenso (art. 6, par. 1, lett. a).',
          ],
          'Non vengono prese decisioni automatizzate su di te e non viene fatta alcuna profilazione.',
        ],
      },
      {
        h: 'Chi altro interviene',
        p: [
          [
            'Cloudflare, Inc. ospita il sito e il database e li protegge dagli attacchi. Per farlo tratta l’indirizzo IP di ogni visita.',
            'Resend, Inc. invia le email, se indichi il tuo indirizzo.',
            'Google Ireland Ltd. fornisce Google Analytics, se lo accetti.',
          ],
          'Cloudflare e Resend hanno sede negli Stati Uniti. I trasferimenti si basano sul Data Privacy Framework UE-USA o, in mancanza, sulle clausole contrattuali tipo della Commissione europea. I tuoi dati non vengono venduti né ceduti a nessun altro.',
        ],
      },
      {
        h: 'Per quanto tempo vengono conservati',
        p: [
          'La tua lista resta salvata finché non la elimini con «Cancella tutto». Finché esiste, la copia di backup conserva le versioni precedenti per 30 giorni al massimo. I link inviati per email scadono dopo due giorni. I cookie di Google Analytics durano fino a due anni, o finché non li cancelli.',
        ],
      },
      {
        h: 'I tuoi diritti',
        p: [
          'Puoi chiedere di accedere ai tuoi dati, di farli correggere o cancellare, opporti al loro uso, limitarlo o riceverli in un formato leggibile da portare con te. Scrivi a {email}. Dato che BabyMatch non chiede registrazione, può servire il link della tua lista per capire qual è la tua.',
          'Se pensi che i tuoi dati non siano stati trattati correttamente, puoi presentare un reclamo all’[Agenzia spagnola per la protezione dei dati](https://www.aepd.es) o all’autorità del tuo paese.',
        ],
      },
      {
        h: 'Minori',
        p: ['BabyMatch è pensato per persone adulte. Non vengono raccolti consapevolmente dati di minori.'],
      },
      {
        h: 'Modifiche',
        p: ['Se questa informativa cambia, la nuova versione sarà pubblicata su questa pagina con la sua data.'],
      },
    ],
  },

  cookies: {
    title: 'Informativa sui cookie',
    desc: 'Quali cookie usa BabyMatch, a cosa servono e come cambiare la tua scelta.',
    lead: 'BabyMatch usa pochissimi cookie, e nessuno pubblicitario.',
    change: 'Cambia la mia scelta sulle statistiche',
    sections: [
      {
        h: 'Che cos’è un cookie',
        p: ['È un piccolo file che un sito salva nel tuo browser per riconoscerlo in seguito. L’archiviazione locale del browser ha una funzione simile e qui viene spiegata allo stesso modo.'],
      },
      {
        h: 'Cookie propri, necessari',
        p: [
          'Vengono creati solo quando inizi a usare l’app. Senza di loro non è possibile salvare la tua lista, per questo non richiedono il consenso.',
          [
            'bm_s: conserva la chiave che riconosce la tua lista sul server. Dura 400 giorni dalla tua ultima visita.',
            'bm_u: indica all’app che questo browser ha già una lista salvata. Dura 400 giorni.',
          ],
        ],
      },
      {
        h: 'Archiviazione locale',
        p: [
          'Nel tuo browser vengono salvati anche, con nomi che iniziano per «babymatch:», la tua lista di nomi, la tua scelta sulle statistiche e, se voti nella votazione di un’altra persona, un identificativo casuale e il nome che hai indicato. Restano lì finché non li cancelli.',
        ],
      },
      {
        h: 'Cookie di misurazione, solo se accetti',
        p: [
          'Se accetti l’avviso, viene caricato Google Analytics, di Google Ireland Ltd., per sapere quante persone visitano il sito e quali pagine leggono. Salva i cookie _ga e _ga_RYQMVXMSTY, che durano fino a due anni. Se rifiuti, a Google non viene chiesto nulla e nessuno di questi cookie viene salvato.',
        ],
      },
      {
        h: 'Quello che non c’è',
        p: ['Non ci sono cookie pubblicitari né pixel dei social network, e la tua attività su altri siti non viene tracciata.'],
      },
      {
        h: 'Come cambiare la tua scelta',
        p: [
          'Puoi accettare o rifiutare le statistiche quando vuoi con il pulsante qui sotto. I cookie propri si cancellano dalle impostazioni del tuo browser o con «Cancella tutto» nel menu dell’app, che elimina anche la tua lista. Maggiori dettagli nell’[informativa sulla privacy]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Condizioni d’uso',
    desc: 'Le regole per usare BabyMatch: che cosa offre, che cosa puoi aspettarti e che cosa no.',
    lead: 'Usando babymatch.app accetti queste condizioni. Sono poche e scritte per essere capite.',
    sections: [
      {
        h: 'Chi fornisce il servizio',
        p: ['BabyMatch è offerto da {name}. I suoi dati sono nelle [note legali]({noticeUrl}).'],
      },
      {
        h: 'Il servizio',
        p: [
          'BabyMatch è gratuito e non chiede registrazione. La tua lista viene salvata nel tuo browser e in una copia sul server, così non la perdi.',
          'Il sito può cambiare, aggiungere o togliere funzioni. Se in futuro qualcuna diventerà a pagamento, sarà indicato chiaramente prima che tu paghi qualcosa.',
        ],
      },
      {
        h: 'La tua lista e i tuoi link',
        p: [
          'Il link per invitare il tuo partner unisce le vostre due liste, e quello di una votazione permette di votare a chiunque lo apra. Sei tu a decidere a chi mandarli. Con «Cancella tutto» elimini per sempre la tua lista e le tue votazioni.',
        ],
      },
      {
        h: 'Uso corretto',
        p: [
          [
            'Non cercare di accedere alle liste o alle votazioni di altre persone.',
            'Non scaricare il sito in blocco e non sovraccaricarlo con richieste automatiche.',
            'Non scrivere contenuti offensivi o illegali nei campi di testo, come il nome con cui voti.',
          ],
          'Se queste regole non vengono rispettate, l’accesso può essere bloccato o il contenuto eliminato.',
        ],
      },
      {
        h: 'Le informazioni sui nomi',
        p: [
          'Significati, origini, onomastici e dati sono forniti a titolo indicativo e possono contenere errori. Prima di registrare un nome, controlla le regole dell’ufficio di stato civile del tuo paese.',
        ],
      },
      {
        h: 'Link e consigli',
        p: [
          'Il sito può contenere link a siti e prodotti di terzi. Alcuni link possono essere di affiliazione: se compri passando da lì, BabyMatch riceve una commissione senza costi per te. In quel caso sarà indicato accanto al link.',
        ],
      },
      {
        h: 'Responsabilità',
        p: [
          'Il servizio è offerto così com’è. Si fa il possibile perché funzioni sempre e perché nessuna lista vada persa, ma non si garantisce che sia disponibile in ogni momento né privo di errori. Niente di tutto questo limita i diritti che la legge ti riconosce come consumatore.',
        ],
      },
      {
        h: 'Modifiche e legge applicabile',
        p: [
          'Queste condizioni possono essere aggiornate; la versione in vigore è quella pubblicata su questa pagina. Sono regolate dalla legge spagnola. Se sei un consumatore, eventuali controversie saranno decise dal tribunale del luogo in cui vivi.',
        ],
      },
    ],
  },
}

export default legal
