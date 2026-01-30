// src/app/(dashboard)/admin/base/diagnosticos/[codigo]/resultados/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Download,
  AlertCircle,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Edit,
  Printer
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  descricao: string
  nivel: string
  ano_escolar: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Resposta {
  aluno_id: string
  questao_numero: number
  acertou: string
  tipo_erro?: string
}

// Estrutura das questões por competência
const estruturaQuestoes = [
  { numero: 1, competencia: 'L', nome: 'Leitura', cor: 'bg-blue-500', corClara: 'bg-blue-100 text-blue-700' },
  { numero: 2, competencia: 'L', nome: 'Leitura', cor: 'bg-blue-500', corClara: 'bg-blue-100 text-blue-700' },
  { numero: 3, competencia: 'F', nome: 'Fluência', cor: 'bg-green-500', corClara: 'bg-green-100 text-green-700' },
  { numero: 4, competencia: 'F', nome: 'Fluência', cor: 'bg-green-500', corClara: 'bg-green-100 text-green-700' },
  { numero: 5, competencia: 'R', nome: 'Raciocínio', cor: 'bg-yellow-500', corClara: 'bg-yellow-100 text-yellow-700' },
  { numero: 6, competencia: 'R', nome: 'Raciocínio', cor: 'bg-yellow-500', corClara: 'bg-yellow-100 text-yellow-700' },
  { numero: 7, competencia: 'A', nome: 'Aplicação', cor: 'bg-orange-500', corClara: 'bg-orange-100 text-orange-700' },
  { numero: 8, competencia: 'A', nome: 'Aplicação', cor: 'bg-orange-500', corClara: 'bg-orange-100 text-orange-700' },
  { numero: 9, competencia: 'J', nome: 'Justificativa', cor: 'bg-purple-500', corClara: 'bg-purple-100 text-purple-700' },
  { numero: 10, competencia: 'J', nome: 'Justificativa', cor: 'bg-purple-500', corClara: 'bg-purple-100 text-purple-700' },
]

const competencias = [
  { codigo: 'L', nome: 'Leitura/Interpretação', cor: 'bg-blue-500', questoes: [1, 2] },
  { codigo: 'F', nome: 'Fluência/Cálculo', cor: 'bg-green-500', questoes: [3, 4] },
  { codigo: 'R', nome: 'Raciocínio/Compreensão', cor: 'bg-yellow-500', questoes: [5, 6] },
  { codigo: 'A', nome: 'Aplicação/Problemas', cor: 'bg-orange-500', questoes: [7, 8] },
  { codigo: 'J', nome: 'Justificativa/Conexão', cor: 'bg-purple-500', questoes: [9, 10] },
]

const tiposErro = [
  { codigo: 'E1', nome: 'Leitura', descricao: 'Não entendeu o enunciado', cor: 'bg-blue-100 text-blue-700' },
  { codigo: 'E2', nome: 'Cálculo', descricao: 'Errou a conta', cor: 'bg-green-100 text-green-700' },
  { codigo: 'E3', nome: 'Conceito', descricao: 'Não sabe o conceito', cor: 'bg-red-100 text-red-700' },
  { codigo: 'E4', nome: 'Estratégia', descricao: 'Caminho errado', cor: 'bg-orange-100 text-orange-700' },
  { codigo: 'E5', nome: 'Branco', descricao: 'Não tentou', cor: 'bg-gray-100 text-gray-700' },
]

