'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nameToSlug, genderLabel, popularityStars } from '@/lib/slug'

const FAMOSOS: Record<string, string[]> = {'lucia': ['Lucía de Siracusa (santa mártir)', 'Lucía Etxebarria (escritora)', 'Lucía Méndez (cantante)'], 'sofia': ['Sofía de Grecia (reina de España)', 'Sofía Vergara (actriz)', 'Sofía Loren (actriz italiana)'], 'hugo': ['Victor Hugo (escritor francés)', 'Hugo Boss (empresario)'], 'mateo': ['Mateo (evangelista bíblico)', 'Mateo Kovacic (futbolista)'], 'martina': ['Martina Navratilova (tenista)', 'Martina García (actriz)'], 'pablo': ['Pablo Picasso (pintor)', 'Pablo Neruda (poeta)', 'Pablo Iglesias (político)'], 'maria': ['María de Nazaret', 'María Callas (soprano)', 'María Montessori (pedagoga)'], 'ana': ['Ana Frank (escritora)', 'Ana de Austria (reina)', 'Ana Belén (cantante)'], 'alba': ['Alba Flores (actriz)', 'La duquesa de Alba'], 'leo': ['Leonardo DiCaprio (actor)', 'Leo Messi (futbolista)'], 'lucas': ['San Lucas (evangelista)', 'Lucas Vázquez (futbolista)', 'George Lucas (director)'], 'emma': ['Emma Watson (actriz)', 'Emma Stone (actriz)'], 'carlos': ['Carlos III (rey de España)', 'Carlos Sainz (piloto)', 'Carlos Gardel (cantante)'], 'jorge': ['Jorge Luis Borges (escritor)', 'Jorge Lorenzo (piloto)'], 'david': ['David (rey bíblico)', 'David Bowie (músico)', 'David Silva (futbolista)'], 'sara': ['Sara (esposa de Abraham)', 'Sara Baras (bailaora)', 'Sara Carbonero (periodista)'], 'laura': ['Laura Pausini (cantante)', 'Laura Ingalls Wilder (escritora)'], 'elena': ['Elena de Troya', 'Elena Anaya (actriz)'], 'daniel': ['Daniel (profeta bíblico)', 'Daniel Craig (actor)'], 'miguel': ['Miguel Ángel (artista)', 'Miguel de Cervantes (escritor)', 'Miguel Bosé (cantante)'], 'iker': ['Iker Casillas (portero)', 'Iker Muniain (futbolista)'], 'valentina': ['Valentina Tereshkova (cosmonauta)', 'Valentina Vezzali (esgrimista)'], 'alejandro': ['Alejandro Magno', 'Alejandro Sanz (cantante)']}

const CATEGORIES: Record<string, any> = {'nina': {'label': 'Nombres de niña', 'description': 'Los mejores nombres para tu bebé niña con significado y origen.', 'emoji': '👧', 'gender': 'f'}, 'nino': {'label': 'Nombres de niño', 'description': 'Los mejores nombres para tu bebé niño con significado y origen.', 'emoji': '👦', 'gender': 'm'}, 'espanoles': {'label': 'Nombres españoles', 'description': 'Nombres de bebé de origen español con mucha tradición.', 'emoji': '🇪🇸', 'origin': 'Español'}, 'vascos': {'label': 'Nombres vascos', 'description': 'Nombres vascos (euskera). Únicos y con mucha personalidad.', 'emoji': '🌊', 'origin': 'Euskera'}, 'franceses': {'label': 'Nombres franceses', 'description': 'Nombres franceses. Elegantes y muy de moda.', 'emoji': '🥖', 'origin': 'Francés'}, 'italianos': {'label': 'Nombres italianos', 'description': 'Nombres italianos. Con música e historia mediterránea.', 'emoji': '🍕', 'origin': 'Italiano'}, 'escandinavos': {'label': 'Nombres escandinavos', 'description': 'Nombres nórdicos y vikingos. Fuertes y muy en tendencia.', 'emoji': '🏔️', 'origin': 'Escandinavo'}, 'biblicos': {'label': 'Nombres bíblicos', 'description': 'Nombres bíblicos con significado espiritual profundo.', 'emoji': '✨', 'tag': 'bíblico'}, 'catalanes': {'label': 'Nombres catalanes', 'description': 'Nombres catalanes con fuerte identidad cultural.', 'emoji': '🌹', 'origin': 'Catalán'}, 'arabes': {'label': 'Nombres árabes', 'description': 'Nombres árabes. Exóticos y con significados especiales.', 'emoji': '🌙', 'origin': 'Árabe'}, 'griegos': {'label': 'Nombres griegos', 'description': 'Nombres griegos con historia mitológica.', 'emoji': '🏛️', 'origin': 'Griego'}, 'irlandeses': {'label': 'Nombres irlandeses', 'description': 'Nombres irlandeses y celtas. Únicos con mucha personalidad.', 'emoji': '☘️', 'origin': 'Irlandés'}, 'cortos': {'label': 'Nombres cortos para bebé', 'description': 'Nombres de 1 o 2 sílabas. Modernos y con mucho carácter.', 'emoji': '⚡'}}

