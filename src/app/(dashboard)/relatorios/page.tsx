'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import {
  FileText, Download, RefreshCw, Filter, Users, User, Building2,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Award,
  BookOpen, GraduationCap, Loader2, ChevronDown, Sparkles,
  FileSpreadsheet, Copy, Calendar
} from 'lucide-react'

// ============================================================
// TIPOS
// ============================================================

type NivelRelatorio = 'geral' | 'etapa' | 'ano' | 'turma' | 'aluno'
type EtapaEnsino = 'fundamental' | 'medio' | 'todos'
type Periodo = '1' | '2' | '3' | '4' | 'anual'

interface Turma {
  id: string
  nome: string
  ano_serie: string
  etapa: EtapaEnsino
}

interface Aluno {
  id: string
  nome: string
  turma_id: string
}

interface DadosRelatorio {
  mediaGeral: number
  totalAlunos: number
  aprovados: number
  emRecuperacao: number
  criticos: number
  evolucaoBimestral: { bimestre: string; media: number }[]
  desempenhoPorHabilidade: { habilidade: string; media: number; fullMark: number }[]
  rankingTurmas: { turma: string; media: number; alunos: number }[]
  distribuicaoNotas: { faixa: string; quantidade: number; cor: string }[]
  topAlunos: { nome: string; media: number; turma: string }[]
  alunosEmRisco: { nome: string; media: number; turma: string }[]
}

// ============================================================
// CONSTANTES
// ============================================================

const ANOS_SERIES = {
  fundamental: [
    { value: '6º ano EF', label: '6º ano EF' },
    { value: '7º ano EF', label: '7º ano EF' },
    { value: '8º ano EF', label: '8º ano EF' },
    { value: '9º ano EF', label: '9º ano EF' },
  ],
  medio: [
    { value: '1ª série EM', label: '1ª série EM' },
    { value: '2ª série EM', label: '2ª série EM' },
    { value: '3ª série EM', label: '3ª série EM' },
  ]
}

const CORES_GRAFICO = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
}

