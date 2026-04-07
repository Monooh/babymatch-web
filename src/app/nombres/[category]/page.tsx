import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'
import { notFound } from 'next/navigation'

export const revalidate = 3600

type Category = {
  label: string
  description: string
  emoji: string
  filter: (n: any) => boolean
  gender?: string
}

const CATEGORIES: Record<string, Category> = {
  nina: {
    label: 'Nombres de niña',
    description: 'Descubre los mejores nombres para tu bebé niña. Con significado, origen y popularidad.',
    emoji: '👧',
    filter: (n) => n.gender === 'f',
    gender: 'f',
  },
  nino: {
    label: 'Nombres de niño',
    description: 'Los mejores nombres para tu bebé niño. Descubre su significado y origen.',
    emoji: '👦',
    filter: (n) => n.gender === 'm',
    gender: 'm',
  },
  espanoles: {
    label: 'Nombres españoles',
    description: 'Nombres de bebé de origen español con mucha tradición y significado profundo.',
    emoji: '🇪🇸',
    filter: (n) => n.origin === 'Español',
  },
  vascos: {
    label: 'Nombres vascos',
    description: 'Nombres de bebé de origen vasco (euskera). Únicos, sonoros y con mucha personalidad.',
    emoji: '🌊',
    filter: (n) => n.origin === 'Euskera',
  },
  franceses: {
    label: 'Nombres franceses',
    description: 'Nombres de bebé de origen francés. Elegantes, sofisticados y muy de moda.',
    emoji: '🥖',
    filter: (n) => n.origin === 'Francés',
  },
  italianos: {
    label: 'Nombres italianos',
    description: 'Nombres de bebé de origen italiano. Con música, historia y mucha elegancia mediterránea.',
    emoji: '🍕',
    filter: (n) => n.origin === 'Italiano',
  },
  escandinavos: {
    label: 'Nombres escandinavos',
    description: 'Nombres de bebé nórdicos y vikingos. Fuertes, únicos y muy en tendencia.',
    emoji: '🏔️',
    filter: (n) => n.origin === 'Escandinavo',
  },
  biblicos: {
    label: 'Nombres bíblicos',
    description: 'Nombres de bebé de origen bíblico. Con siglos de historia y significado espiritual profundo.',
    emoji: '✨',
    filter: (n) => (n.style_tags || []).includes('bíblico'),
  },
  catalanes: {
    label: 'Nombres catalanes',
    description: 'Nombres de bebé de origen catalán. Con fuerte identidad cultural y gran musicalidad.',
    emoji: '🌹',
    filter: (n) => n.origin === 'Catalán',
  },
  arabes: {
    label: 'Nombres árabes',
    description: 'Nombres de bebé de origen árabe. Exóticos, sonoros y con significados muy especiales.',
    emoji: '🌙',
    filter: (n) => n.origin === 'Árabe',
  },
  griegos: {
    label: 'Nombres griegos',
    description: 'Nombres de bebé de origen griego. Con historia mitológica y una elegancia atemporal.',
    emoji: '🏛️',
    filter: (n) => n.origin === 'Griego',
  },
  cortos: {
    label: 'Nombres cortos para bebé',
    description: 'Nombres de bebé de 1 o 2 sílabas. Fáciles de pronunciar, modernos y con mucho carácter.',
    emoji: '⚡',
    filter: (n) => n.syllables <= 2,
  },
  irlandeses: {
    label: 'Nombres irlandeses',
    description: 'Nombres de bebé de origen irlandés y celta. Únicos, con historia y mucha personalidad.',
    emoji: '☘️',
    filter: (n) => n.origin === 'Irlandés',
  },
}

export async function generateMetadata({ params }: any) {
  const cat = CATEGORIES[params.category]
  if (!cat) return { title: 'Nombres de bebé' }
  return {
    title: cat.label + ' — Significado y origen | BabyMatch',
    description: cat.description,
    alternates: { canonical: 'https://babymatch.app/nombres/' + params.category },
  }
}

