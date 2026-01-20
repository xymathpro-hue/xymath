'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Plus, Search, FileText, Edit, Trash2, Eye, Play, QrCode, Check, X, 
  Wand2, Filter, Users, CheckCircle, ArrowLeft, ArrowUp, ArrowDown, 
  AlertCircle, BarChart3, Download, FileDown, ChevronDown, ChevronUp,
  BookOpen, Target, Layers, Clock, SlidersHorizontal, RefreshCw
} from 'lucide-react'
import { exportToWord, exportToPDF } from '@/lib/export-document'

interface Simulado {
  id: string
  titulo: string
  descricao?: string
  turma_id?: string
  tempo_minutos: number
  questoes_ids: string[]
  configuracoes?: any
  status: 'rascunho' | 'publicado' | 'encerrado'
  created_at: string
  usuario_id: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
  ativa: boolean
}

interface Questao {
  id: string
  enunciado: string
  ano_serie: string
  dificuldade: string
  habilidade_bncc_id?: string
  is_publica?: boolean
  ativa?: boolean
  alternativa_a?: string
  alternativa_b?: string
  alternativa_c?: string
  alternativa_d?: string
  alternativa_e?: string
  resposta_correta?: string
  fonte?: string
  descritor_codigo?: string
  unidade_tematica?: string
}

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
}

interface DescritorSaeb {
  id: string
  codigo: string
  descricao: string
}

const ANO_SERIE_OPTIONS = [
  { value: '', label: 'Todos os anos' },
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
]

const DIFICULDADE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'facil', label: 'Fácil', emoji: '🟢', color: 'text-green-600' },
  { value: 'medio', label: 'Médio', emoji: '🟡', color: 'text-yellow-600' },
  { value: 'dificil', label: 'Difícil', emoji: '🔴', color: 'text-red-600' },
]

const FONTE_OPTIONS = [
  { value: '', label: 'Todas as fontes' },
  { value: 'BNCC', label: 'BNCC' },
  { value: 'SAEB', label: 'SAEB' },
  { value: 'TEMA', label: 'Por Tema' },
]

