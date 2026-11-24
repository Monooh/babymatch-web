# BabyMatch

Web y web app para elegir el nombre del bebé deslizando tarjetas, en seis idiomas (es, en, fr, de, it, pt).
Todo vive en este proyecto Next.js: la web de SEO y la app comparten datos, diseño y traducciones.

## Qué hay

| Ruta | Qué es |
| --- | --- |
| `/{idioma}` | Home con la baraja real en el hero |
| `/{idioma}/app` | La app: cuestionario, swipe, filtros, listas, favoritos y match con la pareja |
| `/{idioma}/nombres/{nombre}` | Ficha de cada nombre (significado, origen, parecidos). El segmento se traduce: `names`, `prenoms`, `vornamen`, `nomi`, `nomes` |
| `/{idioma}/listas/{lista}` | Listas por origen, estilo, inicial, longitud y popularidad, con slug traducido |
| `/sitemap/{idioma}.xml`, `/robots.txt` | Sitemaps con hreflang por idioma |

`/` redirige al idioma del navegador. Las URLs de la primera versión (`/nombres/...`, `/app`) redirigen a `/es/...`.
Ambas cosas las hace Cloudflare (ver «Despliegue»).

## Sin registro, con copia en el servidor

No hay cuentas, correo ni contraseña, pero las listas ya no viven solo en el navegador.

- **El móvil es la copia de trabajo.** Cada deslizamiento se guarda primero en `localStorage` (`src/lib/store.ts`)
  y se envía un segundo después. Sin conexión todo sigue funcionando y se envía al volver.
- **El servidor es la red de seguridad y el punto de encuentro de la pareja** (`cloudflare/api/worker.js`, un Worker
  con una base D1, en `babymatch.app/api/*`). La primera vez que un dispositivo guarda un nombre recibe una persona
  y un secreto; el secreto va en una cookie `HttpOnly` (los navegadores la conservan aunque borren el almacenamiento
  local, que es lo que hace Safari tras 7 días sin visitas) y la app guarda otra copia.
- **Una lista es un mapa `{id del nombre: [respuesta, hora]}`** (0 no, 1 me gusta, 2 superlike, 3 retirado) que se
  fusiona entrada a entrada, gana la más reciente. Fusionar dos veces da lo mismo, así que una petición repetida,
  tardía o simultánea desde otro dispositivo nunca borra un nombre. `src/lib/sync.ts` es el motor del cliente.
- **Pareja**: un enlace con un código (`#j=…`). Quien lo abre queda unido y, desde entonces, cada uno recibe los
  «me gusta» del otro al sincronizar (cada 20 s con la app abierta). Si el enlace ya unió a dos personas, pregunta
  «¿eres tú?» y devuelve su lista: es la vía de recuperación cuando alguien lo ha perdido todo.
- **Otro móvil**: el menú crea un enlace personal (`#k=…`) que abre la misma lista en otro dispositivo.
- **Borrar todo** elimina la persona del servidor y del móvil, sus votaciones y, en la siguiente pasada, su copia
  de seguridad.
- **La ronda final** (`src/components/app/Final.tsx`, `src/lib/final.ts`): de los nombres en común a uno solo.
  Duelos de dos en dos (cada nombre lleva una puntuación tipo Elo por persona; el orden de la pareja es la suma),
  los cinco finalistas junto a los apellidos, con «Escuchar» y avisos de rima, y «Es este»: cuando los dos marcan
  el mismo, ya tienen nombre. Los duelos viajan como un bloque por persona (`users.final`), gana el más reciente.
- **Votación de familia y amigos**: la pareja abre una votación con sus finalistas y comparte un enlace
  (`/<idioma>/vote#v=…`, `src/components/VotePage.tsx`). Se vota sin cuenta, un voto por navegador; quien vota ve
  el recuento solo después de votar y la pareja ve además quién votó qué. La página invita a probar la app: es la
  segunda vía por la que entra gente nueva, después de la invitación a la pareja.
- **Correo opcional** (`cloudflare/api/mail.js`): guarda la lista con una dirección, envía el enlace que la abre en
  cualquier móvil y avisa cuando la pareja se une o hay matches nuevos (uno al día como mucho, y solo si la persona
  no está usando la app). Está apagado hasta que el Worker tenga con qué enviar: la vinculación `send_email` de
  Cloudflare (plan Workers Paid) o un secreto `RESEND_API_KEY`. Sin ninguno de los dos, la app no muestra nada de
  correo.
