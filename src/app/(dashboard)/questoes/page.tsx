'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Search, BookOpen, Edit, Trash2, Filter, Eye, Copy, X, CheckCircle, Image } from 'lucide-react'

interface Questao {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e?: string
  resposta_correta: 'A' | 'B' | 'C' | 'D' | 'E'
  dificuldade: 'facil' | 'medio' | 'dificil'
  ano_serie: string
  unidade_tematica_id?: string
  habilidade_bncc_id?: string
  descritor_saeb_id?: string
  nivel_cognitivo_id?: string
  contexto_id?: string
  fonte_id?: string
  comentario_resolucao?: string
  imagem_url?: string
  revisada?: boolean
  created_at: string
}

interface UnidadeTematica { id: string; codigo: string; nome: string }
interface HabilidadeBncc { id: string; codigo: string; descricao: string; objeto_conhecimento: string }
interface DescritorSaeb { id: string; codigo: string; descricao: string; tema: string }
interface NivelCognitivo { id: string; codigo: string; nome: string }
interface Contexto { id: string; codigo: string; nome: string }
interface Fonte { id: string; codigo: string; nome: string }

const ANO_SERIE_OPTIONS = [
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
  { value: '1º ano EM', label: '1º ano EM' },
  { value: '2º ano EM', label: '2º ano EM' },
  { value: '3º ano EM', label: '3º ano EM' },
]

const DIFICULDADE_OPTIONS = [
  { value: 'facil', label: '🟢 Fácil' },
  { value: 'medio', label: '🟡 Médio' },
  { value: 'dificil', label: '🔴 Difícil' },
]

