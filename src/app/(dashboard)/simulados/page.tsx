'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Select, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Simulado, Turma, Questao } from '@/types'
import { Plus, Search, FileText, Edit, Trash2, Eye, Play, QrCode, Check, X, Wand2 } from 'lucide-react'

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

  const [formData, setFormData] = useState({
    titulo: '', descricao: '', turma_id: '', tempo_minutos: 60,
    embaralhar_questoes: true, embaralhar_alternativas: false,
  })

  const [questaoFilters, setQuestaoFilters] = useState({ ano_serie: '', habilidade_bncc_id: '', dificuldade: '' })

  const [autoConfig, setAutoConfig] = useState({
    ano_serie: '6º ano EF',
    habilidades_ids: [] as string[],
    total_questoes: 10,
    qtd_facil: 3,
    qtd_medio: 4,
    qtd_dificil: 3,
  })

  const supabase = createClient()

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

  const handleOpenModal = (s?: Simulado) => {
    if (s) {
      setEditingSimulado(s)
      setFormData({ titulo: s.titulo, descricao: s.descricao || '', turma_id: s.turma_id || '', tempo_minutos: s.tempo_minutos || 60,
        embaralhar_questoes: s.configuracoes?.embaralhar_questoes ?? true, embaralhar_alternativas: s.configuracoes?.embaralhar_alternativas ?? false })
      setQuestoesSelecionadas(s.questoes_ids || [])
    } else {
      setEditingSimulado(null)
      setFormData({ titulo: '', descricao: '', turma_id: '', tempo_minutos: 60, embaralhar_questoes: true, embaralhar_alternativas: false })
      setQuestoesSelecionadas([])
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.titulo) return
    setSaving(true)
    try {
      const data = {
        usuario_id: usuario.id, titulo: formData.titulo, descricao: formData.descricao || null,
        turma_id: formData.turma_id || null, tempo_minutos: formData.tempo_minutos, questoes_ids: questoesSelecionadas,
        configuracoes: { embaralhar_questoes: formData.embaralhar_questoes, embaralhar_alternativas: formData.embaralhar_alternativas,
          mostrar_gabarito_apos: true, permitir_revisao: true }, status: 'rascunho',
      }
      if (editingSimulado) { await supabase.from('simulados').update(data).eq('id', editingSimulado.id) }
      else { await supabase.from('simulados').insert(data) }
      setModalOpen(false); fetchData()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => { if (confirm('Excluir?')) { await supabase.from('simulados').delete().eq('id', id); fetchData() } }
  const handlePublish = async (id: string) => { await supabase.from('simulados').update({ status: 'publicado' }).eq('id', id); fetchData() }
  const toggleQuestao = (id: string) => setQuestoesSelecionadas(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id])

  const toggleHabilidade = (id: string) => {
    setAutoConfig(prev => ({
      ...prev,
      habilidades_ids: prev.habilidades_ids.includes(id)
        ? prev.habilidades_ids.filter(h => h !== id)
        : [...prev.habilidades_ids, id]
    }))
  }

  const gerarQuestoesAutomaticamente = () => {
    let questoesFiltradas = questoesDisponiveis.filter(q => q.ano_serie === autoConfig.ano_serie)

    if (autoConfig.habilidades_ids.length > 0) {
      questoesFiltradas = questoesFiltradas.filter(q => 
        q.habilidade_bncc_id && autoConfig.habilidades_ids.includes(q.habilidade_bncc_id)
      )
    }

    const faceis = questoesFiltradas.filter(q => q.dificuldade === 'facil')
    const medias = questoesFiltradas.filter(q => q.dificuldade === 'medio')
    const dificeis = questoesFiltradas.filter(q => q.dificuldade === 'dificil')

    const shuffle = (arr: Questao[]) => arr.sort(() => Math.random() - 0.5)

    const selecionadas: string[] = [
      ...shuffle(faceis).slice(0, autoConfig.qtd_facil).map(q => q.id),
      ...shuffle(medias).slice(0, autoConfig.qtd_medio).map(q => q.id),
      ...shuffle(dificeis).slice(0, autoConfig.qtd_dificil).map(q => q.id),
    ]

    setQuestoesSelecionadas(selecionadas)
    setGerarAutoModalOpen(false)
  }

  const filteredQuestoes = questoesDisponiveis.filter(q => {
    if (questaoFilters.ano_serie && q.ano_serie !== questaoFilters.ano_serie) return false
    if (questaoFilters.dificuldade && q.dificuldade !== questaoFilters.dificuldade) return false
    if (questaoFilters.habilidade_bncc_id && q.habilidade_bncc_id !== questaoFilters.habilidade_bncc_id) return false
    return true
  })

  const habilidadesFiltradas = habilidades.filter(h => 
    autoConfig.ano_serie ? h.codigo.includes(autoConfig.ano_serie.charAt(0)) : true
  )

  const filteredSimulados = simulados.filter(s => s.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
  const getStatusVariant = (s: string): 'warning' | 'success' | 'default' => s === 'rascunho' ? 'warning' : s === 'publicado' ? 'success' : 'default'
  const getHabilidadeCodigo = (id?: string) => id ? habilidades.find(h => h.id === id)?.codigo : null

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Simulados</h1><p className="text-gray-600">Crie e gerencie simulados</p></div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Novo Simulado</Button>
      </div>

      <Card variant="bordered" className="mb-6"><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-gray-900" /></div>
      </CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-gray-900">{simulados.length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Rascunhos</p><p className="text-2xl font-bold text-yellow-600">{simulados.filter(s => s.status === 'rascunho').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Publicados</p><p className="text-2xl font-bold text-green-600">{simulados.filter(s => s.status === 'publicado').length}</p></CardContent></Card>
        <Card variant="bordered"><CardContent className="p-4"><p className="text-sm text-gray-600">Encerrados</p><p className="text-2xl font-bold text-gray-900">{simulados.filter(s => s.status === 'encerrado').length}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      : filteredSimulados.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm ? 'Nenhum encontrado' : 'Nenhum simulado'}</h3>
          <p className="text-gray-500 mb-6">Crie seu primeiro simulado</p>
          <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Criar</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">{filteredSimulados.map(s => (
          <Card key={s.id} variant="bordered" className="hover:shadow-md transition-shadow"><CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2"><h3 className="font-semibold text-gray-900">{s.titulo}</h3><Badge variant={getStatusVariant(s.status)}>{s.status}</Badge></div>
                {s.descricao && <p className="text-gray-600 text-sm mb-2">{s.descricao}</p>}
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{s.questoes_ids?.length || 0} questões</span><span>{s.tempo_minutos} min</span>
                  {s.turma_id && <span>{turmas.find(t => t.id === s.turma_id)?.nome}</span>}
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
          </CardContent></Card>
        ))}</div>
      )}

      {/* Modal Criar/Editar Simulado */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSimulado ? 'Editar Simulado' : 'Novo Simulado'} size="xl">
        <div className="space-y-4">
          <Input label="Título" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} className="text-gray-900" />
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea className="w-full px-4 py-2 border rounded-lg text-gray-900" rows={2} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Turma" options={turmas.map(t => ({ value: t.id, label: t.nome }))} placeholder="Selecione..." value={formData.turma_id} onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })} />
            <Input label="Tempo (min)" type="number" value={formData.tempo_minutos} onChange={(e) => setFormData({ ...formData, tempo_minutos: parseInt(e.target.value) || 60 })} className="text-gray-900" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.embaralhar_questoes} onChange={(e) => setFormData({ ...formData, embaralhar_questoes: e.target.checked })} className="rounded" /><span className="text-sm text-gray-700">Embaralhar questões</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.embaralhar_alternativas} onChange={(e) => setFormData({ ...formData, embaralhar_alternativas: e.target.checked })} className="rounded" /><span className="text-sm text-gray-700">Embaralhar alternativas</span></label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Questões: {questoesSelecionadas.length}</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setGerarAutoModalOpen(true)}>
                  <Wand2 className="w-4 h-4 mr-1" />Gerar Automático
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuestoesModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />Manual
                </Button>
              </div>
            </div>
            {questoesSelecionadas.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {questoesSelecionadas.map((id, idx) => {
                  const q = questoesDisponiveis.find(x => x.id === id)
                  return q ? (
                    <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-900">
                        <strong>{idx + 1}.</strong> {q.enunciado.substring(0, 50)}...
                        {getHabilidadeCodigo(q.habilidade_bncc_id) && (
                          <Badge variant="info" className="ml-2 text-xs">{getHabilidadeCodigo(q.habilidade_bncc_id)}</Badge>
                        )}
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
            <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!formData.titulo || questoesSelecionadas.length === 0}>
              {editingSimulado ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Seleção Manual de Questões */}
      <Modal isOpen={questoesModalOpen} onClose={() => setQuestoesModalOpen(false)} title="Selecionar Questões" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={questaoFilters.ano_serie} onChange={(e) => setQuestaoFilters({ ...questaoFilters, ano_serie: e.target.value })}>
                <option value="">Todos</option>
                {ANO_SERIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habilidade BNCC</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={questaoFilters.habilidade_bncc_id} onChange={(e) => setQuestaoFilters({ ...questaoFilters, habilidade_bncc_id: e.target.value })}>
                <option value="">Todas</option>
                {habilidades.map(h => <option key={h.id} value={h.id}>{h.codigo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={questaoFilters.dificuldade} onChange={(e) => setQuestaoFilters({ ...questaoFilters, dificuldade: e.target.value })}>
                <option value="">Todas</option>
                {DIFICULDADE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">{filteredQuestoes.length} questões encontradas</div>

          <div className="max-h-96 overflow-y-auto space-y-2">
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
                        {getHabilidadeCodigo(q.habilidade_bncc_id) && <Badge>{getHabilidadeCodigo(q.habilidade_bncc_id)}</Badge>}
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
            <p className="flex-1 text-center py-2 font-medium text-gray-900">{questoesSelecionadas.length} selecionadas</p>
          </div>
        </div>
      </Modal>

      {/* Modal Gerar Automático */}
      <Modal isOpen={gerarAutoModalOpen} onClose={() => setGerarAutoModalOpen(false)} title="Gerar Simulado Automático" size="lg">
        <div className="space-y-4">
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
                  <input
                    type="checkbox"
                    checked={autoConfig.habilidades_ids.includes(h.id)}
                    onChange={() => toggleHabilidade(h.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900"><strong>{h.codigo}</strong> - {h.descricao.substring(0, 50)}...</span>
                </label>
              ))}
            </div>
            {autoConfig.habilidades_ids.length > 0 && (
              <p className="text-sm text-indigo-600 mt-1">{autoConfig.habilidades_ids.length} habilidade(s) selecionada(s)</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Questões Fáceis</label>
              <Input type="number" min={0} value={autoConfig.qtd_facil} onChange={(e) => setAutoConfig({ ...autoConfig, qtd_facil: parseInt(e.target.value) || 0 })} className="text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Questões Médias</label>
              <Input type="number" min={0} value={autoConfig.qtd_medio} onChange={(e) => setAutoConfig({ ...autoConfig, qtd_medio: parseInt(e.target.value) || 0 })} className="text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Questões Difíceis</label>
              <Input type="number" min={0} value={autoConfig.qtd_dificil} onChange={(e) => setAutoConfig({ ...autoConfig, qtd_dificil: parseInt(e.target.value) || 0 })} className="text-gray-900" />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total:</strong> {autoConfig.qtd_facil + autoConfig.qtd_medio + autoConfig.qtd_dificil} questões
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setGerarAutoModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={gerarQuestoesAutomaticamente}>
              <Wand2 className="w-4 h-4 mr-2" />Gerar Questões
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