- **Copia de seguridad** (`cloudflare/api/backup.js`): cada 20 minutos el Worker copia a una segunda base D1
  (`babymatch-backup`) las personas que han cambiado, y guarda cómo estaba cada una al final de cada día durante
  30 días. `npm run backup` dice cómo va; `npm run backup -- restore <id> [día]` devuelve una persona y
  `npm run backup -- restore-all` repone todo lo que falte. La copia vive en la misma cuenta de Cloudflare: protege
  de errores y borrados, no de perder la cuenta.
- **Vigilancia** (`.github/workflows/monitor.yml`): cada 15 minutos comprueba la web, la API y `/api/health` (base
  de datos y antigüedad de la copia). Si falla dos veces seguidas, GitHub avisa por correo.
- Los enlaces antiguos (`#p=…`, la lista entera dentro del enlace, `src/lib/share.ts`) se siguen abriendo.
- Para cobrar más adelante: `users.plan` y `users.email` ya existen; el servidor media todo lo que ve la pareja,
  así que un límite de pago se aplica ahí, no en el cliente.

Probarlo en local: `wrangler dev` en `cloudflare/api` (puerto 8787) y `npm run dev -- --port 3210`; después
`npm run test:api` (comprobaciones del servidor, incluidos correo y copia de seguridad en local), `npm run test:app`
(dos móviles simulados de principio a fin) y `npm run test:final` (ronda final, votación y correo en cuatro móviles).
Cómo se usa la app, en cifras: `npm run stats` y `docs/medicion.md`.

## La base de nombres

- `data/raw/*.txt`: una línea por nombre, con el significado en los seis idiomas. El formato está en `data/BRIEF.md`.
- `npm run data` (o `npm run build`, que lo ejecuta antes) fusiona duplicados y genera:
  - `src/data/master.json`: todos los nombres con todos los idiomas (solo servidor).
  - `public/data/names.{idioma}.json`: filas compactas para la app.
  - `data/ids.json`: id numérico estable de cada nombre. No lo borres: los enlaces de pareja dependen de él.
- Para añadir nombres, crea más ficheros en `data/raw/` con el mismo formato y vuelve a ejecutar `npm run data`.
- Los significados se generaron con IA a partir de la etimología más aceptada; conviene revisar los nombres
  más visitados.

Las listas no se guardan: se calculan a partir de una clave (`c:basque:f`, `t:biblical`, `l:a:m`…) en
`src/lib/model.ts`, y su título y slug se componen por idioma en `src/i18n/taxonomy.ts`.

## Datos del mundo real

Dos fuentes dan a cada ficha y a cada lista algo que no tiene ninguna otra página:

- **Personas conocidas (Wikidata, licencia CC0).** `npm run people` descarga, para cada nombre, las personas con
  artículo en Wikipedia que se llaman así (`data/people.json`). Tarda horas, se puede cortar y retomar, y empieza
  por los nombres más populares. `npm run people creators` descarga los youtubers, tiktokers, influencers,
  cantantes, actores, futbolistas y modelos más conocidos con su nombre de pila (`data/creators.json`): de ahí
  salen las listas «Nombres de youtubers», etc. Para dejar fuera a alguien, añade su nombre en inglés a
  `data/people-exclude.json`.
- **Rankings de recién nacidos por país.** `data/official/{idioma}.json` guarda el último ranking publicado y el
  del año anterior: INE (España), SSA (Estados Unidos), INSEE (Francia), ISTAT (Italia), GfdS (Alemania, solo los
  10 primeros) e IRN (Portugal, 10 primeros, cifras provisionales de prensa). De ahí salen las listas «populares
  en {año}» (el ranking tal cual) y «tendencia en {año siguiente}» (los que más puestos suben), y el puesto de
  cada nombre en su ficha. Hay que actualizarlos a mano cuando cada organismo publique el año nuevo.

El año de los títulos es el del día en que se construye el sitio, así que esas direcciones cambian cada enero.

### Cifras oficiales, santoral y nombres que combinan

- `npm run` no los lanza: son descargas puntuales. `node scripts/fetch-stats.mjs [es|en|fr|it]` escribe
  `data/stats/<idioma>.json` con cifras de los institutos de estadística (INE: personas, edad media, provincias y
  décadas; INSEE e ISTAT: nacimientos por año; SSA: hay que bajar el zip a mano, lo explica el script).
  `src/lib/stats.ts` las lee al construir y la ficha las muestra en «{nombre} en cifras».
