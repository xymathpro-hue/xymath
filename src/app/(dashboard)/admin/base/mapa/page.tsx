// src/app/(dashboard)/admin/base/mapa/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users,
  Download,
  Filter,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  nivel: string
  ano_escolar: string
  ordem: number
}

interface Resposta {
  aluno_id: string
  diagnostico_id: string
  questao_numero: number
  acertou: string
  tipo_erro?: string
}

// Competências
const competencias = [
  { codigo: 'L', nome: 'Leitura', questoes: [1, 2], cor: 'bg-blue-500', corClara: 'bg-blue-100 text-blue-700' },
  { codigo: 'F', nome: 'Fluência', questoes: [3, 4], cor: 'bg-green-500', corClara: 'bg-green-100 text-green-700' },
  { codigo: 'R', nome: 'Raciocínio', questoes: [5, 6], cor: 'bg-yellow-500', corClara: 'bg-yellow-100 text-yellow-700' },
  { codigo: 'A', nome: 'Aplicação', questoes: [7, 8], cor: 'bg-orange-500', corClara: 'bg-orange-100 text-orange-700' },
  { codigo: 'J', nome: 'Justificativa', questoes: [9, 10], cor: 'bg-purple-500', corClara: 'bg-purple-100 text-purple-700' },
]

// Pesos para cálculo do grupo final
const PESOS: Record<string, number> = { 'D1': 3, 'D2': 2, 'D3': 1 }
const GRUPO_PARA_PONTOS: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3 }

