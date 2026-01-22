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

// Estado inicial com distribuição padrão para evitar erros de índice
const distribuicaoInicial = [
  { faixa: '0-20%', quantidade: 0, cor: 'bg-red-500' },
  { faixa: '21-40%', quantidade: 0, cor: 'bg-orange-400' },
  { faixa: '41-60%', quantidade: 0, cor: 'bg-yellow-400' },
  { faixa: '61-80%', quantidade: 0, cor: 'bg-green-400' },
  { faixa: '81-100%', quantidade: 0, cor: 'bg-green-600' }
]

export default function RelatoriosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<DadosGrafico>({
    turmas: [],
    distribuicao: distribuicaoInicial,
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
    if (!usuario?.id) { 
      setLoading(false)
      return 
    }
    setLoading(true)

    try {
      // 1. Dados por turma
      const { data: turmasData } = await supabase
        .from('turmas')
        .select(`
          id, nome,
          alunos(count)
        `)
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)

      const turmasComMedia: { nome: string; media: number; total_alunos: number }[] = []

      if (turmasData) {
        for (const turma of turmasData) {
          const { data: resultados } = await supabase
            .from('resultados')
            .select('percentual, aluno_id')
            .eq('aluno_id', turma.id)

          const media = resultados && resultados.length > 0
            ? Math.round(resultados.reduce((acc, r) => acc + (r.percentual || 0), 0) / resultados.length)
            : 0

          turmasComMedia.push({
            nome: turma.nome,
            media,
            total_alunos: (turma.alunos as any)?.[0]?.count || 0
          })
        }
      }

      // 2. Distribuição de notas
      const { data: todosResultados } = await supabase
        .from('resultados')
        .select('percentual')

      const distribuicao = [
        { faixa: '0-20%', quantidade: 0, cor: 'bg-red-500' },
        { faixa: '21-40%', quantidade: 0, cor: 'bg-orange-400' },
        { faixa: '41-60%', quantidade: 0, cor: 'bg-yellow-400' },
        { faixa: '61-80%', quantidade: 0, cor: 'bg-green-400' },
        { faixa: '81-100%', quantidade: 0, cor: 'bg-green-600' }
      ]

      if (todosResultados) {
        todosResultados.forEach(r => {
          const p = r.percentual || 0
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
        const inicioMes = data.toISOString()
        const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString()

        const { data: resultadosMes } = await supabase
          .from('resultados')
          .select('percentual')
          .gte('created_at', inicioMes)
          .lte('created_at', fimMes)

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
      let habilidades: { codigo: string; percentual: number }[] = []
      
      if (habIds.length > 0) {
        const { data: habilidadesData } = await supabase
          .from('habilidades_bncc')
          .select('id, codigo')
          .in('id', habIds)

        habilidades = habIds.map(id => {
          const hab = habilidadesData?.find(h => h.id === id)
          const dados = habilidadesMap[id]
          return {
            codigo: hab?.codigo || 'N/A',
            percentual: dados.total > 0 ? Math.round((dados.acertos / dados.total) * 100) : 0
          }
        }).sort((a, b) => a.codigo.localeCompare(b.codigo)).slice(0, 15)
      }

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

  // Calcular total para pizza (com proteção)
  const totalDistribuicao = dados.distribuicao.reduce((acc, d) => acc + d.quantidade, 0)

  // Funções auxiliares para acessar distribuição com segurança
  const getDistribuicaoQuantidade = (index: number) => {
    return dados.distribuicao[index]?.quantidade || 0
  }

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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Desempenho por Turma */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Desempenho por Turma
              </h3>
              {dados.turmas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="space-y-3">
                  {dados.turmas.map((turma, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 truncate">{turma.nome}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getCorBarra(turma.media)} transition-all duration-500`}
                          style={{ width: `${turma.media}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">{turma.media}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 2: Distribuição de Notas (Pizza simulada) */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                Distribuição de Notas
              </h3>
              {totalDistribuicao === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Pizza visual simples */}
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let offset = 0
                        return dados.distribuicao.map((d, idx) => {
                          const percent = totalDistribuicao > 0 ? (d.quantidade / totalDistribuicao) * 100 : 0
                          const dashArray = `${percent} ${100 - percent}`
                          const currentOffset = offset
                          offset += percent
                          const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
                          return (
                            <circle
                              key={idx}
                              cx="50" cy="50" r="40"
                              fill="transparent"
                              stroke={colors[idx]}
                              strokeWidth="20"
                              strokeDasharray={dashArray}
                              strokeDashoffset={-currentOffset}
                              className="transition-all duration-500"
                            />
                          )
                        })
                      })()}
                    </svg>
                  </div>
                  {/* Legenda */}
                  <div className="flex-1 space-y-2">
                    {dados.distribuicao.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded ${d.cor}`}></span>
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
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Evolução nos Últimos 6 Meses
              </h3>
              {dados.evolucao.every(e => e.media === 0) ? (
                <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
              ) : (
                <div className="flex items-end justify-between h-40 gap-2 px-2">
                  {dados.evolucao.map((e, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-medium text-gray-700">{e.media}%</span>
                      <div 
                        className={`w-full ${getCorBarra(e.media)} rounded-t transition-all duration-500`}
                        style={{ height: `${Math.max(e.media, 5)}%` }}
                      ></div>
                      <span className="text-xs text-gray-600">{e.periodo}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 4: Habilidades BNCC */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
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

      {/* Cards de resumo - CORRIGIDO COM PROTEÇÃO */}
      {!loading && dados.distribuicao.length >= 5 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700">
                {getDistribuicaoQuantidade(3) + getDistribuicaoQuantidade(4)}
              </p>
              <p className="text-sm text-green-600">Acima de 60%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">
                {getDistribuicaoQuantidade(2)}
              </p>
              <p className="text-sm text-yellow-600">Entre 41-60%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-700">
                {getDistribuicaoQuantidade(1)}
              </p>
              <p className="text-sm text-orange-600">Entre 21-40%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-700">
                {getDistribuicaoQuantidade(0)}
              </p>
              <p className="text-sm text-red-600">Abaixo de 20%</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
