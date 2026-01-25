'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, CheckCircle } from 'lucide-react'

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

    // ✅ VOLTA PARA A PÁGINA DO SIMULADO (NÃO correção)
    router.push(`/simulados/${params.id}`)
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Publicar Simulado</h1>

      <div className="rounded border bg-white p-6 space-y-2">
        <p><strong>Título:</strong> {simulado.titulo}</p>
        <p><strong>Status:</strong> {simulado.status}</p>
      </div>

      <button
        onClick={publicarSimulado}
        disabled={salvando}
        className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" />
        {salvando ? 'Publicando...' : 'Publicar simulado'}
      </button>
    </div>
  )
}
