'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, Button, Select, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Simulado, Turma, Questao } from '@/types'
import { BarChart3, Users, TrendingUp, TrendingDown, Award, Target, Download } from 'lucide-react'

interface ResultadoCompleto {
  aluno_id: string
  aluno_nome: string
  turma_nome: string
  simulado_titulo: string
  total_questoes: number
  total_acertos: number
  percentual: number
  corrigido_em: string
}

interface EstatisticasQuestao {
  questao_id: string
  numero: number
  enunciado: string
  habilidade?: string
  descritor?: string
  total_respostas: number
  acertos: number
  percentual_acerto: number
  resposta_correta: string
  distribuicao: { A: number; B: number; C: number; D: number; E: number }
}

export default function ResultadosPage() {
  const searchParams = useSearchParams()
  const simuladoParam = searchParams.get('simulado')
  const { usuario } = useAuth()
  const supabase = createClient()

  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSimulado, setSelectedSimulado] = useState<string>(simuladoParam || '')
  const [selectedTurma, setSelectedTurma] = useState<string>('')
  const [resultados, setResultados] = useState<ResultadoCompleto[]>([])
  const [estatisticasQuestoes, setEstatisticasQuestoes] = useState<EstatisticasQuestao[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])

  // Carregar simulados e turmas
  const fetchBase = useCallback(async () => {
    if (!usuario?.id) return
    try {
      const [simRes, turRes] = await Promise.all([
        supabase.from('simulados').select('*').eq('usuario_id', usuario.id).order('created_at', { ascending: false }),
        supabase.from('turmas').select('*').eq('usuario_id', usuario.id).eq('ativa', true),
      ])
      setSimulados(simRes.data || [])
      setTurmas(turRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => { fetchBase() }, [fetchBase])

  // Carregar resultados quando selecionar simulado
  const fetchResultados = useCallback(async () => {
    if (!selectedSimulado) {
      setResultados([])
      setEstatisticasQuestoes([])
      return
    }

    try {
      const simulado = simulados.find(s => s.id === selectedSimulado)
      if (!simulado) return

      // Buscar questões do simulado
      if (simulado.questoes_ids?.length > 0) {
        const { data: questoesData } = await supabase
          .from('questoes')
          .select('*')
          .in('id', simulado.questoes_ids)
        
        const questoesOrdenadas = simulado.questoes_ids
          .map((id: string) => questoesData?.find(q => q.id === id))
          .filter(Boolean) as Questao[]
        setQuestoes(questoesOrdenadas)
      }

      // Buscar aplicações
      let query = supabase
        .from('aplicacoes')
        .select('id, turma_id')
        .eq('simulado_id', selectedSimulado)

      if (selectedTurma) {
        query = query.eq('turma_id', selectedTurma)
      }

      const { data: aplicacoes } = await query
      if (!aplicacoes || aplicacoes.length === 0) {
        setResultados([])
        return
      }

      // Buscar resultados
      const aplicacaoIds = aplicacoes.map(a => a.id)
      const { data: resultadosData } = await supabase
        .from('resultados')
        .select('*, alunos(nome, turma_id)')
        .in('aplicacao_id', aplicacaoIds)
        .order('percentual', { ascending: false })

      const resultadosFormatados: ResultadoCompleto[] = (resultadosData || []).map(r => {
        const turma = turmas.find(t => t.id === (r.alunos as any)?.turma_id)
        return {
          aluno_id: r.aluno_id,
          aluno_nome: (r.alunos as any)?.nome || 'Desconhecido',
          turma_nome: turma?.nome || '',
          simulado_titulo: simulado.titulo,
          total_questoes: r.total_questoes,
          total_acertos: r.total_acertos,
          percentual: r.percentual,
          corrigido_em: r.corrigido_em,
        }
      })
      setResultados(resultadosFormatados)

      // Calcular estatísticas por questão
      const { data: respostasData } = await supabase
        .from('respostas')
        .select('*')
        .in('aplicacao_id', aplicacaoIds)

      if (respostasData && questoes.length > 0) {
        const stats: EstatisticasQuestao[] = questoes.map((q, index) => {
          const respostasQuestao = respostasData.filter(r => r.questao_id === q.id)
          const total = respostasQuestao.length
          const acertos = respostasQuestao.filter(r => r.correta).length
          
          const distribuicao = { A: 0, B: 0, C: 0, D: 0, E: 0 }
          respostasQuestao.forEach(r => {
            if (r.resposta_marcada && distribuicao.hasOwnProperty(r.resposta_marcada)) {
              distribuicao[r.resposta_marcada as keyof typeof distribuicao]++
            }
          })

          return {
            questao_id: q.id,
            numero: index + 1,
            enunciado: q.enunciado,
            habilidade: (q as any).habilidade_codigo,
            descritor: (q as any).descritor_codigo,
            total_respostas: total,
            acertos,
            percentual_acerto: total > 0 ? (acertos / total) * 100 : 0,
            resposta_correta: q.resposta_correta,
            distribuicao,
          }
        })
        setEstatisticasQuestoes(stats)
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedSimulado, selectedTurma, simulados, turmas, supabase, questoes.length])

  useEffect(() => { fetchResultados() }, [selectedSimulado, selectedTurma])

  // Estatísticas gerais
  const totalAlunos = resultados.length
  const mediaGeral = totalAlunos > 0 ? resultados.reduce((acc, r) => acc + r.percentual, 0) / totalAlunos : 0
  const maiorNota = totalAlunos > 0 ? Math.max(...resultados.map(r => r.percentual)) : 0
  const menorNota = totalAlunos > 0 ? Math.min(...resultados.map(r => r.percentual)) : 0
  const aprovados = resultados.filter(r => r.percentual >= 60).length
  const taxaAprovacao = totalAlunos > 0 ? (aprovados / totalAlunos) * 100 : 0

  // Questões mais difíceis e mais fáceis
  const questoesPorDificuldade = [...estatisticasQuestoes].sort((a, b) => a.percentual_acerto - b.percentual_acerto)
  const questoesMaisDificeis = questoesPorDificuldade.slice(0, 3)
  const questoesMaisFaceis = questoesPorDificuldade.slice(-3).reverse()

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Resultados e Análises</h1>
        <p className="text-gray-600">Acompanhe o desempenho dos alunos</p>
      </div>

      {/* Filtros */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Simulado"
              options={simulados.map(s => ({ value: s.id, label: s.titulo }))}
              placeholder="Selecione um simulado..."
              value={selectedSimulado}
              onChange={(e) => setSelectedSimulado(e.target.value)}
            />
            <Select
              label="Turma (opcional)"
              options={turmas.map(t => ({ value: t.id, label: `${t.nome} - ${t.ano_serie}` }))}
              placeholder="Todas as turmas"
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {!selectedSimulado ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione um simulado</h3>
            <p className="text-gray-500">Escolha um simulado para visualizar os resultados e análises</p>
          </CardContent>
        </Card>
      ) : resultados.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-500">Este simulado ainda não foi corrigido</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAlunos}</p>
                    <p className="text-xs text-gray-500">Alunos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{mediaGeral.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Média</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{maiorNota.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Maior nota</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{menorNota.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Menor nota</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{taxaAprovacao.toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">Aprovação (≥60%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Questões Mais Difíceis */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Questões Mais Difíceis
                </h3>
                <div className="space-y-3">
                  {questoesMaisDificeis.map(q => (
                    <div key={q.questao_id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                        {q.numero}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                        <div className="flex gap-2 mt-1">
                          {q.habilidade && <Badge variant="default" className="text-xs">{q.habilidade}</Badge>}
                          <span className="text-xs text-red-600 font-medium">{q.percentual_acerto.toFixed(0)}% acerto</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Questões Mais Fáceis */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Questões Mais Fáceis
                </h3>
                <div className="space-y-3">
                  {questoesMaisFaceis.map(q => (
                    <div key={q.questao_id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                        {q.numero}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                        <div className="flex gap-2 mt-1">
                          {q.habilidade && <Badge variant="default" className="text-xs">{q.habilidade}</Badge>}
                          <span className="text-xs text-green-600 font-medium">{q.percentual_acerto.toFixed(0)}% acerto</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Alunos */}
          <Card variant="bordered" className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ranking de Alunos</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">Acertos</TableHead>
                    <TableHead className="text-center">Percentual</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((r, index) => (
                    <TableRow key={r.aluno_id}>
                      <TableCell>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{r.aluno_nome}</TableCell>
                      <TableCell>{r.turma_nome}</TableCell>
                      <TableCell className="text-center">{r.total_acertos}/{r.total_questoes}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${
                          r.percentual >= 70 ? 'text-green-600' :
                          r.percentual >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {r.percentual.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.percentual >= 60 ? 'success' : 'danger'}>
                          {r.percentual >= 60 ? 'Aprovado' : 'Recuperação'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Análise por Questão */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Análise por Questão</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Nº</TableHead>
                      <TableHead>Habilidade</TableHead>
                      <TableHead className="text-center">Resp.</TableHead>
                      <TableHead className="text-center">Gabarito</TableHead>
                      <TableHead className="text-center">% Acerto</TableHead>
                      <TableHead className="text-center">Distribuição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estatisticasQuestoes.map(q => (
                      <TableRow key={q.questao_id}>
                        <TableCell className="font-medium">{q.numero}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {q.habilidade && <Badge variant="info" className="text-xs">{q.habilidade}</Badge>}
                            {q.descritor && <Badge className="text-xs">{q.descritor}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{q.total_respostas}</TableCell>
                        <TableCell className="text-center font-bold text-green-600">{q.resposta_correta}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            q.percentual_acerto >= 70 ? 'text-green-600' :
                            q.percentual_acerto >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {q.percentual_acerto.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            {(['A', 'B', 'C', 'D', 'E'] as const).map(letra => {
                              const count = q.distribuicao[letra]
                              if (count === 0 && letra === 'E') return null
                              const isCorrect = letra === q.resposta_correta
                              return (
                                <span
                                  key={letra}
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {letra}:{count}
                                </span>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
