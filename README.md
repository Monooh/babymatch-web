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

## Sin cuentas, sin servidor

- Favoritos, descartes y respuestas del cuestionario se guardan en `localStorage` (`src/lib/store.ts`).
- El match con la pareja viaja en un enlace: los ids de los nombres que te gustan van comprimidos en el
  fragmento de la URL (`src/lib/share.ts`), que nunca llega al servidor. Quien lo abre guarda esa lista y ve un
  match cada vez que le gusta el mismo nombre.
- El proyecto antiguo de Supabase ya no existe. Para cuentas y sincronización en tiempo real haría falta un
  backend nuevo; `store.ts` es el único punto que habría que conectar.

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
