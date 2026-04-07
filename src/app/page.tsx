import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'

export const revalidate = 3600

// Nombres destacados hardcodeados — no necesitan query
const FEATURED = [
  {id:1,name:'Lucía',gender:'f',origin:'Español'},{id:2,name:'Martina',gender:'f',origin:'Español'},
  {id:3,name:'Sofía',gender:'f',origin:'Español'},{id:4,name:'Hugo',gender:'m',origin:'Germánico'},
  {id:5,name:'Mateo',gender:'m',origin:'Español'},{id:6,name:'Leo',gender:'m',origin:'Español'},
  {id:7,name:'Emma',gender:'f',origin:'Germánico'},{id:8,name:'Oliver',gender:'m',origin:'Inglés'},
  {id:9,name:'Valentina',gender:'f',origin:'Latino'},
]

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section style={{ background:'linear-gradient(135deg,#FFF4F1 0%,#FDDCDC 100%)', padding:'80px 24px 100px', textAlign:'center' }}>
        <div className="container">
          <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.85rem', fontWeight:600, marginBottom:'24px' }}>🍼 La app de nombres de bebé para parejas</div>
          <h1 style={{ fontSize:'clamp(2.2rem,5vw,3.8rem)', fontWeight:900, lineHeight:1.1, color:'#3D1A1A', marginBottom:'24px', letterSpacing:'-0.02em' }}>
            Encuentra el nombre<br /><span style={{color:'#8B2020'}}>perfecto para tu bebé</span>
          </h1>
          <p style={{ fontSize:'clamp(1rem,2vw,1.2rem)', color:'#666', maxWidth:'540px', margin:'0 auto 40px', lineHeight:1.7 }}>
            Desliza nombres como si fuera Tinder. Cuando tú y tu pareja hacéis like al mismo nombre, es un <strong>Match</strong>.
          </p>
          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap', marginBottom:'48px' }}>
            <a href="/app" className="btn btn-primary" style={{ fontSize:'1.1rem', padding:'16px 36px' }}>Probar gratis →</a>
            <a href="/nombres" className="btn btn-outline">Ver nombres</a>
          </div>
          <div style={{ display:'flex', gap:'32px', justifyContent:'center', flexWrap:'wrap' }}>
            {[['🍼','974','nombres disponibles'],['💑','+500','parejas ya lo usan'],['⭐','4.9/5','valoración media'],['🌍','26','orígenes distintos']].map(([icon,num,label]) => (
              <div key={String(label)} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem' }}>{icon}</div>
                <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#3D1A1A' }}>{num}</div>
                <div style={{ fontSize:'0.8rem', color:'#888' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding:'80px 24px', background:'#fff' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, marginBottom:'16px', color:'#3D1A1A' }}>¿Cómo funciona BabyMatch?</h2>
          <p style={{ textAlign:'center', color:'#666', marginBottom:'64px', fontSize:'1.05rem' }}>Tres pasos para encontrar el nombre perfecto</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'32px' }}>
            {[
              {icon:'💑',title:'Crea vuestra pareja',desc:'Uno crea el perfil y comparte un código con su pareja. Cada uno vota de forma independiente, sin influirse mutuamente.'},
              {icon:'👆',title:'Deslizad nombres',desc:'+974 nombres con significado, origen, popularidad y estilo. Like al nombre que os gusta, X al que no.'},
              {icon:'💚',title:'Descubrid vuestro Match',desc:'Cuando los dos le dais like al mismo nombre, BabyMatch lo detecta. ¡Ese es vuestro candidato!'},
            ].map((s,i) => (
              <div key={i} className="card" style={{ textAlign:'center', padding:'40px 28px' }}>
                <div style={{ fontSize:'3rem', marginBottom:'16px' }}>{s.icon}</div>
                <h3 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:'12px', color:'#3D1A1A' }}>{s.title}</h3>
                <p style={{ color:'#666', lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOMBRES POPULARES */}
      <section style={{ padding:'80px 24px', background:'#FFF4F1' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, marginBottom:'48px', color:'#3D1A1A' }}>Nombres más populares</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'16px', marginBottom:'40px' }}>
            {FEATURED.map((n:any) => (
              <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ textAlign:'center', padding:'20px 16px' }}>
                <div style={{ marginBottom:'8px' }}><span className={'badge badge-'+n.gender}>{n.gender==='f'?'Niña':n.gender==='m'?'Niño':'Unisex'}</span></div>
                <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#3D1A1A', marginBottom:'4px' }}>{n.name}</div>
                <div style={{ fontSize:'0.8rem', color:'#999' }}>{n.origin}</div>
              </a>
            ))}
          </div>
          <div style={{ textAlign:'center', display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/nombres/nina" className="btn btn-outline">👧 Nombres de niña</a>
            <a href="/nombres/nino" className="btn btn-outline">👦 Nombres de niño</a>
            <a href="/nombres" className="btn btn-outline">Ver todos →</a>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section style={{ padding:'80px 24px', background:'#fff' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, marginBottom:'16px', color:'#3D1A1A' }}>Lo que dicen las parejas</h2>
          <p style={{ textAlign:'center', color:'#666', marginBottom:'56px' }}>Miles de futuros papás ya han encontrado su nombre favorito</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'24px' }}>
            {[
              {text:'"Llevábamos meses sin ponernos de acuerdo. Con BabyMatch encontramos el nombre en dos días."',author:'Sara & Pablo',city:'Madrid',name:'Eligieron: Lucía'},
              {text:'"La idea de votar por separado es genial. Así ninguno influye al otro y el match tiene mucho más valor."',author:'Marta & Jordi',city:'Barcelona',name:'Eligieron: Marc'},
              {text:'"Me encantó descubrir nombres de otros países. Acabamos eligiendo un nombre irlandés que no conocíamos."',author:'Ana & Íñigo',city:'Bilbao',name:'Eligieron: Maeve'},
            ].map((t,i) => (
              <div key={i} className="card" style={{ padding:'32px' }}>
                <div style={{ display:'flex', gap:'4px', marginBottom:'16px' }}>{'★★★★★'.split('').map((s,j)=><span key={j} style={{color:'#FFD700'}}>{s}</span>)}</div>
                <p style={{ color:'#444', lineHeight:1.8, marginBottom:'20px', fontStyle:'italic' }}>{t.text}</p>
                <div style={{ borderTop:'1px solid #e8d8d4', paddingTop:'16px' }}>
                  <div style={{ fontWeight:700, color:'#3D1A1A' }}>{t.author}</div>
                  <div style={{ fontSize:'0.85rem', color:'#999' }}>{t.city} · {t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(135deg,#3D1A1A 0%,#8B2020 100%)', textAlign:'center', color:'#fff' }}>
        <div className="container">
          <h2 style={{ fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:900, marginBottom:'20px' }}>¿Embarazados y aún sin nombre?</h2>
          <p style={{ fontSize:'1.1rem', opacity:0.85, maxWidth:'480px', margin:'0 auto 40px', lineHeight:1.7 }}>Más de 974 nombres esperando. Empieza ahora, es gratis y sin registro.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontSize:'1.1rem', padding:'16px 40px' }}>Empezar gratis →</a>
        </div>
      </section>
    </>
  )
}
