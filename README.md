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

## Idiomas

- Textos de interfaz: `src/i18n/dict/{idioma}.ts` (el inglés define las claves).
- Etiquetas de orígenes, estilos y gramática de los títulos de lista: `src/i18n/taxonomy.ts`.
- Para añadir un idioma: súmalo en `src/i18n/config.ts`, crea su diccionario, añade su columna en
  `taxonomy.ts` y la columna de significados en los datos.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # datos + build de producción
```

Variable opcional: `NEXT_PUBLIC_SITE_URL` (por defecto `https://babymatch.app`), usada en canónicas, hreflang y sitemaps.

En el build se generan todas las listas y las fichas de los nombres más populares; el resto de fichas se
generan en la primera visita y quedan en caché.

## Diseño

Tema Hallmark «Hum» (papel recortado, cartulina, Chillax). Los tokens están en `src/styles/tokens.css` y todo
el CSS en `src/styles/site.css`; ningún color ni fuente se escribe fuera de los tokens.
