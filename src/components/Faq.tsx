import { jsonLd } from '@/lib/seo'

/** Questions with the answer right under each one, plus the same text as FAQPage data. Written for people first:
 *  assistants lift a passage when the question is the heading and the answer stands on its own. */
export function Faq({ id, title, items, small }: { id: string; title: string; items: [string, string][]; small?: boolean }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return (
    <section className={small ? 'section section--tight' : 'section'} aria-labelledby={id}>
      <div className="container">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
        {small ? <h2 id={id} className="h-sm">{title}</h2> : <div className="head"><h2 id={id}>{title}</h2></div>}
        <div className="faq">
          {items.map(([q, a]) => (<div key={q}><h3>{q}</h3><p>{a}</p></div>))}
        </div>
      </div>
    </section>
  )
}