const CORES_DISTRIBUICAO = [
  { faixa: '9-10 (Excelente)', cor: '#10B981' },
  { faixa: '7-8.9 (Bom)', cor: '#3B82F6' },
  { faixa: '6-6.9 (Regular)', cor: '#F59E0B' },
  { faixa: '4-5.9 (Atenção)', cor: '#F97316' },
  { faixa: '0-3.9 (Crítico)', cor: '#EF4444' },
]

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function RelatoriosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  // Estados de filtros
  const [nivel, setNivel] = useState<NivelRelatorio>('geral')
  const [etapa, setEtapa] = useState<EtapaEnsino>('todos')
  const [anoSerie, setAnoSerie] = useState<string>('')
  const [turmaId, setTurmaId] = useState<string>('')
  const [alunoId, setAlunoId] = useState<string>('')
  const [periodo, setPeriodo] = useState<Periodo>('anual')
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear())
  const [compararAnterior, setCompararAnterior] = useState(false)

  // Estados de dados
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)

  // Detectar bimestre atual
  const getBimestreAtual = () => {
    const mes = new Date().getMonth() + 1
    if (mes <= 3) return 1
    if (mes <= 6) return 2
    if (mes <= 9) return 3
    return 4
  }

  const bimestreAtual = getBimestreAtual()

  // Carregar turmas
  const carregarTurmas = useCallback(async () => {
    if (!usuario) return

    const { data } = await supabase
      .from('turmas')
      .select('id, nome, ano_serie')
      .eq('usuario_id', usuario.id)
      .order('nome')

    if (data) {
      const turmasComEtapa = data.map(t => ({
        ...t,
        etapa: t.ano_serie.includes('EM') ? 'medio' as EtapaEnsino : 'fundamental' as EtapaEnsino
      }))
      setTurmas(turmasComEtapa)
    }
  }, [usuario, supabase])

  // Carregar alunos da turma selecionada
  const carregarAlunos = useCallback(async () => {
    if (!turmaId) {
      setAlunos([])
      return
    }

    const { data } = await supabase
      .from('alunos')
      .select('id, nome, turma_id')
      .eq('turma_id', turmaId)
      .order('nome')

    if (data) setAlunos(data)
  }, [turmaId, supabase])

  // Gerar relatório
  const gerarRelatorio = useCallback(async () => {
    if (!usuario) return

    setGerando(true)
    try {
      // Filtrar turmas baseado nos filtros
      let turmasFiltradas = [...turmas]

      if (etapa !== 'todos') {
        turmasFiltradas = turmasFiltradas.filter(t => t.etapa === etapa)
      }

      if (anoSerie) {
        turmasFiltradas = turmasFiltradas.filter(t => t.ano_serie === anoSerie)
      }

      if (turmaId) {
        turmasFiltradas = turmasFiltradas.filter(t => t.id === turmaId)
      }

      const turmaIds = turmasFiltradas.map(t => t.id)

      // Carregar alunos das turmas filtradas
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, turma_id')
        .in('turma_id', turmaIds.length > 0 ? turmaIds : [''])

      // Carregar notas
      let notasQuery = supabase
        .from('notas')
        .select('*')
        .eq('ano_letivo', anoLetivo)

      if (periodo !== 'anual') {
        notasQuery = notasQuery.eq('periodo', parseInt(periodo))
      }

      const { data: notasData } = await notasQuery

      // Filtrar notas por alunos das turmas
      const alunoIds = alunosData?.map(a => a.id) || []
      const notasFiltradas = notasData?.filter(n => alunoIds.includes(n.aluno_id)) || []

      // Se for relatório de aluno específico
      let notasParaAnalise = notasFiltradas
      if (alunoId) {
        notasParaAnalise = notasFiltradas.filter(n => n.aluno_id === alunoId)
      }

      // Calcular médias por aluno
      const mediasPorAluno = new Map<string, { soma: number; count: number; notas: number[] }>()

      for (const nota of notasParaAnalise) {
        if (nota.nota !== null) {
          const atual = mediasPorAluno.get(nota.aluno_id) || { soma: 0, count: 0, notas: [] }
          atual.soma += nota.nota
          atual.count += 1
          atual.notas.push(nota.nota)
          mediasPorAluno.set(nota.aluno_id, atual)
        }
      }

      // Calcular estatísticas
      let somaGeral = 0
      let countGeral = 0
      let aprovados = 0
      let emRecuperacao = 0
      let criticos = 0

      const alunosComMedia: { id: string; nome: string; turma_id: string; media: number }[] = []

      mediasPorAluno.forEach((dados, alunoId) => {
        const media = dados.soma / dados.count
        somaGeral += media
        countGeral += 1

        if (media >= 6) aprovados++
        else if (media >= 4) emRecuperacao++
        else criticos++

        const aluno = alunosData?.find(a => a.id === alunoId)
        if (aluno) {
          alunosComMedia.push({
            id: aluno.id,
            nome: aluno.nome,
            turma_id: aluno.turma_id,
            media
          })
        }
      })

      const mediaGeral = countGeral > 0 ? somaGeral / countGeral : 0

      // Evolução bimestral
      const evolucaoBimestral: { bimestre: string; media: number }[] = []
      for (let bim = 1; bim <= bimestreAtual; bim++) {
        const notasBim = notasFiltradas.filter(n => n.periodo === bim && n.nota !== null)
        if (notasBim.length > 0) {
          const mediaBim = notasBim.reduce((acc, n) => acc + (n.nota || 0), 0) / notasBim.length
          evolucaoBimestral.push({
            bimestre: `${bim}º Bim`,
            media: Math.round(mediaBim * 10) / 10
          })
        }
      }

      // Ranking de turmas
      const rankingTurmas: { turma: string; media: number; alunos: number }[] = []
      for (const turma of turmasFiltradas) {
        const alunosTurma = alunosComMedia.filter(a => a.turma_id === turma.id)
        if (alunosTurma.length > 0) {
          const mediaTurma = alunosTurma.reduce((acc, a) => acc + a.media, 0) / alunosTurma.length
          rankingTurmas.push({
            turma: turma.nome,
            media: Math.round(mediaTurma * 10) / 10,
            alunos: alunosTurma.length
          })
        }
      }
      rankingTurmas.sort((a, b) => b.media - a.media)

      // Distribuição de notas
      const distribuicaoNotas = CORES_DISTRIBUICAO.map(d => ({
        ...d,
        quantidade: 0
      }))

      for (const aluno of alunosComMedia) {
        if (aluno.media >= 9) distribuicaoNotas[0].quantidade++
        else if (aluno.media >= 7) distribuicaoNotas[1].quantidade++
        else if (aluno.media >= 6) distribuicaoNotas[2].quantidade++
        else if (aluno.media >= 4) distribuicaoNotas[3].quantidade++
        else distribuicaoNotas[4].quantidade++
      }

      // Top alunos e em risco
      const alunosOrdenados = [...alunosComMedia].sort((a, b) => b.media - a.media)
      const topAlunos = alunosOrdenados.slice(0, 5).map(a => {
        const turma = turmasFiltradas.find(t => t.id === a.turma_id)
        return { nome: a.nome, media: Math.round(a.media * 10) / 10, turma: turma?.nome || '' }
      })

      const alunosEmRisco = alunosOrdenados
        .filter(a => a.media < 6)
        .slice(-5)
        .reverse()
        .map(a => {
          const turma = turmasFiltradas.find(t => t.id === a.turma_id)
          return { nome: a.nome, media: Math.round(a.media * 10) / 10, turma: turma?.nome || '' }
        })

      // Desempenho por habilidade (simulado - você pode conectar com habilidades BNCC reais)
      const habilidadesFund = ['Números', 'Álgebra', 'Geometria', 'Grandezas', 'Estatística']
      const habilidadesMedio = ['Funções', 'Geometria', 'Trigonometria', 'Estatística', 'Mat. Financeira']
      
      const habilidades = etapa === 'medio' ? habilidadesMedio : habilidadesFund
      const desempenhoPorHabilidade = habilidades.map(hab => ({
        habilidade: hab,
        media: Math.round((mediaGeral + (Math.random() * 2 - 1)) * 10) / 10,
        fullMark: 10
      }))

      setDados({
        mediaGeral: Math.round(mediaGeral * 10) / 10,
        totalAlunos: alunosData?.length || 0,
        aprovados,
        emRecuperacao,
        criticos,
        evolucaoBimestral,
        desempenhoPorHabilidade,
        rankingTurmas,
        distribuicaoNotas,
        topAlunos,
        alunosEmRisco
      })

    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
    } finally {
      setGerando(false)
    }
  }, [usuario, supabase, turmas, etapa, anoSerie, turmaId, alunoId, periodo, anoLetivo, bimestreAtual])

  // Effects
  useEffect(() => {
    carregarTurmas()
  }, [carregarTurmas])

  useEffect(() => {
    carregarAlunos()
  }, [carregarAlunos])

  useEffect(() => {
    if (turmas.length > 0) {
      gerarRelatorio()
    }
  }, [turmas.length])

  // Resetar filtros dependentes
  useEffect(() => {
    setAnoSerie('')
    setTurmaId('')
    setAlunoId('')
  }, [etapa])

  useEffect(() => {
    setTurmaId('')
    setAlunoId('')
  }, [anoSerie])

  useEffect(() => {
    setAlunoId('')
  }, [turmaId])

  // Filtrar turmas para dropdown
  const turmasFiltradas = turmas.filter(t => {
    if (etapa !== 'todos' && t.etapa !== etapa) return false
    if (anoSerie && t.ano_serie !== anoSerie) return false
    return true
  })

  // Anos/séries disponíveis
  const anosDisponiveis = etapa === 'todos' 
    ? [...ANOS_SERIES.fundamental, ...ANOS_SERIES.medio]
    : etapa === 'fundamental' 
    ? ANOS_SERIES.fundamental 
    : ANOS_SERIES.medio

  // Loading inicial
  if (loading && turmas.length === 0) {
    useEffect(() => {
      if (turmas.length > 0) setLoading(false)
    }, [turmas])
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Inteligentes</h1>
          <p className="text-gray-600">Análise completa de desempenho com IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={gerarRelatorio} disabled={gerando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${gerando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Nível do relatório */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nível do Relatório
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'geral', label: 'Geral', icon: Building2 },
                  { value: 'etapa', label: 'Por Etapa', icon: BookOpen },
                  { value: 'ano', label: 'Por Ano/Série', icon: GraduationCap },
                  { value: 'turma', label: 'Por Turma', icon: Users },
                  { value: 'aluno', label: 'Por Aluno', icon: User },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => setNivel(item.value as NivelRelatorio)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      nivel === item.value
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros em linha */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Etapa de Ensino */}
              {nivel !== 'geral' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Etapa de Ensino
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={etapa}
                    onChange={(e) => setEtapa(e.target.value as EtapaEnsino)}
                  >
                    <option value="todos">Todas as etapas</option>
                    <option value="fundamental">Fundamental II (6º-9º)</option>
                    <option value="medio">Ensino Médio (1ª-3ª)</option>
                  </select>
                </div>
              )}

              {/* Ano/Série */}
              {['ano', 'turma', 'aluno'].includes(nivel) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Ano/Série
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={anoSerie}
                    onChange={(e) => setAnoSerie(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {anosDisponiveis.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Turma */}
              {['turma', 'aluno'].includes(nivel) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Turma
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={turmaId}
                    onChange={(e) => setTurmaId(e.target.value)}
                  >
                    <option value="">Todas as turmas</option>
                    {turmasFiltradas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aluno */}
              {nivel === 'aluno' && turmaId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Aluno
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={alunoId}
                    onChange={(e) => setAlunoId(e.target.value)}
                  >
                    <option value="">Selecione o aluno</option>
                    {alunos.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Período */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Período
                </label>
                <div className="flex gap-1">
                  {[
                    { value: '1', label: '1º Bim' },
                    { value: '2', label: '2º Bim' },
                    { value: '3', label: '3º Bim' },
                    { value: '4', label: '4º Bim' },
                    { value: 'anual', label: 'Anual' },
                  ].map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriodo(p.value as Periodo)}
                      disabled={p.value !== 'anual' && parseInt(p.value) > bimestreAtual}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        periodo === p.value
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : parseInt(p.value) > bimestreAtual && p.value !== 'anual'
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Ano Letivo
                </label>
                <select
                  className="p-2 border rounded-lg"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026].map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compararAnterior}
                    onChange={(e) => setCompararAnterior(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Comparar com ano anterior</span>
                </label>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={gerarRelatorio} disabled={gerando}>
                {gerando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Relatório com IA
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={gerarRelatorio} disabled={gerando}>
                <BarChart className="w-4 h-4 mr-2" />
                Só Gráficos
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setNivel('geral')
                  setEtapa('todos')
                  setAnoSerie('')
                  setTurmaId('')
                  setAlunoId('')
                  setPeriodo('anual')
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do relatório */}
      {gerando ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Gerando relatório...</p>
          </div>
        </div>
      ) : dados ? (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Média Geral</p>
                    <p className="text-2xl font-bold text-gray-900">{dados.mediaGeral}</p>
                  </div>
                  <div className={`p-2 rounded-full ${dados.mediaGeral >= 6 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {dados.mediaGeral >= 6 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Alunos</p>
                    <p className="text-2xl font-bold text-gray-900">{dados.totalAlunos}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Aprovados</p>
                    <p className="text-2xl font-bold text-green-600">{dados.aprovados}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Recuperação</p>
                    <p className="text-2xl font-bold text-orange-600">{dados.emRecuperacao}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Críticos</p>
                    <p className="text-2xl font-bold text-red-600">{dados.criticos}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Bimestral */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Evolução Bimestral
                </h3>
                {dados.evolucaoBimestral.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dados.evolucaoBimestral}>
                      <defs>
                        <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CORES_GRAFICO.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CORES_GRAFICO.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="bimestre" stroke="#6B7280" fontSize={12} />
                      <YAxis domain={[0, 10]} stroke="#6B7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        formatter={(value: number) => [value.toFixed(1), 'Média']}
                      />
                      <Area
                        type="monotone"
                        dataKey="media"
                        stroke={CORES_GRAFICO.primary}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMedia)"
                      />
                      {/* Linha de meta */}
                      <Line
                        type="monotone"
                        dataKey={() => 6}
                        stroke={CORES_GRAFICO.danger}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                        name="Meta (6.0)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Sem dados de evolução disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição de Notas */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  Distribuição de Notas
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dados.distribuicaoNotas.filter(d => d.quantidade > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="quantidade"
                      nameKey="faixa"
                      label={({ faixa, quantidade }) => quantidade > 0 ? `${quantidade}` : ''}
                    >
                      {dados.distribuicaoNotas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ranking de Turmas */}
            {dados.rankingTurmas.length > 1 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Ranking de Turmas
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dados.rankingTurmas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" domain={[0, 10]} stroke="#6B7280" fontSize={12} />
                      <YAxis type="category" dataKey="turma" stroke="#6B7280" fontSize={12} width={80} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        formatter={(value: number) => [value.toFixed(1), 'Média']}
                      />
                      <Bar dataKey="media" radius={[0, 4, 4, 0]}>
                        {dados.rankingTurmas.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.media >= 6 ? CORES_GRAFICO.success : entry.media >= 4 ? CORES_GRAFICO.warning : CORES_GRAFICO.danger}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Desempenho por Habilidade */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Desempenho por Área
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={dados.desempenhoPorHabilidade}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="habilidade" stroke="#6B7280" fontSize={11} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} stroke="#6B7280" fontSize={10} />
                    <Radar
                      name="Média"
                      dataKey="media"
                      stroke={CORES_GRAFICO.primary}
                      fill={CORES_GRAFICO.primary}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      formatter={(value: number) => [value.toFixed(1), 'Média']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Listas de alunos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Alunos */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Alunos Destaque
                </h3>
                {dados.topAlunos.length > 0 ? (
                  <div className="space-y-3">
                    {dados.topAlunos.map((aluno, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            <p className="text-sm text-gray-500">{aluno.turma}</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-green-600">{aluno.media}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Sem dados disponíveis</p>
                )}
              </CardContent>
            </Card>

            {/* Alunos em Risco */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Alunos que Precisam de Atenção
                </h3>
                {dados.alunosEmRisco.length > 0 ? (
                  <div className="space-y-3">
                    {dados.alunosEmRisco.map((aluno, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold">
                            !
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            <p className="text-sm text-gray-500">{aluno.turma}</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-red-600">{aluno.media}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum aluno em situação crítica!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Botões de exportação */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Texto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione os filtros e gere o relatório
            </h3>
            <p className="text-gray-500">
              Use os filtros acima para personalizar sua análise
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
