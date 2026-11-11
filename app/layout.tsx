import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoloLevel — Daily Quest',
  description: 'Bangun konsistensi dan naikkan levelmu setiap hari.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Cegah pinch zoom di iOS Safari (gesture events)
                document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });

                // Cegah 2-finger multi-touch pinch zoom di layar sentuh / mobile browser
                document.addEventListener('touchmove', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });

                // Cegah pinch zoom via trackpad laptop (Ctrl + wheel)
                document.addEventListener('wheel', function(e) {
                  if (e.ctrlKey) {
                    e.preventDefault();
                  }
                }, { passive: false });
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
