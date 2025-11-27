'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Select, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Questao } from '@/types'
import { 
  ANO_SERIE_OPTIONS, 
  DIFICULDADE_OPTIONS, 
  UNIDADES_TEMATICAS,
  getHabilidadesPorAno,
  getDescritoresPorNivel,
  getNivel
} from '@/lib/constants'
import { Plus, Search, BookOpen, Edit, Trash2, Filter, Eye, Copy, X } from 'lucide-react'

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

  const [filters, setFilters] = useState({
    ano_serie: '', unidade_tematica: '', habilidade: '', descritor: '', dificuldade: ''
  })

  const [formData, setFormData] = useState({
    enunciado: '', alternativa_a: '', alternativa_b: '', alternativa_c: '', alternativa_d: '', alternativa_e: '',
    resposta_correta: 'A' as 'A' | 'B' | 'C' | 'D' | 'E',
    ano_serie: '6º ano', unidade_tematica: 'numeros', habilidade_codigo: '', descritor_codigo: '',
    dificuldade: 'medio' as 'facil' | 'medio' | 'dificil',
  })

  const supabase = createClient()

  const fetchQuestoes = useCallback(async () => {
    if (!usuario?.id) return
    try {
      let query = supabase.from('questoes').select('*').eq('usuario_id', usuario.id).order('created_at', { ascending: false })
      if (filters.ano_serie) query = query.eq('ano_serie', filters.ano_serie)
      if (filters.dificuldade) query = query.eq('dificuldade', filters.dificuldade)
      if (filters.unidade_tematica) query = query.eq('unidade_tematica', filters.unidade_tematica)
      const { data, error } = await query
      if (error) throw error
      setQuestoes(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, filters])

  useEffect(() => { fetchQuestoes() }, [fetchQuestoes])

  const habilidades = getHabilidadesPorAno(formData.ano_serie)
  const descritores = getDescritoresPorNivel(getNivel(formData.ano_serie))

  const handleOpenModal = (questao?: Questao) => {
    if (questao) {
      setEditingQuestao(questao)
      setFormData({
        enunciado: questao.enunciado, alternativa_a: questao.alternativa_a, alternativa_b: questao.alternativa_b,
        alternativa_c: questao.alternativa_c, alternativa_d: questao.alternativa_d, alternativa_e: questao.alternativa_e || '',
        resposta_correta: questao.resposta_correta, ano_serie: questao.ano_serie,
        unidade_tematica: (questao as any).unidade_tematica || 'numeros',
        habilidade_codigo: (questao as any).habilidade_codigo || '', descritor_codigo: (questao as any).descritor_codigo || '',
        dificuldade: questao.dificuldade,
      })
    } else {
      setEditingQuestao(null)
      setFormData({
        enunciado: '', alternativa_a: '', alternativa_b: '', alternativa_c: '', alternativa_d: '', alternativa_e: '',
        resposta_correta: 'A', ano_serie: '6º ano', unidade_tematica: 'numeros', habilidade_codigo: '', descritor_codigo: '', dificuldade: 'medio',
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.enunciado) return
    setSaving(true)
    try {
      const questaoData = {
        usuario_id: usuario.id, enunciado: formData.enunciado,
        alternativa_a: formData.alternativa_a, alternativa_b: formData.alternativa_b,
        alternativa_c: formData.alternativa_c, alternativa_d: formData.alternativa_d,
        alternativa_e: formData.alternativa_e || null, resposta_correta: formData.resposta_correta,
        ano_serie: formData.ano_serie, unidade_tematica: formData.unidade_tematica,
        habilidade_codigo: formData.habilidade_codigo || null, descritor_codigo: formData.descritor_codigo || null,
        dificuldade: formData.dificuldade, ativa: true,
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

  const filteredQuestoes = questoes.filter(q => q.enunciado.toLowerCase().includes(searchTerm.toLowerCase()))
  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const getDificuldadeVariant = (dif: string): 'success' | 'warning' | 'danger' | 'default' => {
    return dif === 'facil' ? 'success' : dif === 'medio' ? 'warning' : dif === 'dificil' ? 'danger' : 'default'
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco de Questões</h1>
          <p className="text-gray-600">Matemática • 6º ao 9º ano e Ensino Médio</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Nova Questão</Button>
      </div>

      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Buscar questões..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Button variant={activeFiltersCount > 0 ? 'primary' : 'outline'} onClick={() => setFilterOpen(!filterOpen)}>
              <Filter className="w-5 h-5 mr-2" />Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>
          {filterOpen && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select label="Ano/Série" options={ANO_SERIE_OPTIONS} placeholder="Todos" value={filters.ano_serie} onChange={(e) => setFilters({ ...filters, ano_serie: e.target.value })} />
                <Select label="Unidade Temática" options={UNIDADES_TEMATICAS} placeholder="Todas" value={filters.unidade_tematica} onChange={(e) => setFilters({ ...filters, unidade_tematica: e.target.value })} />
                <Select label="Dificuldade" options={DIFICULDADE_OPTIONS} placeholder="Todas" value={filters.dificuldade} onChange={(e) => setFilters({ ...filters, dificuldade: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setFilters({ ano_serie: '', unidade_tematica: '', habilidade: '', descritor: '', dificuldade: '' })}>
                  <X className="w-4 h-4 mr-1" /> Limpar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold">{questoes.length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Fáceis</p><p className="text-2xl font-bold text-green-600">{questoes.filter(q => q.dificuldade === 'facil').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Médias</p><p className="text-2xl font-bold text-yellow-600">{questoes.filter(q => q.dificuldade === 'medio').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Difíceis</p><p className="text-2xl font-bold text-red-600">{questoes.filter(q => q.dificuldade === 'dificil').length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : filteredQuestoes.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{searchTerm ? 'Nenhuma questão encontrada' : 'Nenhuma questão cadastrada'}</h3>
            <p className="text-gray-500 mb-6">Comece criando sua primeira questão</p>
            <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Criar Questão</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestoes.map((questao, index) => (
            <Card key={questao.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <Badge variant="info">{questao.ano_serie}</Badge>
                      <Badge variant={getDificuldadeVariant(questao.dificuldade)}>{questao.dificuldade}</Badge>
                      {(questao as any).habilidade_codigo && <Badge>{(questao as any).habilidade_codigo}</Badge>}
                      {(questao as any).descritor_codigo && <Badge>{(questao as any).descritor_codigo}</Badge>}
                    </div>
                    <p className="text-gray-900 line-clamp-2">{questao.enunciado}</p>
                    <p className="mt-2 text-sm text-gray-500">Resposta: <strong className="text-indigo-600">{questao.resposta_correta}</strong></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingQuestao(questao); setViewModalOpen(true) }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(questao)}><Copy className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(questao)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(questao.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingQuestao ? 'Editar Questão' : 'Nova Questão'} size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Select label="Ano/Série" options={ANO_SERIE_OPTIONS} value={formData.ano_serie} onChange={(e) => setFormData({ ...formData, ano_serie: e.target.value, habilidade_codigo: '' })} />
            <Select label="Unidade Temática" options={UNIDADES_TEMATICAS} value={formData.unidade_tematica} onChange={(e) => setFormData({ ...formData, unidade_tematica: e.target.value })} />
            <Select label="Dificuldade" options={DIFICULDADE_OPTIONS} value={formData.dificuldade} onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value as any })} />
            <Select label="Resposta" options={[{value:'A',label:'A'},{value:'B',label:'B'},{value:'C',label:'C'},{value:'D',label:'D'},{value:'E',label:'E'}]} value={formData.resposta_correta} onChange={(e) => setFormData({ ...formData, resposta_correta: e.target.value as any })} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Select label="Habilidade BNCC" options={habilidades.map(h => ({ value: h.codigo, label: `${h.codigo}` }))} placeholder="Selecione..." value={formData.habilidade_codigo} onChange={(e) => setFormData({ ...formData, habilidade_codigo: e.target.value })} />
            <Select label="Descritor SAEB" options={descritores.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.descricao.substring(0, 40)}...` }))} placeholder="Selecione..." value={formData.descritor_codigo} onChange={(e) => setFormData({ ...formData, descritor_codigo: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={4} placeholder="Digite o enunciado..." value={formData.enunciado} onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Input label="Alternativa A" value={formData.alternativa_a} onChange={(e) => setFormData({ ...formData, alternativa_a: e.target.value })} />
            <Input label="Alternativa B" value={formData.alternativa_b} onChange={(e) => setFormData({ ...formData, alternativa_b: e.target.value })} />
            <Input label="Alternativa C" value={formData.alternativa_c} onChange={(e) => setFormData({ ...formData, alternativa_c: e.target.value })} />
            <Input label="Alternativa D" value={formData.alternativa_d} onChange={(e) => setFormData({ ...formData, alternativa_d: e.target.value })} />
            <Input label="Alternativa E (opcional)" value={formData.alternativa_e} onChange={(e) => setFormData({ ...formData, alternativa_e: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!formData.enunciado || !formData.alternativa_a}>{editingQuestao ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Visualizar */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Questão" size="lg">
        {viewingQuestao && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{viewingQuestao.ano_serie}</Badge>
              <Badge variant={getDificuldadeVariant(viewingQuestao.dificuldade)}>{viewingQuestao.dificuldade}</Badge>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg"><p className="whitespace-pre-wrap">{viewingQuestao.enunciado}</p></div>
            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                const alt = viewingQuestao[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string
                if (!alt) return null
                const isCorrect = viewingQuestao.resposta_correta === letra
                return (
                  <div key={letra} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
                    <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>{letra})</span>
                    <span className={`ml-2 ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>{alt}</span>
                    {isCorrect && <span className="ml-2 text-green-600 text-sm">(Correta)</span>}
                  </div>
                )
              })}
            </div>
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
