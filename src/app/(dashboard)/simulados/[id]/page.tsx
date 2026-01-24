'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft } from 'lucide-react'

export default function SimuladoDetalhePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [publicando, setPublicando] = useState(false)

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

  const publicarSimulado = async () => {
    setPublicando(true)

    const { error } = await supabase
      .from('simulados')
      .update({ status: 'publicado' })
      .eq('id', params.id)

    setPublicando(false)

    if (error) {
      alert('Erro ao publicar simulado')
      return
    }

    alert('Simulado publicado com sucesso')
    router.refresh() // 🔒 FICA NA PÁGINA DO SIMULADO
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push('/simulados')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">{simulado.titulo}</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <p><strong>Status:</strong> {simulado.status}</p>
        <p><strong>Valor total:</strong> {simulado.valor_total ?? 10} pontos</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {simulado.status === 'rascunho' && (
          <button
            onClick={publicarSimulado}
            disabled={publicando}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {publicando ? 'Publicando...' : 'Publicar simulado'}
          </button>
        )}

        <button
          onClick={() => alert('Folha de respostas — próximo passo')}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Folha de respostas
        </button>

        <button
          onClick={() => alert('Correção automática — próximo passo')}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Correção automática
        </button>
      </div>
    </div>
  )
}
