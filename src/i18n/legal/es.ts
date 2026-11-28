import type { Legal } from './index'

const legal: Legal = {
  updated: 'Última actualización: {date}',

  notice: {
    title: 'Aviso legal',
    desc: 'Quién está detrás de BabyMatch y las condiciones legales del sitio.',
    lead: 'Quién responde de esta web y bajo qué reglas funciona.',
    sections: [
      {
        h: 'Titular del sitio',
        p: [
          'En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico, se informa de que babymatch.app es un proyecto de:',
          ['Titular: {name}, trabajador autónomo', 'NIF: {nif}', 'Domicilio: {address}', 'Contacto: {email}'],
        ],
      },
      {
        h: 'Qué es BabyMatch',
        p: [
          'BabyMatch es una web gratuita para elegir el nombre de un bebé. Reúne fichas de nombres con su significado, origen, santoral y cifras oficiales, y una app en la que dos personas marcan los nombres que les gustan y ven en cuáles coinciden.',
          'El uso del sitio se rige por las [condiciones de uso]({termsUrl}), la [política de privacidad]({privacyUrl}) y la [política de cookies]({cookiesUrl}).',
        ],
      },
      {
        h: 'Propiedad intelectual',
        p: [
          'Los textos, el diseño, el código, el logotipo y el nombre BabyMatch pertenecen al titular. Las cifras de uso de cada nombre proceden de organismos públicos de estadística, citados en la página donde aparecen, y conservan su propia licencia.',
          'Puedes citar el contenido y enlazarlo indicando la fuente. No está permitido copiar el sitio de forma masiva ni reutilizarlo con fines comerciales sin permiso por escrito.',
        ],
      },
      {
        h: 'Responsabilidad',
        p: [
          'La información sobre nombres es orientativa. Se revisa con cuidado, pero puede contener errores, y no sustituye a lo que diga el registro civil de tu país sobre qué nombres se pueden inscribir.',
          'El sitio enlaza a páginas de terceros. El titular no responde de su contenido ni de cómo tratan tus datos.',
        ],
      },
      {
        h: 'Ley aplicable',
        p: ['Este sitio se rige por la ley española. Si eres consumidor, cualquier desacuerdo se resolverá en los juzgados de tu domicilio.'],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: 'Responsable de tus datos',
        p: ['El responsable es {name}, titular de BabyMatch. Sus datos completos están en el [aviso legal]({noticeUrl}). Para cualquier cosa relacionada con tus datos, escribe a {email}.'],
      },
      {
        h: 'Para qué se usan y con qué base legal',
        p: [
          [
            'Guardar tu lista, unirla a la de tu pareja y gestionar las votaciones que abras: es el servicio que pides al usar la app (artículo 6.1.b del RGPD).',
            'Enviarte correos sobre tu lista, solo si das tu dirección: tu consentimiento, que puedes retirar cuando quieras (artículo 6.1.a).',
            'Contar visitas y uso de forma anónima y proteger la web de abusos: interés legítimo en saber si el sitio funciona y mantenerlo seguro (artículo 6.1.f).',
            'Google Analytics, solo si lo aceptas: tu consentimiento (artículo 6.1.a).',
          ],
          'No se toman decisiones automatizadas sobre ti ni se elaboran perfiles.',
        ],
      },
      {
        h: 'Quién más interviene',
        p: [
          [
            'Cloudflare, Inc. aloja la web y la base de datos, y la protege de ataques. Para ello procesa la dirección IP de cada visita.',
            'Resend, Inc. envía los correos, si das tu dirección.',
            'Stripe Payments Europe, Ltd. cobra el pago de Premium, si lo compras. Recibe tus datos de pago; BabyMatch no los ve ni los guarda: solo conserva la confirmación del pago y el correo que das al pagar, para devolverte el acceso.',
            'Google Ireland Ltd. presta Google Analytics, si lo aceptas.',
          ],
          'Cloudflare y Resend tienen sede en Estados Unidos. Las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o, en su defecto, en las cláusulas contractuales tipo de la Comisión Europea. Tus datos no se venden ni se ceden a nadie más.',
        ],
      },
      {
        h: 'Cuánto tiempo se guardan',
        p: [
          'Tu lista se guarda hasta que la borras con «Borrar todo». Mientras existe, la copia de seguridad conserva versiones anteriores durante 30 días como máximo. Los enlaces que se envían por correo caducan a los dos días. Las cookies de Google Analytics duran hasta dos años, o hasta que las borres.',
        ],
      },
      {
        h: 'Tus derechos',
        p: [
          'Puedes pedir acceso a tus datos, que se corrijan o se borren, oponerte a su uso, limitarlo o llevártelos en un formato legible. Escribe a {email}. Como BabyMatch no obliga a registrarse, puede que haga falta el correo de tu cuenta o el enlace de tu lista para saber cuál es la tuya.',
          'Si crees que tus datos no se han tratado bien, puedes reclamar ante la [Agencia Española de Protección de Datos](https://www.aepd.es) o ante la autoridad de tu país.',
        ],
      },
      {
        h: 'Menores',
        p: ['BabyMatch está pensado para personas adultas. No se recogen a sabiendas datos de menores.'],
      },
      {
        h: 'Cambios',
        p: ['Si esta política cambia, la nueva versión se publicará en esta página con su fecha.'],
      },
    ],
  },

  cookies: {
    title: 'Política de cookies',
    desc: 'Qué cookies usa BabyMatch, para qué sirven y cómo cambiar tu elección.',
    lead: 'BabyMatch usa muy pocas cookies, y ninguna de publicidad.',
    change: 'Cambiar mi elección sobre la analítica',
    sections: [
      {
        h: 'Qué es una cookie',
        p: ['Es un pequeño archivo que una web guarda en tu navegador para reconocerlo más adelante. El almacenamiento local del navegador cumple una función parecida y aquí se explica igual.'],
      },
      {
        h: 'Cookies propias, necesarias',
        p: [
          'Solo se crean cuando empiezas a usar la app. Sin ellas no se puede guardar tu lista, por eso no piden consentimiento.',
          [
            'bm_s: guarda la clave que reconoce tu lista en el servidor. Dura 400 días desde tu última visita.',
            'bm_u: indica a la app que este navegador ya tiene una lista guardada. Dura 400 días.',
          ],
        ],
      },
      {
        h: 'Almacenamiento local',
        p: [
          'En tu navegador se guardan también, con nombres que empiezan por «babymatch:», tu lista de nombres, tu elección sobre la analítica y, si votas en la votación de otra persona, un identificador aleatorio y el nombre de pila que hayas dado. Se quedan ahí hasta que los borras.',
        ],
      },
      {
        h: 'Cookies de medición, solo si aceptas',
        p: [
          'Si aceptas el aviso, se carga Google Analytics, de Google Ireland Ltd., para saber cuánta gente visita la web y qué páginas lee. Guarda las cookies _ga y _ga_RYQMVXMSTY, que duran hasta dos años. Si lo rechazas, no se pide nada a Google ni se guarda ninguna de estas cookies.',
        ],
      },
      {
        h: 'Lo que no hay',
        p: ['No hay cookies de publicidad, ni píxeles de redes sociales, ni se sigue tu actividad en otras webs.'],
      },
      {
        h: 'Cómo cambiar tu elección',
        p: [
          'Puedes aceptar o rechazar la analítica cuando quieras con el botón de abajo. Las cookies propias se borran desde los ajustes de tu navegador o con «Borrar todo» en el menú de la app, que elimina también tu lista. Más detalles en la [política de privacidad]({privacyUrl}).',
        ],
      },
    ],
  },

  terms: {
    title: 'Condiciones de uso',
    desc: 'Las reglas para usar BabyMatch: qué ofrece, qué puedes esperar y qué no.',
    lead: 'Al usar babymatch.app aceptas estas condiciones. Son pocas y están escritas para entenderse.',
    sections: [
      {
        h: 'Quién presta el servicio',
        p: ['BabyMatch lo ofrece {name}. Sus datos están en el [aviso legal]({noticeUrl}).'],
      },
      {
        h: 'El servicio',
        p: [
          'BabyMatch se puede usar gratis y sin registrarse. Tu lista se guarda en tu navegador y en una copia en el servidor para que no la pierdas. Si quieres, puedes crear una cuenta con tu correo, sin contraseña, para abrir tu lista desde cualquier dispositivo.',
          'La versión gratuita tiene un número limitado de «me gusta» y de superlikes al día. El sitio puede cambiar, añadir o retirar funciones.',
        ],
      },
      {
        h: 'BabyMatch Premium',
        p: [
          'Premium quita los límites diarios de «me gusta» y de superlikes. Cuesta 9,99 € (impuestos incluidos) y se paga una sola vez: no es una suscripción y no se renueva.',
          'Vale para ti y para la persona con la que hayas unido tu lista, mientras sigáis unidos. Si separáis las listas, Premium se queda con quien lo pagó.',
          'El pago lo gestiona Stripe. El acceso se activa en cuanto el pago se confirma; al pagar aceptas que empiece de inmediato y que, una vez activado, no se aplica el derecho de desistimiento de 14 días.',
          'Si has pagado y no ves Premium activado, escribe a {email} y lo resolvemos o te devolvemos el dinero.',
        ],
      },
      {
        h: 'Tu lista y tus enlaces',
        p: [
          'El enlace para invitar a tu pareja une vuestras dos listas, y el de una votación deja votar a quien lo abra. Tú decides a quién se los envías. Con «Borrar todo» eliminas tu lista y tus votaciones para siempre.',
        ],
      },
      {
        h: 'Uso correcto',
        p: [
          [
            'No intentes acceder a listas o votaciones de otras personas.',
            'No descargues el sitio de forma masiva ni lo sobrecargues con peticiones automáticas.',
            'No escribas contenido ofensivo o ilegal en los campos de texto, como el nombre con el que votas.',
          ],
          'Si se incumplen estas reglas, se puede bloquear el acceso o borrar el contenido.',
        ],
      },
      {
        h: 'La información sobre nombres',
        p: [
          'Significados, orígenes, santoral y cifras se ofrecen a título orientativo y pueden contener errores. Antes de inscribir un nombre, comprueba las normas del registro civil de tu país.',
        ],
      },
      {
        h: 'Enlaces y recomendaciones',
        p: [
          'El sitio puede enlazar a webs y productos de terceros. Algunos enlaces pueden ser de afiliación: si compras a través de ellos, BabyMatch recibe una comisión sin coste para ti. Cuando sea así, se indicará junto al enlace.',
        ],
      },
      {
        h: 'Responsabilidad',
        p: [
          'El servicio se ofrece tal cual. Se hace lo posible por que funcione siempre y por no perder ninguna lista, pero no se garantiza que esté disponible en todo momento ni libre de errores. Nada de esto limita los derechos que la ley te reconoce como consumidor.',
        ],
      },
      {
        h: 'Cambios y ley aplicable',
        p: [
          'Estas condiciones pueden actualizarse; la versión vigente es la publicada en esta página. Se rigen por la ley española. Si eres consumidor, cualquier desacuerdo se resolverá en los juzgados de tu domicilio.',
        ],
      },
    ],
  },
}

export default legal
