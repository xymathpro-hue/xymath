'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { BarChart3, Users, Filter, Download, Info, ChevronDown, ChevronUp } from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Aluno {
  id: string
  nome: string
  turma_id: string
}

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
  objeto_conhecimento: string
}

interface DesempenhoAluno {
  aluno_id: string
  aluno_nome: string
  habilidades: Record<string, { acertos: number; total: number; percentual: number }>
  media_geral: number
}

interface DesempenhoHabilidade {
  habilidade_id: string
  codigo: string
  descricao: string
  total_questoes: number
  total_acertos: number
  percentual: number
}

export default function MapaCalorPage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState<string>('')
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [desempenhoAlunos, setDesempenhoAlunos] = useState<DesempenhoAluno[]>([])
  const [desempenhoHabilidades, setDesempenhoHabilidades] = useState<DesempenhoHabilidade[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'alunos' | 'habilidades'>('alunos')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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

  // Carregar habilidades
  useEffect(() => {
    const loadHabilidades = async () => {
      const { data } = await supabase
        .from('habilidades_bncc')
        .select('id, codigo, descricao, objeto_conhecimento')
        .order('codigo')
      if (data) setHabilidades(data)
    }
    loadHabilidades()
  }, [supabase])

  // Carregar dados do mapa de calor
  const loadMapaCalor = useCallback(async () => {
    if (!turmaId) {
      setDesempenhoAlunos([])
      setDesempenhoHabilidades([])
      return
    }

    setLoading(true)
    try {
      // Buscar alunos da turma
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome')

      if (!alunos || alunos.length === 0) {
        setDesempenhoAlunos([])
        setDesempenhoHabilidades([])
        setLoading(false)
        return
      }

      // Buscar todas as respostas dos alunos desta turma
      // Juntando com questões para pegar a habilidade_bncc_id
      const { data: respostas } = await supabase
        .from('respostas')
        .select(`
          aluno_id,
          questao_id,
          correta,
          questoes!inner(habilidade_bncc_id)
        `)
        .in('aluno_id', alunos.map(a => a.id))

      // Processar dados por aluno
      const desempenhoPorAluno: Record<string, DesempenhoAluno> = {}
      const desempenhoPorHabilidade: Record<string, { acertos: number; total: number }> = {}

      // Inicializar alunos
      alunos.forEach(aluno => {
        desempenhoPorAluno[aluno.id] = {
          aluno_id: aluno.id,
          aluno_nome: aluno.nome,
          habilidades: {},
          media_geral: 0
        }
      })

      // Processar respostas
      if (respostas) {
        respostas.forEach((resp: any) => {
          const habId = resp.questoes?.habilidade_bncc_id
          if (!habId) return

          // Por aluno
          if (!desempenhoPorAluno[resp.aluno_id].habilidades[habId]) {
            desempenhoPorAluno[resp.aluno_id].habilidades[habId] = { acertos: 0, total: 0, percentual: 0 }
          }
          desempenhoPorAluno[resp.aluno_id].habilidades[habId].total++
          if (resp.correta) {
            desempenhoPorAluno[resp.aluno_id].habilidades[habId].acertos++
          }

          // Por habilidade (geral da turma)
          if (!desempenhoPorHabilidade[habId]) {
            desempenhoPorHabilidade[habId] = { acertos: 0, total: 0 }
          }
          desempenhoPorHabilidade[habId].total++
          if (resp.correta) {
            desempenhoPorHabilidade[habId].acertos++
          }
        })
      }

      // Calcular percentuais por aluno
      Object.values(desempenhoPorAluno).forEach(aluno => {
        let totalAcertos = 0
        let totalQuestoes = 0
        Object.values(aluno.habilidades).forEach(hab => {
          hab.percentual = hab.total > 0 ? Math.round((hab.acertos / hab.total) * 100) : 0
          totalAcertos += hab.acertos
          totalQuestoes += hab.total
        })
        aluno.media_geral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0
      })

      // Montar array de desempenho por habilidade
      const habsComDados = Object.entries(desempenhoPorHabilidade).map(([habId, dados]) => {
        const hab = habilidades.find(h => h.id === habId)
        return {
          habilidade_id: habId,
          codigo: hab?.codigo || '',
          descricao: hab?.descricao || '',
          total_questoes: dados.total,
          total_acertos: dados.acertos,
          percentual: dados.total > 0 ? Math.round((dados.acertos / dados.total) * 100) : 0
        }
      }).filter(h => h.codigo).sort((a, b) => a.codigo.localeCompare(b.codigo))

      setDesempenhoAlunos(Object.values(desempenhoPorAluno).sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome)))
      setDesempenhoHabilidades(habsComDados)
    } catch (error) {
      console.error('Erro ao carregar mapa de calor:', error)
    } finally {
      setLoading(false)
    }
  }, [turmaId, supabase, habilidades])

  useEffect(() => {
    if (habilidades.length > 0) {
      loadMapaCalor()
    }
  }, [loadMapaCalor, habilidades])

  // Função para cor baseada no percentual
  const getCorCalor = (percentual: number): string => {
    if (percentual >= 80) return 'bg-green-500 text-white'
    if (percentual >= 60) return 'bg-green-300 text-green-900'
    if (percentual >= 40) return 'bg-yellow-300 text-yellow-900'
    if (percentual >= 20) return 'bg-orange-400 text-white'
    return 'bg-red-500 text-white'
  }

  const getCorBorda = (percentual: number): string => {
    if (percentual >= 80) return 'border-green-600'
    if (percentual >= 60) return 'border-green-400'
    if (percentual >= 40) return 'border-yellow-400'
    if (percentual >= 20) return 'border-orange-500'
    return 'border-red-600'
  }

  // Habilidades que têm dados
  const habilidadesComDados = habilidades.filter(h => 
    desempenhoHabilidades.some(d => d.habilidade_id === h.id)
  )

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Mapa de Calor - Habilidades BNCC
          </h1>
          <p className="text-gray-600 mt-1">Visualize o desempenho dos alunos por habilidade</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
              >
                <option value="">Selecione uma turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'alunos' ? 'primary' : 'outline'}
                onClick={() => setViewMode('alunos')}
                size="sm"
              >
                <Users className="w-4 h-4 mr-1" />
                Por Aluno
              </Button>
              <Button
                variant={viewMode === 'habilidades' ? 'primary' : 'outline'}
                onClick={() => setViewMode('habilidades')}
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Por Habilidade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Legenda:</span>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-green-500"></span><span className="text-xs">≥80%</span></div>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-green-300"></span><span className="text-xs">60-79%</span></div>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-yellow-300"></span><span className="text-xs">40-59%</span></div>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-orange-400"></span><span className="text-xs">20-39%</span></div>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-red-500"></span><span className="text-xs">&lt;20%</span></div>
            <div className="flex items-center gap-1"><span className="w-6 h-6 rounded bg-gray-200"></span><span className="text-xs">Sem dados</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : !turmaId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma turma</h3>
            <p className="text-gray-500">Escolha uma turma para visualizar o mapa de calor</p>
          </CardContent>
        </Card>
      ) : desempenhoAlunos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sem dados disponíveis</h3>
            <p className="text-gray-500">Ainda não há respostas registradas para esta turma</p>
          </CardContent>
        </Card>
      ) : viewMode === 'alunos' ? (
        /* Visualização por Aluno */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[200px]">Aluno</th>
                    <th className="text-center p-3 font-medium text-gray-700 min-w-[80px]">Média</th>
                    {habilidadesComDados.map(hab => (
                      <th key={hab.id} className="text-center p-2 font-medium text-gray-700 min-w-[60px]" title={hab.descricao}>
                        <span className="text-xs">{hab.codigo}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {desempenhoAlunos.map((aluno, idx) => (
                    <tr key={aluno.aluno_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3 font-medium text-gray-900 sticky left-0 bg-inherit border-r">
                        {aluno.aluno_nome}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-sm font-bold ${getCorCalor(aluno.media_geral)}`}>
                          {aluno.media_geral}%
                        </span>
                      </td>
                      {habilidadesComDados.map(hab => {
                        const dados = aluno.habilidades[hab.id]
                        return (
                          <td key={hab.id} className="p-1 text-center">
                            {dados ? (
                              <span 
                                className={`inline-block w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${getCorCalor(dados.percentual)}`}
                                title={`${dados.acertos}/${dados.total} acertos`}
                              >
                                {dados.percentual}%
                              </span>
                            ) : (
                              <span className="inline-block w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-400">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Visualização por Habilidade */
        <div className="space-y-3">
          {desempenhoHabilidades.map(hab => (
            <Card key={hab.habilidade_id} className={`border-l-4 ${getCorBorda(hab.percentual)}`}>
              <CardContent className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleRow(hab.habilidade_id)}
                >
                  <div className="flex items-center gap-4">
                    <span className={`inline-block px-3 py-2 rounded text-lg font-bold ${getCorCalor(hab.percentual)}`}>
                      {hab.percentual}%
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{hab.codigo}</p>
                      <p className="text-sm text-gray-600 line-clamp-1">{hab.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{hab.total_acertos}/{hab.total_questoes} acertos</p>
                    </div>
                    {expandedRows.has(hab.habilidade_id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {expandedRows.has(hab.habilidade_id) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-700 mb-3">{hab.descricao}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {desempenhoAlunos.map(aluno => {
                        const dados = aluno.habilidades[hab.habilidade_id]
                        if (!dados) return null
                        return (
                          <div key={aluno.aluno_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getCorCalor(dados.percentual)}`}>
                              {dados.percentual}%
                            </span>
                            <span className="text-xs text-gray-700 truncate">{aluno.aluno_nome.split(' ')[0]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resumo */}
      {turmaId && desempenhoHabilidades.length > 0 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <h3 className="font-bold text-indigo-900 mb-3">📊 Resumo da Turma</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{desempenhoAlunos.length}</p>
                <p className="text-sm text-gray-600">Alunos</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{desempenhoHabilidades.length}</p>
                <p className="text-sm text-gray-600">Habilidades avaliadas</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {desempenhoHabilidades.filter(h => h.percentual >= 60).length}
                </p>
                <p className="text-sm text-gray-600">Habilidades ≥60%</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {desempenhoHabilidades.filter(h => h.percentual < 40).length}
                </p>
                <p className="text-sm text-gray-600">Habilidades críticas (&lt;40%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
          }
