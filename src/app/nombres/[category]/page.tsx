'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'

type Category = { label: string; description: string; emoji: string; gender?: string; origin?: string; tag?: string }

const CATEGORIES: Record<string, Category> = {
  nina: { label:'Nombres de niña', description:'Los mejores nombres para tu bebé niña con significado y origen.', emoji:'👧', gender:'f' },
  nino: { label:'Nombres de niño', description:'Los mejores nombres para tu bebé niño con significado y origen.', emoji:'👦', gender:'m' },
  espanoles: { label:'Nombres españoles', description:'Nombres de bebé de origen español con mucha tradición.', emoji:'🇪🇸', origin:'Español' },
  vascos: { label:'Nombres vascos', description:'Nombres de bebé vascos (euskera). Únicos y con mucha personalidad.', emoji:'🌊', origin:'Euskera' },
  franceses: { label:'Nombres franceses', description:'Nombres de bebé franceses. Elegantes y muy de moda.', emoji:'🥖', origin:'Francés' },
  italianos: { label:'Nombres italianos', description:'Nombres de bebé italianos. Con música e historia mediterránea.', emoji:'🍕', origin:'Italiano' },
  escandinavos: { label:'Nombres escandinavos', description:'Nombres nórdicos y vikingos. Fuertes y muy en tendencia.', emoji:'🏔️', origin:'Escandinavo' },
  biblicos: { label:'Nombres bíblicos', description:'Nombres de bebé bíblicos con significado espiritual profundo.', emoji:'✨', tag:'bíblico' },
  catalanes: { label:'Nombres catalanes', description:'Nombres catalanes con fuerte identidad cultural.', emoji:'🌹', origin:'Catalán' },
  arabes: { label:'Nombres árabes', description:'Nombres árabes. Exóticos y con significados especiales.', emoji:'🌙', origin:'Árabe' },
  griegos: { label:'Nombres griegos', description:'Nombres griegos con historia mitológica y elegancia atemporal.', emoji:'🏛️', origin:'Griego' },
  cortos: { label:'Nombres cortos para bebé', description:'Nombres de 1 o 2 sílabas. Modernos y con mucho carácter.', emoji:'⚡' },
  irlandeses: { label:'Nombres irlandeses', description:'Nombres irlandeses y celtas. Únicos con mucha personalidad.', emoji:'☘️', origin:'Irlandés' },
}

export default function CategoryPage() {
  const params = useParams()
  const category = params.category as string
  const cat = CATEGORIES[category]
  const [names, setNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cat) return
    async function load() {
      let query = supabase.from('names').select('id,name,gender,origin').order('popularity', { ascending: false })
      if (cat.gender) query = query.eq('gender', cat.gender)
      else if (cat.origin) query = query.eq('origin', cat.origin)
      else if (cat.tag) query = query.contains('style_tags', [cat.tag])
      const { data } = await query
      setNames(data || [])
      setLoading(false)
    }
    load()
  }, [category])

  if (!cat) return <div style={{padding:'80px 24px',textAlign:'center'}}><h1>Categoría no encontrada</h1><a href="/nombres">Ver todos los nombres</a></div>

  const byLetter: Record<string, any[]> = {}
  names.forEach(n => {
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
          {!loading && <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.9rem', fontWeight:600 }}>{names.length} nombres encontrados</div>}
        </div>
      </section>

      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:'#999' }}>
          <div style={{ fontSize:'2rem', marginBottom:'16px' }}>🍼</div>
          <p>Cargando nombres...</p>
        </div>
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
