'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PlusCircle } from 'lucide-react'

interface Simulado {
  id: string
  titulo: string
  status: string
  created_at: string
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
        .select('id, titulo, status, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSimulados(data)
      }

      setLoading(false)
    }

    carregar()
  }, [])

  if (loading) {
    return <div className="p-6">Carregando simulados...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simulados</h1>

        <button
          onClick={() => router.push('/simulados/novo')}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <PlusCircle className="w-4 h-4" />
          Novo simulado
        </button>
      </div>

      {simulados.length === 0 ? (
        <div className="rounded border bg-white p-6 text-gray-600">
          Nenhum simulado criado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {simulados.map((simulado) => (
            <div
              key={simulado.id}
              className="flex items-center justify-between rounded border bg-white p-4"
            >
              <div>
                <p className="font-medium">{simulado.titulo}</p>
                <p className="text-sm text-gray-500">
                  Status: {simulado.status}
                </p>
              </div>

              <button
                onClick={() => router.push(`/simulados/${simulado.id}`)}
                className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white"
              >
                Abrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
