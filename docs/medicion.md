# Plan de medición de BabyMatch

Qué queremos saber, con qué se mide y qué número nos dice que toca dar el siguiente paso (cobrar).

## Las tres preguntas

1. **¿Llega gente?** Tráfico de buscadores y de asistentes de IA a las fichas y listas.
2. **¿La usa?** De quien abre la app, cuántos deslizan, vuelven otro día e invitan a su pareja.
3. **¿Se contagia?** Cuántas invitaciones acaban en una pareja unida y en matches.

Cobrar tiene sentido cuando la 2 y la 3 dan que sí de forma sostenida. Los umbrales están al final.

## Dónde se mira cada cosa

| Qué | Dónde | Cuenta a… | Notas |
|---|---|---|---|
| Impresiones, clics y posición en Google | Search Console, propiedad `babymatch.app` | Todo el mundo | Con 2–3 días de retraso. Mirar por carpeta de idioma (`/es/`, `/en/`…) y por tipo de página (fichas, listas). |
| Visitas a la web y de dónde vienen | Google Analytics 4, propiedad «BabyMatch» | Solo quien acepta el aviso | Sirve para proporciones (fuentes, páginas de entrada), no para totales. |
| Visitas totales, sin cookies | Cloudflare Web Analytics (panel de Cloudflare → Analytics & Logs → Web Analytics → babymatch.app) | Todo el mundo | Activo para todos los países desde el 23-11-2026 (antes excluía a la UE). Es el total fiable de visitas. |
| Todo el embudo, de la llegada a la pareja unida | **Panel**: <https://babymatch.app/es/panel> | Todo el mundo | Se entra con un enlace que llega al correo del propietario (botón «Enviarme el enlace»). Periodos de 7, 30 y 90 días, cada uno comparado con el anterior. |
| Lo mismo, en el terminal | `npm run stats` | Todo el mundo | Contadores anónimos de la propia app y las listas guardadas. No dependen del aviso de cookies. |
| Presencia en respuestas de IA | `.granola/mediciones/` (`/granola medir`) | — | Una pasada al mes con las mismas preguntas. |

`npm run stats` (o `npm run stats 30` para 30 días) necesita `npx wrangler login` hecho en el ordenador.

## El embudo de la app

Cada paso es un evento. Se cuenta de dos formas a la vez: un contador anónimo diario en nuestra base de datos
(sin persona ni dispositivo: solo «pasó una vez más hoy, en este idioma») y, si la visita aceptó el aviso, el mismo
evento en Google Analytics con el nombre de la tabla.

| Paso | Evento | Se cuenta |
|---|---|---|
| Llega a la web desde fuera | `visit` | cada llegada (no al moverse dentro de la web ni al recargar) |
| …de dónde viene | `src_search`, `src_ai`, `src_social`, `src_other`, `src_direct` | cada llegada |
| …por qué página entra | `land_name`, `land_list`, `land_home`, `land_app`, `land_saints`, `land_data`, `land_other` | cada llegada |
| Abre la app | `app_open` | cada visita |
| …desde dónde | `from_name`, `from_list`, `from_home`, `from_invite`, `from_other` | cada visita |
| Empieza el cuestionario | `quiz_start` | una vez por persona |
| Lo termina / lo salta | `quiz_done` / `quiz_skip` | una vez |
| Primer deslizamiento | `first_swipe` | una vez |
| 10 y 50 deslizamientos | `swipes_10`, `swipes_50` | una vez |
| Primer «me gusta» y 10 «me gusta» | `first_like`, `likes_10` | una vez |
| Superlike | `superlike` | cada vez |
| Crea la invitación | `invite_created` | cada vez |
| La comparte o la copia | `invite_shared` | cada vez |
| La pareja abre el enlace | `invite_opened` | cada vez |
| La pareja se une | `partner_joined` | cada vez |
| Match | `match` | cada aviso de match |
| Abre una lista en la app / usa filtros | `list_opened`, `filters_used` | cada vez |
| Crea su enlace personal / recupera su lista | `backup_link`, `restored` | cada vez |
| Abre la ronda final | `final_opened` | cada vez |
| Resuelve un duelo / llega a 10 | `duel` / `duels_10` | cada vez / una vez |
| Escribe sus apellidos en la ronda final | `surname_set` | una vez |
| Abre una votación / la comparte | `poll_created` / `poll_shared` | cada vez |
| Un familiar abre la votación / vota | `vote_opened` / `vote_cast` | cada vez / una vez por persona |
| Llega a la app desde una votación | `from_vote` | cada visita |
| Guarda su lista con el correo / lo confirma | `email_saved` / `email_confirmed` | cada vez |

