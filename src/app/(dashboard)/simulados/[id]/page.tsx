'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

export default function SimuladoPage({ params }: PageProps) {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
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

  // =========================
  // PUBLICAR SIMULADO
  // =========================
  const publicarSimulado = async () => {
    setSalvando(true)

    const { error } = await supabase
      .from('simulados')
      .update({ status: 'publicado' })
      .eq('id', params.id)

    setSalvando(false)

    if (error) {
      alert('Erro ao publicar simulado')
      return
    }

    alert('Simulado publicado com sucesso!')

    // ✅ SEMPRE VOLTA PARA A PÁGINA DO SIMULADO
    router.push(`/simulados/${params.id}`)
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.back()}
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

      <div className="flex gap-3">
        {simulado.status !== 'publicado' && (
          <button
            onClick={publicarSimulado}
            disabled={salvando}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {salvando ? 'Publicando...' : 'Publicar simulado'}
          </button>
        )}

        <button
          onClick={() => router.push('/simulados')}
          className="rounded bg-gray-500 px-4 py-2 text-white"
        >
          Voltar para lista
        </button>
      </div>
    </div>
  )
}
