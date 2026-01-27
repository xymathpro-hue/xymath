// src/app/(dashboard)/admin/base/page.tsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/is-admin'

export default async function MetodoBasePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/simulados')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Método BASE</h1>

      <div className="rounded border bg-white p-6 space-y-4">
        <p className="text-gray-700">
          Esta área é exclusiva do administrador.
        </p>

        <ul className="list-disc pl-6 text-sm text-gray-600 space-y-1">
          <li>Diagnóstico inicial</li>
          <li>Microavaliações por habilidade</li>
          <li>Regras pedagógicas do Método BASE</li>
          <li>Análises e relatórios</li>
        </ul>

        <div className="rounded bg-yellow-50 p-4 text-sm text-yellow-800">
          ⚠️ Esta área será construída por sprints.  
          Nenhuma funcionalidade ativa ainda.
        </div>
      </div>
    </div>
  )
}
