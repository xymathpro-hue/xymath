'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

interface Simulado {
  id: string
  titulo: string
  publicado: boolean
  total_questoes: number
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
        .select('id, titulo, publicado, total_questoes')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSimulados(data as Simulado[])
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simulados</h1>

        <button
          onClick={() => router.push('/simulados/novo')}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          + Novo Simulado
        </button>
      </div>

      {simulados.length === 0 && (
        <div className="text-gray-500">
          Nenhum simulado encontrado.
        </div>
      )}

      <div className="space-y-4">
        {simulados.map(simulado => (
          <div
            key={simulado.id}
            className="rounded border bg-white p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold">{simulado.titulo}</div>
              <div className="text-sm text-gray-500">
                {simulado.total_questoes} questões
                {simulado.publicado && (
                  <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-green-700">
                    Publicado
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/simulados/${simulado.id}`}
                className="rounded bg-gray-700 px-3 py-1.5 text-white"
              >
                Abrir
              </Link>

              {simulado.publicado && (
                <Link
                  href={`/simulados/${simulado.id}/correcao`}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-white"
                >
                  Corrigir
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
