# Huecos

Etiquetas: OWN (lo que cuentan nuestras páginas), CLAIM (ventajas sostenibles), EARN (cobertura externa),
CONTEST (alternativas). Estado al 2026-11-23.

## Cerrados en esta pasada

| Hueco | Causa | Etiqueta | Qué se hizo |
|---|---|---|---|
| La portada no decía en texto llano qué es, para quién y cuánto cuesta | Cobertura débil | OWN | Bloque de 7 preguntas con respuesta y `FAQPage` en los 6 idiomas (`src/components/Faq.tsx`, `home.faq` en los diccionarios) |
| Nada trataba la alternativa (lista normal, app de tienda) | Falta la información | CONTEST | Pregunta «¿En qué se diferencia…?» con lo que se gana y lo que se pierde |
| Las fichas no respondían a la pregunta tal como se hace | Cobertura débil | OWN | Preguntas «¿Qué significa X?», origen, género, popularidad y grafías, en cada ficha y con `FAQPage` |
| Las listas abrían con una frase sin datos | Cobertura débil | OWN | La entradilla dice cuántos nombres hay y nombra los cinco primeros |
| No había `llms.txt` | Técnico menor | OWN | `src/app/llms.txt/route.ts` |
| `/` y `www` daban 404 a los navegadores | No se puede leer | OWN | El Worker raíz sirve él mismo el 404; comprobación añadida al despliegue |
| No había forma de medir | — | — | Search Console verificado y 6 sitemaps enviados; GA4 con consentimiento |
| Las fichas se parecían demasiado entre sí | Cobertura débil | OWN | Cada ficha lleva las personas conocidas con ese nombre (Wikidata) y su puesto en el ranking de cada país; ambas cosas entran también en sus preguntas |
| Faltaban listas que la gente busca con año y por redes | Falta la información | OWN | Listas «populares en 2026» (ranking oficial), «tendencia en 2027» (los que más suben) y de youtubers, tiktokers, influencers, cantantes, actores, futbolistas y modelos |

## Abiertos

| Hueco | Causa | Etiqueta | Siguiente paso |
|---|---|---|---|
| La descarga de personas conocidas cubre primero los nombres más populares | Cobertura débil | OWN | Dejar terminar `npm run people` (horas) y volver a desplegar |
| Alemania y Portugal solo tienen los 10 primeros del ranking | Falta la información | OWN | Alemania: valorar beliebte-vornamen.de (top 500). Portugal: esperar la lista completa del IRN |
| El sitio no está indexado (dominio con dos días) | No se puede leer | OWN | Esperar a Google; dar de alta en Bing Webmaster Tools importando desde Search Console (lo hace el dueño) |
| Ninguna fuente externa menciona BabyMatch | Nadie más lo dice | EARN | Las fuentes que la IA cita para «app nombres bebé pareja» son fichas de tiendas de apps y artículos de revistas (Diez Minutos, Guía Infantil, Hola). Objetivo: aparecer en esas comparativas y en hilos donde se pregunta |
| `/es/app` no tiene texto en el HTML | No se puede leer | OWN | Aceptable: la portada es la página que describe la app. Revisar si la IA cita `/app` |
| Significados generados con IA sin revisar por nativos | — | CLAIM | Revisión por idioma antes de afirmar exactitud |
