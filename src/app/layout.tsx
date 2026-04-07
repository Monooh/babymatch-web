import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://babymatch.app'),
  title: { template: '%s | BabyMatch', default: 'BabyMatch — App para elegir el nombre de tu bebé en pareja' },
  description: 'Encuentra el nombre perfecto para tu bebé. Desliza, haz match con tu pareja y descubre nombres con significado. Gratis.',
  openGraph: { siteName: 'BabyMatch', type: 'website', locale: 'es_ES' },
  robots: { index: true, follow: true },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav>
          <div className="nav-inner">
            <a href="/" className="nav-logo">
              <img src="/logo.png" alt="BabyMatch" />
              Baby<span>Match</span>
            </a>
            <div className="nav-links">
              <a href="/nombres">Todos los nombres</a>
              <a href="/nombres/nina">Niña</a>
              <a href="/nombres/nino">Niño</a>
              <a href="/app" className="nav-cta">Abrir app →</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer style={{ background:'#1a0a0a', color:'rgba(255,255,255,0.65)', paddingTop:'64px', marginTop:'80px', fontSize:'0.875rem' }}>
          <div className="container">
            {/* Top row */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'48px', paddingBottom:'48px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              {/* Brand column */}
              <div>
                <a href="/" style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', textDecoration:'none' }}>
                  <img src="/logo.png" alt="BabyMatch" style={{ width:'40px', height:'40px', borderRadius:'10px' }} />
                  <span style={{ fontSize:'1.2rem', fontWeight:800, color:'#fff' }}>Baby<span style={{color:'#e57373'}}>Match</span></span>
                </a>
                <p style={{ lineHeight:1.7, marginBottom:'24px', maxWidth:'280px' }}>
                  La app para encontrar el nombre de tu bebé en pareja. Desliza, vota y haz match.
                </p>
                <div style={{ display:'flex', gap:'16px' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff' }}>974</div>
                    <div style={{ fontSize:'0.75rem' }}>nombres</div>
                  </div>
                  <div style={{ width:'1px', background:'rgba(255,255,255,0.15)' }}></div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff' }}>100%</div>
                    <div style={{ fontSize:'0.75rem' }}>gratuito</div>
                  </div>
                  <div style={{ width:'1px', background:'rgba(255,255,255,0.15)' }}></div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff' }}>26</div>
                    <div style={{ fontSize:'0.75rem' }}>orígenes</div>
                  </div>
                </div>
              </div>
              {/* Nombres column */}
              <div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:'16px', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Nombres</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[['Todos los nombres','/nombres'],['Nombres de niña','/nombres/nina'],['Nombres de niño','/nombres/nino'],['Nombres españoles','/nombres/espanoles'],['Nombres vascos','/nombres/vascos'],['Nombres franceses','/nombres/franceses']].map(([label, href]) => (
                    <a key={href} href={href} style={{ color:'rgba(255,255,255,0.6)', transition:'color .2s' }}>{label}</a>
                  ))}
                </div>
              </div>
              {/* Más nombres column */}
              <div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:'16px', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>Por origen</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[['Nombres italianos','/nombres/italianos'],['Nombres escandinavos','/nombres/escandinavos'],['Nombres bíblicos','/nombres/biblicos'],['Nombres catalanes','/nombres/catalanes'],['Nombres árabes','/nombres/arabes'],['Nombres griegos','/nombres/griegos']].map(([label, href]) => (
                    <a key={href} href={href} style={{ color:'rgba(255,255,255,0.6)', transition:'color .2s' }}>{label}</a>
                  ))}
                </div>
              </div>
              {/* App column */}
              <div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:'16px', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>La app</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[['Probar gratis','/app'],['Cómo funciona','/#como-funciona'],['Para parejas','/#para-parejas']].map(([label, href]) => (
                    <a key={href} href={href} style={{ color:'rgba(255,255,255,0.6)', transition:'color .2s' }}>{label}</a>
                  ))}
                </div>
                <div style={{ marginTop:'24px', padding:'16px', background:'rgba(255,255,255,0.05)', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>{'★★★★★'.split('').map((s,i) => <span key={i} style={{ color:'#FFD700', fontSize:'1rem' }}>{s}</span>)}</div>
                  <p style={{ fontSize:'0.8rem', lineHeight:1.6, color:'rgba(255,255,255,0.7)', fontStyle:'italic' }}>"Encontramos el nombre en una semana. ¡Increíble!"</p>
                  <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginTop:'8px' }}>— Sara & Pablo, Madrid</p>
                </div>
              </div>
            </div>
            {/* Bottom row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 0', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>© {new Date().getFullYear()} BabyMatch · Hecho con 🍼 para futuros papás</div>
              <div style={{ display:'flex', gap:'24px' }}>
                <a href="/nombres" style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>Nombres</a>
                <a href="/app" style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>App</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
