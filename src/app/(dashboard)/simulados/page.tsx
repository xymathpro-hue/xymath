'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PlusCircle, FileText, Calendar } from 'lucide-react'

interface Simulado {
  id: string
  titulo: string
  status: string
  total_questoes: number
  created_at: string
}

export default function SimuladosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, status, total_questoes, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSimulados(data)
      }

      setLoading(false)
    }

    carregar()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando simulados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>

        <button
          onClick={() => router.push('/simulados/novo')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Novo simulado
        </button>
      </div>

      {simulados.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nenhum simulado criado ainda.</p>
          <p className="text-sm text-gray-500">Clique em "Novo simulado" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulados.map((simulado) => (
            <div
              key={simulado.id}
              className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{simulado.titulo}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      simulado.status === 'publicado' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {simulado.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {simulado.total_questoes || 0} questões
                    </span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(simulado.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push(`/simulados/${simulado.id}`)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 transition-colors"
              >
                Abrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
