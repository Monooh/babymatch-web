import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'
export const dynamic = 'force-dynamic'
export default async function HomePage() {
  const { data: featured } = await supabase.from('names').select('*').order('popularity', { ascending: false }).limit(12)
  return (
    <>
      <section style={{ background: 'linear-gradient(135deg, #FFF4F1 0%, #FDDCDC 100%)', padding: '80px 24px 100px', textAlign: 'center' }}>
        <div className="container">
          <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.85rem', fontWeight:600, marginBottom:'24px' }}>🍼 La app de nombres de bebé para parejas</div>
          <h1 style={{ fontSize:'clamp(2.2rem,5vw,3.8rem)', fontWeight:900, lineHeight:1.1, color:'#3D1A1A', marginBottom:'24px', letterSpacing:'-0.02em' }}>
            Encuentra el nombre<br /><span style={{color:'#8B2020'}}>perfecto para tu bebé</span>
          </h1>
          <p style={{ fontSize:'clamp(1rem,2vw,1.25rem)', color:'#666', maxWidth:'560px', margin:'0 auto 40px', lineHeight:1.7 }}>
            Desliza nombres como si fuera Tinder. Cuando tú y tu pareja hacéis like al mismo nombre, es un <strong>Match</strong>.
          </p>
          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/app" className="btn btn-primary" style={{ fontSize:'1.1rem', padding:'16px 36px' }}>Probar gratis →</a>
            <a href="/nombres" className="btn btn-outline">Ver nombres</a>
          </div>
          <p style={{ marginTop:'20px', fontSize:'0.85rem', color:'#999' }}>Sin registro · Gratis · +1.000 nombres</p>
        </div>
      </section>
      <section style={{ padding:'80px 24px', background:'#fff' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, marginBottom:'56px', color:'#3D1A1A' }}>¿Cómo funciona?</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'32px' }}>
            {[{icon:'💑',title:'Crea vuestra pareja',desc:'Conecta con tu pareja con un código único. Cada uno vota por su cuenta, sin influirse.'},{icon:'👆',title:'Desliza nombres',desc:'Más de 1.000 nombres con significado, origen y popularidad. Like o no like, así de simple.'},{icon:'💚',title:'Haz Match',desc:'Cuando los dos le dais like al mismo nombre, es un match. ¡Ese es el candidato!'}].map((s,i) => (
              <div key={i} className="card" style={{ textAlign:'center', padding:'40px 28px' }}>
                <div style={{ fontSize:'3rem', marginBottom:'16px' }}>{s.icon}</div>
                <h3 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:'12px', color:'#3D1A1A' }}>{s.title}</h3>
                <p style={{ color:'#666', lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding:'80px 24px', background:'#FFF4F1' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, marginBottom:'48px', color:'#3D1A1A' }}>Nombres más populares</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'16px', marginBottom:'40px' }}>
            {(featured||[]).map((n:any) => (
              <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ textAlign:'center', padding:'20px 16px' }}>
                <div style={{ marginBottom:'8px' }}><span className={'badge badge-'+n.gender}>{n.gender==='f'?'Niña':n.gender==='m'?'Niño':'Unisex'}</span></div>
                <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#3D1A1A', marginBottom:'4px' }}>{n.name}</div>
                <div style={{ fontSize:'0.8rem', color:'#999' }}>{n.origin}</div>
              </a>
            ))}
          </div>
          <div style={{ textAlign:'center' }}><a href="/nombres" className="btn btn-outline">Ver todos los nombres →</a></div>
        </div>
      </section>
      <section style={{ padding:'80px 24px', background:'linear-gradient(135deg,#3D1A1A 0%,#8B2020 100%)', textAlign:'center', color:'#fff' }}>
        <div className="container">
          <h2 style={{ fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:900, marginBottom:'20px' }}>¿Embarazados y aún sin nombre?</h2>
          <p style={{ fontSize:'1.1rem', opacity:0.85, maxWidth:'480px', margin:'0 auto 40px', lineHeight:1.7 }}>Más de 1.000 nombres esperando. Empieza ahora, es gratis.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontSize:'1.1rem', padding:'16px 40px' }}>Empezar gratis →</a>
        </div>
      </section>
    </>
  )
}