export default function SimuladosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  // Estados principais
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [descritoresSaeb, setDescritoresSaeb] = useState<DescritorSaeb[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados do modo criação
  const [modoEdicao, setModoEdicao] = useState(false)
  const [editingSimulado, setEditingSimulado] = useState<Simulado | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Estados das questões selecionadas
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [questaoExpandida, setQuestaoExpandida] = useState<string | null>(null)
  
  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    ano_serie: '',
    dificuldade: '',
    fonte: '',
    habilidades_ids: [] as string[],
    busca: ''
  })
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false)
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turmas_ids: [] as string[],
    tempo_minutos: 60,
    embaralhar_questoes: true,
    embaralhar_alternativas: false,
  })
  
  // Estados de UI
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Temas disponíveis
  const temasDisponiveis = [...new Set(
    questoesDisponiveis
      .filter(q => q.unidade_tematica)
      .map(q => q.unidade_tematica!)
  )].sort()

  // Carregar dados
  const fetchData = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    try {
      const [sRes, tRes, qRes, hRes, dRes] = await Promise.all([
        supabase.from('simulados').select('*').eq('usuario_id', usuario.id).order('created_at', { ascending: false }),
        supabase.from('turmas').select('*').eq('usuario_id', usuario.id).eq('ativa', true),
        supabase.from('questoes').select('*').eq('ativa', true),
        supabase.from('habilidades_bncc').select('id, codigo, descricao').order('codigo'),
        supabase.from('descritores_saeb').select('id, codigo, descricao').order('codigo'),
      ])
      setSimulados(sRes.data || [])
      setTurmas(tRes.data || [])
      setQuestoesDisponiveis(qRes.data || [])
      setHabilidades(hRes.data || [])
      setDescritoresSaeb(dRes.data || [])
    } catch (e) {
      console.error('Erro:', e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Click outside para fechar menu export
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar questões
  const questoesFiltradas = questoesDisponiveis.filter(q => {
    // Filtro por ano (exceto quando é TEMA)
    if (filtros.fonte !== 'TEMA' && filtros.ano_serie && q.ano_serie !== filtros.ano_serie) return false
    
    // Filtro por dificuldade
    if (filtros.dificuldade && q.dificuldade !== filtros.dificuldade) return false
    
    // Filtro por fonte
    if (filtros.fonte) {
      if (filtros.fonte === 'TEMA') {
        if (!q.unidade_tematica) return false
      } else {
        const qFonte = q.fonte || 'BNCC'
        if (qFonte !== filtros.fonte) return false
      }
    }
    
    // Filtro por habilidades/descritores/temas
    if (filtros.habilidades_ids.length > 0) {
      if (filtros.fonte === 'SAEB') {
        if (!q.descritor_codigo || !filtros.habilidades_ids.includes(q.descritor_codigo)) return false
      } else if (filtros.fonte === 'TEMA') {
        if (!q.unidade_tematica || !filtros.habilidades_ids.includes(q.unidade_tematica)) return false
      } else {
        if (!q.habilidade_bncc_id || !filtros.habilidades_ids.includes(q.habilidade_bncc_id)) return false
      }
    }
    
    // Filtro por busca textual
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase()
      if (!q.enunciado.toLowerCase().includes(busca)) return false
    }
    
    return true
  })

  // Simulados filtrados
  const simuladosFiltrados = simulados.filter(s => 
    s.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Habilidades filtradas por ano
  const habilidadesFiltradas = habilidades.filter(h => {
    if (!filtros.ano_serie) return true
    const anoNum = filtros.ano_serie.charAt(0)
    return h.codigo.includes(anoNum)
  })

  // Iniciar criação de simulado
  const iniciarCriacao = (simulado?: Simulado) => {
    setSaveError(null)
    setQuestaoExpandida(null)
    
    if (simulado) {
      setEditingSimulado(simulado)
      const config = simulado.configuracoes || {}
      setFormData({
        titulo: simulado.titulo,
        descricao: simulado.descricao || '',
        turmas_ids: config.turmas_selecionadas || (simulado.turma_id ? [simulado.turma_id] : []),
        tempo_minutos: simulado.tempo_minutos || 60,
        embaralhar_questoes: config.embaralhar_questoes ?? true,
        embaralhar_alternativas: config.embaralhar_alternativas ?? false
      })
      setQuestoesSelecionadas(simulado.questoes_ids || [])
    } else {
      setEditingSimulado(null)
      setFormData({
        titulo: '',
        descricao: '',
        turmas_ids: [],
        tempo_minutos: 60,
        embaralhar_questoes: true,
        embaralhar_alternativas: false
      })
      setQuestoesSelecionadas([])
    }
    
    setFiltros({ ano_serie: '', dificuldade: '', fonte: '', habilidades_ids: [], busca: '' })
    setModoEdicao(true)
  }

  // Cancelar criação
  const cancelarCriacao = () => {
    setModoEdicao(false)
    setEditingSimulado(null)
    setQuestoesSelecionadas([])
    setSaveError(null)
  }

  // Salvar simulado
  const salvarSimulado = async () => {
    if (!usuario?.id) { setSaveError('Usuário não autenticado'); return }
    if (!formData.titulo.trim()) { setSaveError('Digite um título para o simulado'); return }
    if (questoesSelecionadas.length === 0) { setSaveError('Selecione pelo menos uma questão'); return }

    setSaving(true)
    setSaveError(null)

    try {
      const dataToSave = {
        usuario_id: usuario.id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao?.trim() || null,
        turma_id: formData.turmas_ids[0] || null,
        tempo_minutos: formData.tempo_minutos,
        questoes_ids: questoesSelecionadas,
        configuracoes: {
          embaralhar_questoes: formData.embaralhar_questoes,
          embaralhar_alternativas: formData.embaralhar_alternativas,
          mostrar_gabarito_apos: true,
          permitir_revisao: true,
          turmas_selecionadas: formData.turmas_ids
        },
        status: 'rascunho'
      }

      let result
      if (editingSimulado) {
        result = await supabase.from('simulados').update(dataToSave).eq('id', editingSimulado.id).select()
      } else {
        result = await supabase.from('simulados').insert(dataToSave).select()
      }

      if (result.error) { setSaveError(`Erro: ${result.error.message}`); return }
      
      setModoEdicao(false)
      setEditingSimulado(null)
      setQuestoesSelecionadas([])
      fetchData()
    } catch (e: any) {
      setSaveError(e.message || 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  // Toggle questão selecionada
  const toggleQuestao = (id: string) => {
    setQuestoesSelecionadas(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  // Toggle turma
  const toggleTurma = (id: string) => {
    setFormData(prev => ({
      ...prev,
      turmas_ids: prev.turmas_ids.includes(id) 
        ? prev.turmas_ids.filter(t => t !== id) 
        : [...prev.turmas_ids, id]
    }))
  }

  // Toggle habilidade no filtro
  const toggleHabilidade = (id: string) => {
    setFiltros(prev => ({
      ...prev,
      habilidades_ids: prev.habilidades_ids.includes(id)
        ? prev.habilidades_ids.filter(h => h !== id)
        : [...prev.habilidades_ids, id]
    }))
  }

  // Mover questão na ordem
  const moverQuestao = (index: number, direcao: 'up' | 'down') => {
    const novaOrdem = [...questoesSelecionadas]
    const novoIndex = direcao === 'up' ? index - 1 : index + 1
    if (novoIndex < 0 || novoIndex >= novaOrdem.length) return
    ;[novaOrdem[index], novaOrdem[novoIndex]] = [novaOrdem[novoIndex], novaOrdem[index]]
    setQuestoesSelecionadas(novaOrdem)
  }

  // Gerar automaticamente
  const gerarAutomatico = (qtd: number) => {
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
    const disponiveis = questoesFiltradas.filter(q => !questoesSelecionadas.includes(q.id))
    
    // Distribuir por dificuldade
    const faceis = shuffle(disponiveis.filter(q => q.dificuldade === 'facil'))
    const medias = shuffle(disponiveis.filter(q => q.dificuldade === 'medio'))
    const dificeis = shuffle(disponiveis.filter(q => q.dificuldade === 'dificil'))
    
    const qtdFacil = Math.round(qtd * 0.3)
    const qtdDificil = Math.round(qtd * 0.3)
    const qtdMedio = qtd - qtdFacil - qtdDificil
    
    const novas = [
      ...faceis.slice(0, qtdFacil),
      ...medias.slice(0, qtdMedio),
      ...dificeis.slice(0, qtdDificil)
    ].map(q => q.id)
    
    setQuestoesSelecionadas(prev => [...prev, ...novas])
  }

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({ ano_serie: '', dificuldade: '', fonte: '', habilidades_ids: [], busca: '' })
  }

  // Handlers de ações dos simulados
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este simulado?')) return
    await supabase.from('simulados').delete().eq('id', id)
    fetchData()
  }

  const handlePublish = async (id: string) => {
    await supabase.from('simulados').update({ status: 'publicado' }).eq('id', id)
    fetchData()
  }

  const handleExport = async (simulado: Simulado, formato: 'word' | 'pdf') => {
    setExportMenuOpen(null)
    try {
      const { data: questoesData } = await supabase
        .from('questoes')
        .select('*')
        .in('id', simulado.questoes_ids)
      
      if (!questoesData) return
      
      const questoesOrdenadas = simulado.questoes_ids
        .map(id => questoesData.find(q => q.id === id))
        .filter(Boolean)
        .map(q => ({
          ...q!,
          habilidade_codigo: habilidades.find(h => h.id === q!.habilidade_bncc_id)?.codigo || q!.descritor_codigo
        }))
      
      const turmaNome = getTurmasNomes(simulado)
      const config = {
        titulo: simulado.titulo,
        subtitulo: simulado.descricao,
        turma: turmaNome,
        tempo: simulado.tempo_minutos,
        incluirGabarito: true,
        incluirCabecalho: true,
        questoes: questoesOrdenadas
      }
      
      if (formato === 'word') await exportToWord(config)
      else await exportToPDF(config)
    } catch (e) {
      console.error('Erro ao exportar:', e)
      alert('Erro ao exportar documento')
    }
  }

  // Helpers
  const getHabilidadeCodigo = (q: Questao) => {
    if (q.descritor_codigo) return q.descritor_codigo
    if (q.unidade_tematica) return q.unidade_tematica.length > 20 ? q.unidade_tematica.substring(0, 20) + '...' : q.unidade_tematica
    if (!q.habilidade_bncc_id) return null
    return habilidades.find(h => h.id === q.habilidade_bncc_id)?.codigo || null
  }

  const getDificuldadeInfo = (d?: string) => {
    const opt = DIFICULDADE_OPTIONS.find(o => o.value === d)
    if (!opt || !opt.value) return { label: d || '', emoji: '', color: 'text-gray-600' }
    return opt
  }

  const getTurmasNomes = (s: Simulado) => {
    const config = s.configuracoes || {}
    const ids = config.turmas_selecionadas || (s.turma_id ? [s.turma_id] : [])
    return ids.map((id: string) => turmas.find(t => t.id === id)?.nome).filter(Boolean).join(', ')
  }

  const getStatusBadge = (status: string) => {
    if (status === 'rascunho') return <Badge variant="warning">Rascunho</Badge>
    if (status === 'publicado') return <Badge variant="success">Publicado</Badge>
    return <Badge>Encerrado</Badge>
  }

  const getEstatisticas = () => {
    const questoes = questoesSelecionadas.map(id => questoesDisponiveis.find(q => q.id === id)).filter(Boolean) as Questao[]
    return {
      total: questoes.length,
      facil: questoes.filter(q => q.dificuldade === 'facil').length,
      medio: questoes.filter(q => q.dificuldade === 'medio').length,
      dificil: questoes.filter(q => q.dificuldade === 'dificil').length,
    }
  }

  const stats = getEstatisticas()

  // ============================================
  // RENDER: MODO LISTAGEM DE SIMULADOS
  // ============================================
  if (!modoEdicao) {
    return (
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
            <p className="text-gray-600">Crie e gerencie seus simulados</p>
          </div>
          <Button onClick={() => iniciarCriacao()}>
            <Plus className="w-5 h-5 mr-2" />
            Novo Simulado
          </Button>
        </div>

        {/* Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder="Buscar simulados..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{simulados.length}</p>
            <p className="text-sm text-gray-600">Total</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{simulados.filter(s => s.status === 'rascunho').length}</p>
            <p className="text-sm text-gray-600">Rascunhos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{simulados.filter(s => s.status === 'publicado').length}</p>
            <p className="text-sm text-gray-600">Publicados</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{simulados.filter(s => s.status === 'encerrado').length}</p>
            <p className="text-sm text-gray-600">Encerrados</p>
          </CardContent></Card>
        </div>

        {/* Lista de simulados */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : simuladosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum simulado encontrado' : 'Nenhum simulado criado'}
              </h3>
              <p className="text-gray-500 mb-6">Crie seu primeiro simulado agora!</p>
              <Button onClick={() => iniciarCriacao()}>
                <Plus className="w-5 h-5 mr-2" />
                Criar Simulado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {simuladosFiltrados.map(s => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{s.titulo}</h3>
                        {getStatusBadge(s.status)}
                      </div>
                      {s.descricao && <p className="text-gray-600 text-sm mb-2">{s.descricao}</p>}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {s.questoes_ids?.length || 0} questões
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {s.tempo_minutos} min
                        </span>
                        {getTurmasNomes(s) && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getTurmasNomes(s)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-wrap gap-1">
                      {s.status === 'rascunho' && (
                        <Button variant="ghost" size="sm" onClick={() => handlePublish(s.id)} title="Publicar">
                          <Play className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Link href={`/simulados/${s.id}`}>
                        <Button variant="ghost" size="sm" title="Ver">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/simulados/${s.id}/resultados`}>
                        <Button variant="ghost" size="sm" title="Resultados">
                          <BarChart3 className="w-4 h-4 text-indigo-600" />
                        </Button>
                      </Link>
                      <div className="relative" ref={exportMenuRef}>
                        <Button variant="ghost" size="sm" onClick={() => setExportMenuOpen(exportMenuOpen === s.id ? null : s.id)} title="Exportar">
                          <Download className="w-4 h-4 text-green-600" />
                        </Button>
                        {exportMenuOpen === s.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[140px]">
                            <button onClick={() => handleExport(s, 'word')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <FileDown className="w-4 h-4 text-blue-600" />Word
                            </button>
                            <button onClick={() => handleExport(s, 'pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <FileDown className="w-4 h-4 text-red-600" />PDF
                            </button>
                          </div>
                        )}
                      </div>
                      <Link href={`/simulados/${s.id}/gabarito`}>
                        <Button variant="ghost" size="sm" title="Gabarito QR">
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => iniciarCriacao(s)} title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} title="Excluir">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // RENDER: MODO CRIAÇÃO/EDIÇÃO DE SIMULADO
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={cancelarCriacao}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {editingSimulado ? 'Editar Simulado' : 'Novo Simulado'}
              </h1>
              <p className="text-sm text-gray-500 hidden sm:block">
                {questoesSelecionadas.length} questões selecionadas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="hidden sm:flex">
              <Eye className="w-4 h-4 mr-2" />
              Revisar
            </Button>
            <Button onClick={salvarSimulado} loading={saving}>
              <Check className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{editingSimulado ? 'Salvar' : 'Criar'}</span>
              <span className="sm:hidden">OK</span>
            </Button>
          </div>
        </div>
        
        {/* Barra de progresso */}
        <div className="h-1 bg-gray-200">
          <div 
            className={`h-1 transition-all ${questoesSelecionadas.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'}`}
            style={{ width: `${Math.min(questoesSelecionadas.length * 10, 100)}%` }}
          />
        </div>
      </div>

      {/* Erro */}
      {saveError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* ============================================ */}
        {/* COLUNA ESQUERDA: FILTROS E CONFIGURAÇÕES */}
        {/* ============================================ */}
        <div className="lg:w-80 lg:min-h-screen lg:border-r bg-white p-4 space-y-4">
          {/* Dados do Simulado */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dados do Simulado
            </h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Título *</label>
              <Input
                placeholder="Ex: Prova Bimestral - 6º Ano"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Descrição</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-gray-900 text-sm resize-none"
                rows={2}
                placeholder="Descrição opcional..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tempo (min)</label>
                <Input
                  type="number"
                  min={10}
                  value={formData.tempo_minutos}
                  onChange={(e) => setFormData({ ...formData, tempo_minutos: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Turmas</label>
                <Button 
                  variant="outline" 
                  className="w-full justify-between text-sm"
                  onClick={() => setShowTurmasModal(true)}
                >
                  <span>{formData.turmas_ids.length || 'Selecionar'}</span>
                  <Users className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.embaralhar_questoes}
                  onChange={(e) => setFormData({ ...formData, embaralhar_questoes: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Embaralhar questões</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.embaralhar_alternativas}
                  onChange={(e) => setFormData({ ...formData, embaralhar_alternativas: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Embaralhar alternativas</span>
              </label>
            </div>
          </div>

          <hr />

          {/* Filtros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </h3>
              {(filtros.ano_serie || filtros.dificuldade || filtros.fonte || filtros.habilidades_ids.length > 0) && (
                <button onClick={limparFiltros} className="text-xs text-indigo-600 hover:underline">
                  Limpar
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ano/Série</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900 text-sm"
                value={filtros.ano_serie}
                onChange={(e) => setFiltros({ ...filtros, ano_serie: e.target.value, habilidades_ids: [] })}
                disabled={filtros.fonte === 'TEMA'}
              >
                {ANO_SERIE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Dificuldade</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900 text-sm"
                value={filtros.dificuldade}
                onChange={(e) => setFiltros({ ...filtros, dificuldade: e.target.value })}
              >
                {DIFICULDADE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fonte</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900 text-sm"
                value={filtros.fonte}
                onChange={(e) => setFiltros({ ...filtros, fonte: e.target.value, habilidades_ids: [] })}
              >
                {FONTE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro avançado: Habilidades/Descritores/Temas */}
            <div>
              <button
                onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
                className="flex items-center justify-between w-full text-sm text-gray-700 hover:text-indigo-600"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {filtros.fonte === 'SAEB' ? 'Descritores' : filtros.fonte === 'TEMA' ? 'Temas' : 'Habilidades BNCC'}
                  {filtros.habilidades_ids.length > 0 && (
                    <Badge variant="info" className="text-xs">{filtros.habilidades_ids.length}</Badge>
                  )}
                </span>
                {showFiltrosAvancados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showFiltrosAvancados && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {filtros.fonte === 'SAEB' ? (
                    descritoresSaeb.map(d => (
                      <label key={d.codigo} className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filtros.habilidades_ids.includes(d.codigo)}
                          onChange={() => toggleHabilidade(d.codigo)}
                          className="rounded mt-0.5"
                        />
                        <span className="text-xs text-gray-900">
                          <strong>{d.codigo}</strong> - {d.descricao.substring(0, 50)}...
                        </span>
                      </label>
                    ))
                  ) : filtros.fonte === 'TEMA' ? (
                    temasDisponiveis.length > 0 ? temasDisponiveis.map(tema => (
                      <label key={tema} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filtros.habilidades_ids.includes(tema)}
                          onChange={() => toggleHabilidade(tema)}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-900">{tema}</span>
                      </label>
                    )) : (
                      <p className="text-xs text-gray-500 text-center py-2">Nenhum tema disponível</p>
                    )
                  ) : (
                    habilidadesFiltradas.map(h => (
                      <label key={h.id} className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filtros.habilidades_ids.includes(h.id)}
                          onChange={() => toggleHabilidade(h.id)}
                          className="rounded mt-0.5"
                        />
                        <span className="text-xs text-gray-900">
                          <strong>{h.codigo}</strong>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Buscar no enunciado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Palavra-chave..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <hr />

          {/* Ações rápidas */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Ações Rápidas
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => gerarAutomatico(5)} className="text-xs">
                +5
              </Button>
              <Button variant="outline" size="sm" onClick={() => gerarAutomatico(10)} className="text-xs">
                +10
              </Button>
              <Button variant="outline" size="sm" onClick={() => gerarAutomatico(15)} className="text-xs">
                +15
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              Adiciona questões aleatórias dos filtros atuais (30% fácil, 40% médio, 30% difícil)
            </p>
            
            {questoesSelecionadas.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => setQuestoesSelecionadas([])}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar seleção ({questoesSelecionadas.length})
              </Button>
            )}
          </div>

          {/* Estatísticas das selecionadas */}
          {questoesSelecionadas.length > 0 && (
            <>
              <hr />
              <div className="p-3 bg-indigo-50 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">Selecionadas: {stats.total}</h4>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-700">🟢 {stats.facil}</span>
                  <span className="text-yellow-700">🟡 {stats.medio}</span>
                  <span className="text-red-700">🔴 {stats.dificil}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ============================================ */}
        {/* COLUNA DIREITA: LISTA DE QUESTÕES */}
        {/* ============================================ */}
        <div className="flex-1 p-4">
          {/* Info */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              <strong>{questoesFiltradas.length}</strong> questões encontradas
            </p>
            <Button variant="ghost" size="sm" onClick={() => setFiltros({ ...filtros })}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Lista de questões */}
          <div className="space-y-3">
            {questoesFiltradas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">Nenhuma questão encontrada</h3>
                  <p className="text-sm text-gray-500">Tente ajustar os filtros</p>
                </CardContent>
              </Card>
            ) : (
              questoesFiltradas.map((q, idx) => {
                const selecionada = questoesSelecionadas.includes(q.id)
                const expandida = questaoExpandida === q.id
                const dif = getDificuldadeInfo(q.dificuldade)
                const hab = getHabilidadeCodigo(q)
                const indexNaSelecao = questoesSelecionadas.indexOf(q.id)
                
                return (
                  <Card 
                    key={q.id} 
                    className={`transition-all ${selecionada ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : 'hover:shadow-md'}`}
                  >
                    <CardContent className="p-0">
                      {/* Header do card */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleQuestao(q.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            selecionada ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                          }`}>
                            {selecionada && <Check className="w-4 h-4 text-white" />}
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                              <Badge variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'} className="text-xs">
                                {dif.emoji} {dif.label}
                              </Badge>
                              {hab && <Badge className="text-xs">{hab}</Badge>}
                              {selecionada && (
                                <Badge variant="info" className="text-xs">
                                  #{indexNaSelecao + 1}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Enunciado */}
                            <p className={`text-gray-900 ${expandida ? '' : 'line-clamp-3'}`}>
                              {q.enunciado}
                            </p>
                          </div>
                          
                          {/* Botão expandir */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setQuestaoExpandida(expandida ? null : q.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                          >
                            {expandida ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Alternativas (expandido) */}
                      {expandida && (
                        <div className="px-4 pb-4 pt-0 border-t bg-gray-50/50">
                          <div className="mt-3 space-y-2">
                            {['A', 'B', 'C', 'D', 'E'].map(letra => {
                              const alt = q[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string | undefined
                              if (!alt) return null
                              const correta = q.resposta_correta === letra
                              
                              return (
                                <div 
                                  key={letra}
                                  className={`flex items-start gap-2 p-2 rounded-lg ${
                                    correta ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <span className={`font-bold text-sm ${correta ? 'text-green-700' : 'text-gray-500'}`}>
                                    {letra})
                                  </span>
                                  <span className={`text-sm flex-1 ${correta ? 'text-green-800' : 'text-gray-700'}`}>
                                    {alt}
                                  </span>
                                  {correta && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Ações quando selecionada */}
                          {selecionada && (
                            <div className="mt-3 pt-3 border-t flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                Posição: {indexNaSelecao + 1} de {questoesSelecionadas.length}
                              </span>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); moverQuestao(indexNaSelecao, 'up') }}
                                  disabled={indexNaSelecao === 0}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); moverQuestao(indexNaSelecao, 'down') }}
                                  disabled={indexNaSelecao === questoesSelecionadas.length - 1}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); toggleQuestao(q.id) }}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* BARRA FLUTUANTE MOBILE */}
      {/* ============================================ */}
      {questoesSelecionadas.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{questoesSelecionadas.length} selecionadas</p>
              <p className="text-xs text-gray-500">
                🟢 {stats.facil} | 🟡 {stats.medio} | 🔴 {stats.dificil}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={salvarSimulado} loading={saving}>
                <Check className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: SELECIONAR TURMAS */}
      {/* ============================================ */}
      <Modal isOpen={showTurmasModal} onClose={() => setShowTurmasModal(false)} title="Selecionar Turmas" size="sm">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {turmas.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhuma turma cadastrada</p>
          ) : (
            turmas.map(turma => (
              <label 
                key={turma.id} 
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border"
              >
                <input
                  type="checkbox"
                  checked={formData.turmas_ids.includes(turma.id)}
                  onChange={() => toggleTurma(turma.id)}
                  className="rounded text-indigo-600"
                />
                <div>
                  <p className="font-medium text-gray-900">{turma.nome}</p>
                  <p className="text-sm text-gray-500">{turma.ano_serie}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button className="w-full" onClick={() => setShowTurmasModal(false)}>
            Confirmar ({formData.turmas_ids.length} selecionadas)
          </Button>
        </div>
      </Modal>

      {/* ============================================ */}
      {/* MODAL: PREVIEW DO SIMULADO */}
      {/* ============================================ */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Revisar Simulado" size="xl">
        <div className="space-y-4">
          {/* Info geral */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg text-gray-900">{formData.titulo || 'Sem título'}</h3>
            {formData.descricao && <p className="text-gray-600 text-sm mt-1">{formData.descricao}</p>}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="bg-white p-2 rounded text-center">
                <p className="text-xs text-gray-500">Questões</p>
                <p className="font-bold text-gray-900">{questoesSelecionadas.length}</p>
              </div>
              <div className="bg-white p-2 rounded text-center">
                <p className="text-xs text-gray-500">Tempo</p>
                <p className="font-bold text-gray-900">{formData.tempo_minutos}min</p>
              </div>
              <div className="bg-white p-2 rounded text-center">
                <p className="text-xs text-gray-500">Turmas</p>
                <p className="font-bold text-gray-900">{formData.turmas_ids.length || '-'}</p>
              </div>
              <div className="bg-white p-2 rounded text-center">
                <p className="text-xs text-gray-500">Média/questão</p>
                <p className="font-bold text-gray-900">
                  {questoesSelecionadas.length > 0 ? Math.round(formData.tempo_minutos / questoesSelecionadas.length) : 0}min
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-700">🟢 {stats.facil} fáceis</span>
              <span className="text-yellow-700">🟡 {stats.medio} médias</span>
              <span className="text-red-700">🔴 {stats.dificil} difíceis</span>
            </div>
          </div>
          
          {/* Lista de questões */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Ordem das Questões</h4>
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
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-gray-900 text-sm">Q{idx + 1}</span>
                        <Badge variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'} className="text-xs">
                          {dif.emoji}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                    </div>
                    <button 
                      onClick={() => toggleQuestao(id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button className="flex-1" onClick={salvarSimulado} loading={saving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {editingSimulado ? 'Salvar Alterações' : 'Criar Simulado'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
