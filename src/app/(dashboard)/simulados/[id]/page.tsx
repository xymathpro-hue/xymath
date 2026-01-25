'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Simulado {
  id: string
  titulo: string
  status: string
}

export default function SimuladoDetalhePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, status')
        .eq('id', params.id)
        .single()

      if (!error && data) {
        setSimulado(data)
      }

      setLoading(false)
    }

    carregar()
  }, [params.id])

  if (loading) {
    return <div className="p-6">Carregando simulado...</div>
  }

  if (!simulado) {
    return <div className="p-6">Simulado não encontrado.</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{simulado.titulo}</h1>
        <p className="text-gray-500">Status: {simulado.status}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push(`/simulados/${params.id}/editar`)}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Editar simulado
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}/folha-respostas`)}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Folha de respostas
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}/gabarito`)}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Ver gabarito
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}/corrigir`)}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Correção automática
        </button>
      </div>

      <button
        onClick={() => router.push('/simulados')}
        className="text-sm text-gray-600 underline"
      >
        Voltar para simulados
      </button>
    </div>
  )
}
