'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Simulado {
  id: string
  titulo: string
  status: 'rascunho' | 'publicado'
  valor_total: number | null
}

export default function SimuladoResumoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, status, valor_total')
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

  if (!simulado) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Resumo do Simulado</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <p><strong>Título:</strong> {simulado.titulo}</p>
        <p><strong>Status:</strong> {simulado.status}</p>
        <p>
          <strong>Valor total:</strong>{' '}
          {simulado.valor_total ?? 10} pontos
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push(`/simulados/${simulado.id}/editar`)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Editar simulado
        </button>

        <button
          onClick={() => router.push(`/simulados/${simulado.id}/folha-respostas`)}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Folha de respostas
        </button>

        <button
          onClick={() => router.push(`/simulados/${simulado.id}/corrigir`)}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Correção automática
        </button>

        <button
          onClick={() => router.push('/simulados')}
          className="rounded bg-gray-400 px-4 py-2 text-white"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
