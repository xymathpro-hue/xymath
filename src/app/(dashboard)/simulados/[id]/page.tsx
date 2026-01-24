'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  FileText,
  Edit,
  CheckCircle,
  ClipboardCheck,
} from 'lucide-react'

export default function SimuladoDetalhePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
  }, [params.id])

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

      {/* AÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() =>
            router.push(`/simulados/${params.id}/editar`)
          }
          className="flex items-center gap-2 rounded bg-gray-700 px-4 py-3 text-white"
        >
          <Edit className="w-4 h-4" />
          Editar simulado
        </button>

        <button
          onClick={() =>
            router.push(`/simulados/${params.id}/folha-respostas`)
          }
          className="flex items-center gap-2 rounded bg-gray-800 px-4 py-3 text-white"
        >
          <FileText className="w-4 h-4" />
          Folha de respostas
        </button>

        <button
          onClick={() =>
            router.push(`/simulados/${params.id}/corrigir`)
          }
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-3 text-white"
        >
          <ClipboardCheck className="w-4 h-4" />
          Correção automática
        </button>

        {simulado.status !== 'publicado' && (
          <button
            onClick={async () => {
              const { error } = await supabase
                .from('simulados')
                .update({ status: 'publicado' })
                .eq('id', params.id)

              if (error) {
                alert('Erro ao publicar')
                return
              }

              alert('Simulado publicado')
              window.location.reload()
            }}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-3 text-white"
          >
            <CheckCircle className="w-4 h-4" />
            Publicar
          </button>
        )}
      </div>
    </div>
  )
}
