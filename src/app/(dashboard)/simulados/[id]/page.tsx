'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { 
  FileText, 
  Edit, 
  Printer, 
  ScanLine, 
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'

interface Simulado {
  id: string
  titulo: string
  descricao: string | null
  status: 'rascunho' | 'publicado'
  total_questoes: number
  gabarito: string[]
  questoes_ids: string[]
  configuracoes: {
    pontuacao_questao?: number
    cabecalho_escola?: string
    cabecalho_endereco?: string
  }
  created_at: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function SimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
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

      // Carregar turmas associadas
      if (data.turmas_ids && data.turmas_ids.length > 0) {
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
          .in('id', data.turmas_ids)
        setTurmas(turmasData || [])
      } else if (data.turma_id) {
        const { data: turmaData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
          .eq('id', data.turma_id)
          .single()
        if (turmaData) setTurmas([turmaData])
      }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || !simulado) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando simulado...</p>
        </div>
      </div>
    )
  }

  const pontuacaoQuestao = simulado.configuracoes?.pontuacao_questao || 1
  const valorTotal = simulado.total_questoes * pontuacaoQuestao

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/simulados')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{simulado.titulo}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${
              simulado.status === 'publicado' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {simulado.status === 'publicado' ? 'Publicado' : 'Rascunho'}
            </span>
          </div>
          {simulado.descricao && (
            <p className="text-gray-600 mt-1">{simulado.descricao}</p>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{simulado.total_questoes}</p>
              <p className="text-sm text-gray-500">Questões</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{valorTotal}</p>
              <p className="text-sm text-gray-500">Pontos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{turmas.length}</p>
              <p className="text-sm text-gray-500">Turmas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{formatDate(simulado.created_at)}</p>
              <p className="text-sm text-gray-500">Criado em</p>
            </div>
          </div>
        </div>
      </div>

      {/* Turmas */}
      {turmas.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Turmas</h3>
          <div className="flex flex-wrap gap-2">
            {turmas.map(turma => (
              <span key={turma.id} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                {turma.nome} - {turma.ano_serie}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gabarito */}
      {simulado.gabarito && simulado.gabarito.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Gabarito</h3>
          <div className="flex flex-wrap gap-2">
            {simulado.gabarito.map((resposta, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <span className="w-7 h-7 bg-indigo-600 text-white rounded flex items-center justify-center text-sm font-bold">
                  {resposta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ações</h3>
        
        {simulado.status === 'rascunho' && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/simulados/novo?edit=${params.id}`)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={publicar}
              disabled={publicando}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {publicando ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        )}

        {simulado.status === 'publicado' && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/simulados/novo?edit=${params.id}`)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>

            <button
              onClick={() => router.push(`/simulados/${params.id}/folha-respostas`)}
              className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Folha de Respostas
            </button>

            <button
              onClick={() => router.push(`/correcao-automatica`)}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Correção Automática
            </button>

            <button
              onClick={() => router.push(`/resultados?simulado=${params.id}`)}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Ver Resultados
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
