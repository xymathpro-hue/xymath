// src/app/(dashboard)/admin/base/relatorios/aluno/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User,
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Printer
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  nivel: string
  ano_escolar: string
}

interface Resposta {
  aluno_id: string
  diagnostico_id: string
  questao_numero: number
  acertou: string
  tipo_erro?: string
}

const competencias = [
  { codigo: 'L', nome: 'Leitura', questoes: [1, 2], cor: 'bg-blue-500', corClara: 'bg-blue-100 text-blue-700' },
  { codigo: 'F', nome: 'Fluência', questoes: [3, 4], cor: 'bg-green-500', corClara: 'bg-green-100 text-green-700' },
  { codigo: 'R', nome: 'Raciocínio', questoes: [5, 6], cor: 'bg-yellow-500', corClara: 'bg-yellow-100 text-yellow-700' },
  { codigo: 'A', nome: 'Aplicação', questoes: [7, 8], cor: 'bg-orange-500', corClara: 'bg-orange-100 text-orange-700' },
  { codigo: 'J', nome: 'Justificativa', questoes: [9, 10], cor: 'bg-purple-500', corClara: 'bg-purple-100 text-purple-700' },
]

const PESOS: Record<string, number> = { 'D1': 3, 'D2': 2, 'D3': 1 }
const GRUPO_PARA_PONTOS: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3 }

