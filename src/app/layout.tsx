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
              <a href="/nombres">Nombres</a>
              <a href="/nombres?gender=f">Niña</a>
              <a href="/nombres?gender=m">Niño</a>
              <a href="/app" className="nav-cta">Abrir app →</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer>
          <div className="footer-inner">
            <div><strong style={{color:'#fff'}}>BabyMatch</strong> — Encuentra el nombre perfecto para tu bebé</div>
            <div style={{display:'flex',gap:'24px'}}>
              <a href="/nombres">Nombres</a>
              <a href="/app">App</a>
            </div>
            <div>© {new Date().getFullYear()} BabyMatch</div>
          </div>
        </footer>
      </body>
    </html>
  )
}
