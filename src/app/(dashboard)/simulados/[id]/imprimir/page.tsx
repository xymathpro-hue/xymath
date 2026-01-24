'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Printer } from 'lucide-react'

interface Questao {
  id: string
  enunciado: string
}

export default function ImprimirSimuladoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [titulo, setTitulo] = useState('')
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data: simulado } = await supabase
        .from('simulados')
        .select('titulo')
        .eq('id', params.id)
        .single()

      const { data: questoes } = await supabase
        .from('questoes')
        .select('id, enunciado')
        .eq('simulado_id', params.id)
        .order('ordem')

      setTitulo(simulado?.titulo ?? 'Simulado')
      setQuestoes(questoes ?? [])
      setLoading(false)
    }

    carregar()
  }, [params.id])

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/simulados/${params.id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-center">{titulo}</h1>

        {questoes.map((q, index) => (
          <div key={q.id} className="space-y-4">
            <p className="font-semibold">
              {index + 1}. {q.enunciado}
            </p>

            <div className="space-y-2">
              <div>( ) A</div>
              <div>( ) B</div>
              <div>( ) C</div>
              <div>( ) D</div>
              <div>( ) E</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

