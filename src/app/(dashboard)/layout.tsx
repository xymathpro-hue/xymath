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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Se carregou e tem user E usuario, está pronto
    if (!loading && user && usuario) {
      setReady(true)
      return
    }

    // Se carregou mas não tem user OU não tem usuario, vai pro login
    if (!loading && (!user || !usuario)) {
      window.location.href = '/login'
      return
    }
  }, [user, usuario, loading])

  // Timeout de 2 segundos - se não carregou, vai pro login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) {
        window.location.href = '/login'
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [ready])

  if (!ready) {
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
