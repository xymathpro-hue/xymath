'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Simulado, Turma, Questao } from '@/types'
import { Plus, Search, FileText, Edit, Trash2, Eye, Play, QrCode, Check, X, Wand2, Filter, Users, CheckCircle } from 'lucide-react'

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

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
}

export default function SimuladosPage() {
  const { usuario } = useAuth()
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [questoesModalOpen, setQuestoesModalOpen] = useState(false)
  const [gerarAutoModalOpen, setGerarAutoModalOpen] = useState(false)
  const [editingSimulado, setEditingSimulado] = useState<Simulado | null>(null)
  const [saving, setSaving] = useState(false)
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [showHabilidadesFilter, setShowHabilidadesFilter] = useState(false)
  const [showTurmasSelector, setShowTurmasSelector] = useState(false)
  const [geracaoSucesso, setGeracaoSucesso] = useState(false)

  // Inputs como string para permitir campo vazio
  const [totalQuestoesInput, setTotalQuestoesInput] = useState('10')
  const [tempoInput, setTempoInput] = useState('60')
  const [qtdFacilInput, setQtdFacilInput] = useState('3')
  const [qtdMedioInput, setQtdMedioInput] = useState('4')
  const [qtdDificilInput, setQtdDificilInput] = useState('3')

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turmas_ids: [] as string[],
    embaralhar_questoes: true,
    embaralhar_alternativas: false,
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

  const supabase = createClient()

  // Valores numéricos derivados
  const totalQuestoes = parseInt(totalQuestoesInput) || 0
  const tempoMinutos = parseInt(tempoInput) || 60
  const qtdFacil = parseInt(qtdFacilInput) || 0
  const qtdMedio = parseInt(qtdMedioInput) || 0
  const qtdDificil = parseInt(qtdDificilInput) || 0
  const totalDistribuicao = qtdFacil + qtdMedio + qtdDificil

  const fetchData = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    try {
      const [sRes, tRes, qRes, hRes] = await Promise.all([
        supabase.from('simulados').select('*').eq('usuario_id', usuario.id).order('created_at', { ascending: false }),
        supabase.from('turmas').select('*').eq('usuario_id', usuario.id).eq('ativa', true),
        supabase.from('questoes').select('*').or(`usuario_id.eq.${usuario.id},is_publica.eq.true`).eq('ativa', true),
        supabase.from('habilidades_bncc').select('id, codigo, descricao').order('codigo'),
      ])
      setSimulados(sRes.data || [])
      setTurmas(tRes.data || [])
      setQuestoesDisponiveis(qRes.data || [])
      setHabilidades(hRes.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [usuario?.id, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Recalcula distribuição quando total muda
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

  const handleOpenModal = (s?: Simulado) => {
    setGeracaoSucesso(false)
    if (s) {
      setEditingSimulado(s)
      const totalQ = s.questoes_ids?.length || 10
      setFormData({
        titulo: s.titulo,
        descricao: s.descricao || '',
        turmas_ids: s.turma_id ? [s.turma_id] : ((s as any).turmas_ids || []),
        embaralhar_questoes: s.configuracoes?.embaralhar_questoes ?? true,
        embaralhar_alternativas: s.configuracoes?.embaralhar_alternativas ?? false
      })
      setTotalQuestoesInput(totalQ.toString())
      setTempoInput((s.tempo_minutos || 60).toString())
      setQuestoesSelecionadas(s.questoes_ids || [])
      const facil = Math.round(totalQ * 0.3)
      const dificil = Math.round(totalQ * 0.3)
      const medio = totalQ - facil - dificil
      setQtdFacilInput(facil.toString())
      setQtdMedioInput(medio.toString())
      setQtdDificilInput(dificil.toString())
    } else {
      setEditingSimulado(null)
      setFormData({
        titulo: '',
        descricao: '',
        turmas_ids: [],
        embaralhar_questoes: true,
        embaralhar_alternativas: false
      })
      setTotalQuestoesInput('10')
      setTempoInput('60')
      setQtdFacilInput('3')
      setQtdMedioInput('4')
      setQtdDificilInput('3')
      setQuestoesSelecionadas([])
    }
    setShowTurmasSelector(false)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.titulo) return
    setSaving(true)
    try {
      const data = {
        usuario_id: usuario.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        turma_id: formData.turmas_ids[0] || null,
        turmas_ids: formData.turmas_ids,
        tempo_minutos: tempoMinutos,
        questoes_ids: questoesSelecionadas,
        configuracoes: {
          embaralhar_questoes: formData.embaralhar_questoes,
          embaralhar_alternativas: formData.embaralhar_alternativas,
          mostrar_gabarito_apos: true,
          permitir_revisao: true
        },
        status: 'rascunho',
      }
      if (editingSimulado) {
        await supabase.from('simulados').update(data).eq('id', editingSimulado.id)
      } else {
        await supabase.from('simulados').insert(data)
      }
      setModalOpen(false)
      fetchData()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Excluir?')) {
      await supabase.from('simulados').delete().eq('id', id)
      fetchData()
    }
  }

  const handlePublish = async (id: string) => {
    await supabase.from('simulados').update({ status: 'publicado' }).eq('id', id)
    fetchData()
  }

  const toggleQuestao = (id: string) => {
    setQuestoesSelecionadas(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id])
  }

  const toggleTurma = (id: string) => {
    setFormData(prev => ({
      ...prev,
      turmas_ids: prev.turmas_ids.includes(id)
        ? prev.turmas_ids.filter(t => t !== id)
        : [...prev.turmas_ids, id]
    }))
  }

  const selectAllTurmas = () => {
    if (formData.turmas_ids.length === turmas.length) {
      setFormData(prev => ({ ...prev, turmas_ids: [] }))
    } else {
      setFormData(prev => ({ ...prev, turmas_ids: turmas.map(t => t.id) }))
    }
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
    let questoesFiltradas = questoesDisponiveis.filter(q => q.ano_serie === autoConfig.ano_serie)
    if (autoConfig.habilidades_ids.length > 0) {
      questoesFiltradas = questoesFiltradas.filter(q => q.habilidade_id && autoConfig.habilidades_ids.includes(q.habilidade_id))
    }
    const faceis = questoesFiltradas.filter(q => q.dificuldade === 'facil')
    const medias = questoesFiltradas.filter(q => q.dificuldade === 'medio')
    const dificeis = questoesFiltradas.filter(q => q.dificuldade === 'dificil')
    const shuffle = (arr: Questao[]) => [...arr].sort(() => Math.random() - 0.5)
    const selecionadas: string[] = [
      ...shuffle(faceis).slice(0, qtdFacil).map(q => q.id),
      ...shuffle(medias).slice(0, qtdMedio).map(q => q.id),
      ...shuffle(dificeis).slice(0, qtdDificil).map(q => q.id),
    ]
    setQuestoesSelecionadas(selecionadas)
    setGeracaoSucesso(true)
    
    // Fecha o modal automático após 1.5s
    setTimeout(() => {
      setGerarAutoModalOpen(false)
      setGeracaoSucesso(false)
    }, 1500)
  }

  const filteredQuestoes = questoesDisponiveis.filter(q => {
    if (questaoFilters.ano_serie && q.ano_serie !== questaoFilters.ano_serie) return false
    if (questaoFilters.dificuldade && q.dificuldade !== questaoFilters.dificuldade) return false
    if (questaoFilters.habilidades_ids.length > 0) {
      if (!q.habilidade_id || !questaoFilters.habilidades_ids.includes(q.habilidade_id)) return false
    }
    return true
  })

  const habilidadesFiltradas = habilidades.filter(h => autoConfig.ano_serie ? h.codigo.includes(autoConfig.ano_serie.charAt(0)) : true)
  const habilidadesFiltradasManual = habilidades.filter(h => questaoFilters.ano_serie ? h.codigo.includes(questaoFilters.ano_serie.charAt(0)) : true)
  const filteredSimulados = simulados.filter(s => s.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
  const getStatusVariant = (s: string): 'warning' | 'success' | 'default' => s === 'rascunho' ? 'warning' : s === 'publicado' ? 'success' : 'default'
  const getHabilidadeCodigo = (id?: string) => id ? habilidades.find(h => h.id === id)?.codigo : null
  const getTurmasNomes = (s: Simulado) => {
    const ids = (s as any).turmas_ids || (s.turma_id ? [s.turma_id] : [])
    return ids.map((id: string) => turmas.find(t => t.id === id)?.nome).filter(Boolean).join(', ')
  }

  // Conta questões disponíveis para o gerar automático
  const getQuestoesDisponiveisPorDificuldade = () => {
    let questoesFiltradas = questoesDisponiveis.filter(q => q.ano_serie === autoConfig.ano_serie)
    if (autoConfig.habilidades_ids.length > 0) {
      questoesFiltradas = questoesFiltradas.filter(q => q.habilidade_id && autoConfig.habilidades_ids.includes(q.habilidade_id))
    }
    return {
      facil: questoesFiltradas.filter(q => q.dificuldade === 'facil').length,
      medio: questoesFiltradas.filter(q => q.dificuldade === 'medio').length,
      dificil: questoesFiltradas.filter(q => q.dificuldade === 'dificil').length,
      total: questoesFiltradas.length
    }
  }

  const disponiveisAuto = getQuestoesDisponiveisPorDificuldade()

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
          <p className="text-gray-600">Crie e gerencie simulados</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Novo Simulado</Button>
      </div>

      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-gray-900">{simulados.length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Rascunhos</p><p className="text-2xl font-bold text-yellow-600">{simulados.filter(s => s.status === 'rascunho').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Publicados</p><p className="text-2xl font-bold text-green-600">{simulados.filter(s => s.status === 'publicado').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Encerrados</p><p className="text-2xl font-bold text-gray-900">{simulados.filter(s => s.status === 'encerrado').length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : filteredSimulados.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm ? 'Nenhum encontrado' : 'Nenhum simulado'}</h3>
          <p className="text-gray-500 mb-6">Crie seu primeiro simulado</p>
          <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Criar</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredSimulados.map(s => (
            <Card key={s.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{s.titulo}</h3>
                      <Badge variant={getStatusVariant(s.status)}>{s.status}</Badge>
                    </div>
                    {s.descricao && <p className="text-gray-600 text-sm mb-2">{s.descricao}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{s.questoes_ids?.length || 0} questões</span>
                      <span>{s.tempo_minutos} min</span>
                      {getTurmasNomes(s) && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{getTurmasNomes(s)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {s.status === 'rascunho' && <Button variant="ghost" size="sm" onClick={() => handlePublish(s.id)}><Play className="w-4 h-4 text-green-600" /></Button>}
                    <Link href={`/simulados/${s.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    <Link href={`/simulados/${s.id}/gabarito`}><Button variant="ghost" size="sm"><QrCode className="w-4 h-4" /></Button></Link>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSimulado ? 'Editar Simulado' : 'Novo Simulado'} size="xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <Input placeholder="Ex: Simulado SAEB - 9º Ano" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea className="w-full px-4 py-2 border rounded-lg text-gray-900" rows={2} placeholder="Descrição opcional..." value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turmas</label>
            <Button variant={showTurmasSelector ? 'primary' : 'outline'} className="w-full justify-between" onClick={() => setShowTurmasSelector(!showTurmasSelector)}>
              <span className="flex items-center gap-2"><Users className="w-4 h-4" />{formData.turmas_ids.length > 0 ? `${formData.turmas_ids.length} turma(s) selecionada(s)` : 'Selecionar turmas'}</span>
              <Filter className="w-4 h-4" />
            </Button>
            {showTurmasSelector && (
              <div className="mt-2 border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selecione as turmas:</span>
                  <Button variant="ghost" size="sm" onClick={selectAllTurmas}>{formData.turmas_ids.length === turmas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}</Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {turmas.map(turma => (
                    <label key={turma.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input type="checkbox" checked={formData.turmas_ids.includes(turma.id)} onChange={() => toggleTurma(turma.id)} className="rounded text-indigo-600" />
                      <span className="text-sm text-gray-900 font-medium">{turma.nome}</span>
                      <Badge variant="info" className="text-xs">{turma.ano_serie}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {formData.turmas_ids.length > 0 && !showTurmasSelector && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.turmas_ids.map(id => {
                  const turma = turmas.find(t => t.id === id)
                  return turma ? <Badge key={id} variant="info" className="flex items-center gap-1">{turma.nome}<button onClick={() => toggleTurma(id)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button></Badge> : null
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Questões</label>
              <input
                type="number"
                min={1}
                max={50}
                value={totalQuestoesInput}
                onChange={(e) => handleTotalQuestoesChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (minutos)</label>
              <input
                type="number"
                min={10}
                value={tempoInput}
                onChange={(e) => setTempoInput(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-sm text-gray-500">~{totalQuestoes > 0 ? Math.round(tempoMinutos / totalQuestoes) : 0} min/questão</p>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.embaralhar_questoes} onChange={(e) => setFormData({ ...formData, embaralhar_questoes: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-sm text-gray-700">Embaralhar questões</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.embaralhar_alternativas} onChange={(e) => setFormData({ ...formData, embaralhar_alternativas: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-sm text-gray-700">Embaralhar alternativas</span>
            </label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Questões Selecionadas</h4>
                <p className="text-sm text-gray-500">{questoesSelecionadas.length} de {totalQuestoes} questões
                  {questoesSelecionadas.length < totalQuestoes && totalQuestoes > 0 && <span className="text-orange-500 ml-2">(faltam {totalQuestoes - questoesSelecionadas.length})</span>}
                  {questoesSelecionadas.length >= totalQuestoes && totalQuestoes > 0 && <span className="text-green-500 ml-2">✓ Completo</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setGerarAutoModalOpen(true)}><Wand2 className="w-4 h-4 mr-1" />Gerar Automático</Button>
                <Button variant="outline" size="sm" onClick={() => setQuestoesModalOpen(true)}><Plus className="w-4 h-4 mr-1" />Selecionar Manual</Button>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className={`h-2 rounded-full transition-all ${questoesSelecionadas.length >= totalQuestoes && totalQuestoes > 0 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${totalQuestoes > 0 ? Math.min((questoesSelecionadas.length / totalQuestoes) * 100, 100) : 0}%` }} />
            </div>
            {questoesSelecionadas.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {questoesSelecionadas.map((id, idx) => {
                  const q = questoesDisponiveis.find(x => x.id === id)
                  return q ? (
                    <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-900"><strong>{idx + 1}.</strong> {q.enunciado.substring(0, 60)}...
                        {getHabilidadeCodigo(q.habilidade_id) && <Badge variant="info" className="ml-2 text-xs">{getHabilidadeCodigo(q.habilidade_id)}</Badge>}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => toggleQuestao(id)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!formData.titulo || questoesSelecionadas.length === 0}>{editingSimulado ? 'Salvar' : 'Criar Simulado'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Seleção Manual */}
      <Modal isOpen={questoesModalOpen} onClose={() => setQuestoesModalOpen(false)} title="Selecionar Questões" size="xl">
        <div className="space-y-4">
          <div className="bg-indigo-50 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm text-indigo-700"><strong>{questoesSelecionadas.length}</strong> de <strong>{totalQuestoes}</strong> questões selecionadas</span>
            {questoesSelecionadas.length >= totalQuestoes && totalQuestoes > 0 && <Badge variant="success">✓ Completo</Badge>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={questaoFilters.ano_serie} onChange={(e) => setQuestaoFilters({ ...questaoFilters, ano_serie: e.target.value })}>
                <option value="">Todos</option>
                {ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={questaoFilters.dificuldade} onChange={(e) => setQuestaoFilters({ ...questaoFilters, dificuldade: e.target.value })}>
                <option value="">Todas</option>
                {DIFICULDADE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habilidades</label>
              <Button variant={showHabilidadesFilter ? 'primary' : 'outline'} className="w-full justify-between" onClick={() => setShowHabilidadesFilter(!showHabilidadesFilter)}>
                <span>{questaoFilters.habilidades_ids.length > 0 ? `${questaoFilters.habilidades_ids.length} selecionadas` : 'Selecionar'}</span>
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {showHabilidadesFilter && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Selecione as habilidades:</span>
                {questaoFilters.habilidades_ids.length > 0 && <Button variant="ghost" size="sm" onClick={() => setQuestaoFilters({ ...questaoFilters, habilidades_ids: [] })}>Limpar</Button>}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {habilidadesFiltradasManual.map(h => (
                  <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                    <input type="checkbox" checked={questaoFilters.habilidades_ids.includes(h.id)} onChange={() => toggleHabilidadeManual(h.id)} className="rounded text-indigo-600" />
                    <span className="text-sm text-gray-900"><strong>{h.codigo}</strong> - {h.descricao.substring(0, 40)}...</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {questaoFilters.habilidades_ids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {questaoFilters.habilidades_ids.map(id => {
                const h = habilidades.find(x => x.id === id)
                return h ? <Badge key={id} variant="info" className="flex items-center gap-1">{h.codigo}<button onClick={() => toggleHabilidadeManual(id)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button></Badge> : null
              })}
            </div>
          )}
          <div className="text-sm text-gray-600">{filteredQuestoes.length} questões encontradas</div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredQuestoes.map(q => {
              const sel = questoesSelecionadas.includes(q.id)
              return (
                <div key={q.id} className={`p-3 border rounded-lg cursor-pointer ${sel ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`} onClick={() => toggleQuestao(q.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-1 ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1 flex-wrap">
                        <Badge variant="info">{q.ano_serie}</Badge>
                        <Badge variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'}>{q.dificuldade}</Badge>
                        {getHabilidadeCodigo(q.habilidade_id) && <Badge>{getHabilidadeCodigo(q.habilidade_id)}</Badge>}
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">{q.enunciado}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setQuestoesModalOpen(false)}>Fechar</Button>
            <div className="flex-1 text-center py-2"><span className="font-medium text-gray-900">{questoesSelecionadas.length}/{totalQuestoes}</span><span className="text-gray-500 ml-1">selecionadas</span></div>
          </div>
        </div>
      </Modal>

      {/* Modal Gerar Automático */}
      <Modal isOpen={gerarAutoModalOpen} onClose={() => { setGerarAutoModalOpen(false); setGeracaoSucesso(false) }} title="Gerar Simulado Automático" size="lg">
        {geracaoSucesso ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Questões Geradas!</h3>
            <p className="text-gray-600">{questoesSelecionadas.length} questões foram selecionadas automaticamente</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">Meta definida: <strong>{totalQuestoes} questões</strong></p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={autoConfig.ano_serie} onChange={(e) => setAutoConfig({ ...autoConfig, ano_serie: e.target.value })}>
                {ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Habilidades BNCC (opcional)</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {habilidadesFiltradas.map(h => (
                  <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={autoConfig.habilidades_ids.includes(h.id)} onChange={() => toggleHabilidadeAuto(h.id)} className="rounded" />
                    <span className="text-sm text-gray-900"><strong>{h.codigo}</strong> - {h.descricao.substring(0, 50)}...</span>
                  </label>
                ))}
              </div>
              {autoConfig.habilidades_ids.length > 0 && <p className="text-sm text-indigo-600 mt-1">{autoConfig.habilidades_ids.length} habilidade(s) selecionada(s)</p>}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Questões disponíveis: <strong>{disponiveisAuto.total}</strong></p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>🟢 Fáceis: {disponiveisAuto.facil}</span>
                <span>🟡 Médias: {disponiveisAuto.medio}</span>
                <span>🔴 Difíceis: {disponiveisAuto.dificil}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Distribuição por Dificuldade</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🟢 Fáceis (máx: {disponiveisAuto.facil})</label>
                  <input
                    type="number"
                    min={0}
                    max={disponiveisAuto.facil}
                    value={qtdFacilInput}
                    onChange={(e) => setQtdFacilInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🟡 Médias (máx: {disponiveisAuto.medio})</label>
                  <input
                    type="number"
                    min={0}
                    max={disponiveisAuto.medio}
                    value={qtdMedioInput}
                    onChange={(e) => setQtdMedioInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🔴 Difíceis (máx: {disponiveisAuto.dificil})</label>
                  <input
                    type="number"
                    min={0}
                    max={disponiveisAuto.dificil}
                    value={qtdDificilInput}
                    onChange={(e) => setQtdDificilInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  />
                </div>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg ${totalDistribuicao === totalQuestoes ? 'bg-green-50' : 'bg-orange-50'}`}>
              <p className={`text-sm font-medium ${totalDistribuicao === totalQuestoes ? 'text-green-800' : 'text-orange-800'}`}>
                Total da distribuição: {totalDistribuicao} questões
                {totalDistribuicao !== totalQuestoes && <span className="ml-2 font-normal">(meta: {totalQuestoes})</span>}
                {totalDistribuicao === totalQuestoes && <span className="ml-2">✓</span>}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setGerarAutoModalOpen(false)}>Cancelar</Button>
              <Button 
                className="flex-1" 
                onClick={gerarQuestoesAutomaticamente}
                disabled={totalDistribuicao === 0 || disponiveisAuto.total === 0}
              >
                <Wand2 className="w-4 h-4 mr-2" />Gerar {totalDistribuicao} Questões
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
