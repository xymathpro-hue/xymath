'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft, 
  BookOpen,
  Calculator,
  Brain,
  Lightbulb,
  Link2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface DadosCompetencia {
  codigo: string
  nome: string
  descricao: string
  icone: any
  cor: string
  d1: number | null
  d2: number | null
  d3: number | null
  d4: number | null
  media_geral: number
  tendencia: 'subindo' | 'descendo' | 'estavel' | 'indefinido'
}

const COMPETENCIAS_INFO = {
  L: {
    nome: 'Leitura/Interpretação',
    descricao: 'Capacidade de ler e interpretar enunciados matemáticos',
    icone: BookOpen,
    cor: 'bg-blue-500'
  },
  F: {
    nome: 'Fluência/Cálculo',
    descricao: 'Habilidade em realizar cálculos e operações básicas',
    icone: Calculator,
    cor: 'bg-green-500'
  },
  R: {
    nome: 'Raciocínio/Compreensão',
    descricao: 'Capacidade de raciocinar logicamente e compreender conceitos',
    icone: Brain,
    cor: 'bg-purple-500'
  },
  A: {
    nome: 'Aplicação/Problemas',
    descricao: 'Habilidade de aplicar conhecimentos em situações-problema',
    icone: Lightbulb,
    cor: 'bg-yellow-500'
  },
  J: {
    nome: 'Justificativa/Conexão',
    descricao: 'Capacidade de justificar respostas e conectar conceitos',
    icone: Link2,
    cor: 'bg-red-500'
  }
}

