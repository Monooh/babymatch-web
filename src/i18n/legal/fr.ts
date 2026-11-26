import type { Legal } from './index'

const legal: Legal = {
  updated: 'Dernière mise à jour : {date}',

  notice: {
    title: 'Mentions légales',
    desc: 'Qui est derrière BabyMatch et quelles règles légales s’appliquent au site.',
    lead: 'Qui répond de ce site et selon quelles règles il fonctionne.',
    sections: [
      {
        h: 'Éditeur du site',
        p: [
          'Conformément à l’article 10 de la loi espagnole 34/2002 sur les services de la société de l’information et le commerce électronique, babymatch.app est un projet de :',
          ['Éditeur : {name}, travailleur indépendant', 'Numéro d’identification fiscale (NIF) : {nif}', 'Adresse : {address}', 'Contact : {email}'],
        ],
      },
      {
        h: 'Ce qu’est BabyMatch',
        p: [
          'BabyMatch est un site gratuit pour choisir le prénom d’un bébé. Il réunit des fiches de prénoms avec leur sens, leur origine, leur fête et les chiffres officiels, ainsi qu’une appli où deux personnes marquent les prénoms qui leur plaisent et voient ceux qu’elles ont en commun.',
          'L’utilisation du site est régie par les [conditions d’utilisation]({termsUrl}), la [politique de confidentialité]({privacyUrl}) et la [politique de cookies]({cookiesUrl}).',
        ],
      },
      {
        h: 'Propriété intellectuelle',
        p: [
          'Les textes, le design, le code, le logo et le nom BabyMatch appartiennent à l’éditeur. Les chiffres d’attribution de chaque prénom viennent d’organismes publics de statistique, cités sur la page où ils figurent, et gardent leur propre licence.',
          'Tu peux citer le contenu et faire un lien vers lui en indiquant la source. Il est interdit de copier le site en masse ou de le réutiliser à des fins commerciales sans autorisation écrite.',
        ],
      },
      {
        h: 'Responsabilité',
        p: [
          'Les informations sur les prénoms sont données à titre indicatif. Elles sont vérifiées avec soin, mais peuvent contenir des erreurs, et elles ne remplacent pas ce que dit l’état civil de ton pays sur les prénoms qui peuvent être déclarés.',
          'Le site renvoie vers des pages de tiers. L’éditeur ne répond ni de leur contenu ni de la façon dont elles traitent tes données.',
        ],
      },
      {
        h: 'Droit applicable',
        p: ['Ce site est régi par le droit espagnol. Si tu es consommateur, tout litige sera porté devant les tribunaux de ton lieu de résidence.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Responsable du traitement de tes données',
        p: ['Le responsable du traitement est {name}, éditeur de BabyMatch. Ses coordonnées complètes figurent dans les [mentions légales]({noticeUrl}). Pour toute question sur tes données, écris à {email}.'],
      },
      {
        h: 'À quoi servent tes données et sur quelle base légale',
        p: [
          [
            'Enregistrer ta liste, la réunir avec celle de ton ou ta partenaire et gérer les votes que tu ouvres : c’est le service que tu demandes en utilisant l’appli (article 6.1.b du RGPD).',
            'T’envoyer des e-mails au sujet de ta liste, seulement si tu donnes ton adresse : ton consentement, que tu peux retirer à tout moment (article 6.1.a).',
            'Compter les visites et l’utilisation de façon anonyme et protéger le site contre les abus : l’intérêt légitime de savoir si le site fonctionne et de le garder sûr (article 6.1.f).',
            'Google Analytics, seulement si tu l’acceptes : ton consentement (article 6.1.a).',
          ],
          'Aucune décision automatisée n’est prise à ton sujet et aucun profil n’est établi.',
        ],
      },
      {
        h: 'Qui d’autre intervient',
        p: [
          [
            'Cloudflare, Inc. héberge le site et la base de données, et les protège contre les attaques. Pour cela, elle traite l’adresse IP de chaque visite.',
            'Resend, Inc. envoie les e-mails, si tu donnes ton adresse.',
            'Google Ireland Ltd. fournit Google Analytics, si tu l’acceptes.',
          ],
          'Cloudflare et Resend ont leur siège aux États-Unis. Les transferts s’appuient sur le cadre de protection des données UE-États-Unis ou, à défaut, sur les clauses contractuelles types de la Commission européenne. Tes données ne sont ni vendues ni cédées à qui que ce soit d’autre.',
        ],
      },
      {
        h: 'Combien de temps elles sont conservées',
        p: [
          'Ta liste est conservée jusqu’à ce que tu la supprimes avec «Tout effacer». Tant qu’elle existe, la copie de sauvegarde garde les versions précédentes pendant 30 jours au maximum. Les liens envoyés par e-mail expirent au bout de deux jours. Les cookies de Google Analytics durent jusqu’à deux ans, ou jusqu’à ce que tu les supprimes.',
        ],
      },
      {
        h: 'Tes droits',
        p: [
          'Tu peux demander l’accès à tes données, leur rectification ou leur effacement, t’opposer à leur utilisation, la limiter ou récupérer tes données dans un format lisible. Écris à {email}. Comme BabyMatch ne demande pas d’inscription, le lien de ta liste peut être nécessaire pour savoir laquelle est la tienne.',
          'Si tu penses que tes données n’ont pas été traitées correctement, tu peux déposer une réclamation auprès de l’[Agence espagnole de protection des données](https://www.aepd.es) ou de l’autorité de ton pays.',
        ],
      },
      {
        h: 'Mineurs',
        p: ['BabyMatch est conçu pour les adultes. Aucune donnée de mineur n’est collectée sciemment.'],
      },
      {
        h: 'Modifications',
        p: ['Si cette politique change, la nouvelle version sera publiée sur cette page avec sa date.'],
      },
    ],
  },

  cookies: {
    title: 'Politique de cookies',
    desc: 'Quels cookies BabyMatch utilise, à quoi ils servent et comment modifier ton choix.',
    lead: 'BabyMatch utilise très peu de cookies, et aucun cookie publicitaire.',
    change: 'Modifier mon choix pour la mesure d’audience',
    sections: [
      {
        h: 'Ce qu’est un cookie',
        p: ['C’est un petit fichier qu’un site enregistre dans ton navigateur pour le reconnaître plus tard. Le stockage local du navigateur joue un rôle semblable et il est expliqué ici de la même façon.'],
      },
      {
        h: 'Cookies propres au site, nécessaires',
        p: [
          'Ils ne sont créés que lorsque tu commences à utiliser l’appli. Sans eux, ta liste ne peut pas être enregistrée, c’est pourquoi ils ne demandent pas ton consentement.',
          [
            'bm_s : garde la clé qui reconnaît ta liste sur le serveur. Il dure 400 jours à partir de ta dernière visite.',
            'bm_u : indique à l’appli que ce navigateur a déjà une liste enregistrée. Il dure 400 jours.',
          ],
        ],
      },
      {
        h: 'Stockage local',
        p: [
          'Ton navigateur garde aussi, sous des noms qui commencent par «babymatch:», ta liste de prénoms, ton choix pour la mesure d’audience et, si tu votes dans le vote de quelqu’un d’autre, un identifiant aléatoire et le prénom que tu as donné. Ils y restent jusqu’à ce que tu les supprimes.',
        ],
      },
      {
        h: 'Cookies de mesure, seulement si tu acceptes',
        p: [
          'Si tu acceptes le bandeau, Google Analytics, de Google Ireland Ltd., est chargé pour savoir combien de personnes visitent le site et quelles pages elles lisent. Il dépose les cookies _ga et _ga_RYQMVXMSTY, qui durent jusqu’à deux ans. Si tu refuses, rien n’est demandé à Google et aucun de ces cookies n’est déposé.',
        ],
      },
      {
        h: 'Ce qu’il n’y a pas',
        p: ['Il n’y a ni cookies publicitaires ni pixels de réseaux sociaux, et ton activité sur d’autres sites n’est pas suivie.'],
      },
      {
        h: 'Comment modifier ton choix',
        p: [
          'Tu peux accepter ou refuser la mesure d’audience à tout moment avec le bouton ci-dessous. Les cookies propres au site se suppriment depuis les réglages de ton navigateur ou avec «Tout effacer» dans le menu de l’appli, qui supprime aussi ta liste. Plus de détails dans la [politique de confidentialité]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Conditions d’utilisation',
    desc: 'Les règles pour utiliser BabyMatch : ce qu’il propose, ce que tu peux en attendre et ce que tu ne peux pas en attendre.',
    lead: 'En utilisant babymatch.app, tu acceptes ces conditions. Elles sont courtes et écrites pour être comprises.',
    sections: [
      {
        h: 'Qui fournit le service',
        p: ['BabyMatch est proposé par {name}. Ses coordonnées figurent dans les [mentions légales]({noticeUrl}).'],
      },
      {
        h: 'Le service',
        p: [
          'BabyMatch est gratuit et ne demande pas d’inscription. Ta liste est enregistrée dans ton navigateur et dans une copie sur le serveur pour que tu ne la perdes pas.',
          'Le site peut modifier, ajouter ou retirer des fonctions. Si l’une d’elles devient payante un jour, ce sera indiqué clairement avant que tu paies quoi que ce soit.',
        ],
      },
      {
        h: 'Ta liste et tes liens',
        p: [
          'Le lien pour inviter ton ou ta partenaire réunit vos deux listes, et celui d’un vote permet de voter à toute personne qui l’ouvre. C’est toi qui décides à qui tu les envoies. Avec «Tout effacer», tu supprimes ta liste et tes votes pour toujours.',
        ],
      },
      {
        h: 'Bon usage',
        p: [
          [
            'N’essaie pas d’accéder aux listes ou aux votes d’autres personnes.',
            'Ne télécharge pas le site en masse et ne le surcharge pas de requêtes automatiques.',
            'N’écris pas de contenu offensant ou illégal dans les champs de texte, comme le prénom sous lequel tu votes.',
          ],
          'Si ces règles ne sont pas respectées, l’accès peut être bloqué ou le contenu supprimé.',
        ],
      },
      {
        h: 'Les informations sur les prénoms',
        p: [
          'Les sens, les origines, les fêtes et les chiffres sont donnés à titre indicatif et peuvent contenir des erreurs. Avant de déclarer un prénom, vérifie les règles de l’état civil de ton pays.',
        ],
      },
      {
        h: 'Liens et recommandations',
        p: [
          'Le site peut renvoyer vers des sites et des produits de tiers. Certains liens peuvent être des liens d’affiliation : si tu achètes en passant par eux, BabyMatch touche une commission sans frais pour toi. Dans ce cas, ce sera indiqué à côté du lien.',
        ],
      },
      {
        h: 'Responsabilité',
        p: [
          'Le service est fourni tel quel. Tout est fait pour qu’il fonctionne toujours et qu’aucune liste ne se perde, mais rien ne garantit qu’il soit disponible à tout moment ni exempt d’erreurs. Rien de tout cela ne limite les droits que la loi te reconnaît en tant que consommateur.',
        ],
      },
      {
        h: 'Modifications et droit applicable',
        p: [
          'Ces conditions peuvent être mises à jour ; la version en vigueur est celle publiée sur cette page. Elles sont régies par le droit espagnol. Si tu es consommateur, tout litige sera porté devant les tribunaux de ton lieu de résidence.',
        ],
      },
    ],
  },
}

export default legal
