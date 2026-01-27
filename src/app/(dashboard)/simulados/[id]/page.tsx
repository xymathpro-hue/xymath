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

export default function SimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicando, setPublicando] = useState(false)

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

  const publicar = async () => {
    setPublicando(true)

    const { error } = await supabase
      .from('simulados')
      .update({ status: 'publicado' })
      .eq('id', params.id)

    setPublicando(false)

    if (error) {
      alert('Erro ao publicar')
      return
    }

    setSimulado((prev) =>
      prev ? { ...prev, status: 'publicado' } : prev
    )
  }

  if (loading || !simulado) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{simulado.titulo}</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <p><strong>Status:</strong> {simulado.status}</p>
        <p>
          <strong>Valor total:</strong>{' '}
          {simulado.valor_total ?? 10} pontos
        </p>
      </div>

      {simulado.status === 'rascunho' && (
        <button
          onClick={publicar}
          disabled={publicando}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {publicando ? 'Publicando...' : 'Publicar simulado'}
        </button>
      )}

      {simulado.status === 'publicado' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/simulados/${params.id}/editar`)}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Editar
          </button>

          <button
            onClick={() =>
              router.push(`/simulados/${params.id}/folha-respostas`)
            }
            className="rounded bg-gray-700 px-4 py-2 text-white"
          >
            Folha de respostas
          </button>

          <button
            onClick={() =>
              router.push(`/simulados/${params.id}/corrigir`)
            }
            className="rounded bg-indigo-600 px-4 py-2 text-white"
          >
            Correção automática
          </button>
        </div>
      )}
    </div>
  )
}
