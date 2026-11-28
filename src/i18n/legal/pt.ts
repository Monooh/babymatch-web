import type { Legal } from './index'

const legal: Legal = {
  updated: 'Última atualização: {date}',

  notice: {
    title: 'Aviso legal',
    desc: 'Quem está por trás do BabyMatch e as condições legais do site.',
    lead: 'Quem responde por este site e com quais regras ele funciona.',
    sections: [
      {
        h: 'Titular do site',
        p: [
          'Como exige o artigo 10 da lei espanhola 34/2002, sobre serviços da sociedade da informação e comércio eletrônico, estes são os dados de quem mantém o babymatch.app:',
          ['Titular: {name}, trabalhador autônomo', 'Número fiscal espanhol (NIF): {nif}', 'Endereço: {address}', 'Contato: {email}'],
        ],
      },
      {
        h: 'O que é o BabyMatch',
        p: [
          'O BabyMatch é um site gratuito para escolher o nome do bebê. Reúne páginas de nomes com significado, origem, dia do santo e números oficiais, e um app em que duas pessoas marcam os nomes que curtem e veem quais têm em comum.',
          'O uso do site segue os [termos de uso]({termsUrl}), a [política de privacidade]({privacyUrl}) e a [política de cookies]({cookiesUrl}).',
        ],
      },
      {
        h: 'Propriedade intelectual',
        p: [
          'Os textos, o design, o código, o logotipo e o nome BabyMatch pertencem ao titular. Os números de uso de cada nome vêm de órgãos públicos de estatística, citados na página em que aparecem, e mantêm sua própria licença.',
          'Você pode citar o conteúdo e colocar links para ele indicando a fonte. Não é permitido copiar o site em massa nem reutilizá-lo para fins comerciais sem autorização por escrito.',
        ],
      },
      {
        h: 'Responsabilidade',
        p: [
          'As informações sobre nomes servem como orientação. São revisadas com cuidado, mas podem conter erros e não substituem o que o registro civil do seu país diz sobre quais nomes podem ser registrados.',
          'O site tem links para páginas de terceiros. O titular não responde pelo conteúdo delas nem pela forma como tratam seus dados.',
        ],
      },
      {
        h: 'Lei aplicável',
        p: ['Este site é regido pela lei espanhola. Se você é consumidor, qualquer divergência será resolvida nos tribunais do lugar onde você mora.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Quem é responsável pelos seus dados',
        p: ['O controlador dos dados é {name}, titular do BabyMatch. Os dados completos dele estão no [aviso legal]({noticeUrl}). Para qualquer assunto relacionado aos seus dados, escreva para {email}.'],
      },
      {
        h: 'Para que os dados são usados e com que base legal',
        p: [
          [
            'Salvar sua lista, uni-la à do seu parceiro e gerenciar as votações que você abrir: é o serviço que você pede ao usar o app, conforme o artigo 6.1.b do RGPD (Regulamento Geral sobre a Proteção de Dados da União Europeia).',
            'Enviar e-mails sobre sua lista, só se você informar seu endereço: seu consentimento, que você pode retirar quando quiser (artigo 6.1.a).',
            'Contar visitas e uso de forma anônima e proteger o site contra abusos: interesse legítimo em saber se o site funciona e em mantê-lo seguro (artigo 6.1.f).',
            'Google Analytics, só se você aceitar: seu consentimento (artigo 6.1.a).',
          ],
          'Nenhuma decisão automatizada é tomada sobre você, e não são criados perfis.',
        ],
      },
      {
        h: 'Quem mais participa',
        p: [
          [
            'A Cloudflare, Inc. hospeda o site e o banco de dados e os protege contra ataques. Para isso, processa o endereço IP de cada visita.',
            'A Resend, Inc. envia os e-mails, se você informar seu endereço.',
            'A Stripe Payments Europe, Ltd. processa o pagamento do Premium, se você comprar. Ela recebe seus dados de pagamento; o BabyMatch não os vê nem os guarda: mantém apenas a confirmação do pagamento e o e-mail que você informa ao pagar, para devolver seu acesso.',
            'A Google Ireland Ltd. fornece o Google Analytics, se você aceitar.',
          ],
          'A Cloudflare e a Resend têm sede nos Estados Unidos. As transferências se apoiam no Marco de Privacidade de Dados UE-EUA ou, na falta dele, nas cláusulas contratuais padrão da Comissão Europeia. Seus dados não são vendidos nem repassados a mais ninguém.',
        ],
      },
      {
        h: 'Por quanto tempo ficam guardados',
        p: [
          'Sua lista fica guardada até você apagá-la com «Apagar tudo». Enquanto ela existir, a cópia de segurança conserva versões anteriores por no máximo 30 dias. Os links enviados por e-mail expiram em dois dias. Os cookies do Google Analytics duram até dois anos, ou até você apagá-los.',
        ],
      },
      {
        h: 'Seus direitos',
        p: [
          'Você pode pedir acesso aos seus dados, pedir que sejam corrigidos ou apagados, se opor ao uso deles, limitar esse uso ou levá-los com você em um formato legível. Escreva para {email}. Como o BabyMatch não pede cadastro, pode ser necessário o link da sua lista para saber qual é a sua.',
          'Se você achar que seus dados não foram bem tratados, pode reclamar à [Agência Espanhola de Proteção de Dados](https://www.aepd.es) ou à autoridade do seu país.',
        ],
      },
      {
        h: 'Menores',
        p: ['O BabyMatch é pensado para adultos. Dados de menores não são coletados de forma consciente.'],
      },
      {
        h: 'Mudanças',
        p: ['Se esta política mudar, a nova versão será publicada nesta página com a data.'],
      },
    ],
  },

  cookies: {
    title: 'Política de cookies',
    desc: 'Quais cookies o BabyMatch usa, para que servem e como mudar sua escolha.',
    lead: 'O BabyMatch usa pouquíssimos cookies, e nenhum de publicidade.',
    change: 'Mudar minha escolha sobre a análise',
    sections: [
      {
        h: 'O que é um cookie',
        p: ['É um pequeno arquivo que um site guarda no seu navegador para reconhecê-lo mais tarde. O armazenamento local do navegador cumpre uma função parecida e é explicado aqui da mesma forma.'],
      },
      {
        h: 'Cookies próprios, necessários',
        p: [
          'Só são criados quando você começa a usar o app. Sem eles não dá para salvar sua lista, por isso não pedem consentimento.',
          [
            'bm_s: guarda a chave que reconhece sua lista no servidor. Dura 400 dias a partir da sua última visita.',
            'bm_u: indica ao app que este navegador já tem uma lista salva. Dura 400 dias.',
          ],
        ],
      },
      {
        h: 'Armazenamento local',
        p: [
          'No seu navegador também ficam guardados, com nomes que começam por «babymatch:», sua lista de nomes, sua escolha sobre a análise e, se você votar na votação de outra pessoa, um identificador aleatório e o primeiro nome que você tiver informado. Ficam ali até você apagá-los.',
        ],
      },
      {
        h: 'Cookies de medição, só se você aceitar',
        p: [
          'Se você aceitar o aviso, o Google Analytics, da Google Ireland Ltd., é carregado para saber quantas pessoas visitam o site e quais páginas leem. Ele guarda os cookies _ga e _ga_RYQMVXMSTY, que duram até dois anos. Se você recusar, nada é pedido ao Google e nenhum desses cookies é guardado.',
        ],
      },
      {
        h: 'O que não existe aqui',
        p: ['Não há cookies de publicidade nem pixels de redes sociais, e sua atividade em outros sites não é rastreada.'],
      },
      {
        h: 'Como mudar sua escolha',
        p: [
          'Você pode aceitar ou recusar a análise quando quiser com o botão abaixo. Os cookies próprios podem ser apagados nas configurações do seu navegador ou com «Apagar tudo» no menu do app, que elimina também sua lista. Mais detalhes na [política de privacidade]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Termos de uso',
    desc: 'As regras para usar o BabyMatch: o que ele oferece, o que você pode esperar e o que não pode.',
    lead: 'Ao usar o babymatch.app, você aceita estes termos. São poucos e foram escritos para serem entendidos.',
    sections: [
      {
        h: 'Quem presta o serviço',
        p: ['O BabyMatch é oferecido por {name}. Os dados dele estão no [aviso legal]({noticeUrl}).'],
      },
      {
        h: 'O serviço',
        p: [
          'O BabyMatch pode ser usado de graça e não pede cadastro. Sua lista fica salva no seu navegador e em uma cópia no servidor, para você não perdê-la.',
          'A versão gratuita tem um número limitado de curtidas e de superlikes por dia. O site pode mudar, acrescentar ou retirar funções.',
        ],
      },
      {
        h: 'BabyMatch Premium',
        p: [
          'O Premium tira os limites diários de curtidas e de superlikes. Custa 9,99 € (impostos incluídos) e é pago uma única vez: não é assinatura e não se renova.',
          'Vale para você e para a pessoa com quem você uniu sua lista, enquanto continuarem unidos. Se separarem as listas, o Premium fica com quem pagou.',
          'O pagamento é processado pela Stripe. O acesso é ativado assim que o pagamento é confirmado; ao pagar, você aceita que ele comece na hora e que, depois de ativado, o direito de arrependimento de 14 dias deixa de se aplicar.',
          'Se você pagou e o Premium não aparece ativo, escreva para {email}: resolvemos ou devolvemos o dinheiro.',
        ],
      },
      {
        h: 'Sua lista e seus links',
        p: [
          'O link para convidar seu parceiro une as duas listas de vocês, e o de uma votação deixa votar quem o abrir. Você decide para quem enviar cada um. Com «Apagar tudo», você elimina sua lista e suas votações para sempre.',
        ],
      },
      {
        h: 'Uso correto',
        p: [
          [
            'Não tente acessar listas ou votações de outras pessoas.',
            'Não baixe o site em massa nem o sobrecarregue com requisições automáticas.',
            'Não escreva conteúdo ofensivo ou ilegal nos campos de texto, como o nome com que você vota.',
          ],
          'Se essas regras forem descumpridas, o acesso pode ser bloqueado ou o conteúdo apagado.',
        ],
      },
      {
        h: 'As informações sobre nomes',
        p: [
          'Significados, origens, dias do santo e números são oferecidos como orientação e podem conter erros. Antes de registrar um nome, confira as regras do registro civil do seu país.',
        ],
      },
      {
        h: 'Links e recomendações',
        p: [
          'O site pode ter links para sites e produtos de terceiros. Alguns links podem ser de afiliados: se você comprar por eles, o BabyMatch recebe uma comissão sem custo para você. Quando for o caso, isso será indicado ao lado do link.',
        ],
      },
      {
        h: 'Responsabilidade',
        p: [
          'O serviço é oferecido como está. Tudo é feito para que funcione sempre e para que nenhuma lista se perca, mas não há garantia de que esteja disponível o tempo todo nem livre de erros. Nada disso limita os direitos que a lei garante a você como consumidor.',
        ],
      },
      {
        h: 'Mudanças e lei aplicável',
        p: [
          'Estes termos podem ser atualizados; a versão em vigor é a publicada nesta página. Eles são regidos pela lei espanhola. Se você é consumidor, qualquer divergência será resolvida nos tribunais do lugar onde você mora.',
        ],
      },
    ],
  },
}

export default legal