Además, de las listas guardadas salen los datos que no dependen de eventos: personas con lista, activas en 7 días,
que **volvieron otro día**, emparejadas, matches por pareja y los nombres con más «me gusta».

Dónde está en el código: los eventos de la app se lanzan con `track()` (`src/lib/sync.ts`) y las llegadas a la web
desde `public/consent.js`, sin cookies ni nada guardado en el dispositivo (se mira de qué página viene la visita).
El servidor los admite si están en la lista `EVENTS` de `cloudflare/api/worker.js` y descarta los de rastreadores.
El panel es `src/components/Panel.tsx` con las cifras de `cloudflare/api/admin.js`; el informe del terminal,
`scripts/stats.mjs`. Un evento nuevo se añade en esos sitios.

Quién puede abrir el panel: la dirección que esté en la tabla `admins` de la base de datos. Se cambia a mano con
`npx wrangler d1 execute babymatch --remote --command "…"` desde `cloudflare/api`; no está en el repositorio.

## Qué mirar y cada cuánto

**Cada lunes, 10 minutos**

- Search Console: clics e impresiones de la semana frente a la anterior, por idioma. Páginas indexadas.
- El panel, en 7 días: llegadas, aperturas, % que llega al primer deslizamiento, invitaciones creadas, parejas unidas.

**Cada mes**

- `npm run stats 30` y apuntar la fila del mes en la tabla de abajo.
- `/granola medir`: en cuántas preguntas aparece BabyMatch en las respuestas de IA.
- Las 20 fichas y listas con más clics en Search Console: ¿de qué tipo son? Eso decide qué contenido ampliar.

| Mes | Clics Google | Aperturas app | 1.er deslizamiento | 10 «me gusta» | Volvieron otro día | Invitaciones | Parejas unidas | Con match |
|---|---|---|---|---|---|---|---|---|
| 2026-12 | | | | | | | | |

## Las cuatro cifras que importan

1. **Activación**: aperturas → primer deslizamiento. Si baja del 50 %, el problema está en la primera pantalla.
2. **Enganche**: personas que llegan a 10 «me gusta» y que vuelven otro día.
3. **Invitación**: de quien da un «me gusta», cuántos crean el enlace. Es el motor de crecimiento gratis.
4. **Unión**: de las invitaciones creadas, cuántas acaban con la pareja dentro.

Desde el 24-11-2026 hay un segundo bucle, la votación de familia y amigos. Sus dos cifras: cuántos familiares
votan por cada votación abierta (`vote_cast` / `poll_created`) y cuántos de los que la abren pasan a la app
(`from_vote` / `vote_opened`). Si la segunda supera el 5 %, cada pareja que llega al final trae gente nueva.

## Cuándo está validado (y toca el muro de pago)

No antes de tener, durante cuatro semanas seguidas:

- al menos **500 aperturas de la app por semana** (con menos, los porcentajes bailan demasiado);
- **30 % o más** de las personas con lista vuelven otro día;
- **15 % o más** de quienes dan un «me gusta» crean la invitación;
- **40 % o más** de las invitaciones acaban en pareja unida.

Son umbrales de partida, elegidos con criterio y no con datos propios: revisarlos con el primer mes real.
El paso siguiente antes de construir nada de pago es una **prueba de puerta falsa**: un botón «Premium» que solo
cuenta cuánta gente lo toca (evento `premium_tap`) y explica que llegará pronto.

## Hecho

- Panel privado con todo el embudo y recuento propio de llegadas a la web, por origen y página de entrada (25-11-2026).

- Cloudflare Web Analytics cuenta a todos los visitantes (23-11-2026).
- En GA4, `first_like`, `invite_created`, `partner_joined` y `match` están creados como eventos clave (23-11-2026).

- Copia de seguridad de las listas cada 20 minutos y vigilancia de la web cada 15 (24-11-2026): ver el README.

## Pendiente

- **Informe anual con datos propios** («los nombres con más likes en BabyMatch»): los datos ya se guardan;
  falta volumen para publicarlo con sentido.

## Lo que no se mide, a propósito

- Bing Webmaster Tools: descartado el 25-11-2026. No se da de alta la web allí.
- Ningún evento lleva el nombre de la persona ni su lista: los contadores son totales por día e idioma.
- Google Analytics no recibe nada si la visita no acepta.
- Las listas guardadas se usan para el informe solo en agregado.