export default async function CategoryPage({ params }: any) {
  const cat = CATEGORIES[params.category]
  if (!cat) notFound()

  // Query inteligente por categoría — solo trae los nombres necesarios
  let query = supabase.from('names').select('id,name,gender,origin').order('popularity', { ascending: false })
  if (cat.gender) query = query.eq('gender', cat.gender)
  else if (['espanoles','vascos','franceses','italianos','escandinavos','catalanes','arabes','griegos','irlandeses'].includes(params.category)) {
    const originMap: Record<string,string> = {espanoles:'Español',vascos:'Euskera',franceses:'Francés',italianos:'Italiano',escandinavos:'Escandinavo',catalanes:'Catalán',arabes:'Árabe',griegos:'Griego',irlandeses:'Irlandés'}
    query = query.eq('origin', originMap[params.category])
  }
  const { data: all } = await query
  const names = all || []

  const byLetter: Record<string, any[]> = {}
  names.forEach((n: any) => {
    const l = n.name[0].toUpperCase()
    if (!byLetter[l]) byLetter[l] = []
    byLetter[l].push(n)
  })
  const letters = Object.keys(byLetter).sort()

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.label,
    description: cat.description,
    url: 'https://babymatch.app/nombres/' + params.category,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Breadcrumb */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', fontSize:'0.85rem', color:'#999' }}>
        <div className="container">
          <a href="/" style={{color:'#999'}}>Inicio</a> / <a href="/nombres" style={{color:'#999'}}>Nombres</a> / <strong style={{color:'#3D1A1A'}}>{cat.label}</strong>
        </div>
      </div>

      {/* Header */}
      <section style={{ background:'linear-gradient(135deg,#FFF4F1 0%,#FDDCDC 100%)', padding:'60px 24px' }}>
        <div className="container" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'16px' }}>{cat.emoji}</div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'16px' }}>{cat.label}</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', maxWidth:'560px', margin:'0 auto 24px', lineHeight:1.7 }}>{cat.description}</p>
          <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.9rem', fontWeight:600 }}>
            {names.length} nombres encontrados
          </div>
        </div>
      </section>

      {/* Letra index */}
      {letters.length > 0 && (
        <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', position:'sticky', top:'64px', zIndex:50 }}>
          <div className="container" style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
            {letters.map(l => (
              <a key={l} href={'#letra-'+l} style={{ display:'inline-block', width:'32px', height:'32px', lineHeight:'32px', textAlign:'center', borderRadius:'8px', fontSize:'0.85rem', fontWeight:700, color:'#8B2020', background:'#FFF4F1' }}>{l}</a>
            ))}
          </div>
        </div>
      )}

      {/* Nombres */}
      <div className="container" style={{ padding:'48px 24px' }}>
        {letters.map(letter => (
          <section key={letter} id={'letra-'+letter} style={{ marginBottom:'48px' }}>
            <h2 style={{ fontSize:'1.8rem', fontWeight:900, color:'#8B2020', borderBottom:'2px solid #FDDCDC', paddingBottom:'8px', marginBottom:'20px' }}>{letter}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px' }}>
              {byLetter[letter].map((n:any) => (
                <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
                  <span className={'badge badge-'+n.gender} style={{ flexShrink:0, fontSize:'0.7rem' }}>{n.gender==='f'?'♀':n.gender==='m'?'♂':'⚥'}</span>
                  <div>
                    <div style={{ fontWeight:700, color:'#3D1A1A' }}>{n.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'#999' }}>{n.origin}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section style={{ background:'linear-gradient(135deg,#3D1A1A 0%,#8B2020 100%)', padding:'60px 24px', textAlign:'center', color:'#fff' }}>
        <div className="container">
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'16px' }}>¿Te gustan estos nombres?</h2>
          <p style={{ opacity:0.85, marginBottom:'28px', lineHeight:1.6 }}>Prueba BabyMatch con tu pareja y descubrid en cuáles coincidís.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontWeight:700 }}>Probar gratis →</a>
        </div>
      </section>
    </>
  )
}
