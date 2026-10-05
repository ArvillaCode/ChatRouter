import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChatRouter',
  description: 'Multi-provider AI chat',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
