'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'

export default function NombresPage() {
  const [names, setNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('names').select('id,name,gender,origin').order('popularity', { ascending: false })
      .then(({ data }) => { setNames(data || []); setLoading(false) })
  }, [])

  const byLetter: Record<string, any[]> = {}
  names.forEach(n => {
    const l = n.name[0].toUpperCase()
    if (!byLetter[l]) byLetter[l] = []
    byLetter[l].push(n)
  })
  const letters = Object.keys(byLetter).sort()

  return (
    <>
      <section style={{ background:'linear-gradient(135deg,#FFF4F1 0%,#FDDCDC 100%)', padding:'60px 24px' }}>
        <div className="container" style={{ textAlign:'center' }}>
          <h1 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'16px' }}>Nombres de bebé</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', marginBottom:'32px' }}>
            {loading ? 'Cargando...' : `${names.length} nombres · ${names.filter(n=>n.gender==='f').length} de niña · ${names.filter(n=>n.gender==='m').length} de niño`}
          </p>
          <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            {[{label:'👧 Niña',href:'/nombres/nina'},{label:'👦 Niño',href:'/nombres/nino'},{label:'🌍 Españoles',href:'/nombres/espanoles'},{label:'🥖 Franceses',href:'/nombres/franceses'},{label:'🍕 Italianos',href:'/nombres/italianos'},{label:'🌊 Vascos',href:'/nombres/vascos'}].map(f => (
              <a key={f.label} href={f.href} style={{ background:'#fff', border:'1px solid #e8d8d4', padding:'8px 18px', borderRadius:'20px', fontSize:'0.9rem', color:'#3D1A1A' }}>{f.label}</a>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:'#999' }}>
          <div style={{ fontSize:'2rem', marginBottom:'16px' }}>🍼</div>
          <p>Cargando nombres...</p>
        </div>
      ) : (
        <>
          <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', position:'sticky', top:'64px', zIndex:50 }}>
            <div className="container" style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
              {letters.map(l => <a key={l} href={'#letra-'+l} style={{ display:'inline-block', width:'32px', height:'32px', lineHeight:'32px', textAlign:'center', borderRadius:'8px', fontSize:'0.85rem', fontWeight:700, color:'#8B2020', background:'#FFF4F1' }}>{l}</a>)}
            </div>
          </div>
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
      <section style={{ background:'#FFF4F1', padding:'60px 24px', textAlign:'center' }}>
        <div className="container">
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>¿Tienes pareja? Usad BabyMatch juntos</h2>
          <p style={{ color:'#666', marginBottom:'28px' }}>Deslizad nombres por separado y descubrid en cuáles coincidís.</p>
          <a href="/app" className="btn btn-primary">Probar la app gratis →</a>
        </div>
      </section>
    </>
  )
}
