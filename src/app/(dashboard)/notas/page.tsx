'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Settings, FileText, BarChart3, Plus, Edit, Trash2, Save, Users, AlertCircle, CheckCircle, TrendingUp, Award, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ConfiguracaoNotas {
  id: string
  usuario_id: string
  tipo_periodo: 'bimestral' | 'trimestral'
  num_periodos: number
  media_aprovacao: number
  permite_recuperacao: boolean
  permite_prova_final: boolean
  arredondamento: number
  pesos_periodos: number[]
}

interface ComponenteAvaliacao {
  id: string
  usuario_id: string
  nome: string
  peso: number
  ordem: number
  ativo: boolean
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Aluno {
  id: string
  nome: string
  numero?: number
  turma_id: string
}

interface Nota {
  id?: string
  aluno_id: string
  turma_id: string
  componente_id: string
  periodo: number
  ano_letivo: number
  nota: number | null
  nota_recuperacao: number | null
  observacao?: string
}

type TabType = 'configuracao' | 'lancamento' | 'relatorio'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export default function NotasPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>('configuracao')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Configuração
  const [config, setConfig] = useState<ConfiguracaoNotas | null>(null)
  const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([])
  const [modalComponenteOpen, setModalComponenteOpen] = useState(false)
  const [editingComponente, setEditingComponente] = useState<ComponenteAvaliacao | null>(null)
  const [componenteForm, setComponenteForm] = useState({ nome: '', peso: '1.0' })

  // Lançamento
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [periodoSelecionado, setPeriodoSelecionado] = useState<number>(1)
  const [notasEditadas, setNotasEditadas] = useState<Record<string, Nota>>({})

  // Relatório
  const [todasNotas, setTodasNotas] = useState<Nota[]>([])
  const [todosAlunos, setTodosAlunos] = useState<Aluno[]>([])
  const [relatorioTurma, setRelatorioTurma] = useState<string>('')

  const anoLetivo = new Date().getFullYear()

  // Configuração padrão
  const configPadrao: Omit<ConfiguracaoNotas, 'id' | 'usuario_id'> = {
    tipo_periodo: 'bimestral',
    num_periodos: 4,
    media_aprovacao: 6.0,
    permite_recuperacao: true,
    permite_prova_final: true,
    arredondamento: 0.5,
    pesos_periodos: [1, 1, 1, 1]
  }

