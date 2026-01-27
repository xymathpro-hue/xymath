// src/app/(dashboard)/layout.tsx

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/is-admin'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = isAdmin(user)

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-64 border-r bg-gray-50 p-4 space-y-4">
        <h2 className="font-bold text-lg">XYMath</h2>

        <nav className="space-y-2 text-sm">
          <a href="/simulados" className="block hover:underline">
            Simulados
          </a>

          <a href="/turmas" className="block hover:underline">
            Turmas
          </a>

          {/* 🔒 SOMENTE ADMIN */}
          {admin && (
            <>
              <hr />
              <span className="text-xs text-gray-500">ADMIN</span>

              <a
                href="/admin/base"
                className="block text-indigo-600 hover:underline"
              >
                Método BASE
              </a>

              <a
                href="/admin"
                className="block text-indigo-600 hover:underline"
              >
                Painel Admin
              </a>
            </>
          )}
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  )
}
