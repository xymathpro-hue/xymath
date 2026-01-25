'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Simulado {
  id: string
  titulo: string
  publicado: boolean
}

export default function SimuladosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, publicado')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSimulados(data)
      }

      setLoading(false)
    }

    carregar()
  }, [supabase])

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Simulados</h1>

        <button
          onClick={() => router.push('/simulados/novo')}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          + Novo Simulado
        </button>
      </div>

      {simulados.length === 0 && (
        <p className="text-gray-500">Nenhum simulado encontrado.</p>
      )}

      <div className="space-y-4">
        {simulados.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded border bg-white p-4"
          >
            <div>
              <p className="font-semibold">{s.titulo}</p>
              {s.publicado && (
                <span className="text-xs text-green-600">Publicado</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/simulados/${s.id}`)}
                className="rounded bg-gray-700 px-3 py-1 text-white text-sm"
              >
                Abrir
              </button>

              <button
                onClick={() =>
                  router.push(`/simulados/${s.id}/folha-respostas`)
                }
                className="rounded bg-gray-500 px-3 py-1 text-white text-sm"
              >
                Folha
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