  const fetchData = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }

    try {
      // Buscar configuração
      const { data: configData } = await supabase
        .from('configuracoes_notas')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single()

      if (configData) {
        setConfig(configData)
      }

      // Buscar componentes
      const { data: compData } = await supabase
        .from('componentes_avaliacao')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('ativo', true)
        .order('ordem')

      setComponentes(compData || [])

      // Buscar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
        .order('nome')

      setTurmas(turmasData || [])

      // Buscar todos os alunos para relatório
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, numero, turma_id')
        .eq('ativo', true)

      setTodosAlunos(alunosData || [])

      // Buscar todas as notas para relatório
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('ano_letivo', anoLetivo)

      setTodasNotas(notasData || [])

    } catch (e) {
      console.error('Erro:', e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, anoLetivo])

  useEffect(() => { fetchData() }, [fetchData])

  // Buscar alunos quando selecionar turma
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([])
      setNotas([])
      return
    }

    const fetchAlunos = async () => {
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, numero, turma_id')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('numero')

      setAlunos(alunosData || [])

      // Buscar notas existentes
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('turma_id', turmaSelecionada)
        .eq('periodo', periodoSelecionado)
        .eq('ano_letivo', anoLetivo)

      setNotas(notasData || [])
      setNotasEditadas({})
    }

    fetchAlunos()
  }, [turmaSelecionada, periodoSelecionado, supabase, anoLetivo])

  // === CONFIGURAÇÃO ===

  const handleSaveConfig = async () => {
    if (!usuario?.id) return
    setSaving(true)
    setSaveError(null)

    try {
      const dataToSave = {
        usuario_id: usuario.id,
        tipo_periodo: config?.tipo_periodo || configPadrao.tipo_periodo,
        num_periodos: config?.num_periodos || configPadrao.num_periodos,
        media_aprovacao: config?.media_aprovacao || configPadrao.media_aprovacao,
        permite_recuperacao: config?.permite_recuperacao ?? configPadrao.permite_recuperacao,
        permite_prova_final: config?.permite_prova_final ?? configPadrao.permite_prova_final,
        arredondamento: config?.arredondamento || configPadrao.arredondamento,
        pesos_periodos: config?.pesos_periodos || configPadrao.pesos_periodos
      }

      let result
      if (config?.id) {
        result = await supabase
          .from('configuracoes_notas')
          .update(dataToSave)
          .eq('id', config.id)
          .select()
      } else {
        result = await supabase
          .from('configuracoes_notas')
          .insert(dataToSave)
          .select()
      }

      if (result.error) throw result.error

      setConfig(result.data[0])
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTipoPeriodoChange = (tipo: 'bimestral' | 'trimestral') => {
    const numPeriodos = tipo === 'bimestral' ? 4 : 3
    const pesos = Array(numPeriodos).fill(1)
    setConfig(prev => ({
      ...prev!,
      tipo_periodo: tipo,
      num_periodos: numPeriodos,
      pesos_periodos: pesos
    } as ConfiguracaoNotas))
  }

  const handlePesoChange = (index: number, valor: string) => {
    const pesos = [...(config?.pesos_periodos || configPadrao.pesos_periodos)]
    pesos[index] = parseFloat(valor) || 1
    setConfig(prev => ({ ...prev!, pesos_periodos: pesos } as ConfiguracaoNotas))
  }

  // === COMPONENTES ===

  const handleOpenComponenteModal = (comp?: ComponenteAvaliacao) => {
    if (comp) {
      setEditingComponente(comp)
      setComponenteForm({ nome: comp.nome, peso: comp.peso.toString() })
    } else {
      setEditingComponente(null)
      setComponenteForm({ nome: '', peso: '1.0' })
    }
    setModalComponenteOpen(true)
  }

  const handleSaveComponente = async () => {
    if (!usuario?.id || !componenteForm.nome.trim()) return
    setSaving(true)

    try {
      const dataToSave = {
        usuario_id: usuario.id,
        nome: componenteForm.nome.trim(),
        peso: parseFloat(componenteForm.peso) || 1,
        ordem: editingComponente?.ordem ?? componentes.length,
        ativo: true
      }

      if (editingComponente) {
        await supabase
          .from('componentes_avaliacao')
          .update(dataToSave)
          .eq('id', editingComponente.id)
      } else {
        await supabase
          .from('componentes_avaliacao')
          .insert(dataToSave)
      }

      setModalComponenteOpen(false)
      fetchData()
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComponente = async (id: string) => {
    if (!confirm('Excluir este componente?')) return

    await supabase
      .from('componentes_avaliacao')
      .update({ ativo: false })
      .eq('id', id)

    fetchData()
  }

  // === LANÇAMENTO ===

  const getNotaKey = (alunoId: string, componenteId: string) => `${alunoId}-${componenteId}`

  const getNotaValue = (alunoId: string, componenteId: string): number | null => {
    const key = getNotaKey(alunoId, componenteId)
    if (notasEditadas[key]) {
      return notasEditadas[key].nota
    }
    const notaExistente = notas.find(n => n.aluno_id === alunoId && n.componente_id === componenteId)
    return notaExistente?.nota ?? null
  }

  const getRecuperacaoValue = (alunoId: string, componenteId: string): number | null => {
    const key = getNotaKey(alunoId, componenteId)
    if (notasEditadas[key]) {
      return notasEditadas[key].nota_recuperacao
    }
    const notaExistente = notas.find(n => n.aluno_id === alunoId && n.componente_id === componenteId)
    return notaExistente?.nota_recuperacao ?? null
  }

  const handleNotaChange = (alunoId: string, componenteId: string, valor: string, isRecuperacao = false) => {
    const key = getNotaKey(alunoId, componenteId)
    const notaExistente = notas.find(n => n.aluno_id === alunoId && n.componente_id === componenteId)
    const notaAtual = notasEditadas[key] || {
      aluno_id: alunoId,
      turma_id: turmaSelecionada,
      componente_id: componenteId,
      periodo: periodoSelecionado,
      ano_letivo: anoLetivo,
      nota: notaExistente?.nota ?? null,
      nota_recuperacao: notaExistente?.nota_recuperacao ?? null,
      id: notaExistente?.id
    }

    const valorNumerico = valor === '' ? null : Math.min(10, Math.max(0, parseFloat(valor) || 0))

    setNotasEditadas(prev => ({
      ...prev,
      [key]: {
        ...notaAtual,
        [isRecuperacao ? 'nota_recuperacao' : 'nota']: valorNumerico
      }
    }))
  }

  const calcularMedia = (alunoId: string): number | null => {
    if (componentes.length === 0) return null

    let somaNotas = 0
    let somaPesos = 0

    for (const comp of componentes) {
      const nota = getNotaValue(alunoId, comp.id)
      const recuperacao = getRecuperacaoValue(alunoId, comp.id)

      // Usa a maior nota entre normal e recuperação
      const notaFinal = recuperacao !== null && recuperacao > (nota || 0) ? recuperacao : nota

      if (notaFinal !== null) {
        somaNotas += notaFinal * comp.peso
        somaPesos += comp.peso
      }
    }

    if (somaPesos === 0) return null

    const media = somaNotas / somaPesos
    const arredondamento = config?.arredondamento || 0.5
    return Math.round(media / arredondamento) * arredondamento
  }

  const handleSaveNotas = async () => {
    const notasParaSalvar = Object.values(notasEditadas)
    if (notasParaSalvar.length === 0) return

    setSaving(true)
    setSaveError(null)

    try {
      for (const nota of notasParaSalvar) {
        if (nota.id) {
          await supabase
            .from('notas')
            .update({
              nota: nota.nota,
              nota_recuperacao: nota.nota_recuperacao
            })
            .eq('id', nota.id)
        } else {
          await supabase
            .from('notas')
            .insert({
              aluno_id: nota.aluno_id,
              turma_id: nota.turma_id,
              componente_id: nota.componente_id,
              periodo: nota.periodo,
              ano_letivo: nota.ano_letivo,
              nota: nota.nota,
              nota_recuperacao: nota.nota_recuperacao
            })
        }
      }

      // Recarregar notas
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('turma_id', turmaSelecionada)
        .eq('periodo', periodoSelecionado)
        .eq('ano_letivo', anoLetivo)

      setNotas(notasData || [])
      setNotasEditadas({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      // Atualizar dados do relatório
      fetchData()
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusAluno = (media: number | null): { status: string; color: string } => {
    if (media === null) return { status: '-', color: 'text-gray-400' }
    const mediaAprovacao = config?.media_aprovacao || 6.0
    if (media >= mediaAprovacao) return { status: 'Aprovado', color: 'text-green-600' }
    if (media >= mediaAprovacao - 1) return { status: 'Recuperação', color: 'text-yellow-600' }
    return { status: 'Abaixo', color: 'text-red-600' }
  }

  // === RELATÓRIO ===

  const getMediaTurma = (turmaId: string): number => {
    const notasTurma = todasNotas.filter(n => n.turma_id === turmaId && n.nota !== null)
    if (notasTurma.length === 0) return 0
    const soma = notasTurma.reduce((acc, n) => acc + (n.nota || 0), 0)
    return Math.round((soma / notasTurma.length) * 10) / 10
  }

  const getMediaPorPeriodo = (turmaId?: string) => {
    const periodos = config?.tipo_periodo === 'trimestral'
      ? ['1º Tri', '2º Tri', '3º Tri']
      : ['1º Bim', '2º Bim', '3º Bim', '4º Bim']

    return periodos.map((nome, idx) => {
      const notasPeriodo = todasNotas.filter(n => 
        n.periodo === idx + 1 && 
        n.nota !== null &&
        (!turmaId || n.turma_id === turmaId)
      )
      const media = notasPeriodo.length > 0
        ? notasPeriodo.reduce((acc, n) => acc + (n.nota || 0), 0) / notasPeriodo.length
        : 0
      return {
        nome,
        media: Math.round(media * 10) / 10
      }
    })
  }

  const getDistribuicaoNotas = (turmaId?: string) => {
    const faixas = [
      { nome: '0-2', min: 0, max: 2, count: 0 },
      { nome: '2-4', min: 2, max: 4, count: 0 },
      { nome: '4-6', min: 4, max: 6, count: 0 },
      { nome: '6-8', min: 6, max: 8, count: 0 },
      { nome: '8-10', min: 8, max: 10, count: 0 },
    ]

    const notasFiltradas = todasNotas.filter(n => 
      n.nota !== null && (!turmaId || n.turma_id === turmaId)
    )

    notasFiltradas.forEach(n => {
      const nota = n.nota || 0
      const faixa = faixas.find(f => nota >= f.min && nota <= f.max)
      if (faixa) faixa.count++
    })

    return faixas
  }

  const getRankingAlunos = (turmaId?: string, limit = 10) => {
    const alunosFiltrados = turmaId 
      ? todosAlunos.filter(a => a.turma_id === turmaId)
      : todosAlunos

    const ranking = alunosFiltrados.map(aluno => {
      const notasAluno = todasNotas.filter(n => n.aluno_id === aluno.id && n.nota !== null)
      const media = notasAluno.length > 0
        ? notasAluno.reduce((acc, n) => acc + (n.nota || 0), 0) / notasAluno.length
        : 0
      return {
        ...aluno,
        media: Math.round(media * 10) / 10,
        turma: turmas.find(t => t.id === aluno.turma_id)?.nome || ''
      }
    })

    return ranking
      .filter(a => a.media > 0)
      .sort((a, b) => b.media - a.media)
      .slice(0, limit)
  }

  const getEstatisticasGerais = (turmaId?: string) => {
    const notasFiltradas = todasNotas.filter(n => 
      n.nota !== null && (!turmaId || n.turma_id === turmaId)
    )

    if (notasFiltradas.length === 0) {
      return { media: 0, maior: 0, menor: 0, aprovados: 0, total: 0 }
    }

    const valores = notasFiltradas.map(n => n.nota || 0)
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    const mediaAprovacao = config?.media_aprovacao || 6.0

    return {
      media: Math.round(media * 10) / 10,
      maior: Math.max(...valores),
      menor: Math.min(...valores),
      aprovados: valores.filter(v => v >= mediaAprovacao).length,
      total: valores.length
    }
  }

  const dadosMediasTurmas = turmas.map(t => ({
    nome: t.nome,
    media: getMediaTurma(t.id)
  })).filter(t => t.media > 0)

  const dadosEvolucao = getMediaPorPeriodo(relatorioTurma || undefined)
  const dadosDistribuicao = getDistribuicaoNotas(relatorioTurma || undefined)
  const rankingAlunos = getRankingAlunos(relatorioTurma || undefined)
  const estatisticas = getEstatisticasGerais(relatorioTurma || undefined)

  const periodos = config?.tipo_periodo === 'trimestral'
    ? ['1º Tri', '2º Tri', '3º Tri']
    : ['1º Bim', '2º Bim', '3º Bim', '4º Bim']

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sistema de Notas</h1>
        <p className="text-gray-600">Configure e lance notas dos alunos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('configuracao')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'configuracao'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuração
        </button>
        <button
          onClick={() => setActiveTab('lancamento')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'lancamento'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Lançamento
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'relatorio'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Relatório
        </button>
      </div>

      {/* Mensagens */}
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-600">Salvo com sucesso!</p>
        </div>
      )}

      {/* === ABA CONFIGURAÇÃO === */}
      {activeTab === 'configuracao' && (
        <div className="space-y-6">
          {/* Tipo de Período */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Período Letivo</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tipo_periodo"
                    checked={(config?.tipo_periodo || configPadrao.tipo_periodo) === 'bimestral'}
                    onChange={() => handleTipoPeriodoChange('bimestral')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Bimestral</p>
                    <p className="text-sm text-gray-500">4 períodos por ano</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tipo_periodo"
                    checked={(config?.tipo_periodo || configPadrao.tipo_periodo) === 'trimestral'}
                    onChange={() => handleTipoPeriodoChange('trimestral')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Trimestral</p>
                    <p className="text-sm text-gray-500">3 períodos por ano</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Pesos dos Períodos */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Pesos dos Períodos</h3>
              <div className="grid grid-cols-4 gap-4">
                {(config?.pesos_periodos || configPadrao.pesos_periodos).map((peso, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {idx + 1}º {(config?.tipo_periodo || configPadrao.tipo_periodo) === 'bimestral' ? 'Bimestre' : 'Trimestre'}
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={peso}
                      onChange={(e) => handlePesoChange(idx, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configurações Gerais */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Média para Aprovação</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={config?.media_aprovacao ?? configPadrao.media_aprovacao}
                    onChange={(e) => setConfig(prev => ({ ...prev!, media_aprovacao: parseFloat(e.target.value) || 6 } as ConfiguracaoNotas))}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arredondamento</label>
                  <select
                    value={config?.arredondamento ?? configPadrao.arredondamento}
                    onChange={(e) => setConfig(prev => ({ ...prev!, arredondamento: parseFloat(e.target.value) } as ConfiguracaoNotas))}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  >
                    <option value="0.1">0.1</option>
                    <option value="0.25">0.25</option>
                    <option value="0.5">0.5</option>
                    <option value="1">1.0</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recuperacao"
                    checked={config?.permite_recuperacao ?? configPadrao.permite_recuperacao}
                    onChange={(e) => setConfig(prev => ({ ...prev!, permite_recuperacao: e.target.checked } as ConfiguracaoNotas))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <label htmlFor="recuperacao" className="text-sm text-gray-700">Permitir Recuperação</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prova_final"
                    checked={config?.permite_prova_final ?? configPadrao.permite_prova_final}
                    onChange={(e) => setConfig(prev => ({ ...prev!, permite_prova_final: e.target.checked } as ConfiguracaoNotas))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <label htmlFor="prova_final" className="text-sm text-gray-700">Permitir Prova Final</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Componentes de Avaliação */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Componentes de Avaliação</h3>
                <Button size="sm" onClick={() => handleOpenComponenteModal()}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </div>
              {componentes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum componente cadastrado. Adicione provas, trabalhos, etc.</p>
              ) : (
                <div className="space-y-2">
                  {componentes.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{comp.nome}</span>
                        <Badge>Peso: {comp.peso}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenComponenteModal(comp)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteComponente(comp.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} loading={saving}>
              <Save className="w-4 h-4 mr-2" />Salvar Configurações
            </Button>
          </div>
        </div>
      )}

      {/* === ABA LANÇAMENTO === */}
      {activeTab === 'lancamento' && (
        <div className="space-y-6">
          {/* Seletores */}
          <Card variant="bordered">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                  <select
                    value={turmaSelecionada}
                    onChange={(e) => setTurmaSelecionada(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  >
                    <option value="">Selecione uma turma</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select
                    value={periodoSelecionado}
                    onChange={(e) => setPeriodoSelecionado(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  >
                    {periodos.map((p, idx) => (
                      <option key={idx} value={idx + 1}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Badge variant="info" className="text-sm">{anoLetivo}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Notas */}
          {!turmaSelecionada ? (
            <Card variant="bordered">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma turma</h3>
                <p className="text-gray-500">Escolha a turma e o período para lançar notas</p>
              </CardContent>
            </Card>
          ) : componentes.length === 0 ? (
            <Card variant="bordered">
              <CardContent className="p-12 text-center">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Configure os componentes</h3>
                <p className="text-gray-500 mb-4">Adicione componentes de avaliação na aba Configuração</p>
                <Button onClick={() => setActiveTab('configuracao')}>
                  <Settings className="w-4 h-4 mr-2" />Ir para Configuração
                </Button>
              </CardContent>
            </Card>
          ) : alunos.length === 0 ? (
            <Card variant="bordered">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum aluno</h3>
                <p className="text-gray-500">Esta turma não possui alunos cadastrados</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Botão Salvar no topo */}
              {Object.keys(notasEditadas).length > 0 && (
                <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <span className="text-yellow-800">
                    {Object.keys(notasEditadas).length} nota(s) alterada(s)
                  </span>
                  <Button onClick={handleSaveNotas} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />Salvar Notas
                  </Button>
                </div>
              )}

              <Card variant="bordered">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nº</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Aluno</th>
                        {componentes.map(comp => (
                          <th key={comp.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                            {comp.nome}
                            <span className="block text-xs font-normal text-gray-500">Peso: {comp.peso}</span>
                          </th>
                        ))}
                        {config?.permite_recuperacao && (
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Rec.</th>
                        )}
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Média</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {alunos.map(aluno => {
                        const media = calcularMedia(aluno.id)
                        const status = getStatusAluno(media)
                        return (
                          <tr key={aluno.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">{aluno.numero || '-'}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{aluno.nome}</td>
                            {componentes.map(comp => (
                              <td key={comp.id} className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={getNotaValue(aluno.id, comp.id) ?? ''}
                                  onChange={(e) => handleNotaChange(aluno.id, comp.id, e.target.value)}
                                  className="w-16 px-2 py-1 text-center border rounded text-gray-900"
                                  placeholder="-"
                                />
                              </td>
                            ))}
                            {config?.permite_recuperacao && (
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={getRecuperacaoValue(aluno.id, componentes[0]?.id) ?? ''}
                                  onChange={(e) => handleNotaChange(aluno.id, componentes[0]?.id, e.target.value, true)}
                                  className="w-16 px-2 py-1 text-center border rounded text-gray-900 bg-yellow-50"
                                  placeholder="-"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-lg text-gray-900">
                                {media !== null ? media.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-center text-sm font-medium ${status.color}`}>
                              {status.status}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* === ABA RELATÓRIO === */}
      {activeTab === 'relatorio' && (
        <div className="space-y-6">
          {/* Filtro */}
          <Card variant="bordered">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Filtrar por turma:</label>
                <select
                  value={relatorioTurma}
                  onChange={(e) => setRelatorioTurma(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-gray-900"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Média Geral</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.media}</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Maior Nota</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas.maior}</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Menor Nota</p>
                <p className="text-2xl font-bold text-red-600">{estatisticas.menor}</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas.aprovados}</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Notas</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Média por Turma */}
            {!relatorioTurma && dadosMediasTurmas.length > 0 && (
              <Card variant="bordered">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">📊 Média por Turma</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosMediasTurmas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="media" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Evolução por Período */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">📈 Evolução por Período</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dadosEvolucao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="media" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de Notas */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">📉 Distribuição de Notas</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosDistribuicao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]}>
                      {dadosDistribuicao.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index < 2 ? '#ef4444' : index === 2 ? '#f59e0b' : '#22c55e'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ranking de Alunos */}
            <Card variant="bordered">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">🏆 Top 10 Alunos</h3>
                {rankingAlunos.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma nota lançada ainda</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {rankingAlunos.map((aluno, idx) => (
                      <div key={aluno.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            {!relatorioTurma && (
                              <p className="text-xs text-gray-500">{aluno.turma}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-lg text-indigo-600">{aluno.media}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mensagem se não houver dados */}
          {todasNotas.length === 0 && (
            <Card variant="bordered">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado disponível</h3>
                <p className="text-gray-500">Lance notas na aba Lançamento para ver os relatórios</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal Componente */}
      <Modal
        isOpen={modalComponenteOpen}
        onClose={() => setModalComponenteOpen(false)}
        title={editingComponente ? 'Editar Componente' : 'Novo Componente'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <Input
              placeholder="Ex: Prova Bimestral"
              value={componenteForm.nome}
              onChange={(e) => setComponenteForm({ ...componenteForm, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso</label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={componenteForm.peso}
              onChange={(e) => setComponenteForm({ ...componenteForm, peso: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalComponenteOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSaveComponente} loading={saving}>
              {editingComponente ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
