'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  CheckCircle,
  XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Questao {
  id: string
  numero: number
}

interface AlunoResultado {
  id: string
  nome: string
  presente: boolean
  grupo: string
  respostas: { [key: string]: string }
  totalAcertos: number
  percentual: number
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function ResultadosDiagnosticoPage() {
  const params = useParams()
  const codigo = (params.codigo as string).toUpperCase()
  const searchParams = useSearchParams()
  const turmaId = searchParams.get('turma')
  const supabase = createClient()
  
  const [diagnostico, setDiagnostico] = useState<{ id: string; nome: string } | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [alunos, setAlunos] = useState<AlunoResultado[]>([])
  const [loading, setLoading] = useState(true)
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    presentes: 0,
    grupoA: 0,
    grupoB: 0,
    grupoC: 0,
    mediaAcertos: 0,
    totalQuestoes: 6
  })

  useEffect(() => {
    if (turmaId && codigo) {
      carregarResultados()
    }
  }, [turmaId, codigo])

  async function carregarResultados() {
    try {
      // Carregar diagnóstico
      const { data: diagData } = await supabase
        .from('base_diagnosticos')
        .select('id, nome')
        .eq('codigo', codigo)
        .single()

      if (!diagData) {
        setLoading(false)
        return
      }
      setDiagnostico(diagData)

      // Carregar turma
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('id', turmaId)
        .single()

      setTurma(turmaData)

      // Carregar questões
      const { data: questoesData } = await supabase
        .from('base_diagnostico_questoes')
        .select('id, numero')
        .eq('diagnostico_id', diagData.id)
        .order('numero')

      setQuestoes(questoesData || [])
      const totalQuestoes = questoesData?.length || 6

      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome')

      if (!alunosData) return

      // Carregar grupos
      const bimestre = Math.ceil((new Date().getMonth() + 1) / 3)
      const anoLetivo = new Date().getFullYear()

      const { data: gruposData } = await supabase
        .from('base_alunos_grupo')
        .select('aluno_id, grupo')
        .eq('turma_id', turmaId)
        .eq('ano_letivo', anoLetivo)
        .eq('bimestre', bimestre)

      const gruposMap = new Map(gruposData?.map(g => [g.aluno_id, g.grupo]) || [])

      // Carregar aula do diagnóstico
      const { data: aulaData } = await supabase
        .from('base_aulas')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('diagnostico_id', diagData.id)
        .eq('tipo', 'diagnostico')
        .order('data_aula', { ascending: false })
        .limit(1)
        .single()

      if (!aulaData) {
        setAlunos([])
        setLoading(false)
        return
      }

      // Carregar presenças
      const { data: presencasData } = await supabase
        .from('base_presencas')
        .select('aluno_id, presente')
        .eq('aula_id', aulaData.id)

      const presencasMap = new Map(presencasData?.map(p => [p.aluno_id, p.presente]) || [])

      // Carregar respostas
      const { data: respostasData } = await supabase
        .from('base_respostas_diagnostico')
        .select('aluno_id, questao_id, resposta')
        .eq('aula_id', aulaData.id)

      // Montar resultados dos alunos
      const alunosComResultados = alunosData.map(aluno => {
        const presente = presencasMap.get(aluno.id) ?? true
        const grupo = gruposMap.get(aluno.id) || '-'
        
        const respostas: { [key: string]: string } = {}
        let totalAcertos = 0

        if (questoesData) {
          questoesData.forEach(questao => {
            const resposta = respostasData?.find(
              r => r.aluno_id === aluno.id && r.questao_id === questao.id
            )
            respostas[`q${questao.numero}`] = resposta?.resposta || ''
            if (resposta?.resposta === 'acertou') totalAcertos++
          })
        }

        const percentual = presente ? Math.round((totalAcertos / totalQuestoes) * 100) : 0

        return {
          ...aluno,
          presente,
          grupo,
          respostas,
          totalAcertos,
          percentual
        }
      })

      setAlunos(alunosComResultados)

      // Calcular estatísticas
      const presentes = alunosComResultados.filter(a => a.presente)
      const somaAcertos = presentes.reduce((acc, a) => acc + a.totalAcertos, 0)
      
      setEstatisticas({
        total: alunosComResultados.length,
        presentes: presentes.length,
        grupoA: alunosComResultados.filter(a => a.grupo === 'A').length,
        grupoB: alunosComResultados.filter(a => a.grupo === 'B').length,
        grupoC: alunosComResultados.filter(a => a.grupo === 'C').length,
        mediaAcertos: presentes.length > 0 ? Math.round(somaAcertos / presentes.length * 10) / 10 : 0,
        totalQuestoes
      })

    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
    } finally {
      setLoading(false)
    }
  }

  function getRespostaIcon(resposta: string) {
    switch (resposta) {
      case 'acertou':
        return <span className="text-green-500">✅</span>
      case 'parcial':
        return <span className="text-yellow-500">⚠️</span>
      case 'errou':
        return <span className="text-red-500">❌</span>
      default:
        return <span className="text-gray-300">—</span>
    }
  }

  function getGrupoStyle(grupo: string) {
    switch (grupo) {
      case 'A':
        return 'bg-red-100 text-red-700'
      case 'B':
        return 'bg-yellow-100 text-yellow-700'
      case 'C':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/base/diagnosticos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultados {codigo}</h1>
          <p className="text-gray-500 mt-1">
            {diagnostico?.nome} - {turma?.nome}
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Presentes</p>
          <p className="text-2xl font-bold text-green-600">{estatisticas.presentes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Média Acertos</p>
          <p className="text-2xl font-bold text-indigo-600">{estatisticas.mediaAcertos}/{estatisticas.totalQuestoes}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-sm text-red-600">Grupo A</p>
          <p className="text-2xl font-bold text-red-700">{estatisticas.grupoA}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
          <p className="text-sm text-yellow-600">Grupo B</p>
          <p className="text-2xl font-bold text-yellow-700">{estatisticas.grupoB}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-sm text-green-600">Grupo C</p>
          <p className="text-2xl font-bold text-green-700">{estatisticas.grupoC}</p>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Resultados por Aluno</h2>
        </div>

        {alunos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum resultado encontrado. Lance as respostas primeiro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aluno</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">Presença</th>
                  {questoes.map((q) => (
                    <th key={q.id} className="px-3 py-3 text-center text-sm font-medium text-gray-700">
                      Q{q.numero}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">Acertos</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">Grupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className={!aluno.presente ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {aluno.nome}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {aluno.presente ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                    {questoes.map((q) => (
                      <td key={q.id} className="px-3 py-3 text-center">
                        {getRespostaIcon(aluno.respostas[`q${q.numero}`])}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-gray-900">{aluno.totalAcertos}/{estatisticas.totalQuestoes}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getGrupoStyle(aluno.grupo)}`}>
                        {aluno.grupo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Legenda</h4>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="text-sm text-gray-600">Acertou</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-sm text-gray-600">Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span className="text-sm text-gray-600">Errou</span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-4">
        <Link
          href={`/admin/base/diagnosticos/${codigo.toLowerCase()}/lancar?turma=${turmaId}`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Editar Lançamento
        </Link>
        <Link
          href="/admin/base/mapa"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Ver Mapa da Turma
        </Link>
      </div>
    </div>
  )
    }