export default function QuestoesPage() {
  const { usuario } = useAuth()
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingQuestao, setEditingQuestao] = useState<Questao | null>(null)
  const [viewingQuestao, setViewingQuestao] = useState<Questao | null>(null)
  const [saving, setSaving] = useState(false)

  const [unidadesTematicas, setUnidadesTematicas] = useState<UnidadeTematica[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [descritores, setDescritores] = useState<DescritorSaeb[]>([])
  const [niveisCognitivos, setNiveisCognitivos] = useState<NivelCognitivo[]>([])
  const [contextos, setContextos] = useState<Contexto[]>([])
  const [fontes, setFontes] = useState<Fonte[]>([])

  const [filters, setFilters] = useState({
    ano_serie: '',
    unidade_tematica_id: '',
    habilidade_bncc_id: '',
    descritor_saeb_id: '',
    dificuldade: '',
    contexto_id: '',
  })

  const [formData, setFormData] = useState({
    enunciado: '',
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    resposta_correta: 'A' as 'A' | 'B' | 'C' | 'D' | 'E',
    ano_serie: '6º ano EF',
    unidade_tematica_id: '',
    habilidade_bncc_id: '',
    descritor_saeb_id: '',
    nivel_cognitivo_id: '',
    contexto_id: '',
    fonte_id: '',
    dificuldade: 'medio' as 'facil' | 'medio' | 'dificil',
    comentario_resolucao: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const loadAuxData = async () => {
      const [utRes, habRes, descRes, ncRes, ctxRes, fontRes] = await Promise.all([
        supabase.from('unidades_tematicas').select('*').order('ordem'),
        supabase.from('habilidades_bncc').select('*').order('codigo'),
        supabase.from('descritores_saeb').select('*').order('codigo'),
        supabase.from('niveis_cognitivos').select('*').order('ordem'),
        supabase.from('contextos_questao').select('*').order('nome'),
        supabase.from('fontes_questao').select('*').order('nome'),
      ])
      if (utRes.data) setUnidadesTematicas(utRes.data)
      if (habRes.data) setHabilidades(habRes.data)
      if (descRes.data) setDescritores(descRes.data)
      if (ncRes.data) setNiveisCognitivos(ncRes.data)
      if (ctxRes.data) setContextos(ctxRes.data)
      if (fontRes.data) setFontes(fontRes.data)
    }
    loadAuxData()
  }, [supabase])

  const fetchQuestoes = useCallback(async () => {
    if (!usuario?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase
        .from('questoes')
        .select('*')
        .or(`usuario_id.eq.${usuario.id},is_publica.eq.true`)
        .order('created_at', { ascending: false })

      if (filters.ano_serie) query = query.eq('ano_serie', filters.ano_serie)
      if (filters.dificuldade) query = query.eq('dificuldade', filters.dificuldade)
      if (filters.unidade_tematica_id) query = query.eq('unidade_tematica_id', filters.unidade_tematica_id)
      if (filters.habilidade_bncc_id) query = query.eq('habilidade_bncc_id', filters.habilidade_bncc_id)
      if (filters.descritor_saeb_id) query = query.eq('descritor_saeb_id', filters.descritor_saeb_id)
      if (filters.contexto_id) query = query.eq('contexto_id', filters.contexto_id)

      const { data, error } = await query
      if (error) throw error
      setQuestoes(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, filters])

  useEffect(() => {
    fetchQuestoes()
  }, [fetchQuestoes])

  const habilidadesFiltradas = habilidades

  const handleOpenModal = (questao?: Questao) => {
    if (questao) {
      setEditingQuestao(questao)
      setFormData({
        enunciado: questao.enunciado,
        alternativa_a: questao.alternativa_a,
        alternativa_b: questao.alternativa_b,
        alternativa_c: questao.alternativa_c,
        alternativa_d: questao.alternativa_d,
        alternativa_e: questao.alternativa_e || '',
        resposta_correta: questao.resposta_correta,
        ano_serie: questao.ano_serie,
        unidade_tematica_id: questao.unidade_tematica_id || '',
        habilidade_bncc_id: questao.habilidade_bncc_id || '',
        descritor_saeb_id: questao.descritor_saeb_id || '',
        nivel_cognitivo_id: questao.nivel_cognitivo_id || '',
        contexto_id: questao.contexto_id || '',
        fonte_id: questao.fonte_id || '',
        dificuldade: questao.dificuldade,
        comentario_resolucao: questao.comentario_resolucao || '',
      })
    } else {
      setEditingQuestao(null)
      setFormData({
        enunciado: '',
        alternativa_a: '',
        alternativa_b: '',
        alternativa_c: '',
        alternativa_d: '',
        alternativa_e: '',
        resposta_correta: 'A',
        ano_serie: '6º ano EF',
        unidade_tematica_id: '',
        habilidade_bncc_id: '',
        descritor_saeb_id: '',
        nivel_cognitivo_id: '',
        contexto_id: '',
        fonte_id: '',
        dificuldade: 'medio',
        comentario_resolucao: '',
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.enunciado) return
    setSaving(true)
    try {
      const questaoData = {
        usuario_id: usuario.id,
        enunciado: formData.enunciado,
        alternativa_a: formData.alternativa_a,
        alternativa_b: formData.alternativa_b,
        alternativa_c: formData.alternativa_c,
        alternativa_d: formData.alternativa_d,
        alternativa_e: formData.alternativa_e || null,
        resposta_correta: formData.resposta_correta,
        ano_serie: formData.ano_serie,
        unidade_tematica_id: formData.unidade_tematica_id || null,
        habilidade_bncc_id: formData.habilidade_bncc_id || null,
        descritor_saeb_id: formData.descritor_saeb_id || null,
        nivel_cognitivo_id: formData.nivel_cognitivo_id || null,
        contexto_id: formData.contexto_id || null,
        fonte_id: formData.fonte_id || null,
        dificuldade: formData.dificuldade,
        comentario_resolucao: formData.comentario_resolucao || null,
        ativa: true,
      }

      if (editingQuestao) {
        await supabase.from('questoes').update(questaoData).eq('id', editingQuestao.id)
      } else {
        await supabase.from('questoes').insert(questaoData)
      }
      setModalOpen(false)
      fetchQuestoes()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta questão?')) return
    await supabase.from('questoes').delete().eq('id', id)
    fetchQuestoes()
  }

  const handleDuplicate = async (questao: Questao) => {
    if (!usuario?.id) return
    const { id, created_at, ...rest } = questao
    await supabase.from('questoes').insert({ ...rest, usuario_id: usuario.id })
    fetchQuestoes()
  }

  const clearFilters = () => {
    setFilters({ ano_serie: '', unidade_tematica_id: '', habilidade_bncc_id: '', descritor_saeb_id: '', dificuldade: '', contexto_id: '' })
  }

  const filteredQuestoes = questoes.filter(q => q.enunciado.toLowerCase().includes(searchTerm.toLowerCase()))
  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const getDificuldadeVariant = (dif: string): 'success' | 'warning' | 'danger' | 'default' => {
    return dif === 'facil' ? 'success' : dif === 'medio' ? 'warning' : dif === 'dificil' ? 'danger' : 'default'
  }

  const getDificuldadeLabel = (dif: string) => dif === 'facil' ? 'Fácil' : dif === 'medio' ? 'Médio' : 'Difícil'

  const getHabilidadeCodigo = (id?: string) => id ? habilidades.find(h => h.id === id)?.codigo : null
  const getDescritorCodigo = (id?: string) => id ? descritores.find(d => d.id === id)?.codigo : null
  const getUnidadeNome = (id?: string) => id ? unidadesTematicas.find(u => u.id === id)?.nome : null
  const getContextoNome = (id?: string) => id ? contextos.find(c => c.id === id)?.nome : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco de Questões</h1>
          <p className="text-gray-600">Gerencie suas questões com classificação BNCC e SAEB</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Nova Questão</Button>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="Buscar questões..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Button variant={filterOpen ? 'primary' : 'outline'} onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-5 h-5 mr-2" />Filtros{activeFiltersCount > 0 && <span className="ml-2 bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">{activeFiltersCount}</span>}
          </Button>
        </div>
        {filterOpen && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.ano_serie} onChange={(e) => setFilters({ ...filters, ano_serie: e.target.value })}><option value="">Todos</option>{ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidade Temática</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.unidade_tematica_id} onChange={(e) => setFilters({ ...filters, unidade_tematica_id: e.target.value })}><option value="">Todas</option>{unidadesTematicas.map(ut => <option key={ut.id} value={ut.id}>{ut.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.dificuldade} onChange={(e) => setFilters({ ...filters, dificuldade: e.target.value })}><option value="">Todas</option>{DIFICULDADE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Habilidade BNCC</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.habilidade_bncc_id} onChange={(e) => setFilters({ ...filters, habilidade_bncc_id: e.target.value })}><option value="">Todas</option>{habilidades.map(h => <option key={h.id} value={h.id}>{h.codigo}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descritor SAEB</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.descritor_saeb_id} onChange={(e) => setFilters({ ...filters, descritor_saeb_id: e.target.value })}><option value="">Todos</option>{descritores.map(d => <option key={d.id} value={d.id}>{d.codigo}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contexto</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filters.contexto_id} onChange={(e) => setFilters({ ...filters, contexto_id: e.target.value })}><option value="">Todos</option>{contextos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            </div>
            <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar</Button></div>
          </div>
        )}
      </CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold">{questoes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Fáceis</p><p className="text-2xl font-bold text-green-600">{questoes.filter(q => q.dificuldade === 'facil').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Médias</p><p className="text-2xl font-bold text-yellow-600">{questoes.filter(q => q.dificuldade === 'medio').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Difíceis</p><p className="text-2xl font-bold text-red-600">{questoes.filter(q => q.dificuldade === 'dificil').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Com Imagem</p><p className="text-2xl font-bold text-purple-600">{questoes.filter(q => q.imagem_url).length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : filteredQuestoes.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{searchTerm || activeFiltersCount > 0 ? 'Nenhuma questão encontrada' : 'Nenhuma questão cadastrada'}</h3>
          <p className="text-gray-500 mb-6">{searchTerm || activeFiltersCount > 0 ? 'Tente ajustar os filtros' : 'Comece criando sua primeira questão'}</p>
          {!searchTerm && activeFiltersCount === 0 && <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Criar Questão</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestoes.map((questao, index) => (
            <Card key={questao.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <Badge variant="info">{questao.ano_serie}</Badge>
                    <Badge variant={getDificuldadeVariant(questao.dificuldade)}>{getDificuldadeLabel(questao.dificuldade)}</Badge>
                    {getHabilidadeCodigo(questao.habilidade_bncc_id) && <Badge>{getHabilidadeCodigo(questao.habilidade_bncc_id)}</Badge>}
                    {getDescritorCodigo(questao.descritor_saeb_id) && <Badge>{getDescritorCodigo(questao.descritor_saeb_id)}</Badge>}
                    {getUnidadeNome(questao.unidade_tematica_id) && <Badge variant="default">{getUnidadeNome(questao.unidade_tematica_id)}</Badge>}
                    {questao.imagem_url && <Badge variant="info"><Image className="w-3 h-3 mr-1" />Imagem</Badge>}
                    {questao.revisada && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Revisada</Badge>}
                  </div>
                  <p className="text-gray-900 line-clamp-2 mb-2">{questao.enunciado}</p>
                  {questao.imagem_url && (
                    <div className="mb-2">
                      <img src={questao.imagem_url} alt="Imagem da questão" className="max-h-32 rounded-lg border" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Resposta: <strong className="text-indigo-600">{questao.resposta_correta}</strong></span>
                    {getContextoNome(questao.contexto_id) && <span>Contexto: {getContextoNome(questao.contexto_id)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setViewingQuestao(questao); setViewModalOpen(true) }}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(questao)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(questao)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(questao.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingQuestao ? 'Editar Questão' : 'Nova Questão'} size="xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">📚 Classificação Curricular</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série *</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.ano_serie} onChange={(e) => setFormData({ ...formData, ano_serie: e.target.value })}>{ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidade Temática</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.unidade_tematica_id} onChange={(e) => setFormData({ ...formData, unidade_tematica_id: e.target.value })}><option value="">Selecione...</option>{unidadesTematicas.map(ut => <option key={ut.id} value={ut.id}>{ut.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Habilidade BNCC</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.habilidade_bncc_id} onChange={(e) => setFormData({ ...formData, habilidade_bncc_id: e.target.value })}><option value="">Selecione...</option>{habilidadesFiltradas.map(h => <option key={h.id} value={h.id}>{h.codigo} - {h.objeto_conhecimento}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descritor SAEB</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.descritor_saeb_id} onChange={(e) => setFormData({ ...formData, descritor_saeb_id: e.target.value })}><option value="">Selecione...</option>{descritores.map(d => <option key={d.id} value={d.id}>{d.codigo} - {d.descricao.substring(0, 35)}...</option>)}</select></div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">🎯 Dificuldade e Contexto</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade *</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.dificuldade} onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value as any })}>{DIFICULDADE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nível Cognitivo</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.nivel_cognitivo_id} onChange={(e) => setFormData({ ...formData, nivel_cognitivo_id: e.target.value })}><option value="">Selecione...</option>{niveisCognitivos.map(nc => <option key={nc.id} value={nc.id}>{nc.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contexto</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.contexto_id} onChange={(e) => setFormData({ ...formData, contexto_id: e.target.value })}><option value="">Selecione...</option>{contextos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.fonte_id} onChange={(e) => setFormData({ ...formData, fonte_id: e.target.value })}><option value="">Selecione...</option>{fontes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
            </div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Enunciado *</label><textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={4} placeholder="Digite o enunciado..." value={formData.enunciado} onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })} /></div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Alternativas *</label>
            {['A', 'B', 'C', 'D', 'E'].map((letra) => (
              <div key={letra} className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full font-medium ${formData.resposta_correta === letra ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{letra}</span>
                <Input placeholder={`Alternativa ${letra}${letra === 'E' ? ' (opcional)' : ''}`} value={formData[`alternativa_${letra.toLowerCase()}` as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [`alternativa_${letra.toLowerCase()}`]: e.target.value })} className="flex-1" />
                <button type="button" onClick={() => setFormData({ ...formData, resposta_correta: letra as any })} className={`px-3 py-2 rounded-lg text-sm font-medium ${formData.resposta_correta === letra ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{formData.resposta_correta === letra ? '✓ Correta' : 'Marcar'}</button>
              </div>
            ))}
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Comentário de Resolução (opcional)</label><textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg" rows={3} placeholder="Explique como resolver..." value={formData.comentario_resolucao} onChange={(e) => setFormData({ ...formData, comentario_resolucao: e.target.value })} /></div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!formData.enunciado || !formData.alternativa_a}>{editingQuestao ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Visualizar Questão" size="lg">
        {viewingQuestao && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{viewingQuestao.ano_serie}</Badge>
              <Badge variant={getDificuldadeVariant(viewingQuestao.dificuldade)}>{getDificuldadeLabel(viewingQuestao.dificuldade)}</Badge>
              {getHabilidadeCodigo(viewingQuestao.habilidade_bncc_id) && <Badge>{getHabilidadeCodigo(viewingQuestao.habilidade_bncc_id)}</Badge>}
              {getDescritorCodigo(viewingQuestao.descritor_saeb_id) && <Badge>{getDescritorCodigo(viewingQuestao.descritor_saeb_id)}</Badge>}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{viewingQuestao.enunciado}</p>
              {viewingQuestao.imagem_url && (
                <div className="mt-4">
                  <img src={viewingQuestao.imagem_url} alt="Imagem da questão" className="max-w-full rounded-lg border" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                const alt = viewingQuestao[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string
                if (!alt) return null
                const isCorrect = viewingQuestao.resposta_correta === letra
                return <div key={letra} className={`p-3 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'}`}><span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>{letra})</span><span className={`ml-2 ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>{alt}</span>{isCorrect && <span className="ml-2 text-green-600 text-sm font-medium">✓ Correta</span>}</div>
              })}
            </div>
            {viewingQuestao.comentario_resolucao && <div className="bg-blue-50 p-4 rounded-lg"><h4 className="font-medium text-blue-900 mb-2">💡 Resolução</h4><p className="text-blue-800">{viewingQuestao.comentario_resolucao}</p></div>}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setViewModalOpen(false)}>Fechar</Button>
              <Button className="flex-1" onClick={() => { setViewModalOpen(false); handleOpenModal(viewingQuestao) }}><Edit className="w-4 h-4 mr-2" />Editar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