export default function RelatorioCompetenciasPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [competencias, setCompetencias] = useState<DadosCompetencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarCompetencias()
    }
  }, [turmaSelecionada])

  const carregarTurmas = async () => {
    try {
      const { data: turmasBase, error } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_escolar
          )
        `)
        .eq('ativo', true)

      if (error) throw error

      const turmasFormatadas = turmasBase
        ?.map((t: any) => ({
          id: t.turmas.id,
          nome: t.turmas.nome,
          ano_escolar: t.turmas.ano_escolar
        })) || []

      setTurmas(turmasFormatadas)
      
      if (turmasFormatadas.length > 0) {
        setTurmaSelecionada(turmasFormatadas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    }
  }

  const carregarCompetencias = async () => {
    setLoading(true)
    try {
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)

      const alunosIds = alunos?.map(a => a.id) || []
      const turmaInfo = turmas.find(t => t.id === turmaSelecionada)
      const anoEscolar = turmaInfo?.ano_escolar || '7'

      const { data: diagnosticos } = await supabase
        .from('base_diagnosticos')
        .select('id, codigo')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      // Mapear questões por competência (Q1-Q2=L, Q3-Q4=F, Q5-Q6=R, Q7-Q8=A, Q9-Q10=J)
      const questoesPorCompetencia: { [key: string]: number[] } = {
        L: [1, 2],
        F: [3, 4],
        R: [5, 6],
        A: [7, 8],
        J: [9, 10]
      }

      const dadosCompetencias: DadosCompetencia[] = []

      for (const [codigo, info] of Object.entries(COMPETENCIAS_INFO)) {
        const questoes = questoesPorCompetencia[codigo]
        const medias: { [key: string]: number | null } = {
          d1: null,
          d2: null,
          d3: null,
          d4: null
        }

        // Calcular média por diagnóstico
        for (const diag of diagnosticos || []) {
          const { data: respostas } = await supabase
            .from('base_respostas_diagnostico')
            .select('aluno_id, questao_numero, acertou')
            .eq('diagnostico_id', diag.id)
            .in('aluno_id', alunosIds)
            .in('questao_numero', questoes)

          if (respostas && respostas.length > 0) {
            const alunosAvaliados = new Set(respostas.map(r => r.aluno_id))
            let somaPercentuais = 0

            alunosAvaliados.forEach(alunoId => {
              const respostasAluno = respostas.filter(r => r.aluno_id === alunoId)
              const acertos = respostasAluno.filter(r => r.acertou === true).length
              const percentual = (acertos / questoes.length) * 100
              somaPercentuais += percentual
            })

            const mediaPercentual = somaPercentuais / alunosAvaliados.size
            const diagNumero = diag.codigo.match(/D(\d)/)?.[1]
            if (diagNumero) {
              medias[`d${diagNumero}`] = Math.round(mediaPercentual)
            }
          }
        }

        // Calcular média geral
        const mediasValidas = Object.values(medias).filter(m => m !== null) as number[]
        const mediaGeral = mediasValidas.length > 0
          ? Math.round(mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length)
          : 0

        // Calcular tendência
        let tendencia: 'subindo' | 'descendo' | 'estavel' | 'indefinido' = 'indefinido'
        if (mediasValidas.length >= 2) {
          const primeira = mediasValidas[0]
          const ultima = mediasValidas[mediasValidas.length - 1]
          const diferenca = ultima - primeira
          
          if (diferenca >= 10) tendencia = 'subindo'
          else if (diferenca <= -10) tendencia = 'descendo'
          else tendencia = 'estavel'
        }

        dadosCompetencias.push({
          codigo,
          nome: info.nome,
          descricao: info.descricao,
          icone: info.icone,
          cor: info.cor,
          d1: medias.d1,
          d2: medias.d2,
          d3: medias.d3,
          d4: medias.d4,
          media_geral: mediaGeral,
          tendencia
        })
      }

      // Ordenar por média geral (menor para maior)
      dadosCompetencias.sort((a, b) => a.media_geral - b.media_geral)

      setCompetencias(dadosCompetencias)
    } catch (error) {
      console.error('Erro ao carregar competências:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTendenciaIcone = (tendencia: string) => {
    switch (tendencia) {
      case 'subindo': return { Icone: TrendingUp, cor: 'text-green-600', texto: 'Em evolução' }
      case 'descendo': return { Icone: TrendingDown, cor: 'text-red-600', texto: 'Necessita atenção' }
      case 'estavel': return { Icone: Minus, cor: 'text-yellow-600', texto: 'Estável' }
      default: return { Icone: Minus, cor: 'text-gray-400', texto: 'Sem dados' }
    }
  }

  const getCorDesempenho = (media: number) => {
    if (media >= 70) return 'text-green-600'
    if (media >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Relatório por Competências</h1>
          <p className="text-gray-600 mt-1">Análise detalhada do desempenho em cada competência matemática</p>
        </div>

        {/* Seletor de Turma */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {turmas.map(turma => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} - {turma.ano_escolar}º ano EF
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando análise de competências...</p>
          </div>
        ) : competencias.length > 0 ? (
          <>
            {/* Cards de Competências */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {competencias.map((comp) => {
                const Icone = comp.icone
                const tendenciaInfo = getTendenciaIcone(comp.tendencia)
                const TendenciaIcone = tendenciaInfo.Icone

                return (
                  <div key={comp.codigo} className="bg-white rounded-lg shadow-sm p-6 border-l-4" style={{ borderLeftColor: comp.cor.replace('bg-', '#') }}>
                    <div className="flex items-start gap-4">
                      <div className={`${comp.cor} p-3 rounded-lg`}>
                        <Icone className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{comp.nome}</h3>
                        <p className="text-xs text-gray-500 mb-3">{comp.descricao}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Média Geral:</span>
                            <span className={`text-2xl font-bold ${getCorDesempenho(comp.media_geral)}`}>
                              {comp.media_geral}%
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Tendência:</span>
                            <div className={`flex items-center gap-1 ${tendenciaInfo.cor}`}>
                              <TendenciaIcone className="w-4 h-4" />
                              <span className="text-xs font-medium">{tendenciaInfo.texto}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Desempenho por Diagnóstico</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">D1</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">D2</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">D3</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">D4</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Média</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tendência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {competencias.map((comp) => {
                      const Icone = comp.icone
                      const tendenciaInfo = getTendenciaIcone(comp.tendencia)
                      const TendenciaIcone = tendenciaInfo.Icone

                      return (
                        <tr key={comp.codigo} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`${comp.cor} p-2 rounded`}>
                                <Icone className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{comp.nome}</p>
                                <p className="text-xs text-gray-500">{comp.codigo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {comp.d1 !== null ? (
                              <span className={`text-sm font-semibold ${getCorDesempenho(comp.d1)}`}>
                                {comp.d1}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {comp.d2 !== null ? (
                              <span className={`text-sm font-semibold ${getCorDesempenho(comp.d2)}`}>
                                {comp.d2}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {comp.d3 !== null ? (
                              <span className={`text-sm font-semibold ${getCorDesempenho(comp.d3)}`}>
                                {comp.d3}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {comp.d4 !== null ? (
                              <span className={`text-sm font-semibold ${getCorDesempenho(comp.d4)}`}>
                                {comp.d4}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-lg font-bold ${getCorDesempenho(comp.media_geral)}`}>
                              {comp.media_geral}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className={`inline-flex items-center gap-1 ${tendenciaInfo.cor}`}>
                              <TendenciaIcone className="w-4 h-4" />
                              <span className="text-xs font-medium">{tendenciaInfo.texto}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recomendações */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recomendações Pedagógicas</h2>
              <div className="space-y-4">
                {competencias
                  .filter(c => c.media_geral < 70)
                  .map((comp) => {
                    const Icone = comp.icone
                    return (
                      <div key={comp.codigo} className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className={`${comp.cor} p-2 rounded`}>
                          <Icone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{comp.nome}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {comp.media_geral < 40 
                              ? `⚠️ Necessita intervenção urgente. Considere atividades de reforço intensivo focadas em ${comp.nome.toLowerCase()}.`
                              : `📊 Desempenho intermediário. Reforce conceitos com atividades práticas e contextualizadas.`
                            }
                          </p>
                        </div>
                      </div>
                    )
                  })}
                
                {competencias.every(c => c.media_geral >= 70) && (
                  <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl">🎉</div>
                    <div>
                      <p className="font-semibold text-gray-900">Excelente Desempenho!</p>
                      <p className="text-sm text-gray-600 mt-1">
                        A turma está performando bem em todas as competências. Continue com as estratégias atuais e considere desafios adicionais.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum dado de competências disponível para esta turma.</p>
          </div>
        )}
      </div>
    </div>
  )
                                }
