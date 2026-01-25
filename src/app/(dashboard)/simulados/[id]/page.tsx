'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Simulado {
  id: string
  titulo: string
  publicado: boolean
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
        .select('id, titulo, publicado')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        router.push('/simulados')
        return
      }

      setSimulado(data)
      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  const publicar = async () => {
    if (!simulado) return

    setPublicando(true)

    await supabase
      .from('simulados')
      .update({ publicado: true })
      .eq('id', simulado.id)

    setPublicando(false)

    // 🔴 IMPORTANTE: NÃO REDIRECIONA PARA CORREÇÃO
    // Apenas recarrega a página do simulado
    router.refresh()
  }

  if (loading || !simulado) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push('/simulados')}
        className="text-sm text-gray-600"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold">{simulado.titulo}</h1>

      {!simulado.publicado && (
        <button
          onClick={publicar}
          disabled={publicando}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {publicando ? 'Publicando...' : 'Publicar simulado'}
        </button>
      )}

      {simulado.publicado && (
        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push(`/simulados/${simulado.id}/folha-respostas`)
            }
            className="rounded bg-gray-700 px-4 py-2 text-white"
          >
            Folha de respostas
          </button>

          <button
            onClick={() =>
              router.push(`/simulados/${simulado.id}/corrigir`)
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
