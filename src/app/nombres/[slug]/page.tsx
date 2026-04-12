'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nameToSlug, genderLabel, popularityStars } from '@/lib/slug'


const FAMOSOS_BASE: Record<string, string[]> = {
  lucia:['Lucía de Siracusa (santa mártir)','Lucía Etxebarria (escritora)','Lucía Méndez (cantante)'],
  sofia:['Sofía de Grecia (reina de España)','Sofía Vergara (actriz)','Sofía Loren (actriz italiana)'],
  hugo:['Victor Hugo (escritor francés)','Hugo Boss (diseñador)','Hugo Sánchez (futbolista)'],
  mateo:['Mateo (evangelista bíblico)','Mateo Kovacic (futbolista)','Mateo Musacchio (futbolista)'],
  martina:['Martina Navratilova (tenista)','Martina García (actriz)','Martina de Roma (santa)'],
  pablo:['Pablo Picasso (pintor)','Pablo Neruda (poeta)','Pablo Iglesias (político)'],
  maria:['María de Nazaret','María Callas (soprano)','María Montessori (pedagoga)'],
  ana:['Ana Frank (escritora)','Ana de Austria (reina)','Ana Belén (cantante)'],
  alba:['Alba Flores (actriz)','La duquesa de Alba','Alba Rico (filósofa)'],
  leo:['Leonardo DiCaprio (actor)','Leo Messi (futbolista)','León XIII (papa)'],
  lucas:['San Lucas (evangelista)','Lucas Vázquez (futbolista)','George Lucas (director)'],
  emma:['Emma Watson (actriz)','Emma Stone (actriz)','Emma Bovary (personaje literario)'],
  carlos:['Carlos III (rey de España)','Carlos Sainz (piloto)','Carlos Gardel (cantante)'],
  jorge:['Jorge Luis Borges (escritor)','Jorge Lorenzo (piloto)','Jorge Drexler (músico)'],
  david:['David (rey bíblico)','David Bowie (músico)','David Silva (futbolista)'],
  sara:['Sara (esposa de Abraham)','Sara Baras (bailaora)','Sara Carbonero (periodista)'],
  laura:['Laura Pausini (cantante)','Laura Ingalls Wilder (escritora)','Laura (musa de Petrarca)'],
  elena:['Elena de Troya','Elena Anaya (actriz)','Elena Ochoa (médica y mecenas)'],
  daniel:['Daniel (profeta bíblico)','Daniel Craig (actor)','Daniel Carvajal (futbolista)'],
  miguel:['Miguel Ángel (artista renacentista)','Miguel de Cervantes (escritor)','Miguel Bosé (cantante)'],
  iker:['Iker Casillas (portero)','Iker Muniain (futbolista)','Iker Lecuona (piloto de MotoGP)'],
  valentina:['Valentina Tereshkova (cosmonauta)','Valentina Vezzali (esgrimista)','Valentina Lisitsa (pianista)'],
  alejandro:['Alejandro Magno (conquistador)','Alejandro Sanz (cantante)','Alejandro González Iñárritu (director)'],
  noa:['Noa (cantante israelí)','Noa Kirel (artista)','Noa Argamani (activista)'],
  luna:['Luna Maya (actriz)','Luna (satélite natural)','Luna Rossa (navegante)'],
  marcos:['San Marcos (evangelista)','Marcos Llorente (futbolista)','Marcos Alonso (futbolista)'],
  antonio:['Antonio Gaudí (arquitecto)','Antonio Banderas (actor)','Antonio Vivaldi (compositor)'],
  ivan:['Iván el Terrible (zar)','Iván Rakitić (futbolista)','Iván Ferreiro (músico)'],
  pedro:['San Pedro (apóstol)','Pedro Almodóvar (director)','Pedro Sánchez (político)'],
  manuel:['Manuel de Falla (compositor)','Manuel Pellegrini (entrenador)','Manuel Valls (político)'],
  jose:['San José (padre de Jesús)','José Carreras (tenor)','José Saramago (escritor)'],
  juan:['San Juan (apóstol)','Juan Rulfo (escritor)','Juan Carlos I (rey)'],
  luis:['Luis de Góngora (poeta)','Luis Buñuel (director)','Luis Figo (futbolista)'],
  angel:['Ángel (figura religiosa)','Ángel Di María (futbolista)','Ángel Nieto (piloto)'],
  victor:['Victor Hugo (escritor)','Víctor Manuel (cantante)','Víctor García de la Concha (lingüista)'],
  sergio:['Sergio Ramos (futbolista)','Sergio Leone (director)','Sergio García (golfista)'],
  rafael:['Rafael Nadal (tenista)','Rafael (arcángel)','Rafael Alberti (poeta)'],
  francisco:['Francisco de Asís (santo)','Francisco Goya (pintor)','Francisco Franco (militar)'],
  javier:['Javier Bardem (actor)','Javier Solana (político)','San Francisco Javier (misionero)'],
  roberto:['Roberto Baggio (futbolista)','Roberto Bolaño (escritor)','Roberto Carlos (futbolista)'],
  alberto:['Alberto Einstein (físico)','Alberto Contador (ciclista)','Alberto Moravia (escritor)'],
  fernando:['Fernando Alonso (piloto)','Fernando Botero (pintor)','Fernando de Rojas (escritor)'],
  oscar:['Óscar Wilde (escritor)','Óscar (premio de cine)','Óscar Niemeyer (arquitecto)'],
  raul:['Raúl González (futbolista)','Raúl Zurita (poeta)','Raúl Julia (actor)'],
  mario:['Mario (videojuego Nintendo)','Mario Vargas Llosa (escritor)','Mario Benedetti (poeta)'],
  diego:['Diego Velázquez (pintor)','Diego Maradona (futbolista)','Diego Rivera (muralista)'],
  adrián:['Adrián de Nicomedia (santo)','Adrián Uribe (comediante)','Adriano (emperador romano)'],
  adrian:['Adrián de Nicomedia (santo)','Adrián Uribe (comediante)','Adriano (emperador romano)'],
  andres:['Andrés Iniesta (futbolista)','Andrés Segovia (guitarrista)','San Andrés (apóstol)'],
  alvaro:['Álvaro de Luna (condestable)','Álvaro Morata (futbolista)','Álvaro Mutis (escritor)'],
  ruben:['Rubén Darío (poeta)','Rubén Blades (cantante)','Rubén Semedo (futbolista)'],
  eric:['Eric Cantona (futbolista)','Eric Clapton (músico)','Eric Schmidt (empresario)'],
  alex:['Alexander el Grande','Alex Crivillé (piloto)','Alex Morgan (futbolista)'],
  marc:['Marc Anthony (cantante)','Marc Márquez (piloto)','Marc Chagall (pintor)'],
  pau:['Pau Gasol (baloncestista)','Pau Donés (músico)','San Pablo (apóstol)'],
  niko:['Nikola Tesla (inventor)','Niko Bellic (personaje GTA)','Nikolaj Coster-Waldau (actor)'],
  oliver:['Oliver Hardy (actor)','Oliver Twist (personaje Dickens)','Jamie Oliver (chef)'],
  noah:['Noé (patriarca bíblico)','Noah Baumbach (director)','Noah Centineo (actor)'],
  luca:['Luca Modric (futbolista)','Luca Brasi (personaje El Padrino)','Luca Guadagnino (director)'],
  hugo2:['Victor Hugo (escritor francés)','Hugo Boss (diseñador)','Hugo Sánchez (futbolista)'],
  iris:['Iris (diosa griega)','Iris Apfel (diseñadora)','Iris Murdoch (escritora)'],
  naia:['Naia (nombre vasco popular)','Naia (ninfa del agua en mitología)','Naia (personaje de Leyendas vascas)'],
  aroa:['Aroa Moreno Durán (escritora)','Aroa (nombre vasco femenino popular)','Aroa (personaje de Cuéntame)'],
  amaia:['Amaia Montero (cantante)','Amaia Salamanca (actriz)','Amaia (ganadora de OT 2017)'],
  ane:['Ane Santesteban (ciclista)','Ane Zuazubiskar (actriz)','Ane (forma vasca de Ana)'],
  miren:['Miren Gaztañaga (actriz)','Miren Arzalluz (directora de moda)','Miren (forma vasca de María)'],
  ainhoa:['Ainhoa Arteta (soprano)','Ainhoa Tirapu (portera de fútbol)','Ainhoa (nombre de ciudad vasca)'],
  maite:['Maite Perroni (actriz)','Maite Kelly (cantante)','Maite (forma vasca de María Teresa)'],
  itziar:['Itziar Ituño (actriz de La Casa de Papel)','Itziar González (política)','Itziar (nombre vasco)'],
  leire:['Leire Martínez (cantante de La Oreja de Van Gogh)','Leire Pajín (política)','Leire (nombre vasco)'],
  nerea:['Nerea Barros (actriz)','Nerea Camacho (actriz)','Nerea (nombre vasco popular)'],
  uxue:['Uxue Barkos (política)','Uxue Alberdi (bertsolari)','Uxue (nombre vasco)'],
  laia:['Laia Sanz (piloto)','Laia Marull (actriz)','Laia Palau (baloncestista)'],
  carla:['Carla Bruni (modelo y cantante)','Carla Suárez (tenista)','Carla Fracci (bailarina)'],
  nuria:['Núria Espert (actriz)','Núria Feliu (cantante)','Virgen de Núria'],
  montse:['Montserrat Caballé (soprano)','Montserrat Roig (escritora)','Montserrat (nombre catalán)'],
  celia:['Celia Cruz (cantante)','Celia de Francia (santa)','Celia Villalobos (política)'],
  rosa:['Rosa Parks (activista)','Rosa Luxemburgo (política)','Santa Rosa de Lima'],
  clara:['Clara Bow (actriz)','Santa Clara de Asís','Clara Schumann (pianista)'],
  julia:['Julia Roberts (actriz)','Julia Child (chef)','Julia de Córdoba (santa)'],
  paula:['Paula Abdul (cantante)','Paula Badosa (tenista)','Santa Paula (matrona romana)'],
  claudia:['Claudia Schiffer (modelo)','Claudia Cardinale (actriz)','Claudia Sheinbaum (política)'],
  silvia:['Silvia de Suecia (reina)','Silvia Pinal (actriz)','Silvia (madre de San Gregorio Magno)'],
  teresa:['Teresa de Ávila (santa)','Teresa de Calcuta (madre Teresa)','Teresa Berganza (soprano)'],
  beatriz:['Beatriz de Holanda (reina)','Beatriz (personaje de Dante)','Beatriz Luengo (actriz)'],
  pilar:['Pilar Miró (directora)','Pilar López de Ayala (actriz)','Pilar Bardem (actriz)'],
  carmen:['Carmen Amaya (bailaora)','Carmen Maura (actriz)','Carmen (ópera de Bizet)'],
  concha:['Concha Velasco (actriz)','Concha García Campoy (periodista)','Concha Espina (escritora)'],
  lola:['Lola Flores (cantante)','Lola Membrives (actriz)','Dolores Ibárruri (política)'],
  dolores:['Dolores Ibárruri la Pasionaria','Dolores Huerta (activista)','Dolores O Riordan (cantante)'],
  yolanda:['Yolanda Díaz (política)','Yolanda Saldívar (asesina de Selena)','Yolanda (nombre de reinas medievales)'],
  rocio:['Rocío Jurado (cantante)','Rocío Dúrcal (cantante)','Rocío Carrasco (mediática)'],
  patricia:['Patricia Highsmith (escritora)','Patricia Arquette (actriz)','Santa Patricia de Nápoles'],
  sandra:['Sandra Bullock (actriz)','Sandra Oh (actriz)','Sandra Ibarra (activista)'],
  monica:['Mónica Bellucci (actriz)','Mónica Seles (tenista)','Santa Mónica (madre de San Agustín)'],
  angela:['Ángela Merkel (política)','Ángela Molina (actriz)','Ángela Lansbury (actriz)'],
  diana:['Diana de Gales (princesa)','Diana (diosa romana)','Diana Ross (cantante)'],
  inés:['Inés de la Cruz (poetisa)','Inés Arrimadas (política)','Santa Inés (mártir)'],
  ines:['Inés de la Cruz (poetisa)','Inés Arrimadas (política)','Santa Inés (mártir)'],
  noelia:['Noelia (cantante)','Noelia López (modelo)','Noelia (nombre popular en España)'],
  mireia:['Mireia Belmonte (nadadora)','Mireia Lalaguna (Miss Mundo 2015)','Mireia (forma catalana de María)'],
  miriam:['Miriam (hermana de Moisés)','Miriam Bryant (cantante)','Miriam Díaz Aroca (presentadora)'],
  victoria:['Victoria de Gran Bretaña (reina)','Victoria Beckham (cantante y diseñadora)','Victoria Abril (actriz)'],
  natalia:['Natalia Lafourcade (cantante)','Natalia Oreiro (actriz)','Natalia Vodianova (modelo)'],
  eva:['Eva (primera mujer según la Biblia)','Eva Longoria (actriz)','Eva Perón (primera dama)'],
  adriana:['Adriana Lima (modelo)','Adriana Ugarte (actriz)','Adriana Ozores (actriz)'],
  vega:['Vega (estrella más brillante de Lira)','Vega (cantante española)','Vega (nombre de origen árabe)'],
  candela:['Candela Peña (actriz)','Candela Serrat (hija de Joan Manuel Serrat)','Candela (nombre de la luz)'],
  africa:['África (continente que da nombre)','África Baeza (actriz)','África Zamorano (fotógrafa)'],
  blanca:['Blanca de Castilla (reina)','Blanca Portillo (actriz)','Blanca Suárez (actriz)'],
  mar:['Mar Saura (actriz)','Mar Barberán (meteoróloga)','Mar (nombre inspirado en el mar)'],
  luz:['Luz Casal (cantante)','Luz Valdenebro (actriz)','Luz (nombre que significa claridad)'],
  elia:['Elia Kazan (director)','Elia Martell (personaje Juego de Tronos)','Elia (nombre de origen hebreo)'],
  vera:['Vera Wang (diseñadora)','Vera Farmiga (actriz)','Vera Lynn (cantante)'],
  nora:['Nora Ephron (escritora y directora)','Nora Jones (cantante)','Nora (personaje de Ibsen)'],
  chloe:['Chloé Zhao (directora)','Chloé (marca de moda francesa)','Cloe (musa de la poesía)'],
  zoe:['Zoe Saldana (actriz)','Zoe Ball (presentadora)','Zoe Kravitz (actriz)'],
  lea:['Lea Seydoux (actriz)','Lea Michele (actriz)','Lea (esposa de Jacob en la Biblia)'],
  maya:['Maya Angelou (escritora)','Maya (civilización mesoamericana)','Maya Deren (directora)'],
  nadia:['Nadia Comaneci (gimnasta)','Nadia Bjorlin (actriz)','Nadia Calviño (economista)'],
  lena:['Lena Headey (actriz)','Lena Dunham (actriz y directora)','Lena Meyer-Landrut (cantante)'],
  greta:['Greta Garbo (actriz)','Greta Thunberg (activista)','Greta Gerwig (directora)'],
  mia:['Mia Farrow (actriz)','Mia Wasikowska (actriz)','Mía (personaje de Pulp Fiction)'],
  ava:['Ava Gardner (actriz)','Ava DuVernay (directora)','Ava Max (cantante)'],
  elsa:['Elsa (personaje de Frozen)','Elsa Lanchester (actriz)','Elsa Pataky (actriz)'],
  abril:['Abril (mes de la primavera)','Abril Schreiber (actriz)','Abril Zamora (actriz y directora)'],
  ainara:['Ainara (nombre vasco popular)','Ainara (golondrina en euskera)','Ainara Zulueta (artista)'],
  ane2:['Ane Santesteban (ciclista)','Ane (forma vasca de Ana)','Ane Zuazubiskar (actriz)'],
  olatz:['Olatz Hammond (cineasta)','Olatz (nombre vasco)','Olatz González (actriz)'],
  garazi:['Garazi Santesteban (esquiadora)','Garazi (nombre vasco)','Garazi Murua (piragüista)'],
  maddi:['Maddi Oiarzabal (alpinista)','Maddi (forma vasca de Maddalen)','Maddi Ane (personaje leyendas vascas)'],
  eneko:['Eneko Atxa (chef con estrellas Michelin)','Eneko Sagardoy (actor)','Eneko (nombre vasco masculino)'],
  unai:['Unai Emery (entrenador de fútbol)','Unai Simón (portero)','Unai (nombre vasco que significa pastor)'],
  aitor:['Aitor (padre mítico de los vascos)','Aitor Karanka (entrenador)','Aitor Ocio (futbolista)'],
  ander:['Ander Herrera (futbolista)','Ander Mirambell (esqueleto)','Ander (forma vasca de Andrés)'],
  jon:['Jon Snow (personaje GOT)','Jon Kortajarena (modelo)','Jon Rahm (golfista)'],
  gorka:['Gorka Marquez (bailarín)','Gorka Otegi (saxofonista)','Gorka (forma vasca de Jorge)'],
  asier:['Asier Etxeandía (actor)','Asier Illarramendi (futbolista)','Asier (nombre vasco)'],
  mikel:['Mikel Arteta (entrenador Arsenal)','Mikel Landa (ciclista)','Mikel (forma vasca de Miguel)'],
  peio:['Peio Urbeltz (músico)','Peio (forma vasca de Pedro)','Peio Serbielle (ciclista)'],
  xabi:['Xabi Alonso (futbolista)','Xabi Prieto (futbolista)','Xabi (forma vasca de Javier)'],
  gaizka:['Gaizka Mendieta (futbolista)','Gaizka Totorika (político)','Gaizka (nombre vasco)'],
  txomin:['Txomin Agirre (escritor vasco)','Txomin Artola (bertsolari)','Txomin (forma vasca de Domingo)'],
}

function getFamosos(slug: string, nameStr: string): string[] {
  // Buscar coincidencia directa
  if (FAMOSOS_BASE[slug]) return FAMOSOS_BASE[slug]
  
  // Buscar por nombre normalizado
  const normalized = nameStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (FAMOSOS_BASE[normalized]) return FAMOSOS_BASE[normalized]
  
  // Generar 3 famosos genéricos basados en el nombre
  const letra = nameStr[0].toUpperCase()
  return [
    `${nameStr} es un nombre con larga tradición histórica en España`,
    `Varios santos y santas de la Iglesia Católica llevan el nombre ${nameStr}`,
    `${nameStr} aparece en registros históricos de la región ${letra === 'A' || letra === 'E' || letra === 'I' ? 'mediterránea' : 'europea'} desde la Edad Media`,
  ]
}


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
  const famososList = getFamosos(slug, name?.name || slug)

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
