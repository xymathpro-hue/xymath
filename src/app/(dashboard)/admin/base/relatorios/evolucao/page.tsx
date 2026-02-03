'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  LineChart,
  AlertCircle
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface DadosEvolucao {
  diagnostico: string
  media: number
  grupo_a: number
  grupo_b: number
  grupo_c: number
  total_avaliados: number
}

export default function RelatorioEvolucaoPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [evolucao, setEvolucao] = useState<DadosEvolucao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarEvolucao()
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

  const carregarEvolucao = async () => {
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
        .select('id, codigo, nome')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      const dadosEvolucao: DadosEvolucao[] = []

      for (const diag of diagnosticos || []) {
        const { data: respostas } = await supabase
          .from('base_respostas_diagnostico')
          .select('aluno_id, acertou')
          .eq('diagnostico_id', diag.id)
          .in('aluno_id', alunosIds)

        if (!respostas || respostas.length === 0) {
          dadosEvolucao.push({
            diagnostico: diag.codigo,
            media: 0,
            grupo_a: 0,
            grupo_b: 0,
            grupo_c: 0,
            total_avaliados: 0
          })
          continue
        }

        const alunosAvaliados = new Set(respostas.map(r => r.aluno_id))
        let somaPercentuais = 0
        let grupoA = 0
        let grupoB = 0
        let grupoC = 0

        alunosAvaliados.forEach(alunoId => {
          const respostasAluno = respostas.filter(r => r.aluno_id === alunoId)
          const acertos = respostasAluno.filter(r => r.acertou === true).length
          const percentual = (acertos / 12) * 100
          somaPercentuais += percentual

          if (percentual <= 40) grupoA++
          else if (percentual <= 70) grupoB++
          else grupoC++
        })

        const mediaPercentual = somaPercentuais / alunosAvaliados.size

        dadosEvolucao.push({
          diagnostico: diag.codigo,
          media: Math.round(mediaPercentual),
          grupo_a: grupoA,
          grupo_b: grupoB,
          grupo_c: grupoC,
          total_avaliados: alunosAvaliados.size
        })
      }

      setEvolucao(dadosEvolucao)
    } catch (error) {
      console.error('Erro ao carregar evolução:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularVariacao = (index: number) => {
    if (index === 0 || !evolucao[index - 1]) return null
    
    const atual = evolucao[index].media
    const anterior = evolucao[index - 1].media
    
    if (anterior === 0) return null
    
    const variacao = atual - anterior
    
    if (variacao >= 10) return { icon: TrendingUp, cor: 'text-green-600', texto: `+${variacao}%`, tipo: 'positivo' }
    if (variacao <= -10) return { icon: TrendingDown, cor: 'text-red-600', texto: `${variacao}%`, tipo: 'negativo' }
    return { icon: Minus, cor: 'text-yellow-600', texto: 'Estável', tipo: 'estavel' }
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
          
          <h1 className="text-3xl font-bold text-gray-900">Relatório de Evolução</h1>
          <p className="text-gray-600 mt-1">Acompanhe o progresso da turma entre os diagnósticos</p>
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
            <p className="mt-4 text-gray-600">Carregando dados de evolução...</p>
          </div>
        ) : evolucao.length > 0 ? (
          <>
            {/* Gráfico de Linha Visual */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <LineChart className="w-6 h-6 text-indigo-600" />
                Evolução da Média da Turma
              </h2>

              {/* Gráfico Simplificado */}
              <div className="relative h-64 mb-8">
                {/* Linhas de grade horizontais */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[100, 75, 50, 25, 0].map(valor => (
                    <div key={valor} className="flex items-center">
                      <span className="text-xs text-gray-400 w-8">{valor}%</span>
                      <div className="flex-1 border-t border-gray-200"></div>
                    </div>
                  ))}
                </div>

                {/* Pontos e linha */}
                <div className="absolute inset-0 flex items-end justify-around px-12">
                  {evolucao.map((dado, index) => {
                    const altura = (dado.media / 100) * 100
                    const variacao = calcularVariacao(index)
                    const IconeVariacao = variacao?.icon
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="relative w-full flex justify-center" style={{ height: '200px' }}>
                          <div className="absolute bottom-0 flex flex-col items-center">
                            {/* Valor */}
                            <div className="mb-2 text-center">
                              <p className="text-2xl font-bold text-gray-900">{dado.media}%</p>
                              {variacao && IconeVariacao && (
                                <div className={`flex items-center justify-center gap-1 text-xs ${variacao.cor}`}>
                                  <IconeVariacao className="w-3 h-3" />
                                  <span>{variacao.texto}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Ponto */}
                            <div 
                              className="w-4 h-4 bg-indigo-600 rounded-full border-4 border-white shadow-lg"
                              style={{ marginBottom: `${altura}px` }}
                            ></div>
                            
                            {/* Barra */}
                            <div 
                              className="w-2 bg-indigo-200"
                              style={{ height: `${altura}px` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Label do diagnóstico */}
                        <p className="text-sm font-medium text-gray-700 mt-2">{dado.diagnostico}</p>
                        <p className="text-xs text-gray-500">{dado.total_avaliados} alunos</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Detalhamento por Diagnóstico</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnóstico</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Média</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Variação</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grupo A</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grupo B</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grupo C</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avaliados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {evolucao.map((dado, index) => {
                      const variacao = calcularVariacao(index)
                      const IconeVariacao = variacao?.icon

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{dado.diagnostico}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-lg font-bold text-gray-900">{dado.media}%</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {variacao && IconeVariacao ? (
                              <div className={`inline-flex items-center gap-1 ${variacao.cor}`}>
                                <IconeVariacao className="w-4 h-4" />
                                <span className="text-sm font-medium">{variacao.texto}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold text-red-600">{dado.grupo_a}</span>
                              <span className="text-xs text-gray-500">
                                {dado.total_avaliados > 0 ? Math.round((dado.grupo_a / dado.total_avaliados) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold text-yellow-600">{dado.grupo_b}</span>
                              <span className="text-xs text-gray-500">
                                {dado.total_avaliados > 0 ? Math.round((dado.grupo_b / dado.total_avaliados) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold text-green-600">{dado.grupo_c}</span>
                              <span className="text-xs text-gray-500">
                                {dado.total_avaliados > 0 ? Math.round((dado.grupo_c / dado.total_avaliados) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm text-gray-900">{dado.total_avaliados}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Análise e Recomendações */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Análise da Evolução</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    {evolucao.length >= 2 && (
                      <>
                        {(() => {
                          const ultimoIndice = evolucao.length - 1
                          const variacao = calcularVariacao(ultimoIndice)
                          
                          if (!variacao) return <p>Dados insuficientes para análise.</p>
                          
                          if (variacao.tipo === 'positivo') {
                            return <p>✅ A turma está evoluindo! Continue com as estratégias pedagógicas aplicadas.</p>
                          } else if (variacao.tipo === 'negativo') {
                            return <p>⚠️ A turma teve queda no desempenho. Revise as atividades e considere reforço para os grupos A e B.</p>
                          } else {
                            return <p>📊 O desempenho está estável. Considere novos desafios para o Grupo C e reforço para os Grupos A e B.</p>
                          }
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum dado de evolução disponível para esta turma.</p>
          </div>
        )}
      </div>
    </div>
  )
}
