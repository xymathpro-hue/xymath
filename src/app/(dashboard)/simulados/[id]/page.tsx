'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  FileText,
  Printer,
  QrCode,
  Edit,
  ArrowLeft,
} from 'lucide-react'

export default function SimuladoDetalhePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
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

      <div className="rounded border bg-white p-4 space-y-1">
        <p><strong>Status:</strong> {simulado.status}</p>
        <p><strong>ID:</strong> {simulado.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push(`/simulados/${params.id}/editar`)}
          className="flex items-center gap-3 rounded border p-4 hover:bg-gray-50"
        >
          <Edit className="w-5 h-5" />
          Editar simulado
        </button>

        <button
          onClick={() => alert('Impressão do simulado — próximo passo')}
          className="flex items-center gap-3 rounded border p-4 hover:bg-gray-50"
        >
          <Printer className="w-5 h-5" />
          Imprimir simulado
        </button>

        <button
          onClick={() =>
            router.push(`/simulados/${params.id}/folha-respostas`)
          }
          className="flex items-center gap-3 rounded border p-4 hover:bg-gray-50"
        >
          <FileText className="w-5 h-5" />
          Folha de respostas
        </button>

        <button
          onClick={() =>
            router.push(`/simulados/${params.id}/corrigir`)
          }
          className="flex items-center gap-3 rounded border p-4 hover:bg-gray-50"
        >
          <QrCode className="w-5 h-5" />
          Correção automática
        </button>
      </div>
    </div>
  )
}
