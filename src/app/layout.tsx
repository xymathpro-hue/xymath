'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, usuario, loading } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Aguarda o loading terminar
    if (!loading) {
      // Se não tem user OU não tem usuario, redireciona
      if (!user || !usuario) {
        console.log('Não autenticado - redirecionando...')
        window.location.replace('/login')
        return
      }
      setChecked(true)
    }
  }, [user, usuario, loading])

  // Timeout de segurança
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!checked) {
        console.log('Timeout - redirecionando para login')
        window.location.replace('/login')
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [checked])

  // Enquanto verifica, mostra loading
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="pt-16 lg:pt-0 p-6">{children}</div>
      </main>
    </div>
  )
}