export default function RelatorioAlunoPage() {
  const searchParams = useSearchParams()
  const turmaIdParam = searchParams.get('turma')
  const alunoIdParam = searchParams.get('aluno')
  const supabase = createClient()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>(turmaIdParam || '')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>(alunoIdParam || '')
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAlunos()
      carregarDiagnosticos()
    }
  }, [turmaSelecionada])

  useEffect(() => {
    if (alunoSelecionado && turmaSelecionada) {
      carregarRespostas()
    }
  }, [alunoSelecionado, turmaSelecionada])

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
    } finally {
      setLoading(false)
    }
  }

  async function carregarAlunos() {
    try {
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
    }
  }

  async function carregarDiagnosticos() {
    try {
      const turma = turmas.find(t => t.id === turmaSelecionada)
      const anoMatch = turma?.ano_serie.match(/(\d+)/)
      const anoEscolar = anoMatch ? anoMatch[1] : '7'

      const { data: diagsData } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      setDiagnosticos(diagsData || [])
    } catch (error) {
      console.error('Erro ao carregar diagnósticos:', error)
    }
  }

  async function carregarRespostas() {
    try {
      const diagIds = diagnosticos.map(d => d.id)
      if (diagIds.length === 0) return

      const { data: respostasData } = await supabase
        .from('base_respostas_diagnostico')
        .select('*')
        .eq('aluno_id', alunoSelecionado)
        .in('diagnostico_id', diagIds)

      setRespostas(respostasData || [])
    } catch (error) {
      console.error('Erro ao carregar respostas:', error)
    }
  }

  // Funções de cálculo
  function getRespostasAluno(diagnosticoId: string): Resposta[] {
    return respostas.filter(r => r.diagnostico_id === diagnosticoId)
  }

  function alunoFaltou(diagnosticoId: string): boolean {
    const resps = getRespostasAluno(diagnosticoId)
    if (resps.length === 0) return false
    return resps.every(r => r.acertou === 'faltou')
  }

  function calcularDesempenhoCompetencia(diagnosticoId: string, competenciaCodigo: string): number | null {
    if (alunoFaltou(diagnosticoId)) return null
    
    const comp = competencias.find(c => c.codigo === competenciaCodigo)
    if (!comp) return null

    const resps = getRespostasAluno(diagnosticoId)
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

  function calcularTotalDiagnostico(diagnosticoId: string): { acertos: number, percentual: number } | null {
    if (alunoFaltou(diagnosticoId)) return null
    
    const resps = getRespostasAluno(diagnosticoId)
    if (resps.length === 0) return null

    let acertos = 0
    resps.forEach(r => {
      if (r.acertou === 'sim') acertos += 1
      else if (r.acertou === 'parcial') acertos += 0.5
    })

    return { acertos, percentual: (acertos / 10) * 100 }
  }

  function calcularGrupoDiagnostico(diagnosticoId: string): string {
    if (alunoFaltou(diagnosticoId)) return 'F'
    
    const resultado = calcularTotalDiagnostico(diagnosticoId)
    if (!resultado) return '?'

    if (resultado.percentual <= 40) return 'A'
    if (resultado.percentual <= 70) return 'B'
    return 'C'
  }

  function calcularGrupoFinal(): { grupo: string, media: number | null } {
    let somaPonderada = 0
    let somaPesos = 0

    diagnosticos.forEach(diag => {
      const grupo = calcularGrupoDiagnostico(diag.id)
      const diagNum = diag.codigo.split('-')[0]
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

  function getCorGrupo(grupo: string): string {
    switch (grupo) {
      case 'A': return 'bg-red-500 text-white'
      case 'B': return 'bg-yellow-500 text-white'
      case 'C': return 'bg-green-500 text-white'
      case 'F': return 'bg-slate-500 text-white'
      default: return 'bg-gray-300 text-gray-600'
    }
  }

  function getDescricaoGrupo(grupo: string): string {
    switch (grupo) {
      case 'A': return 'Precisa de reforço intensivo'
      case 'B': return 'Em desenvolvimento'
      case 'C': return 'Consolidado'
      case 'F': return 'Faltou aos diagnósticos'
      default: return 'Não avaliado'
    }
  }

  function getTendencia(atual: number | null, anterior: number | null): 'up' | 'down' | 'stable' | null {
    if (atual === null || anterior === null) return null
    if (atual > anterior + 5) return 'up'
    if (atual < anterior - 5) return 'down'
    return 'stable'
  }

  const alunoAtual = alunos.find(a => a.id === alunoSelecionado)
  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)
  const grupoFinal = calcularGrupoFinal()

  const alunosFiltrados = alunos.filter(a => 
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.matricula.toLowerCase().includes(busca.toLowerCase())
  )

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base/relatorios"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório Individual</h1>
            <p className="text-gray-500 mt-1">Desempenho detalhado do aluno</p>
          </div>
        </div>

        {alunoSelecionado && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        )}
      </div>

      {/* Seletores */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Turma</label>
            <select
              value={turmaSelecionada}
              onChange={(e) => { setTurmaSelecionada(e.target.value); setAlunoSelecionado(''); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} - {turma.ano_serie}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aluno</label>
            <select
              value={alunoSelecionado}
              onChange={(e) => setAlunoSelecionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              <option value="">Selecione um aluno...</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo do Relatório */}
      {alunoSelecionado && alunoAtual ? (
        <div className="space-y-6 print:space-y-4">
          {/* Card do Aluno */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {alunoAtual.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{alunoAtual.nome}</h2>
                  <p className="text-gray-500">{turmaAtual?.nome} - {turmaAtual?.ano_serie}</p>
                  <p className="text-sm text-gray-400">Matrícula: {alunoAtual.matricula || 'N/A'}</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Grupo Final</p>
                <div className={`inline-flex w-16 h-16 items-center justify-center rounded-full text-2xl font-bold ${getCorGrupo(grupoFinal.grupo)}`}>
                  {grupoFinal.grupo}
                </div>
                {grupoFinal.media && (
                  <p className="text-xs text-gray-500 mt-1">Média: {grupoFinal.media}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{getDescricaoGrupo(grupoFinal.grupo)}</p>
              </div>
            </div>
          </div>

          {/* Resultados por Diagnóstico */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Resultados por Diagnóstico</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Diagnóstico</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Acertos</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">%</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Grupo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticos.map((diag, idx) => {
                    const resultado = calcularTotalDiagnostico(diag.id)
                    const grupo = calcularGrupoDiagnostico(diag.id)
                    const faltou = alunoFaltou(diag.id)
                    
                    // Calcular tendência em relação ao diagnóstico anterior
                    let tendencia = null
                    if (idx > 0) {
                      const diagAnterior = diagnosticos[idx - 1]
                      const resultadoAnterior = calcularTotalDiagnostico(diagAnterior.id)
                      tendencia = getTendencia(resultado?.percentual || null, resultadoAnterior?.percentual || null)
                    }

                    return (
                      <tr key={diag.id} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              diag.nivel === 'facil' ? 'bg-green-100 text-green-700' :
                              diag.nivel === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {diag.codigo}
                            </span>
                            <span className="text-gray-900">{diag.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {faltou ? (
                            <span className="text-gray-400">Faltou</span>
                          ) : resultado ? (
                            <span className="font-medium">{resultado.acertos}/10</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {faltou ? (
                            <span className="text-gray-400">-</span>
                          ) : resultado ? (
                            <span className="font-medium">{Math.round(resultado.percentual)}%</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold ${getCorGrupo(grupo)}`}>
                            {grupo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {tendencia === 'up' && <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />}
                          {tendencia === 'down' && <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />}
                          {tendencia === 'stable' && <Minus className="w-5 h-5 text-gray-400 mx-auto" />}
                          {tendencia === null && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desempenho por Competência */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Desempenho por Competência</h3>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {competencias.map((comp) => {
                  // Calcular média da competência em todos os diagnósticos
                  let soma = 0
                  let count = 0
                  diagnosticos.forEach(diag => {
                    const desemp = calcularDesempenhoCompetencia(diag.id, comp.codigo)
                    if (desemp !== null) {
                      soma += desemp
                      count++
                    }
                  })
                  const media = count > 0 ? Math.round(soma / count) : null

                  return (
                    <div key={comp.codigo} className="text-center p-4 bg-gray-50 rounded-lg">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${comp.corClara}`}>
                        {comp.codigo}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">{comp.nome}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {media !== null ? `${media}%` : '-'}
                      </p>
                      {media !== null && (
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${media >= 70 ? 'bg-green-500' : media >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${media}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recomendações */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📋 Recomendações</h3>
            <div className="space-y-3">
              {grupoFinal.grupo === 'A' && (
                <>
                  <p className="text-gray-700">• Aplicar <strong>Ficha Amarela</strong> com atividades de reforço intensivo</p>
                  <p className="text-gray-700">• Priorizar competências com menor desempenho</p>
                  <p className="text-gray-700">• Acompanhamento individualizado recomendado</p>
                </>
              )}
              {grupoFinal.grupo === 'B' && (
                <>
                  <p className="text-gray-700">• Aplicar <strong>Ficha Azul</strong> para consolidação</p>
                  <p className="text-gray-700">• Trabalhar competências específicas com dificuldade</p>
                  <p className="text-gray-700">• Monitorar evolução nos próximos diagnósticos</p>
                </>
              )}
              {grupoFinal.grupo === 'C' && (
                <>
                  <p className="text-gray-700">• Aplicar <strong>Ficha Verde</strong> com desafios avançados</p>
                  <p className="text-gray-700">• Pode auxiliar colegas como monitor</p>
                  <p className="text-gray-700">• Propor atividades de aprofundamento</p>
                </>
              )}
              {(grupoFinal.grupo === 'F' || grupoFinal.grupo === '?') && (
                <>
                  <p className="text-gray-700">• Verificar motivo das faltas</p>
                  <p className="text-gray-700">• Aplicar diagnósticos pendentes</p>
                  <p className="text-gray-700">• Entrar em contato com responsáveis se necessário</p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Lista de Alunos para seleção rápida */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-900">Selecione um aluno</h3>
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou matrícula..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {alunosFiltrados.map((aluno) => {
              // Calcular grupo final do aluno
              const respsAluno = respostas.filter(r => r.aluno_id === aluno.id)
              
              return (
                <button
                  key={aluno.id}
                  onClick={() => setAlunoSelecionado(aluno.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-indigo-600">
                      {aluno.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{aluno.nome}</p>
                    <p className="text-sm text-gray-500">Matrícula: {aluno.matricula || 'N/A'}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              )
            })}
            
            {alunosFiltrados.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhum aluno encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

