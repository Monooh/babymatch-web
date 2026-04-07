import { supabase } from '@/lib/supabase'
import { nameToSlug, genderLabel, popularityStars } from '@/lib/slug'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: any) {
  const { data } = await supabase.from('names').select('*')
  const name = (data||[]).find((n:any) => nameToSlug(n.name) === params.slug)
  if (!name) return { title: 'No encontrado' }
  const gender = genderLabel(name.gender)
  return {
    title: name.name+' — Significado y origen del nombre de '+gender.toLowerCase(),
    description: '¿Qué significa '+name.name+'? Nombre de '+gender.toLowerCase()+' de origen '+name.origin+'. '+name.meaning.slice(0,120)+'...',
    alternates: { canonical: 'https://babymatch.app/nombres/'+params.slug },
  }
}
export default async function NamePage({ params }: any) {
  const { data } = await supabase.from('names').select('*')
  const all = data || []
  const name = all.find((n:any) => nameToSlug(n.name) === params.slug)
  if (!name) notFound()
  const related = all.filter((n:any) => n.id !== name.id && (n.gender === name.gender || n.origin === name.origin)).sort(() => Math.random() - 0.5).slice(0, 8)
  const gender = genderLabel(name.gender)
  const genderEmoji = name.gender === 'f' ? '👧' : name.gender === 'm' ? '👦' : '👶'
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
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>{name.style_tags.map((tag:string) => <span key={tag} style={{ background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'4px 12px', borderRadius:'20px', fontSize:'0.8rem' }}>{tag}</span>)}</div>
        </div>
      </section>
      <div className="container" style={{ maxWidth:'760px', padding:'48px 24px' }}>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>¿Qué significa el nombre {name.name}?</h2>
          <p style={{ fontSize:'1.05rem', lineHeight:1.8, color:'#444' }}>{name.meaning}</p>
        </section>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'20px' }}>Datos del nombre {name.name}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px' }}>
            {[{label:'Género',value:genderEmoji+' '+gender},{label:'Origen',value:name.origin},{label:'Sílabas',value:name.syllables+' sílaba'+(name.syllables!==1?'s':'')},{label:'Popularidad',value:popularityStars(name.popularity)}].map(item => (
              <div key={item.label} className="card" style={{ padding:'20px' }}>
                <div style={{ fontSize:'0.8rem', color:'#999', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</div>
                <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#3D1A1A' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>
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
              {related.map((n:any) => (
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
