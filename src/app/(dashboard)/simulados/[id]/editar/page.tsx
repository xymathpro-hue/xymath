'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function EditarSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [simulado, setSimulado] = useState<any>(null)

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

    // ✅ REDIRECIONAMENTO CORRETO
    router.push(`/simulados/${params.id}`)
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Editar Simulado</h1>

      <div className="rounded border bg-white p-4 space-y-2">
        <p><strong>Título:</strong> {simulado.titulo}</p>
        <p><strong>Status:</strong> {simulado.status}</p>
        <p><strong>Valor total:</strong> {simulado.valor_total ?? 10} pontos</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={publicarSimulado}
          disabled={salvando}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {salvando ? 'Publicando...' : 'Publicar simulado'}
        </button>

        <button
          onClick={() => router.push(`/simulados/${params.id}`)}
          className="rounded bg-gray-500 px-4 py-2 text-white"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
