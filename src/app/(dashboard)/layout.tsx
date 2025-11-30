'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, usuario, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar autenticação e redirecionar
  useEffect(() => {
    if (!mounted) return

    // Se não está mais carregando e não tem usuário, redireciona
    if (!loading && !user) {
      console.log('Sem usuário autenticado - redirecionando para /login')
      setShouldRedirect(true)
      window.location.href = '/login'
    }
  }, [user, loading, mounted])

  // Timeout de segurança - se ficar mais de 3 segundos em loading, força redirecionamento
  useEffect(() => {
    if (!mounted) return

    const timeout = setTimeout(() => {
      if (loading || !user) {
        console.warn('Timeout - forçando redirecionamento para /login')
        window.location.href = '/login'
      }
    }, 3000)

    return () => clearTimeout(timeout)
  }, [mounted, loading, user])

  // Enquanto verifica autenticação
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não tem usuário, mostra tela de redirecionamento
  if (!user || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  // Usuário autenticado - renderiza o dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="pt-16 lg:pt-0 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
