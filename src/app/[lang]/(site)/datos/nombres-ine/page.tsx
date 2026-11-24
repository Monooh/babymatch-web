import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE_NAME, paths } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { abs, breadcrumbLd, jsonLd, pageMeta } from '@/lib/seo'
import { STUDY, downloads, inline, plain, study } from '@/lib/study'
import { num } from '@/lib/t'
import { shotSrc } from '@/components/Phone'
import { Crumbs } from '@/components/Chrome'

// The study behind the press note on INE name data. It exists in Spanish only: the figures are about Spain and the
// readers are Spanish newsrooms, who need one page to link to with the tables and the method.
type Props = { params: Promise<{ lang: string }> }

const TITLE = 'Nombres en España por edad media y provincia: datos del INE'
const INE = 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177009&menu=resultados&idp=1254735572981'

export const dynamicParams = false
export function generateStaticParams() {
  return [{ lang: 'es' }]
}

const description = () => `${study().title}. Los nombres con más y menos edad media y el más característico de cada provincia, con las tablas para descargar.`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (lang !== 'es') return {}
  return pageMeta('es', { title: TITLE, description: description(), path: l => (l === 'es' ? STUDY.path : null) })
}

export default async function StudyPage({ params }: Props) {
  const { lang } = await params
  if (lang !== 'es') notFound()
  const d = getDict('es')
  const s = study(), files = downloads()
  const url = abs(STUDY.path)
  const publisher = { '@type': 'Organization', name: SITE_NAME, url: abs('/es'), logo: abs('/icon-512.png') }
  const ld = [
    breadcrumbLd([{ name: SITE_NAME, path: paths.home('es') }, { name: STUDY.crumb, path: STUDY.path }]),
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.lead, inLanguage: 'es',
      datePublished: STUDY.published, dateModified: new Date().toISOString().slice(0, 10), mainEntityOfPage: url,
      author: publisher, publisher, image: abs('/icon-512.png'), isBasedOn: INE,
    },
    {
      '@context': 'https://schema.org', '@type': 'Dataset', name: TITLE, description: description(), url, inLanguage: 'es',
      license: 'https://creativecommons.org/licenses/by/4.0/', creator: publisher, isBasedOn: INE,
      temporalCoverage: '2025-01-01', spatialCoverage: { '@type': 'Place', name: 'España' },
      distribution: files.map(f => ({ '@type': 'DataDownload', encodingFormat: 'text/csv', name: f.label, contentUrl: abs(`${STUDY.files}/${f.file}`) })),
    },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <article>
        <section className="page-hero page-hero--study">
          <div className="container">
            <Crumbs items={[{ name: SITE_NAME, href: paths.home('es') }, { name: STUDY.crumb }]} />
            <h1>{s.title}</h1>
            <p className="lead">{s.lead}</p>
            <p className="study-meta">{s.source}</p>
          </div>
        </section>

        <section className="section section--tight">
          <div className="container">
            <div className="prose">
              {s.body.map((p, i) => <p key={i}>{inline(p)}</p>)}
            </div>
          </div>
        </section>

        <section className="section section--tight" aria-labelledby="h-tablas">
          <div className="container">
            <h2 id="h-tablas" className="h-sm">Tablas</h2>
            <p className="datatable-hint">Desliza cada tabla hacia un lado para ver todas sus columnas.</p>
            {s.tables.map((table, n) => (
              <figure key={n} className="datatable">
                <figcaption id={`t-${n + 1}`}>{table.caption}</figcaption>
                <div className="datatable-scroll" tabIndex={0} role="region" aria-labelledby={`t-${n + 1}`}>
                  <table>
                    <thead>
                      <tr>{table.head.map((h, i) => <th key={i} scope="col" className={table.right[i] ? 'r' : undefined}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((c, i) => <td key={i} className={table.right[i] ? 'r' : undefined}>{inline(c)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.note ? <p className="note muted">{inline(table.note)}</p> : null}
              </figure>
            ))}
          </div>
        </section>

        <section className="section section--tight" aria-labelledby="h-descargas">
          <div className="container">
            <h2 id="h-descargas" className="h-sm">Descargar los datos</h2>
            <ul className="downloads">
              {files.map(f => (
                <li key={f.file}>
                  <a href={`${STUDY.files}/${f.file}`} download>{f.label}</a>
                  <small>CSV, {num(f.rows, 'es')} filas, {num(f.kb, 'es')} KB</small>
                </li>
              ))}
            </ul>
            <p className="note muted">Ficheros en UTF-8, con punto y coma entre campos y coma decimal: se abren tal cual en Excel.</p>
          </div>
        </section>

        <section className="section section--tight" aria-labelledby="h-metodo">
          <div className="container">
            <h2 id="h-metodo" className="h-sm">Metodología</h2>
            <div className="prose">
              <ul>
                {s.method.map((m, i) => <li key={i}>{inline(m)}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="section section--tight" aria-labelledby="h-citar">
          <div className="container">
            <h2 id="h-citar" className="h-sm">Cómo citar</h2>
            <div className="prose">
              <p>Las cifras y las tablas se pueden reproducir citando la fuente: «BabyMatch, con datos del INE», con enlace a <a href={STUDY.path}>{url.replace('https://', '')}</a>. Los datos originales son del INE y tienen licencia CC BY 4.0.</p>
              <p>{inline(s.about)}</p>
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="container">
            <div className="cta cta--shot">
              <div className="cta-shot"><img src={shotSrc('es', 'swipe')} alt="" width={780} height={1688} loading="lazy" decoding="async" /></div>
              <div>
                <h2>{d.vote.ctaH}</h2>
                <p>{d.vote.ctaP}</p>
              </div>
              <a className="btn" href={paths.app('es')}>{d.vote.cta}</a>
            </div>
          </div>
        </section>
      </article>
    </>
  )
}
