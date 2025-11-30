import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'xyMath - Plataforma de Avaliações',
  description: 'Crie e gerencie avaliações de matemática',
}

// Script para limpar sessão problemática
const clearBrokenSession = `
  (function() {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('sb-')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            // Se a sessão expirou ou está inválida, remove
            if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (e) {
      // Se der erro ao parsear, limpa tudo do Supabase
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
    }
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: clearBrokenSession }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
