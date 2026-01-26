'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface PageProps {
  params: {
    id: string
  }
}

export default function SimuladoPage({ params }: PageProps) {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [simulado, setSimulado] = useState<any>(null)

  // =========================
  // CARREGAR SIMULADO
  // =========================
  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        alert('Simulado não encontrado')
        router.push('/simulados')
        return
      }

      setSimulado(data)
      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{simulado.titulo}</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <p>
          <strong>Status:</strong>{' '}
          {simulado.status === 'publicado' ? 'Publicado' : 'Rascunho'}
        </p>
        <p>
          <strong>Valor total:</strong> {simulado.valor_total ?? 10} pontos
        </p>
      </div>

      {/* =========================
          AÇÕES DO SIMULADO
      ========================= */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push(`/simulados/${params.id}/editar`)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Editar
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}/folha-respostas`)}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Folha de respostas
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}/corrigir`)}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Correção automática
        </button>

        <button
          onClick={() => router.push('/simulados')}
          className="rounded bg-gray-500 px-4 py-2 text-white"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
