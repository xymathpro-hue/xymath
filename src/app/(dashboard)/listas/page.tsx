'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Search, FileText, Edit, Trash2, Eye, Download, FileDown, Printer, QrCode, X, Maximize2, Loader2 } from 'lucide-react'

interface Lista {
  id: string
  titulo: string
  descricao: string
  ano_serie: string
  instrucoes: string
  mostrar_gabarito: boolean
  mostrar_resolucao: boolean
  is_publica: boolean
  created_at: string
  questoes_count?: number
}

interface Questao {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e?: string
  resposta_correta: string
  dificuldade: string
  ano_serie: string
  habilidade_id?: string
}

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
}

interface QuestaoSelecionada extends Questao {
  ordem: number
}

const ANO_SERIE_OPTIONS = [
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
]

export default function ListasExerciciosPage() {
  const { usuario } = useAuth()
  const [listas, setListas] = useState<Lista[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<QuestaoSelecionada[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuestoes, setSearchQuestoes] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [previewQuestaoOpen, setPreviewQuestaoOpen] = useState(false)
  const [previewQuestao, setPreviewQuestao] = useState<Questao | null>(null)
  const [editingLista, setEditingLista] = useState<Lista | null>(null)
  const [viewingLista, setViewingLista] = useState<Lista | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    ano_serie: '6º ano EF',
    instrucoes: '',
    mostrar_gabarito: false,
    mostrar_resolucao: false,
  })

  const [filtroQuestoes, setFiltroQuestoes] = useState({
    ano_serie: '',
    dificuldade: '',
    habilidade_id: '',
  })

  const supabase = createClient()

  const fetchListas = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('listas_exercicios')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const listasComContagem = await Promise.all((data || []).map(async (lista) => {
        const { count } = await supabase
          .from('lista_questoes')
          .select('*', { count: 'exact', head: true })
          .eq('lista_id', lista.id)
        return { ...lista, questoes_count: count || 0 }
      }))

      setListas(listasComContagem)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  const fetchQuestoes = useCallback(async () => {
    if (!usuario?.id) return
    try {
      let query = supabase
        .from('questoes')
        .select('*')
        .or(`usuario_id.eq.${usuario.id},is_publica.eq.true`)
        .order('created_at', { ascending: false })

      if (filtroQuestoes.ano_serie) query = query.eq('ano_serie', filtroQuestoes.ano_serie)
      if (filtroQuestoes.dificuldade) query = query.eq('dificuldade', filtroQuestoes.dificuldade)
      if (filtroQuestoes.habilidade_id) query = query.eq('habilidade_id', filtroQuestoes.habilidade_id)

      const { data, error } = await query
      if (error) throw error
      setQuestoesDisponiveis(data || [])
    } catch (error) {
      console.error('Erro:', error)
    }
  }, [usuario?.id, supabase, filtroQuestoes])

  const fetchHabilidades = useCallback(async () => {
    const { data } = await supabase.from('habilidades_bncc').select('id, codigo, descricao').order('codigo')
    if (data) setHabilidades(data)
  }, [supabase])

  useEffect(() => { fetchListas(); fetchHabilidades() }, [fetchListas, fetchHabilidades])
  useEffect(() => { if (usuario?.id) fetchQuestoes() }, [usuario?.id, fetchQuestoes])
  useEffect(() => { if (modalOpen && step === 2) fetchQuestoes() }, [modalOpen, step, fetchQuestoes])

  const handleOpenModal = (lista?: Lista) => {
    if (lista) {
      setEditingLista(lista)
      setFormData({
        titulo: lista.titulo,
        descricao: lista.descricao || '',
        ano_serie: lista.ano_serie || '6º ano EF',
        instrucoes: lista.instrucoes || '',
        mostrar_gabarito: lista.mostrar_gabarito,
        mostrar_resolucao: lista.mostrar_resolucao,
      })
    } else {
      setEditingLista(null)
      setFormData({ titulo: '', descricao: '', ano_serie: '6º ano EF', instrucoes: '', mostrar_gabarito: false, mostrar_resolucao: false })
      setQuestoesSelecionadas([])
    }
    setStep(1)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.titulo) return
    setSaving(true)
    try {
      if (editingLista) {
        const { error } = await supabase.from('listas_exercicios').update({
          titulo: formData.titulo, descricao: formData.descricao, ano_serie: formData.ano_serie,
          instrucoes: formData.instrucoes, mostrar_gabarito: formData.mostrar_gabarito,
          mostrar_resolucao: formData.mostrar_resolucao, updated_at: new Date().toISOString(),
        }).eq('id', editingLista.id)
        if (error) throw error
      } else {
        const { data: novaLista, error } = await supabase.from('listas_exercicios').insert({
          usuario_id: usuario.id, titulo: formData.titulo, descricao: formData.descricao,
          ano_serie: formData.ano_serie, instrucoes: formData.instrucoes,
          mostrar_gabarito: formData.mostrar_gabarito, mostrar_resolucao: formData.mostrar_resolucao,
        }).select().single()

        if (error) throw error

        if (questoesSelecionadas.length > 0 && novaLista) {
          const questoesInsert = questoesSelecionadas.map((q, idx) => ({
            lista_id: novaLista.id, questao_id: q.id, ordem: idx + 1,
          }))
          const { error: questoesError } = await supabase.from('lista_questoes').insert(questoesInsert)
          if (questoesError) throw questoesError
        }
      }
      setModalOpen(false)
      fetchListas()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar lista')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return
    try {
      const { error } = await supabase.from('listas_exercicios').delete().eq('id', id)
      if (error) throw error
      fetchListas()
    } catch (error) { console.error('Erro:', error) }
  }

  const handleAddQuestao = (questao: Questao) => {
    if (questoesSelecionadas.find(q => q.id === questao.id)) return
    setQuestoesSelecionadas([...questoesSelecionadas, { ...questao, ordem: questoesSelecionadas.length + 1 }])
  }

  const handleRemoveQuestao = (id: string) => {
    setQuestoesSelecionadas(questoesSelecionadas.filter(q => q.id !== id).map((q, idx) => ({ ...q, ordem: idx + 1 })))
  }

  const handleMoveQuestao = (index: number, direction: 'up' | 'down') => {
    const newList = [...questoesSelecionadas]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newList.length) return
    ;[newList[index], newList[newIndex]] = [newList[newIndex], newList[index]]
    setQuestoesSelecionadas(newList.map((q, idx) => ({ ...q, ordem: idx + 1 })))
  }

  const handlePreviewQuestao = (questao: Questao) => {
    setPreviewQuestao(questao)
    setPreviewQuestaoOpen(true)
  }

  const handleExport = async (formato: 'pdf' | 'docx') => {
    if (!viewingLista) return
    
    if (formato === 'pdf') {
      alert('Exportação PDF em breve! Use Word por enquanto.')
      return
    }

    setExporting(true)
    try {
      const response = await fetch('/api/exportar/lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listaId: viewingLista.id,
          incluirGabarito: viewingLista.mostrar_gabarito,
          incluirResolucao: viewingLista.mostrar_resolucao,
        }),
      })

      if (!response.ok) throw new Error('Erro ao exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${viewingLista.titulo.replace(/[^a-zA-Z0-9áéíóúãõâêôç\s-]/gi, '').trim().replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setExportModalOpen(false)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao exportar lista. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const filteredListas = listas.filter(l => l.titulo.toLowerCase().includes(searchTerm.toLowerCase()))

  const questoesFiltradas = questoesDisponiveis.filter(q =>
    q.enunciado.toLowerCase().includes(searchQuestoes.toLowerCase()) &&
    !questoesSelecionadas.find(qs => qs.id === q.id)
  )

  const getDificuldadeColor = (dif: string) => dif === 'facil' ? 'success' : dif === 'medio' ? 'warning' : 'danger'
  const getHabilidadeCodigo = (id?: string) => id ? habilidades.find(h => h.id === id)?.codigo : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listas de Exercícios</h1>
          <p className="text-gray-600">Crie listas para treino e tarefas dos alunos</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Nova Lista</Button>
      </div>

      <Card><CardContent className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input placeholder="Buscar listas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total de Listas</p><p className="text-2xl font-bold text-gray-900">{listas.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total de Questões</p><p className="text-2xl font-bold text-indigo-600">{listas.reduce((acc, l) => acc + (l.questoes_count || 0), 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Com Gabarito</p><p className="text-2xl font-bold text-green-600">{listas.filter(l => l.mostrar_gabarito).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Questões Disponíveis</p><p className="text-2xl font-bold text-purple-600">{questoesDisponiveis.length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : filteredListas.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm ? 'Nenhuma lista encontrada' : 'Nenhuma lista criada'}</h3>
          <p className="text-gray-500 mb-6">{searchTerm ? 'Tente outro termo de busca' : 'Comece criando sua primeira lista de exercícios'}</p>
          {!searchTerm && <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Criar Lista</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredListas.map((lista) => (
            <Card key={lista.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{lista.titulo}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{lista.descricao || 'Sem descrição'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="info">{lista.ano_serie}</Badge>
                  <Badge>{lista.questoes_count || 0} questões</Badge>
                  {lista.mostrar_gabarito && <Badge variant="success">Com gabarito</Badge>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-gray-400">{new Date(lista.created_at).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingLista(lista); setViewModalOpen(true) }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setViewingLista(lista); setExportModalOpen(true) }}><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(lista)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(lista.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLista ? 'Editar Lista' : 'Nova Lista de Exercícios'} size="xl">
        <div className="space-y-6">
          {/* Steps */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="font-medium">Dados</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="font-medium">Questões</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <Input placeholder="Ex: Lista de Frações - 6º Ano" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" rows={2} placeholder="Descrição opcional..." value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" value={formData.ano_serie} onChange={(e) => setFormData({ ...formData, ano_serie: e.target.value })}>
                    {ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instruções (aparece no documento)</label>
                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" rows={3} placeholder="Ex: Resolva as questões abaixo mostrando os cálculos..." value={formData.instrucoes} onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.mostrar_gabarito} onChange={(e) => setFormData({ ...formData, mostrar_gabarito: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm text-gray-700">Incluir gabarito no documento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.mostrar_resolucao} onChange={(e) => setFormData({ ...formData, mostrar_resolucao: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm text-gray-700">Incluir resolução</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={() => setStep(2)} disabled={!formData.titulo}>Próximo: Selecionar Questões</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6" style={{ minHeight: '60vh' }}>
                {/* Questões Disponíveis */}
                <div className="border rounded-lg p-4 flex flex-col">
                  <h4 className="font-medium text-gray-900 mb-3">Questões Disponíveis ({questoesFiltradas.length})</h4>

                  {/* Filtros */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <select className="px-2 py-2 text-sm border rounded-lg text-gray-900" value={filtroQuestoes.ano_serie} onChange={(e) => setFiltroQuestoes({ ...filtroQuestoes, ano_serie: e.target.value })}>
                      <option value="">Todos os anos</option>
                      {ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <select className="px-2 py-2 text-sm border rounded-lg text-gray-900" value={filtroQuestoes.habilidade_id} onChange={(e) => setFiltroQuestoes({ ...filtroQuestoes, habilidade_id: e.target.value })}>
                      <option value="">Todas habilidades</option>
                      {habilidades.map(h => <option key={h.id} value={h.id}>{h.codigo}</option>)}
                    </select>
                    <select className="px-2 py-2 text-sm border rounded-lg text-gray-900" value={filtroQuestoes.dificuldade} onChange={(e) => setFiltroQuestoes({ ...filtroQuestoes, dificuldade: e.target.value })}>
                      <option value="">Todas dificuldades</option>
                      <option value="facil">🟢 Fácil</option>
                      <option value="medio">🟡 Médio</option>
                      <option value="dificil">🔴 Difícil</option>
                    </select>
                  </div>

                  <Input placeholder="Buscar questão..." value={searchQuestoes} onChange={(e) => setSearchQuestoes(e.target.value)} className="mb-3" />

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {questoesFiltradas.map((q) => (
                      <div key={q.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer group" onClick={() => handleAddQuestao(q)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getDificuldadeColor(q.dificuldade) as any} className="text-xs">{q.dificuldade}</Badge>
                            <span className="text-xs text-gray-500">{q.ano_serie}</span>
                            {getHabilidadeCodigo(q.habilidade_id) && <Badge variant="info" className="text-xs">{getHabilidadeCodigo(q.habilidade_id)}</Badge>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePreviewQuestao(q) }}>
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-900 line-clamp-3">{q.enunciado}</p>
                        <p className="text-xs text-indigo-600 mt-2 opacity-0 group-hover:opacity-100">Clique para adicionar</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questões Selecionadas */}
                <div className="border rounded-lg p-4 flex flex-col">
                  <h4 className="font-medium text-gray-900 mb-3">Questões Selecionadas ({questoesSelecionadas.length})</h4>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {questoesSelecionadas.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Clique nas questões ao lado para adicionar</p>
                      </div>
                    ) : (
                      questoesSelecionadas.map((q, idx) => (
                        <div key={q.id} className="p-3 border rounded-lg bg-indigo-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-700">#{q.ordem}</span>
                              <Badge variant={getDificuldadeColor(q.dificuldade) as any} className="text-xs">{q.dificuldade}</Badge>
                              {getHabilidadeCodigo(q.habilidade_id) && <Badge variant="info" className="text-xs">{getHabilidadeCodigo(q.habilidade_id)}</Badge>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => handlePreviewQuestao(q)} className="p-1 text-gray-500 hover:text-indigo-600"><Maximize2 className="w-4 h-4" /></button>
                              <button onClick={() => handleMoveQuestao(idx, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                              <button onClick={() => handleMoveQuestao(idx, 'down')} disabled={idx === questoesSelecionadas.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                              <button onClick={() => handleRemoveQuestao(q.id)} className="p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2">{q.enunciado}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1" onClick={handleSave} loading={saving} disabled={questoesSelecionadas.length === 0}>
                  {editingLista ? 'Salvar Alterações' : `Criar Lista (${questoesSelecionadas.length} questões)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Preview Questão */}
      <Modal isOpen={previewQuestaoOpen} onClose={() => setPreviewQuestaoOpen(false)} title="Visualizar Questão" size="lg">
        {previewQuestao && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{previewQuestao.ano_serie}</Badge>
              <Badge variant={getDificuldadeColor(previewQuestao.dificuldade) as any}>{previewQuestao.dificuldade}</Badge>
              {getHabilidadeCodigo(previewQuestao.habilidade_id) && <Badge>{getHabilidadeCodigo(previewQuestao.habilidade_id)}</Badge>}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{previewQuestao.enunciado}</p>
            </div>

            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                const alt = previewQuestao[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string
                if (!alt) return null
                const isCorrect = previewQuestao.resposta_correta === letra
                return (
                  <div key={letra} className={`p-3 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'}`}>
                    <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>{letra})</span>
                    <span className={`ml-2 ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>{alt}</span>
                    {isCorrect && <span className="ml-2 text-green-600 text-sm font-medium">✓ Correta</span>}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewQuestaoOpen(false)}>Fechar</Button>
              {!questoesSelecionadas.find(q => q.id === previewQuestao.id) && (
                <Button className="flex-1" onClick={() => { handleAddQuestao(previewQuestao); setPreviewQuestaoOpen(false) }}>
                  <Plus className="w-4 h-4 mr-2" />Adicionar à Lista
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Exportar */}
      <Modal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} title="Exportar Lista" size="md">
        {viewingLista && (
          <div className="space-y-4">
            <p className="text-gray-600">Escolha o formato para exportar "{viewingLista.titulo}":</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleExport('docx')} 
                disabled={exporting}
                className="p-6 border-2 border-dashed rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-center disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-12 h-12 mx-auto mb-3 text-indigo-600 animate-spin" />
                ) : (
                  <FileDown className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                )}
                <h4 className="font-medium text-gray-900">{exporting ? 'Gerando...' : 'Word (DOCX)'}</h4>
                <p className="text-sm text-gray-500 mt-1">Editável - adicione logo e cabeçalho</p>
              </button>
              <button 
                onClick={() => handleExport('pdf')} 
                disabled={exporting}
                className="p-6 border-2 border-dashed rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-center disabled:opacity-50"
              >
                <Printer className="w-12 h-12 mx-auto mb-3 text-red-600" />
                <h4 className="font-medium text-gray-900">PDF</h4>
                <p className="text-sm text-gray-500 mt-1">Em breve...</p>
              </button>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Documento Profissional</h4>
                  <p className="text-sm text-green-700 mt-1">Inclui cabeçalho, campos para nome/turma/data, questões formatadas e gabarito.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setExportModalOpen(false)} disabled={exporting}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Visualizar Lista */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Visualizar Lista" size="lg">
        {viewingLista && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="info">{viewingLista.ano_serie}</Badge>
              <Badge>{viewingLista.questoes_count || 0} questões</Badge>
              {viewingLista.mostrar_gabarito && <Badge variant="success">Com gabarito</Badge>}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{viewingLista.titulo}</h3>
              {viewingLista.descricao && <p className="text-gray-600 mt-1">{viewingLista.descricao}</p>}
            </div>
            {viewingLista.instrucoes && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 mb-1">Instruções:</h4>
                <p className="text-gray-600">{viewingLista.instrucoes}</p>
              </div>
            )}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setViewModalOpen(false)}>Fechar</Button>
              <Button className="flex-1" onClick={() => { setViewModalOpen(false); setExportModalOpen(true) }}>
                <Download className="w-4 h-4 mr-2" />Exportar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
    }