export default function MapaCalorPage() {
  const searchParams = useSearchParams()
  const turmaIdParam = searchParams.get('turma')
  const supabase = createClient()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>(turmaIdParam || '')
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'competencia' | 'diagnostico'>('competencia')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarDadosTurma()
    }
  }, [turmaSelecionada])

  async function carregarTurmas() {
    try {
      const { data: configTurmas } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_serie
          )
        `)
        .eq('ativo', true)

      if (configTurmas) {
        const turmasData = configTurmas
          .map((ct: any) => ct.turmas)
          .filter(Boolean)
        setTurmas(turmasData)
        
        if (!turmaSelecionada && turmasData.length > 0) {
          setTurmaSelecionada(turmasData[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    }
  }

  async function carregarDadosTurma() {
    try {
      setLoading(true)

      // Pegar ano da turma
      const turma = turmas.find(t => t.id === turmaSelecionada)
      const anoMatch = turma?.ano_serie.match(/(\d+)/)
      const anoEscolar = anoMatch ? anoMatch[1] : '7'

      // Carregar diagnósticos do ano
      const { data: diagsData } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      setDiagnosticos(diagsData || [])

      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])

      // Carregar todas as respostas dos diagnósticos dessa turma
      if (diagsData && diagsData.length > 0) {
        const diagIds = diagsData.map(d => d.id)
        const { data: respostasData } = await supabase
          .from('base_respostas_diagnostico')
          .select('*')
          .eq('turma_id', turmaSelecionada)
          .in('diagnostico_id', diagIds)

        setRespostas(respostasData || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Funções de cálculo
  function getRespostasAluno(alunoId: string, diagnosticoId: string): Resposta[] {
    return respostas.filter(r => r.aluno_id === alunoId && r.diagnostico_id === diagnosticoId)
  }

  function alunoFaltou(alunoId: string, diagnosticoId: string): boolean {
    const resps = getRespostasAluno(alunoId, diagnosticoId)
    if (resps.length === 0) return false
    return resps.every(r => r.acertou === 'faltou')
  }

  function calcularDesempenhoCompetencia(alunoId: string, diagnosticoId: string, competenciaCodigo: string): number | null {
    if (alunoFaltou(alunoId, diagnosticoId)) return null
    
    const comp = competencias.find(c => c.codigo === competenciaCodigo)
    if (!comp) return null

    const resps = getRespostasAluno(alunoId, diagnosticoId)
    if (resps.length === 0) return null

    let acertos = 0
    let total = 0

    comp.questoes.forEach(qNum => {
      const resp = resps.find(r => r.questao_numero === qNum)
      if (resp && resp.acertou !== 'faltou') {
        total++
        if (resp.acertou === 'sim') acertos += 1
        else if (resp.acertou === 'parcial') acertos += 0.5
      }
    })

    if (total === 0) return null
    return (acertos / total) * 100
  }

  function calcularGrupoDiagnostico(alunoId: string, diagnosticoId: string): string {
    if (alunoFaltou(alunoId, diagnosticoId)) return 'F'
    
    const resps = getRespostasAluno(alunoId, diagnosticoId)
    if (resps.length === 0) return '?'

    let acertos = 0
    resps.forEach(r => {
      if (r.acertou === 'sim') acertos += 1
      else if (r.acertou === 'parcial') acertos += 0.5
    })

    const percentual = (acertos / 10) * 100
    if (percentual <= 40) return 'A'
    if (percentual <= 70) return 'B'
    return 'C'
  }

  function calcularGrupoFinal(alunoId: string): { grupo: string, media: number | null } {
    let somaPonderada = 0
    let somaPesos = 0

    diagnosticos.forEach(diag => {
      const grupo = calcularGrupoDiagnostico(alunoId, diag.id)
      const diagNum = diag.codigo.split('-')[0] // D1-7 -> D1
      const peso = PESOS[diagNum] || 1

      if (grupo !== 'F' && grupo !== '?' && GRUPO_PARA_PONTOS[grupo]) {
        somaPonderada += GRUPO_PARA_PONTOS[grupo] * peso
        somaPesos += peso
      }
    })

    if (somaPesos === 0) return { grupo: '?', media: null }

    const media = somaPonderada / somaPesos
    let grupoFinal: string
    if (media <= 1.5) grupoFinal = 'A'
    else if (media <= 2.5) grupoFinal = 'B'
    else grupoFinal = 'C'

    return { grupo: grupoFinal, media: Math.round(media * 100) / 100 }
  }

  function getCorDesempenho(percentual: number | null): string {
    if (percentual === null) return 'bg-gray-200'
    if (percentual >= 70) return 'bg-green-500'
    if (percentual >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function getIconeDesempenho(percentual: number | null): string {
    if (percentual === null) return '-'
    if (percentual >= 70) return '✅'
    if (percentual >= 40) return '🟡'
    return '❌'
  }

  function getCorGrupo(grupo: string): string {
    switch (grupo) {
      case 'A': return 'bg-red-500 text-white'
      case 'B': return 'bg-yellow-500 text-white'
      case 'C': return 'bg-green-500 text-white'
      case 'F': return 'bg-slate-500 text-white'
      default: return 'bg-gray-300 text-gray-600'
    }
  }

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

  // Estatísticas
  const estatisticas = {
    total: alunos.length,
    grupoA: alunos.filter(a => calcularGrupoFinal(a.id).grupo === 'A').length,
    grupoB: alunos.filter(a => calcularGrupoFinal(a.id).grupo === 'B').length,
    grupoC: alunos.filter(a => calcularGrupoFinal(a.id).grupo === 'C').length,
    naoAvaliados: alunos.filter(a => calcularGrupoFinal(a.id).grupo === '?').length,
  }

  if (loading && turmas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mapa de Calor</h1>
            <p className="text-gray-500 mt-1">Visualização por competência e diagnóstico</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'competencia' ? 'diagnostico' : 'competencia')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-4 h-4" />
            {viewMode === 'competencia' ? 'Por Competência' : 'Por Diagnóstico'}
          </button>
        </div>
      </div>

      {/* Seletor de Turma */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecione a turma
        </label>
        <select
          value={turmaSelecionada}
          onChange={(e) => setTurmaSelecionada(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
        >
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome} - {turma.ano_serie}
            </option>
          ))}
        </select>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{estatisticas.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{estatisticas.grupoA}</p>
          <p className="text-sm text-gray-500">Grupo A</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{estatisticas.grupoB}</p>
          <p className="text-sm text-gray-500">Grupo B</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{estatisticas.grupoC}</p>
          <p className="text-sm text-gray-500">Grupo C</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{estatisticas.naoAvaliados}</p>
          <p className="text-sm text-gray-500">Não avaliados</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Mapa de Calor por Competência */}
          {viewMode === 'competencia' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Desempenho por Competência</h2>
                <p className="text-sm text-gray-500 mt-1">
                  ✅ ≥70% | 🟡 40-69% | ❌ &lt;40%
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[180px]">
                        Aluno
                      </th>
                      {diagnosticos.map(diag => (
                        <th key={diag.id} colSpan={5} className="py-2 px-1 text-center border-l border-gray-200">
                          <span className={`text-xs px-2 py-1 rounded ${
                            diag.nivel === 'facil' ? 'bg-green-100 text-green-700' :
                            diag.nivel === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {diag.codigo}
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center border-l border-gray-300 font-medium text-gray-700 min-w-[70px]">
                        Grupo Final
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="sticky left-0 bg-gray-50"></th>
                      {diagnosticos.map(diag => (
                        competencias.map(comp => (
                          <th key={`${diag.id}-${comp.codigo}`} className="py-1 px-1 text-center">
                            <span className={`text-xs px-1 py-0.5 rounded ${comp.corClara}`}>
                              {comp.codigo}
                            </span>
                          </th>
                        ))
                      ))}
                      <th className="border-l border-gray-300"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((aluno, idx) => {
                      const grupoFinal = calcularGrupoFinal(aluno.id)
                      
                      return (
                        <tr 
                          key={aluno.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-2 px-4 sticky left-0 bg-inherit">
                            <span className="font-medium text-gray-900 text-sm truncate block max-w-[170px]">
                              {aluno.nome}
                            </span>
                          </td>
                          
                          {diagnosticos.map(diag => (
                            competencias.map(comp => {
                              const desempenho = calcularDesempenhoCompetencia(aluno.id, diag.id, comp.codigo)
                              const faltou = alunoFaltou(aluno.id, diag.id)
                              
                              return (
                                <td key={`${diag.id}-${comp.codigo}`} className="py-1 px-1 text-center">
                                  {faltou ? (
                                    <span className="inline-flex w-8 h-8 items-center justify-center rounded bg-slate-300 text-slate-600 text-xs">
                                      F
                                    </span>
                                  ) : (
                                    <span 
                                      className={`inline-flex w-8 h-8 items-center justify-center rounded text-sm ${getCorDesempenho(desempenho)} text-white`}
                                      title={desempenho !== null ? `${Math.round(desempenho)}%` : 'Não avaliado'}
                                    >
                                      {getIconeDesempenho(desempenho)}
                                    </span>
                                  )}
                                </td>
                              )
                            })
                          ))}
                          
                          <td className="py-2 px-2 text-center border-l border-gray-300">
                            <div className="flex flex-col items-center">
                              <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold ${getCorGrupo(grupoFinal.grupo)}`}>
                                {grupoFinal.grupo}
                              </span>
                              {grupoFinal.media && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {grupoFinal.media}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mapa por Diagnóstico */}
          {viewMode === 'diagnostico' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Grupo por Diagnóstico</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Visualização simplificada do grupo em cada diagnóstico
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[180px]">
                        Aluno
                      </th>
                      {diagnosticos.map(diag => (
                        <th key={diag.id} className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              diag.nivel === 'facil' ? 'bg-green-100 text-green-700' :
                              diag.nivel === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {diag.codigo}
                            </span>
                            <span className="text-xs text-gray-500">
                              Peso {PESOS[diag.codigo.split('-')[0]]}x
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center border-l border-gray-300 font-medium text-gray-700">
                        Grupo Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((aluno, idx) => {
                      const grupoFinal = calcularGrupoFinal(aluno.id)
                      
                      return (
                        <tr 
                          key={aluno.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-3 px-4 sticky left-0 bg-inherit">
                            <span className="font-medium text-gray-900 text-sm truncate block max-w-[170px]">
                              {aluno.nome}
                            </span>
                          </td>
                          
                          {diagnosticos.map(diag => {
                            const grupo = calcularGrupoDiagnostico(aluno.id, diag.id)
                            
                            return (
                              <td key={diag.id} className="py-3 px-4 text-center">
                                <span className={`inline-flex w-10 h-10 items-center justify-center rounded-full font-bold ${getCorGrupo(grupo)}`}>
                                  {grupo}
                                </span>
                              </td>
                            )
                          })}
                          
                          <td className="py-3 px-4 text-center border-l border-gray-300">
                            <div className="flex flex-col items-center">
                              <span className={`inline-flex w-12 h-12 items-center justify-center rounded-full font-bold text-lg ${getCorGrupo(grupoFinal.grupo)}`}>
                                {grupoFinal.grupo}
                              </span>
                              {grupoFinal.media && (
                                <span className="text-xs text-gray-500 mt-1">
                                  Média: {grupoFinal.media}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Legenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-2">Desempenho</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs">✅</span>
                <span>≥70% (Consolidado)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-white text-xs">🟡</span>
                <span>40-69% (Em desenvolvimento)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white text-xs">❌</span>
                <span>&lt;40% (Precisa reforço)</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 mb-2">Grupos</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</span>
                <span>Reforço intensivo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</span>
                <span>Em desenvolvimento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</span>
                <span>Consolidado</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 mb-2">Status</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-500 rounded flex items-center justify-center text-white text-xs font-bold">F</span>
                <span>Faltou</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-gray-600 text-xs font-bold">?</span>
                <span>Não avaliado</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 mb-2">Pesos (Grupo Final)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">D1</span>
                <span>Peso 3x (Fácil)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 font-bold">D2</span>
                <span>Peso 2x (Médio)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">D3</span>
                <span>Peso 1x (Difícil)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {estatisticas.grupoA > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">
                {estatisticas.grupoA} aluno(s) no Grupo A precisam de atenção especial
              </p>
              <p className="text-sm text-red-600 mt-1">
                Recomendação: Aplicar fichas de reforço e acompanhamento individualizado.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
