'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      window.location.href = '/login'
    }
  }, [user, loading, mounted])

  useEffect(() => {
    if (!mounted) return
    const timeout = setTimeout(() => {
      if (loading || !user) {
        window.location.href = '/login'
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [mounted, loading, user])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return null
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