export default function ResultadosDiagnosticoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const codigo = (params.codigo as string).toUpperCase()
  const turmaId = searchParams.get('turma')

  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (turmaId) {
      carregarDados()
    }
  }, [codigo, turmaId])

  async function carregarDados() {
    try {
      setLoading(true)
      setError(null)

      // Carregar diagnóstico pelo código
      const { data: diag, error: diagError } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .eq('codigo', codigo)
        .single()

      if (diagError || !diag) {
        setError(`Diagnóstico ${codigo} não encontrado`)
        setLoading(false)
        return
      }
      setDiagnostico(diag)

      // Carregar turma
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('id', turmaId)
        .single()

      if (turmaData) {
        setTurma(turmaData)
      }

      // Carregar alunos da turma
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])

      // Carregar respostas
      const { data: respostasData } = await supabase
        .from('base_respostas_diagnostico')
        .select('*')
        .eq('diagnostico_id', diag.id)
        .eq('turma_id', turmaId)

      setRespostas(respostasData || [])

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // Funções de cálculo
  function getRespostaAluno(alunoId: string, questao: number): Resposta | undefined {
    return respostas.find(r => r.aluno_id === alunoId && r.questao_numero === questao)
  }

  function calcularPontuacaoAluno(alunoId: string): number {
    let pontos = 0
    estruturaQuestoes.forEach(q => {
      const resp = getRespostaAluno(alunoId, q.numero)
      if (resp?.acertou === 'sim') pontos += 1
      else if (resp?.acertou === 'parcial') pontos += 0.5
    })
    return pontos
  }

  function determinarGrupo(alunoId: string): string {
    const pontuacao = calcularPontuacaoAluno(alunoId)
    const percentual = (pontuacao / 10) * 100
    if (percentual <= 40) return 'A'
    if (percentual <= 70) return 'B'
    return 'C'
  }

  function calcularDesempenhoCompetencia(competenciaCodigo: string): { acertos: number, total: number, percentual: number } {
    const questoesComp = estruturaQuestoes.filter(q => q.competencia === competenciaCodigo)
    let acertos = 0
    let total = 0

    alunos.forEach(aluno => {
      questoesComp.forEach(q => {
        const resp = getRespostaAluno(aluno.id, q.numero)
        if (resp) {
          total++
          if (resp.acertou === 'sim') acertos += 1
          else if (resp.acertou === 'parcial') acertos += 0.5
        }
      })
    })

    return {
      acertos,
      total,
      percentual: total > 0 ? Math.round((acertos / total) * 100) : 0
    }
  }

  function calcularDistribuicaoErros(): { codigo: string, nome: string, quantidade: number }[] {
    const contagem: Record<string, number> = {}
    
    respostas.forEach(r => {
      if (r.tipo_erro) {
        contagem[r.tipo_erro] = (contagem[r.tipo_erro] || 0) + 1
      }
    })

    return tiposErro.map(te => ({
      codigo: te.codigo,
      nome: te.nome,
      quantidade: contagem[te.codigo] || 0
    })).filter(e => e.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade)
  }

  function calcularDistribuicaoGrupos(): { grupo: string, quantidade: number, percentual: number }[] {
    const grupos = { A: 0, B: 0, C: 0 }
    
    alunos.forEach(aluno => {
      const grupo = determinarGrupo(aluno.id)
      grupos[grupo as keyof typeof grupos]++
    })

    const total = alunos.length
    return [
      { grupo: 'A', quantidade: grupos.A, percentual: total > 0 ? Math.round((grupos.A / total) * 100) : 0 },
      { grupo: 'B', quantidade: grupos.B, percentual: total > 0 ? Math.round((grupos.B / total) * 100) : 0 },
      { grupo: 'C', quantidade: grupos.C, percentual: total > 0 ? Math.round((grupos.C / total) * 100) : 0 },
    ]
  }

  function getCorGrupo(grupo: string) {
    switch (grupo) {
      case 'A': return 'bg-red-500'
      case 'B': return 'bg-yellow-500'
      case 'C': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/base/diagnosticos" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (respostas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/base/diagnosticos" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Resultados - {diagnostico?.codigo}</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-yellow-700 font-medium">Nenhuma resposta lançada</p>
              <p className="text-yellow-600 text-sm mt-1">
                <Link href={`/admin/base/diagnosticos/${codigo.toLowerCase()}/lancar?turma=${turmaId}`} className="underline">
                  Clique aqui para lançar as respostas
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const distribuicaoGrupos = calcularDistribuicaoGrupos()
  const distribuicaoErros = calcularDistribuicaoErros()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base/diagnosticos"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resultados - {diagnostico?.codigo}
            </h1>
            <p className="text-gray-500 mt-1">
              {turma?.nome} • {alunos.length} alunos
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/base/diagnosticos/${codigo.toLowerCase()}/lancar?turma=${turmaId}`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Editar</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span className="text-sm text-gray-500">Total de Alunos</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{alunos.length}</p>
        </div>

        {distribuicaoGrupos.map(g => (
          <div key={g.grupo} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-6 h-6 rounded-full ${getCorGrupo(g.grupo)}`}></div>
              <span className="text-sm text-gray-500">Grupo {g.grupo}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{g.quantidade}</p>
            <p className="text-sm text-gray-500">{g.percentual}% da turma</p>
          </div>
        ))}
      </div>

      {/* Desempenho por Competência */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Desempenho por Competência
        </h2>
        
        <div className="space-y-4">
          {competencias.map(comp => {
            const desempenho = calcularDesempenhoCompetencia(comp.codigo)
            return (
              <div key={comp.codigo} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg ${comp.cor} text-white flex items-center justify-center font-bold text-sm`}>
                      {comp.codigo}
                    </span>
                    <span className="font-medium text-gray-700">{comp.nome}</span>
                  </div>
                  <span className="font-bold text-gray-900">{desempenho.percentual}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`${comp.cor} h-4 rounded-full transition-all duration-500`}
                    style={{ width: `${desempenho.percentual}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Distribuição de Tipos de Erro */}
      {distribuicaoErros.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-red-600" />
            Tipos de Erro Mais Frequentes
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {distribuicaoErros.map(erro => {
              const tipoErro = tiposErro.find(te => te.codigo === erro.codigo)
              return (
                <div key={erro.codigo} className={`rounded-lg p-4 ${tipoErro?.cor || 'bg-gray-100'}`}>
                  <p className="text-2xl font-bold">{erro.quantidade}</p>
                  <p className="text-sm font-medium">{erro.codigo} - {erro.nome}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela de Resultados por Aluno */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Resultados por Aluno</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Aluno</th>
                {estruturaQuestoes.map(q => (
                  <th key={q.numero} className="py-2 px-1 text-center min-w-[40px]">
                    <div className="flex flex-col items-center">
                      <span className={`text-xs px-1 py-0.5 rounded ${q.corClara}`}>
                        {q.competencia}
                      </span>
                      <span className="text-xs text-gray-500">Q{q.numero}</span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-2 text-center font-medium text-gray-700">Nota</th>
                <th className="py-3 px-2 text-center font-medium text-gray-700">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno, idx) => {
                const pontuacao = calcularPontuacaoAluno(aluno.id)
                const grupo = determinarGrupo(aluno.id)
                
                return (
                  <tr 
                    key={aluno.id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="py-2 px-4">
                      <span className="font-medium text-gray-900">{aluno.nome}</span>
                    </td>
                    {estruturaQuestoes.map(q => {
                      const resp = getRespostaAluno(aluno.id, q.numero)
                      let bgColor = 'bg-gray-100'
                      let icon = '-'
                      
                      if (resp?.acertou === 'sim') {
                        bgColor = 'bg-green-500 text-white'
                        icon = '✓'
                      } else if (resp?.acertou === 'parcial') {
                        bgColor = 'bg-yellow-500 text-white'
                        icon = '½'
                      } else if (resp?.acertou === 'nao') {
                        bgColor = 'bg-red-500 text-white'
                        icon = '✗'
                      } else if (resp?.acertou === 'branco') {
                        bgColor = 'bg-gray-300'
                        icon = '-'
                      }
                      
                      return (
                        <td key={q.numero} className="py-2 px-1 text-center">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded text-sm font-bold ${bgColor}`}>
                            {icon}
                          </span>
                        </td>
                      )
                    })}
                    <td className="py-2 px-2 text-center">
                      <span className="font-bold text-gray-900">{pontuacao}/10</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold text-white ${getCorGrupo(grupo)}`}>
                        {grupo}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recomendações */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Recomendações</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <h4 className="font-medium text-red-700 mb-2">Grupo A ({distribuicaoGrupos[0].quantidade} alunos)</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Atividades de reforço básico</li>
              <li>• Material concreto e visual</li>
              <li>• Acompanhamento individualizado</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <h4 className="font-medium text-yellow-700 mb-2">Grupo B ({distribuicaoGrupos[1].quantidade} alunos)</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Consolidação dos conceitos</li>
              <li>• Exercícios de fixação</li>
              <li>• Trabalho em pares</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <h4 className="font-medium text-green-700 mb-2">Grupo C ({distribuicaoGrupos[2].quantidade} alunos)</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Atividades de aprofundamento</li>
              <li>• Desafios e problemas extras</li>
              <li>• Monitoria para colegas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Legenda</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center font-bold">✓</span>
            <span className="text-gray-600">Acertou</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-yellow-500 text-white flex items-center justify-center font-bold">½</span>
            <span className="text-gray-600">Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center font-bold">✗</span>
            <span className="text-gray-600">Errou</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gray-300 flex items-center justify-center font-bold">-</span>
            <span className="text-gray-600">Branco</span>
          </div>
        </div>
      </div>
    </div>
  )
}