- `node scripts/fetch-saints.mjs` escribe `data/saints.json` (Wikidata): el santo de cada nombre. Sale en la ficha
  («Santo de {nombre}») y en el calendario por meses (`/es/santoral`, `/en/name-days`…, `src/lib/saints.ts`).
  `data/saints-fixes.json` corrige a mano las pocas fechas que Wikidata trae mal (San José, San Pablo…).
- `node scripts/fetch-characters.mjs` escribe `data/characters.json` (Wikidata): personajes de 16 sagas y series
  cuyo nombre está en la base. Cada una es una lista («Nombres de personajes de Harry Potter»); para añadir otra,
  quita `list: false` en el script y añade su clave a `FICTION` (`src/lib/model.ts` y `scripts/build-data.mjs`)
  y su título a `FAME_MOD` (`src/i18n/taxonomy.ts`).
- Los nombres de hermanos y los segundos nombres de cada ficha no vienen de ninguna fuente: se calculan en
  `src/lib/names.ts` (`siblingNames`, `middleNames`) con el estilo, el origen, la popularidad y la sonoridad.

## Capturas de la app

Las imágenes y los clips de la portada, las fichas y las listas son la app de verdad, capturada en cada idioma:
`npm run shots` abre la app publicada en un Chrome sin interfaz, la maneja como lo haría una persona (preguntas,
deslizar, filtros, listas, favoritos, invitación y match) y guarda en `public/shots/{idioma}/` ocho pantallas en
WebP y dos clips en MP4. Necesita Google Chrome y `ffmpeg`. Vuelve a ejecutarlo cuando cambie el aspecto de la app.

## Idiomas

- Textos de interfaz: `src/i18n/dict/{idioma}.ts` (el inglés define las claves).
- Etiquetas de orígenes, estilos y gramática de los títulos de lista: `src/i18n/taxonomy.ts`.
- Para añadir un idioma: súmalo en `src/i18n/config.ts`, crea su diccionario, añade su columna en
  `taxonomy.ts` y la columna de significados en los datos.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:3000 (redirige "/" a /es)
npm run build:quick  # build rápido: solo las fichas de los nombres más populares
npm run build        # datos + exportación estática completa + empaquetado para Cloudflare
```

Variable opcional: `NEXT_PUBLIC_SITE_URL` (por defecto `https://babymatch.app`), usada en canónicas, hreflang y sitemaps.

## Despliegue en Cloudflare (gratis)

El sitio es HTML estático: `next build` lo exporta a `out/` y `scripts/build-cf.mjs` lo reparte en `dist/cf/`.
Cloudflare admite 20.000 ficheros por Worker en el plan gratuito y hay más páginas que eso, así que cada idioma
va en su propio Worker de solo ficheros y uno pequeño atiende el resto:

| Worker | Ruta | Contenido |
| --- | --- | --- |
| `babymatch-es`, `-en`, `-fr`, `-de`, `-it`, `-pt` | `babymatch.app/es`, `/es/*`… | Todas las páginas de ese idioma |
| `babymatch-root` | `babymatch.app/*` | Redirección de `/` según el idioma del navegador, URLs antiguas, `robots.txt`, sitemaps, `/_next`, `/data` |

Las peticiones que responde un fichero estático no ejecutan código: son gratuitas e ilimitadas. El único código
es `cloudflare/root-worker.js`, que solo corre para `/` y para URLs que no existen.

Las fichas, listas e índices se publican sin el JavaScript de Next (unos 10 KB por página); solo la home y la app
cargan React. El buscador de la cabecera es `public/search.js`.

```bash
npx wrangler login   # una vez
npm run build        # con BM_ROUTES=0 no configura rutas: cada Worker queda solo en su dirección workers.dev
npm run deploy       # despliega los siete Workers (o `npm run deploy -- es root` para algunos)
```

Cada push a `main` despliega solo con GitHub Actions (`.github/workflows/deploy.yml`), que usa los secretos
`CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` del repositorio. Sin ellos el workflow avisa y no despliega.
Los cambios que solo tocan ficheros `.md` no lanzan despliegue.

Para que las rutas funcionen, `babymatch.app` tiene que ser una zona activa en la misma cuenta de Cloudflare
(DNS gestionado por Cloudflare). Las redirecciones de las URLs antiguas están en `cloudflare/_redirects` y las
cabeceras de caché en `cloudflare/_headers`.

## Diseño

Tema Hallmark «Hum» (papel recortado, cartulina, Chillax). Los tokens están en `src/styles/tokens.css` y todo
el CSS en `src/styles/site.css`; ningún color ni fuente se escribe fuera de los tokens.
