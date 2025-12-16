'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { BarChart3, PieChart, TrendingUp, Users, Filter, Download, RefreshCw } from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface DadosGrafico {
  turmas: { nome: string; media: number; total_alunos: number }[]
  distribuicao: { faixa: string; quantidade: number; cor: string }[]
  evolucao: { periodo: string; media: number }[]
  habilidades: { codigo: string; percentual: number }[]
}

export default function RelatoriosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<DadosGrafico>({
    turmas: [],
    distribuicao: [],
    evolucao: [],
    habilidades: []
  })

  // Carregar turmas
  useEffect(() => {
    const loadTurmas = async () => {
      if (!usuario?.id) return
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
        .order('nome')
      if (data) setTurmas(data)
    }
    loadTurmas()
  }, [usuario?.id, supabase])

  // Carregar dados dos gráficos
  const fetchDados = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    setLoading(true)

    try {
      // 1. Médias por turma
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)

      const turmasComMedia: { nome: string; media: number; total_alunos: number }[] = []

      if (turmasData) {
        for (const turma of turmasData) {
          const { data: resultados } = await supabase
            .from('resultados')
            .select('percentual, aluno_id')
            .in('aluno_id', 
              (await supabase.from('alunos').select('id').eq('turma_id', turma.id)).data?.map(a => a.id) || []
            )

          if (resultados && resultados.length > 0) {
            const media = resultados.reduce((acc, r) => acc + (r.percentual || 0), 0) / resultados.length
            turmasComMedia.push({
              nome: turma.nome,
              media: Math.round(media),
              total_alunos: new Set(resultados.map(r => r.aluno_id)).size
            })
          }
        }
      }

      // 2. Distribuição de notas
      const { data: todasNotas } = await supabase
        .from('resultados')
        .select('percentual')

      const distribuicao = [
        { faixa: '0-20%', quantidade: 0, cor: '#ef4444' },
        { faixa: '21-40%', quantidade: 0, cor: '#f97316' },
        { faixa: '41-60%', quantidade: 0, cor: '#eab308' },
        { faixa: '61-80%', quantidade: 0, cor: '#22c55e' },
        { faixa: '81-100%', quantidade: 0, cor: '#10b981' }
      ]

      if (todasNotas) {
        todasNotas.forEach(n => {
          const p = n.percentual || 0
          if (p <= 20) distribuicao[0].quantidade++
          else if (p <= 40) distribuicao[1].quantidade++
          else if (p <= 60) distribuicao[2].quantidade++
          else if (p <= 80) distribuicao[3].quantidade++
          else distribuicao[4].quantidade++
        })
      }

      // 3. Evolução temporal (últimos 6 meses)
      const evolucao: { periodo: string; media: number }[] = []
      const hoje = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        const inicioMes = data.toISOString().split('T')[0]
        const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString().split('T')[0]

        const { data: resultadosMes } = await supabase
          .from('resultados')
          .select('percentual')
          .gte('corrigido_em', inicioMes)
          .lte('corrigido_em', fimMes)

        const media = resultadosMes && resultadosMes.length > 0
          ? resultadosMes.reduce((acc, r) => acc + (r.percentual || 0), 0) / resultadosMes.length
          : 0

        evolucao.push({
          periodo: data.toLocaleDateString('pt-BR', { month: 'short' }),
          media: Math.round(media)
        })
      }

      // 4. Desempenho por habilidade BNCC
      const { data: respostas } = await supabase
        .from('respostas')
        .select(`
          correta,
          questoes!inner(habilidade_bncc_id)
        `)
        .limit(1000)

      const habilidadesMap: Record<string, { acertos: number; total: number }> = {}

      if (respostas) {
        respostas.forEach((r: any) => {
          const habId = r.questoes?.habilidade_bncc_id
          if (!habId) return
          if (!habilidadesMap[habId]) habilidadesMap[habId] = { acertos: 0, total: 0 }
          habilidadesMap[habId].total++
          if (r.correta) habilidadesMap[habId].acertos++
        })
      }

      // Buscar códigos das habilidades
      const habIds = Object.keys(habilidadesMap)
      const { data: habilidadesData } = await supabase
        .from('habilidades_bncc')
        .select('id, codigo')
        .in('id', habIds)

      const habilidades = habIds.map(id => {
        const hab = habilidadesData?.find(h => h.id === id)
        const dados = habilidadesMap[id]
        return {
          codigo: hab?.codigo || 'N/A',
          percentual: dados.total > 0 ? Math.round((dados.acertos / dados.total) * 100) : 0
        }
      }).sort((a, b) => a.codigo.localeCompare(b.codigo)).slice(0, 15)

      setDados({
        turmas: turmasComMedia.sort((a, b) => b.media - a.media),
        distribuicao,
        evolucao,
        habilidades
      })

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  // Função para cor baseada no valor
  const getCorBarra = (valor: number) => {
    if (valor >= 80) return 'bg-green-500'
    if (valor >= 60) return 'bg-green-400'
    if (valor >= 40) return 'bg-yellow-400'
    if (valor >= 20) return 'bg-orange-400'
    return 'bg-red-500'
  }

  // Calcular total para pizza
  const totalDistribuicao = dados.distribuicao.reduce((acc, d) => acc + d.quantidade, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Relatórios e Estatísticas
          </h1>
          <p className="text-gray-600 mt-1">Análise de desempenho dos alunos e turmas</p>
        </div>
        <Button variant="outline" onClick={fetchDados}>
          <RefreshCw className="w-4 h-4 mr-2" />Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Média por Turma */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Desempenho por Turma
              </h3>
              {dados.turmas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="space-y-3">
                  {dados.turmas.map((turma, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{turma.nome}</span>
                        <span className="text-gray-600">{turma.media}% ({turma.total_alunos} alunos)</span>
                      </div>
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getCorBarra(turma.media)} transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${turma.media}%` }}
                        >
                          {turma.media > 15 && <span className="text-xs text-white font-bold">{turma.media}%</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 2: Distribuição de Notas */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                Distribuição de Notas
              </h3>
              {totalDistribuicao === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Pizza simplificada */}
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {(() => {
                        let acumulado = 0
                        return dados.distribuicao.map((d, idx) => {
                          const percentual = totalDistribuicao > 0 ? (d.quantidade / totalDistribuicao) * 100 : 0
                          const offset = acumulado
                          acumulado += percentual
                          return (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={d.cor}
                              strokeWidth="20"
                              strokeDasharray={`${percentual * 2.51} 251`}
                              strokeDashoffset={`${-offset * 2.51}`}
                            />
                          )
                        })
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{totalDistribuicao}</p>
                        <p className="text-xs text-gray-500">resultados</p>
                      </div>
                    </div>
                  </div>
                  {/* Legenda */}
                  <div className="flex-1 space-y-2">
                    {dados.distribuicao.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: d.cor }}></div>
                        <span className="text-sm text-gray-700">{d.faixa}</span>
                        <span className="text-sm font-medium text-gray-900 ml-auto">{d.quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 3: Evolução Temporal */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Evolução nos Últimos 6 Meses
              </h3>
              {dados.evolucao.every(e => e.media === 0) ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="h-48 flex items-end gap-2">
                  {dados.evolucao.map((e, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-700 mb-1">{e.media}%</span>
                      <div 
                        className={`w-full ${getCorBarra(e.media)} rounded-t transition-all duration-500`}
                        style={{ height: `${Math.max(e.media, 5)}%` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">{e.periodo}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 4: Desempenho por Habilidade BNCC */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Desempenho por Habilidade BNCC
              </h3>
              {dados.habilidades.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dados.habilidades.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-600 w-20">{h.codigo}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getCorBarra(h.percentual)} transition-all duration-500`}
                          style={{ width: `${h.percentual}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10 text-right">{h.percentual}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-700">
              {dados.distribuicao[3].quantidade + dados.distribuicao[4].quantidade}
            </p>
            <p className="text-sm text-green-600">Acima de 60%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">
              {dados.distribuicao[2].quantidade}
            </p>
            <p className="text-sm text-yellow-600">Entre 41-60%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-700">
              {dados.distribuicao[1].quantidade}
            </p>
            <p className="text-sm text-orange-600">Entre 21-40%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-700">
              {dados.distribuicao[0].quantidade}
            </p>
            <p className="text-sm text-red-600">Abaixo de 20%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
              }
