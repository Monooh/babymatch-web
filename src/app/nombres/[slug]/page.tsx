'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nameToSlug, genderLabel, popularityStars } from '@/lib/slug'

const FAMOSOS: Record<string, string[]> = {
  lucia:['Lucía de Siracusa (santa mártir)','Lucía Etxebarria (escritora)','Lucía Méndez (cantante)'],
  sofia:['Sofía de Grecia (reina de España)','Sofía Vergara (actriz)','Sofía Loren (actriz italiana)'],
  hugo:['Victor Hugo (escritor francés)','Hugo Chávez (político)','Hugo Boss (empresario)'],
  mateo:['Mateo (evangelista bíblico)','Mateo Kovacic (futbolista)','Mateo Musacchio (futbolista)'],
  martina:['Martina Navratilova (tenista)','Martina García (actriz)','Martina de Roma (santa)'],
  pablo:['Pablo Picasso (pintor)','Pablo Neruda (poeta)','Pablo Iglesias (político)'],
  maria:['María de Nazaret','María Callas (soprano)','María Montessori (pedagoga)'],
  ana:['Ana Frank (escritora)','Ana de Austria (reina)','Ana Belén (cantante)'],
  alba:['Alba Flores (actriz)','La duquesa de Alba','Alba Rico (filósofa)'],
  luna:['Luna Maya (actriz)','Luna (satélite natural de la Tierra)'],
  leo:['Leonardo DiCaprio (actor)','Leo Messi (futbolista)','León XIII (papa)'],
  lucas:['San Lucas (evangelista)','Lucas Vázquez (futbolista)','George Lucas (director)'],
  emma:['Emma Watson (actriz)','Emma Stone (actriz)','Emma Bovary (personaje literario)'],
  carlos:['Carlos III (rey de España)','Carlos Sainz (piloto)','Carlos Gardel (cantante)'],
  jorge:['Jorge Luis Borges (escritor)','Jorge Lorenzo (piloto)','Jorge Drexler (músico)'],
  david:['David (rey bíblico)','David Bowie (músico)','David Silva (futbolista)'],
  sara:['Sara (esposa de Abraham)','Sara Baras (bailaora)','Sara Carbonero (periodista)'],
  laura:['Laura Pausini (cantante)','Laura Ingalls Wilder (escritora)'],
  elena:['Elena de Troya','Elena Anaya (actriz)'],
  daniel:['Daniel (profeta bíblico)','Daniel Craig (actor)','Daniel Carvajal (futbolista)'],
  miguel:['Miguel Ángel (artista)','Miguel de Cervantes (escritor)','Miguel Bosé (cantante)'],
  iker:['Iker Casillas (portero)','Iker Lecuona (piloto)','Iker Muniain (futbolista)'],
  valentina:['Valentina Tereshkova (cosmonauta)','Valentina Vezzali (esgrimista)'],
  alejandro:['Alejandro Magno','Alejandro Sanz (cantante)'],
}

export default function NamePage() {
  const params = useParams()
  const slug = params.slug as string
  const [name, setName] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [sameLetter, setSameLetter] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: all } = await supabase.from('names').select('*')
      const found = (all||[]).find((n:any) => nameToSlug(n.name) === slug)
      if (found) {
        setName(found)
        setRelated((all||[]).filter((n:any) => n.id !== found.id && (n.gender === found.gender || n.origin === found.origin)).sort(()=>Math.random()-0.5).slice(0,8))
        setSameLetter((all||[]).filter((n:any) => n.id !== found.id && n.name[0].toLowerCase() === found.name[0].toLowerCase() && n.gender === found.gender).sort((a:any,b:any)=>b.popularity-a.popularity).slice(0,6))
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div style={{ textAlign:'center', padding:'80px 24px' }}>
      <div style={{ fontSize:'3rem', marginBottom:'16px' }}>🍼</div>
      <p style={{ color:'#999' }}>Cargando...</p>
    </div>
  )

  if (!name) return (
    <div style={{ textAlign:'center', padding:'80px 24px' }}>
      <h1 style={{ color:'#3D1A1A', marginBottom:'16px' }}>Nombre no encontrado</h1>
      <a href="/nombres" className="btn btn-primary">Ver todos los nombres</a>
    </div>
  )

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
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>{(name.style_tags||[]).map((tag:string) => <span key={tag} style={{ background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'4px 12px', borderRadius:'20px', fontSize:'0.8rem' }}>{tag}</span>)}</div>
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
              {famososList.map((f:string,i:number) => (
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
              {sameLetter.map((n:any) => <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} style={{ background:'#fff', border:'1px solid #e8d8d4', padding:'8px 18px', borderRadius:'20px', color:'#3D1A1A', fontWeight:600, fontSize:'0.9rem' }}>{n.name}</a>)}
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
