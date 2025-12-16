'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Search, FileText, Edit, Trash2, Eye, Check, X, Wand2, Filter, CheckCircle, ArrowLeft, ArrowUp, ArrowDown, AlertCircle, Printer, Download } from 'lucide-react'
import { exportToWord } from '@/lib/export-document'

interface ListaExercicios {
  id: string
  titulo: string
  descricao?: string
  questoes_ids: string[]
  configuracoes?: any
  created_at: string
  usuario_id: string
}

interface Questao {
  id: string
  enunciado: string
  ano_serie: string
  dificuldade: string
  habilidade_id?: string
  alternativa_a?: string
  alternativa_b?: string
  alternativa_c?: string
  alternativa_d?: string
  alternativa_e?: string
  resposta_correta?: string
}

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
}

const ANO_SERIE_OPTIONS = [
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
]

const DIFICULDADE_OPTIONS = [
  { value: 'facil', label: '🟢 Fácil' },
  { value: 'medio', label: '🟡 Médio' },
  { value: 'dificil', label: '🔴 Difícil' },
]

type ModalStep = 'form' | 'preview'

export default function ListaExerciciosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [listas, setListas] = useState<ListaExercicios[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<ModalStep>('form')
  const [questoesModalOpen, setQuestoesModalOpen] = useState(false)
  const [gerarAutoModalOpen, setGerarAutoModalOpen] = useState(false)
  const [editingLista, setEditingLista] = useState<ListaExercicios | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [showHabilidadesFilter, setShowHabilidadesFilter] = useState(false)
  const [geracaoSucesso, setGeracaoSucesso] = useState(false)

  const [totalQuestoesInput, setTotalQuestoesInput] = useState('10')
  const [qtdFacilInput, setQtdFacilInput] = useState('3')
  const [qtdMedioInput, setQtdMedioInput] = useState('4')
  const [qtdDificilInput, setQtdDificilInput] = useState('3')

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    incluir_gabarito: true,
    incluir_cabecalho: true,
  })

  const [questaoFilters, setQuestaoFilters] = useState({
    ano_serie: '',
    habilidades_ids: [] as string[],
    dificuldade: ''
  })

  const [autoConfig, setAutoConfig] = useState({
    ano_serie: '6º ano EF',
    habilidades_ids: [] as string[],
  })

  const totalQuestoes = parseInt(totalQuestoesInput) || 0
  const qtdFacil = parseInt(qtdFacilInput) || 0
  const qtdMedio = parseInt(qtdMedioInput) || 0
  const qtdDificil = parseInt(qtdDificilInput) || 0
  const totalDistribuicao = qtdFacil + qtdMedio + qtdDificil

  const fetchData = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    try {
      const [lRes, qRes, hRes] = await Promise.all([
        supabase.from('listas_exercicios').select('*').eq('usuario_id', usuario.id).order('created_at', { ascending: false }),
        supabase.from('questoes').select('id, enunciado, ano_serie, dificuldade, habilidade_id, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, resposta_correta').eq('ativa', true),
        supabase.from('habilidades_bncc').select('id, codigo, descricao').order('codigo'),
      ])
      setListas(lRes.data || [])
      setQuestoesDisponiveis(qRes.data || [])
      setHabilidades(hRes.data || [])
    } catch (e) {
      console.error('Erro:', e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTotalQuestoesChange = (value: string) => {
    setTotalQuestoesInput(value)
    const num = parseInt(value) || 0
    if (num > 0) {
      const facil = Math.round(num * 0.3)
      const dificil = Math.round(num * 0.3)
      const medio = num - facil - dificil
      setQtdFacilInput(facil.toString())
      setQtdMedioInput(medio.toString())
      setQtdDificilInput(dificil.toString())
    }
  }

  const handleOpenModal = (lista?: ListaExercicios) => {
    setGeracaoSucesso(false)
    setSaveError(null)
    setModalStep('form')
    if (lista) {
      setEditingLista(lista)
      const config = lista.configuracoes || {}
      setFormData({
        titulo: lista.titulo,
        descricao: lista.descricao || '',
        incluir_gabarito: config.incluir_gabarito ?? true,
        incluir_cabecalho: config.incluir_cabecalho ?? true,
      })
      setTotalQuestoesInput((lista.questoes_ids?.length || 10).toString())
      setQuestoesSelecionadas(lista.questoes_ids || [])
    } else {
      setEditingLista(null)
      setFormData({
        titulo: '',
        descricao: '',
        incluir_gabarito: true,
        incluir_cabecalho: true,
      })
      setTotalQuestoesInput('10')
      setQtdFacilInput('3')
      setQtdMedioInput('4')
      setQtdDificilInput('3')
      setQuestoesSelecionadas([])
    }
    setModalOpen(true)
  }

  const handleGoToPreview = () => {
    if (!formData.titulo.trim()) {
      setSaveError('Digite um título')
      return
    }
    if (questoesSelecionadas.length === 0) {
      setSaveError('Selecione pelo menos uma questão')
      return
    }
    setSaveError(null)
    setModalStep('preview')
  }

  const handleBackToForm = () => {
    setSaveError(null)
    setModalStep('form')
  }

  const handleSave = async () => {
    if (!usuario?.id) {
      setSaveError('Usuário não autenticado')
      return
    }
    if (!formData.titulo.trim()) {
      setSaveError('Digite um título')
      return
    }
    if (questoesSelecionadas.length === 0) {
      setSaveError('Selecione pelo menos uma questão')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const dataToSave = {
        usuario_id: usuario.id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao?.trim() || null,
        questoes_ids: questoesSelecionadas,
        configuracoes: {
          incluir_gabarito: formData.incluir_gabarito,
          incluir_cabecalho: formData.incluir_cabecalho,
        }
      }

      let result
      if (editingLista) {
        result = await supabase.from('listas_exercicios').update(dataToSave).eq('id', editingLista.id).select()
      } else {
        result = await supabase.from('listas_exercicios').insert(dataToSave).select()
      }

      if (result.error) {
        setSaveError(`Erro: ${result.error.message}`)
        return
      }

      setModalOpen(false)
      setModalStep('form')
      fetchData()
    } catch (e: any) {
      setSaveError(e.message || 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta lista?')) return
    await supabase.from('listas_exercicios').delete().eq('id', id)
    fetchData()
  }

  const toggleQuestao = (id: string) => {
    setQuestoesSelecionadas(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  const toggleHabilidadeAuto = (id: string) => {
    setAutoConfig(prev => ({
      ...prev,
      habilidades_ids: prev.habilidades_ids.includes(id)
        ? prev.habilidades_ids.filter(h => h !== id)
        : [...prev.habilidades_ids, id]
    }))
  }

  const toggleHabilidadeManual = (id: string) => {
    setQuestaoFilters(prev => ({
      ...prev,
      habilidades_ids: prev.habilidades_ids.includes(id)
        ? prev.habilidades_ids.filter(h => h !== id)
        : [...prev.habilidades_ids, id]
    }))
  }

  const gerarQuestoesAutomaticamente = () => {
    let qFiltradas = questoesDisponiveis.filter(q => q.ano_serie === autoConfig.ano_serie)
    if (autoConfig.habilidades_ids.length > 0) {
      qFiltradas = qFiltradas.filter(q => q.habilidade_id && autoConfig.habilidades_ids.includes(q.habilidade_id))
    }

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

    const faceis = shuffle(qFiltradas.filter(q => q.dificuldade === 'facil')).slice(0, qtdFacil)
    const medias = shuffle(qFiltradas.filter(q => q.dificuldade === 'medio')).slice(0, qtdMedio)
    const dificeis = shuffle(qFiltradas.filter(q => q.dificuldade === 'dificil')).slice(0, qtdDificil)

    const selecionadas = [...faceis, ...medias, ...dificeis].map(q => q.id)
    setQuestoesSelecionadas(selecionadas)
    setGeracaoSucesso(true)

    setTimeout(() => {
      setGerarAutoModalOpen(false)
      setGeracaoSucesso(false)
    }, 1500)
  }

  const moverQuestao = (index: number, direcao: 'up' | 'down') => {
    const novaOrdem = [...questoesSelecionadas]
    const novoIndex = direcao === 'up' ? index - 1 : index + 1
    if (novoIndex < 0 || novoIndex >= novaOrdem.length) return
    ;[novaOrdem[index], novaOrdem[novoIndex]] = [novaOrdem[novoIndex], novaOrdem[index]]
    setQuestoesSelecionadas(novaOrdem)
  }

  const removerQuestao = (id: string) => {
    setQuestoesSelecionadas(prev => prev.filter(q => q !== id))
  }

  const handleExportWord = async (lista: ListaExercicios) => {
    try {
      const { data: questoesData } = await supabase
        .from('questoes')
        .select('id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, resposta_correta, dificuldade, habilidade_id')
        .in('id', lista.questoes_ids)

      if (!questoesData) return

      const questoesOrdenadas = lista.questoes_ids
        .map(id => questoesData.find(q => q.id === id))
        .filter(Boolean)
        .map(q => ({
          ...q!,
          habilidade_codigo: habilidades.find(h => h.id === q!.habilidade_id)?.codigo
        }))

      const config = lista.configuracoes || {}

      await exportToWord({
        titulo: lista.titulo,
        subtitulo: lista.descricao,
        incluirGabarito: config.incluir_gabarito ?? true,
        incluirCabecalho: config.incluir_cabecalho ?? true,
        questoes: questoesOrdenadas
      })
    } catch (e) {
      console.error('Erro ao exportar:', e)
      alert('Erro ao exportar documento')
    }
  }

  const filteredQuestoes = questoesDisponiveis.filter(q => {
    if (questaoFilters.ano_serie && q.ano_serie !== questaoFilters.ano_serie) return false
    if (questaoFilters.dificuldade && q.dificuldade !== questaoFilters.dificuldade) return false
    if (questaoFilters.habilidades_ids.length > 0) {
      if (!q.habilidade_id || !questaoFilters.habilidades_ids.includes(q.habilidade_id)) return false
    }
    return true
  })

  const filteredListas = listas.filter(l =>
    l.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const habilidadesFiltradas = habilidades.filter(h =>
    !autoConfig.ano_serie || h.codigo.includes(autoConfig.ano_serie.charAt(0))
  )

  const habilidadesFiltradasManual = habilidades.filter(h =>
    !questaoFilters.ano_serie || h.codigo.includes(questaoFilters.ano_serie.charAt(0))
  )

  const getHabilidadeCodigo = (id?: string) => {
    if (!id) return null
    return habilidades.find(h => h.id === id)?.codigo || null
  }

  const getDificuldadeInfo = (d?: string) => {
    if (d === 'facil') return { label: 'Fácil', color: 'success' as const, emoji: '🟢' }
    if (d === 'medio') return { label: 'Médio', color: 'warning' as const, emoji: '🟡' }
    if (d === 'dificil') return { label: 'Difícil', color: 'danger' as const, emoji: '🔴' }
    return { label: d || '', color: 'default' as const, emoji: '' }
  }

  const getQuestoesDisponiveisPorDificuldade = () => {
    let qf = questoesDisponiveis.filter(q => q.ano_serie === autoConfig.ano_serie)
    if (autoConfig.habilidades_ids.length > 0) {
      qf = qf.filter(q => q.habilidade_id && autoConfig.habilidades_ids.includes(q.habilidade_id))
    }
    return {
      facil: qf.filter(q => q.dificuldade === 'facil').length,
      medio: qf.filter(q => q.dificuldade === 'medio').length,
      dificil: qf.filter(q => q.dificuldade === 'dificil').length,
      total: qf.length
    }
  }

  const disponiveisAuto = getQuestoesDisponiveisPorDificuldade()

  const getEstatisticasLista = () => {
    const questoes = questoesSelecionadas
      .map(id => questoesDisponiveis.find(q => q.id === id))
      .filter(Boolean) as Questao[]
    return {
      total: questoes.length,
      facil: questoes.filter(q => q.dificuldade === 'facil').length,
      medio: questoes.filter(q => q.dificuldade === 'medio').length,
      dificil: questoes.filter(q => q.dificuldade === 'dificil').length,
      habilidades: [...new Set(questoes.map(q => q.habilidade_id).filter(Boolean))].length
    }
  }

  const stats = getEstatisticasLista()

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Exercícios</h1>
          <p className="text-gray-600">Crie listas para impressão ou PDF</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-5 h-5 mr-2" />Nova Lista
        </Button>
      </div>

      {/* Busca */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar listas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredListas.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma encontrada' : 'Nenhuma lista'}
            </h3>
            <p className="text-gray-500 mb-6">Crie sua primeira lista de exercícios</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-5 h-5 mr-2" />Criar Lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredListas.map(lista => (
            <Card key={lista.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{lista.titulo}</h3>
                    {lista.descricao && (
                      <p className="text-gray-600 text-sm mb-2">{lista.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{lista.questoes_ids?.length || 0} questões</span>
                      <span>{new Date(lista.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleExportWord(lista)} title="Exportar Word">
                      <Download className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(lista)} title="Editar">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(lista.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalStep === 'preview' ? '📋 Revisar Lista' : (editingLista ? 'Editar Lista' : 'Nova Lista')}
        size="xl"
      >
        {modalStep === 'form' ? (
          <div className="space-y-4">
            <div className="flex gap-3 pb-4 border-b">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleGoToPreview}>
                <Eye className="w-4 h-4 mr-2" />
                Revisar ({questoesSelecionadas.length})
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <Input
                placeholder="Ex: Lista de Frações - 6º Ano"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg text-gray-900"
                rows={2}
                placeholder="Descrição opcional..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.incluir_gabarito}
                  onChange={(e) => setFormData({ ...formData, incluir_gabarito: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Incluir gabarito</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.incluir_cabecalho}
                  onChange={(e) => setFormData({ ...formData, incluir_cabecalho: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Incluir cabeçalho</span>
              </label>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Questões: {questoesSelecionadas.length}/{totalQuestoes}</h4>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setGerarAutoModalOpen(true)}>
                    <Wand2 className="w-4 h-4 mr-1" />Auto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuestoesModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />Manual
                  </Button>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${questoesSelecionadas.length >= totalQuestoes && totalQuestoes > 0 ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${totalQuestoes > 0 ? Math.min((questoesSelecionadas.length / totalQuestoes) * 100, 100) : 0}%` }}
                />
              </div>

              {questoesSelecionadas.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {questoesSelecionadas.map((id, idx) => {
                    const q = questoesDisponiveis.find(x => x.id === id)
                    if (!q) return null
                    const dif = getDificuldadeInfo(q.dificuldade)
                    return (
                      <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-bold text-gray-700">{idx + 1}.</span>
                          <Badge variant={dif.color} className="text-xs">{dif.emoji}</Badge>
                          <span className="text-gray-900 truncate">{q.enunciado.substring(0, 40)}...</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleQuestao(id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 pb-4 border-b">
              <Button variant="outline" onClick={handleBackToForm}>
                <ArrowLeft className="w-4 h-4 mr-1" />Voltar
              </Button>
              <Button className="flex-1" onClick={handleSave} loading={saving}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {editingLista ? 'Salvar Alterações' : 'Criar Lista'}
              </Button>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{formData.titulo}</h3>
              {formData.descricao && (
                <p className="text-gray-600 text-sm mb-2">{formData.descricao}</p>
              )}
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 text-xs">Questões</p>
                  <p className="font-bold text-gray-900">{questoesSelecionadas.length}</p>
                </div>
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 text-xs">Habilidades</p>
                  <p className="font-bold text-gray-900">{stats.habilidades}</p>
                </div>
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 text-xs">Gabarito</p>
                  <p className="font-bold text-gray-900">{formData.incluir_gabarito ? 'Sim' : 'Não'}</p>
                </div>
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 text-xs">Cabeçalho</p>
                  <p className="font-bold text-gray-900">{formData.incluir_cabecalho ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-xs">
                <span>🟢 {stats.facil} fáceis</span>
                <span>🟡 {stats.medio} médias</span>
                <span>🔴 {stats.dificil} difíceis</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Questões</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setModalStep('form'); setQuestoesModalOpen(true) }}
                >
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questoesSelecionadas.map((id, idx) => {
                  const q = questoesDisponiveis.find(x => x.id === id)
                  if (!q) return null
                  const dif = getDificuldadeInfo(q.dificuldade)
                  return (
                    <div key={id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moverQuestao(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moverQuestao(idx, 'down')}
                          disabled={idx === questoesSelecionadas.length - 1}
                          className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">Q{idx + 1}</span>
                          <Badge variant={dif.color} className="text-xs">{dif.emoji}</Badge>
                          {getHabilidadeCodigo(q.habilidade_id) && (
                            <Badge className="text-xs">{getHabilidadeCodigo(q.habilidade_id)}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                      </div>
                      <button
                        onClick={() => removerQuestao(id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL - Seleção Manual */}
      <Modal
        isOpen={questoesModalOpen}
        onClose={() => setQuestoesModalOpen(false)}
        title="Selecionar Questões"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm text-indigo-700">
              <strong>{questoesSelecionadas.length}</strong> selecionadas
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select
              className="px-3 py-2 border rounded-lg text-gray-900"
              value={questaoFilters.ano_serie}
              onChange={(e) => setQuestaoFilters({ ...questaoFilters, ano_serie: e.target.value })}
            >
              <option value="">Todos os anos</option>
              {ANO_SERIE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border rounded-lg text-gray-900"
              value={questaoFilters.dificuldade}
              onChange={(e) => setQuestaoFilters({ ...questaoFilters, dificuldade: e.target.value })}
            >
              <option value="">Todas dificuldades</option>
              {DIFICULDADE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant={showHabilidadesFilter ? 'primary' : 'outline'}
              onClick={() => setShowHabilidadesFilter(!showHabilidadesFilter)}
            >
              {questaoFilters.habilidades_ids.length > 0
                ? `${questaoFilters.habilidades_ids.length} hab.`
                : 'Habilidades'}
            </Button>
          </div>

          {showHabilidadesFilter && (
            <div className="border rounded-lg p-2 bg-gray-50 max-h-28 overflow-y-auto">
              {habilidadesFiltradasManual.map(h => (
                <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questaoFilters.habilidades_ids.includes(h.id)}
                    onChange={() => toggleHabilidadeManual(h.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900"><strong>{h.codigo}</strong></span>
                </label>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-600">{filteredQuestoes.length} questões encontradas</p>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredQuestoes.map(q => {
              const sel = questoesSelecionadas.includes(q.id)
              return (
                <div
                  key={q.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${sel ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}
                  onClick={() => toggleQuestao(q.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 mb-1 flex-wrap">
                        <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                        <Badge
                          variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'}
                          className="text-xs"
                        >
                          {q.dificuldade}
                        </Badge>
                        {getHabilidadeCodigo(q.habilidade_id) && (
                          <Badge className="text-xs">{getHabilidadeCodigo(q.habilidade_id)}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">{q.enunciado}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setQuestoesModalOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>

      {/* MODAL - Gerar Automático */}
      <Modal
        isOpen={gerarAutoModalOpen}
        onClose={() => { setGerarAutoModalOpen(false); setGeracaoSucesso(false) }}
        title="Gerar Automaticamente"
        size="lg"
      >
        {geracaoSucesso ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Pronto!</h3>
            <p className="text-gray-600">{questoesSelecionadas.length} questões selecionadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">Meta: <strong>{totalQuestoes} questões</strong></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                value={autoConfig.ano_serie}
                onChange={(e) => setAutoConfig({ ...autoConfig, ano_serie: e.target.value })}
              >
                {ANO_SERIE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habilidades (opcional)</label>
              <div className="max-h-28 overflow-y-auto border rounded-lg p-2">
                {habilidadesFiltradas.map(h => (
                  <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoConfig.habilidades_ids.includes(h.id)}
                      onChange={() => toggleHabilidadeAuto(h.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900"><strong>{h.codigo}</strong></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-600 mb-1">Disponíveis: <strong>{disponiveisAuto.total}</strong></p>
              <div className="flex gap-3 text-xs">
                <span>🟢 {disponiveisAuto.facil}</span>
                <span>🟡 {disponiveisAuto.medio}</span>
                <span>🔴 {disponiveisAuto.dificil}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">🟢 Fáceis</label>
                <input
                  type="number"
                  min={0}
                  value={qtdFacilInput}
                  onChange={(e) => setQtdFacilInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🟡 Médias</label>
                <input
                  type="number"
                  min={0}
                  value={qtdMedioInput}
                  onChange={(e) => setQtdMedioInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🔴 Difíceis</label>
                <input
                  type="number"
                  min={0}
                  value={qtdDificilInput}
                  onChange={(e) => setQtdDificilInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
            </div>

            <div className={`p-3 rounded-lg ${totalDistribuicao === totalQuestoes ? 'bg-green-50' : 'bg-orange-50'}`}>
              <p className={`text-sm font-medium ${totalDistribuicao === totalQuestoes ? 'text-green-800' : 'text-orange-800'}`}>
                Total: {totalDistribuicao} {totalDistribuicao === totalQuestoes && '✓'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setGerarAutoModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={gerarQuestoesAutomaticamente}
                disabled={totalDistribuicao === 0 || disponiveisAuto.total === 0}
              >
                <Wand2 className="w-4 h-4 mr-2" />Gerar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