function CategoryPage({ cat, slug }: { cat: any; slug: string }) {
  const [names, setNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      let query = supabase.from('names').select('id,name,gender,origin').order('popularity', { ascending: false })
      if (cat.gender) query = (query as any).eq('gender', cat.gender)
      else if (cat.origin) query = (query as any).eq('origin', cat.origin)
      const { data } = await query
      let result = data || []
      if (cat.tag) result = result.filter((n: any) => (n.style_tags || []).includes(cat.tag))
      if (slug === 'cortos') result = result.filter((n: any) => n.syllables <= 2)
      setNames(result)
      setLoading(false)
    }
    load()
  }, [slug])

  const byLetter: Record<string, any[]> = {}
  names.forEach((n: any) => {
    const l = n.name[0].toUpperCase()
    if (!byLetter[l]) byLetter[l] = []
    byLetter[l].push(n)
  })
  const letters = Object.keys(byLetter).sort()

  return (
    <>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', fontSize:'0.85rem', color:'#999' }}>
        <div className="container"><a href="/" style={{color:'#999'}}>Inicio</a> / <a href="/nombres" style={{color:'#999'}}>Nombres</a> / <strong style={{color:'#3D1A1A'}}>{cat.label}</strong></div>
      </div>
      <section style={{ background:'linear-gradient(135deg,#FFF4F1 0%,#FDDCDC 100%)', padding:'60px 24px' }}>
        <div className="container" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'16px' }}>{cat.emoji}</div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'16px' }}>{cat.label}</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', maxWidth:'560px', margin:'0 auto 24px', lineHeight:1.7 }}>{cat.description}</p>
          {!loading && <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.9rem', fontWeight:600 }}>{names.length} nombres</div>}
        </div>
      </section>
      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:'#999' }}><div style={{ fontSize:'2rem', marginBottom:'16px' }}>🍼</div><p>Cargando nombres...</p></div>
      ) : (
        <>
          {letters.length > 0 && (
            <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', position:'sticky', top:'64px', zIndex:50 }}>
              <div className="container" style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
                {letters.map(l => <a key={l} href={'#letra-'+l} style={{ display:'inline-block', width:'32px', height:'32px', lineHeight:'32px', textAlign:'center', borderRadius:'8px', fontSize:'0.85rem', fontWeight:700, color:'#8B2020', background:'#FFF4F1' }}>{l}</a>)}
              </div>
            </div>
          )}
          <div className="container" style={{ padding:'48px 24px' }}>
            {letters.map(letter => (
              <section key={letter} id={'letra-'+letter} style={{ marginBottom:'48px' }}>
                <h2 style={{ fontSize:'1.8rem', fontWeight:900, color:'#8B2020', borderBottom:'2px solid #FDDCDC', paddingBottom:'8px', marginBottom:'20px' }}>{letter}</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px' }}>
                  {byLetter[letter].map((n: any) => (
                    <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
                      <span className={'badge badge-'+n.gender} style={{ flexShrink:0, fontSize:'0.7rem' }}>{n.gender==='f'?'♀':n.gender==='m'?'♂':'⚥'}</span>
                      <div><div style={{ fontWeight:700, color:'#3D1A1A' }}>{n.name}</div><div style={{ fontSize:'0.75rem', color:'#999' }}>{n.origin}</div></div>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <section style={{ background:'linear-gradient(135deg,#3D1A1A 0%,#8B2020 100%)', padding:'60px 24px', textAlign:'center', color:'#fff' }}>
        <div className="container">
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'16px' }}>¿Te gustan estos nombres?</h2>
          <p style={{ opacity:0.85, marginBottom:'28px' }}>Prueba BabyMatch con tu pareja y descubrid en cuáles coincidís.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontWeight:700 }}>Probar gratis →</a>
        </div>
      </section>
    </>
  )
}

function NamePage({ slug }: { slug: string }) {
  const [name, setName] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [sameLetter, setSameLetter] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: all } = await supabase.from('names').select('*')
      const found = (all||[]).find((n: any) => nameToSlug(n.name) === slug)
      if (found) {
        setName(found)
        setRelated((all||[]).filter((n: any) => n.id !== found.id && (n.gender === found.gender || n.origin === found.origin)).sort(()=>Math.random()-0.5).slice(0,8))
        setSameLetter((all||[]).filter((n: any) => n.id !== found.id && n.name[0].toLowerCase() === found.name[0].toLowerCase() && n.gender === found.gender).sort((a: any,b: any)=>b.popularity-a.popularity).slice(0,6))
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div style={{ textAlign:'center', padding:'80px 24px' }}><div style={{ fontSize:'3rem', marginBottom:'16px' }}>🍼</div><p style={{ color:'#999' }}>Cargando...</p></div>
  if (!name) return <div style={{ textAlign:'center', padding:'80px 24px' }}><h1 style={{ color:'#3D1A1A', marginBottom:'16px' }}>Nombre no encontrado</h1><a href="/nombres" className="btn btn-primary">Ver todos los nombres</a></div>

  const gender = genderLabel(name.gender)
  const genderEmoji = name.gender === 'f' ? '👧' : name.gender === 'm' ? '👦' : '👶'
  const famososList = FAMOSOS[slug] || []

  return (
    <>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', fontSize:'0.85rem', color:'#999' }}>
        <div className="container"><a href="/" style={{color:'#999'}}>Inicio</a> / <a href="/nombres" style={{color:'#999'}}>Nombres</a> / <strong style={{color:'#3D1A1A'}}>{name.name}</strong></div>
      </div>
      <section style={{ background:name.gender==='f'?'linear-gradient(135deg,#FFF4F1,#FDDCDC)':name.gender==='m'?'linear-gradient(135deg,#F1F4FF,#DCE4FD)':'linear-gradient(135deg,#F4FFF1,#DCFDDC)', padding:'60px 24px' }}>
        <div className="container" style={{ maxWidth:'760px' }}>
          <div style={{ marginBottom:'16px' }}><span className={'badge badge-'+name.gender} style={{ fontSize:'0.9rem', padding:'6px 16px' }}>{genderEmoji} Nombre de {gender.toLowerCase()}</span></div>
          <h1 style={{ fontSize:'clamp(3rem,8vw,5rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'8px', letterSpacing:'-0.02em', lineHeight:1 }}>{name.name}</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', marginBottom:'24px' }}>Origen: <strong style={{color:'#3D1A1A'}}>{name.origin}</strong> · {name.syllables} sílaba{name.syllables!==1?'s':''} · Popularidad: {popularityStars(name.popularity)}</p>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>{(name.style_tags||[]).map((tag: string) => <span key={tag} style={{ background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'4px 12px', borderRadius:'20px', fontSize:'0.8rem' }}>{tag}</span>)}</div>
        </div>
      </section>
      <div className="container" style={{ maxWidth:'760px', padding:'48px 24px' }}>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>¿Qué significa el nombre {name.name}?</h2>
          <p style={{ fontSize:'1.05rem', lineHeight:1.8, color:'#444' }}>{name.meaning}</p>
        </section>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'20px' }}>Datos del nombre {name.name}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px' }}>
            {[{label:'Género',value:genderEmoji+' '+gender},{label:'Origen',value:name.origin},{label:'Sílabas',value:name.syllables+' sílaba'+(name.syllables!==1?'s':'')},{label:'Popularidad',value:popularityStars(name.popularity)}].map(item => (
              <div key={item.label} className="card" style={{ padding:'20px' }}>
                <div style={{ fontSize:'0.75rem', color:'#999', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</div>
                <div style={{ fontSize:'1.05rem', fontWeight:700, color:'#3D1A1A' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>
        {famososList.length > 0 && (
          <section style={{ marginBottom:'48px' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>Personas famosas llamadas {name.name}</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {famososList.map((f: string, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px', background:'#FFF4F1', borderRadius:'12px', border:'1px solid #e8d8d4' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#8B2020,#C4830A)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'1rem', flexShrink:0 }}>{name.name[0]}</div>
                  <span style={{ color:'#3D1A1A', fontWeight:500 }}>{f}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {sameLetter.length > 0 && (
          <section style={{ marginBottom:'48px' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>Otros nombres de {gender.toLowerCase()} que empiezan por {name.name[0].toUpperCase()}</h2>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              {sameLetter.map((n: any) => <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} style={{ background:'#fff', border:'1px solid #e8d8d4', padding:'8px 18px', borderRadius:'20px', color:'#3D1A1A', fontWeight:600, fontSize:'0.9rem' }}>{n.name}</a>)}
            </div>
          </section>
        )}
        <section style={{ background:'linear-gradient(135deg,#3D1A1A,#8B2020)', borderRadius:'20px', padding:'36px 32px', color:'#fff', textAlign:'center', marginBottom:'48px' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>💑</div>
          <h2 style={{ fontSize:'1.4rem', fontWeight:800, marginBottom:'12px' }}>¿Le gustará {name.name} a tu pareja?</h2>
          <p style={{ opacity:0.85, marginBottom:'24px', lineHeight:1.6 }}>Usad BabyMatch para votar por separado. Si los dos le dais like a {name.name}, es un <strong>Match</strong>.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontWeight:700 }}>Probar BabyMatch gratis →</a>
        </section>
        {related.length > 0 && (
          <section>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'20px' }}>Nombres similares a {name.name}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'12px' }}>
              {related.map((n: any) => (
                <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ padding:'16px', textAlign:'center' }}>
                  <div style={{ marginBottom:'6px' }}><span className={'badge badge-'+n.gender} style={{ fontSize:'0.7rem' }}>{n.gender==='f'?'Niña':n.gender==='m'?'Niño':'Unisex'}</span></div>
                  <div style={{ fontWeight:700, color:'#3D1A1A', fontSize:'1.1rem' }}>{n.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'#999', marginTop:'4px' }}>{n.origin}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

export default function SlugPage() {
  const params = useParams()
  const slug = params.slug as string
  const cat = CATEGORIES[slug]
  if (cat) return <CategoryPage cat={cat} slug={slug} />
  return <NamePage slug={slug} />
}
