'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Badge, Modal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Turma, Questao } from '@/types'
import { 
  ArrowLeft, Plus, Check, X, Search, Save, Upload, FileText, 
  BookOpen, PenLine, Eye, Image as ImageIcon, Trash2, GripVertical,
  ChevronUp, ChevronDown, Filter
} from 'lucide-react'

// Interfaces
interface UnidadeTematica { id: string; codigo: string; nome: string }
interface HabilidadeBncc { id: string; codigo: string; descricao: string; objeto_conhecimento: string }
interface DescritorSaeb { id: string; codigo: string; descricao: string; tema: string }
interface Contexto { id: string; codigo: string; nome: string }

interface QuestaoSelecionada {
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
  habilidade_bncc_id?: string
  descritor_saeb_id?: string
  imagem_url?: string
  origem: 'banco' | 'manual' | 'importada'
  tempId?: string // Para questões manuais ainda não salvas
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

export default function NovoSimuladoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { usuario } = useAuth()
  const supabase = createClient()

  // Estados gerais
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(editId ? 2 : 1)

  // Dados do formulário (Step 1)
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turma_id: '',
    tempo_minutos: 60,
    pontuacao_questao: 1.0,
    embaralhar_questoes: false,
    embaralhar_alternativas: false,
    cabecalho_escola: '',
    cabecalho_endereco: '',
  })

  // Step 2 - Questões
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<QuestaoSelecionada[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'banco' | 'manual' | 'importar'>('banco')

  // Aba Banco xyMath
  const [questoesBanco, setQuestoesBanco] = useState<Questao[]>([])
  const [loadingBanco, setLoadingBanco] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOpen, setFilterOpen] = useState(true)
  const [filters, setFilters] = useState({
    ano_serie: '',
    unidade_tematica_id: '',
    habilidade_bncc_id: '',
    descritor_saeb_id: '',
    dificuldade: '',
    contexto_id: ''
  })

  // Dados auxiliares para filtros
  const [unidadesTematicas, setUnidadesTematicas] = useState<UnidadeTematica[]>([])
  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [descritores, setDescritores] = useState<DescritorSaeb[]>([])
  const [contextos, setContextos] = useState<Contexto[]>([])

  // Aba Criar Manual
  const [questaoManual, setQuestaoManual] = useState({
    enunciado: '',
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    resposta_correta: 'A',
    dificuldade: 'medio',
    ano_serie: '6º ano EF',
    imagem_url: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // Modal de visualização
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingQuestao, setViewingQuestao] = useState<QuestaoSelecionada | null>(null)

  // Carregar dados auxiliares
  useEffect(() => {
    const loadAuxData = async () => {
      const [utRes, habRes, descRes, ctxRes] = await Promise.all([
        supabase.from('unidades_tematicas').select('*').order('ordem'),
        supabase.from('habilidades_bncc').select('*').order('codigo'),
        supabase.from('descritores_saeb').select('*').order('codigo'),
        supabase.from('contextos_questao').select('*').order('nome'),
      ])
      if (utRes.data) setUnidadesTematicas(utRes.data)
      if (habRes.data) setHabilidades(habRes.data)
      if (descRes.data) setDescritores(descRes.data)
      if (ctxRes.data) setContextos(ctxRes.data)
    }
    loadAuxData()
  }, [supabase])

  // Carregar turmas e simulado (se editando)
  const fetchData = useCallback(async () => {
    if (!usuario?.id) return
    setLoading(true)
    try {
      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
      setTurmas(turmasData || [])

      // Se editando, carregar simulado existente
      if (editId) {
        const { data: simulado } = await supabase
          .from('simulados')
          .select('*')
          .eq('id', editId)
          .eq('usuario_id', usuario.id)
          .single()

        if (simulado) {
          setFormData({
            titulo: simulado.titulo,
            descricao: simulado.descricao || '',
            turma_id: simulado.turma_id || '',
            tempo_minutos: simulado.tempo_minutos || 60,
            pontuacao_questao: simulado.configuracoes?.pontuacao_questao || 1.0,
            embaralhar_questoes: simulado.configuracoes?.embaralhar_questoes ?? false,
            embaralhar_alternativas: simulado.configuracoes?.embaralhar_alternativas ?? false,
            cabecalho_escola: simulado.configuracoes?.cabecalho_escola || '',
            cabecalho_endereco: simulado.configuracoes?.cabecalho_endereco || '',
          })

          // Carregar questões selecionadas
          if (simulado.questoes_ids && simulado.questoes_ids.length > 0) {
            const { data: questoesData } = await supabase
              .from('questoes')
              .select('*')
              .in('id', simulado.questoes_ids)

            if (questoesData) {
              const questoesOrdenadas = simulado.questoes_ids
                .map((id: string) => {
                  const q = questoesData.find(q => q.id === id)
                  if (q) return { ...q, origem: q.usuario_id ? 'manual' : 'banco' } as QuestaoSelecionada
                  return null
                })
                .filter(Boolean) as QuestaoSelecionada[]
              setQuestoesSelecionadas(questoesOrdenadas)
            }
          }

          // Se não tem questões, vai pro step 2
          if (!simulado.questoes_ids || simulado.questoes_ids.length === 0) {
            setStep(2)
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, editId])

  useEffect(() => { fetchData() }, [fetchData])

  // Buscar questões do banco
  const fetchQuestoesBanco = useCallback(async () => {
    setLoadingBanco(true)
    try {
      let query = supabase
        .from('questoes')
        .select('*')
        .eq('ativa', true)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters.ano_serie) query = query.eq('ano_serie', filters.ano_serie)
      if (filters.dificuldade) query = query.eq('dificuldade', filters.dificuldade)
      if (filters.unidade_tematica_id) query = query.eq('unidade_tematica_id', filters.unidade_tematica_id)
      if (filters.habilidade_bncc_id) query = query.eq('habilidade_bncc_id', filters.habilidade_bncc_id)
      if (filters.descritor_saeb_id) query = query.eq('descritor_saeb_id', filters.descritor_saeb_id)
      if (filters.contexto_id) query = query.eq('contexto_id', filters.contexto_id)

      const { data, error } = await query
      if (error) throw error
      setQuestoesBanco(data || [])
    } catch (error) {
      console.error('Erro ao buscar questões:', error)
    } finally {
      setLoadingBanco(false)
    }
  }, [supabase, filters])

  useEffect(() => {
    if (step === 2 && abaAtiva === 'banco') {
      fetchQuestoesBanco()
    }
  }, [step, abaAtiva, fetchQuestoesBanco])

  // Filtrar questões por busca
  const questoesFiltradas = questoesBanco.filter(q =>
    q.enunciado.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas
  const stats = {
    total: questoesBanco.length,
    faceis: questoesBanco.filter(q => q.dificuldade === 'facil').length,
    medias: questoesBanco.filter(q => q.dificuldade === 'medio').length,
    dificeis: questoesBanco.filter(q => q.dificuldade === 'dificil').length,
  }

  // Toggle questão selecionada
  const toggleQuestao = (questao: Questao) => {
    const jaExiste = questoesSelecionadas.find(q => q.id === questao.id)
    if (jaExiste) {
      setQuestoesSelecionadas(prev => prev.filter(q => q.id !== questao.id))
    } else {
      setQuestoesSelecionadas(prev => [...prev, {
        ...questao,
        origem: 'banco' as const
      }])
    }
  }

  // Adicionar questão manual
  const adicionarQuestaoManual = () => {
    if (!questaoManual.enunciado || !questaoManual.alternativa_a || !questaoManual.alternativa_b) {
      alert('Preencha o enunciado e pelo menos as alternativas A e B')
      return
    }

    const novaQuestao: QuestaoSelecionada = {
      id: '', // Será preenchido ao salvar
      tempId: `temp_${Date.now()}`,
      enunciado: questaoManual.enunciado,
      alternativa_a: questaoManual.alternativa_a,
      alternativa_b: questaoManual.alternativa_b,
      alternativa_c: questaoManual.alternativa_c,
      alternativa_d: questaoManual.alternativa_d,
      alternativa_e: questaoManual.alternativa_e,
      resposta_correta: questaoManual.resposta_correta,
      dificuldade: questaoManual.dificuldade,
      ano_serie: questaoManual.ano_serie,
      imagem_url: questaoManual.imagem_url,
      origem: 'manual'
    }

    setQuestoesSelecionadas(prev => [...prev, novaQuestao])

    // Limpar formulário
    setQuestaoManual({
      enunciado: '',
      alternativa_a: '',
      alternativa_b: '',
      alternativa_c: '',
      alternativa_d: '',
      alternativa_e: '',
      resposta_correta: 'A',
      dificuldade: 'medio',
      ano_serie: '6º ano EF',
      imagem_url: ''
    })
  }

  // Upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !usuario?.id) return

    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${usuario.id}/${Date.now()}.${fileExt}`
      const filePath = `questoes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      setQuestaoManual(prev => ({ ...prev, imagem_url: publicUrl }))
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload da imagem')
    } finally {
      setUploadingImage(false)
    }
  }

  // Remover questão selecionada
  const removerQuestao = (index: number) => {
    setQuestoesSelecionadas(prev => prev.filter((_, i) => i !== index))
  }

  // Mover questão
  const moverQuestao = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...questoesSelecionadas]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
    setQuestoesSelecionadas(newOrder)
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      ano_serie: '',
      unidade_tematica_id: '',
      habilidade_bncc_id: '',
      descritor_saeb_id: '',
      dificuldade: '',
      contexto_id: ''
    })
  }

  // Obter nome/código dos dados auxiliares
  const getHabilidadeCodigo = (id?: string) => id ? habilidades.find(h => h.id === id)?.codigo : null
  const getDescritorCodigo = (id?: string) => id ? descritores.find(d => d.id === id)?.codigo : null

  // Salvar simulado
  const handleSave = async (status: 'rascunho' | 'publicado' = 'rascunho') => {
    if (!usuario?.id || !formData.titulo || questoesSelecionadas.length === 0) return
    setSaving(true)

    try {
      // Primeiro, salvar questões manuais no banco
      const questoesParaSalvar = questoesSelecionadas.filter(q => q.origem === 'manual' && !q.id)
      const questoesIdsFinais: string[] = []

      for (const q of questoesSelecionadas) {
        if (q.origem === 'manual' && !q.id) {
          // Salvar questão manual
          const { data: novaQuestao, error } = await supabase
            .from('questoes')
            .insert({
              usuario_id: usuario.id,
              enunciado: q.enunciado,
              alternativa_a: q.alternativa_a,
              alternativa_b: q.alternativa_b,
              alternativa_c: q.alternativa_c,
              alternativa_d: q.alternativa_d,
              alternativa_e: q.alternativa_e || null,
              resposta_correta: q.resposta_correta,
              dificuldade: q.dificuldade,
              ano_serie: q.ano_serie,
              imagem_url: q.imagem_url || null,
              ativa: true
            })
            .select()
            .single()

          if (error) throw error
          questoesIdsFinais.push(novaQuestao.id)
        } else {
          questoesIdsFinais.push(q.id)
        }
      }

      const simuladoData = {
        usuario_id: usuario.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        turma_id: formData.turma_id || null,
        tempo_minutos: formData.tempo_minutos,
        questoes_ids: questoesIdsFinais,
        configuracoes: {
          embaralhar_questoes: formData.embaralhar_questoes,
          embaralhar_alternativas: formData.embaralhar_alternativas,
          pontuacao_questao: formData.pontuacao_questao,
          cabecalho_escola: formData.cabecalho_escola,
          cabecalho_endereco: formData.cabecalho_endereco,
        },
        status,
      }

      if (editId) {
        await supabase.from('simulados').update(simuladoData).eq('id', editId)
        router.push(`/simulados/${editId}`)
      } else {
        const { data } = await supabase.from('simulados').insert(simuladoData).select().single()
        if (data) router.push(`/simulados/${data.id}`)
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar simulado')
    } finally {
      setSaving(false)
    }
  }

  // Calcular totais
  const totalPontos = questoesSelecionadas.length * formData.pontuacao_questao
  const turmaSelected = turmas.find(t => t.id === formData.turma_id)
  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  // Contagem por origem
  const questoesPorOrigem = {
    banco: questoesSelecionadas.filter(q => q.origem === 'banco').length,
    manual: questoesSelecionadas.filter(q => q.origem === 'manual').length,
    importada: questoesSelecionadas.filter(q => q.origem === 'importada').length,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/simulados" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold">{editId ? 'Editar Simulado' : 'Novo Simulado'}</h1>
        {editId && formData.titulo && (
          <p className="text-gray-600 mt-1">{formData.titulo}</p>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: 'Informações' },
          { num: 2, label: 'Questões' },
          { num: 3, label: 'Revisão' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => setStep(s.num)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                step === s.num ? 'bg-indigo-600 text-white' : step > s.num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </button>
            <span className={`ml-2 font-medium ${step === s.num ? 'text-indigo-600' : 'text-gray-500'}`}>{s.label}</span>
            {i < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Informações */}
      {step === 1 && (
        <Card variant="bordered">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Input
                label="Título do Simulado *"
                placeholder="Ex: Avaliação Diagnóstica - 1º Bimestre"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma (opcional)</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.turma_id}
                  onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Objetivo</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Descreva o objetivo deste simulado..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Input
                label="Tempo (minutos)"
                type="number"
                value={formData.tempo_minutos}
                onChange={(e) => setFormData({ ...formData, tempo_minutos: parseInt(e.target.value) || 60 })}
              />
              <Input
                label="Pontos por questão"
                type="number"
                step="0.1"
                value={formData.pontuacao_questao}
                onChange={(e) => setFormData({ ...formData, pontuacao_questao: parseFloat(e.target.value) || 1 })}
              />
              <div className="flex flex-col justify-end">
                <p className="text-sm text-gray-600">Total estimado:</p>
                <p className="text-xl font-bold text-indigo-600">{totalPontos.toFixed(1)} pontos</p>
                <p className="text-xs text-gray-500">({questoesSelecionadas.length} questões)</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Cabeçalho do Documento</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Nome da Escola"
                  placeholder="Ex: Escola Municipal João da Silva"
                  value={formData.cabecalho_escola}
                  onChange={(e) => setFormData({ ...formData, cabecalho_escola: e.target.value })}
                />
                <Input
                  label="Endereço"
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  value={formData.cabecalho_endereco}
                  onChange={(e) => setFormData({ ...formData, cabecalho_endereco: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!formData.titulo}>
                Próximo: Selecionar Questões
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questões */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Abas */}
          <div className="flex border-b">
            <button
              onClick={() => setAbaAtiva('banco')}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
                abaAtiva === 'banco' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Banco xyMath
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{stats.total}</span>
            </button>
            <button
              onClick={() => setAbaAtiva('manual')}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
                abaAtiva === 'manual' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenLine className="w-5 h-5" />
              Criar Manual
            </button>
            <button
              onClick={() => setAbaAtiva('importar')}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
                abaAtiva === 'importar' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-5 h-5" />
              Importar Arquivo
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Coluna da esquerda: Conteúdo da aba */}
            <div className="lg:col-span-2">
              {/* Aba Banco xyMath */}
              {abaAtiva === 'banco' && (
                <Card variant="bordered">
                  <CardContent className="p-4">
                    {/* Busca e Filtros */}
                    <div className="space-y-4 mb-4">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Buscar questões..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button 
                          variant={filterOpen ? 'primary' : 'outline'} 
                          onClick={() => setFilterOpen(!filterOpen)}
                        >
                          <Filter className="w-4 h-4 mr-2" />
                          Filtros
                          {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">
                              {activeFiltersCount}
                            </span>
                          )}
                        </Button>
                      </div>

                      {/* Filtros expandidos */}
                      {filterOpen && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.ano_serie}
                                onChange={(e) => setFilters({ ...filters, ano_serie: e.target.value })}
                              >
                                <option value="">Todos</option>
                                {ANO_SERIE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Temática</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.unidade_tematica_id}
                                onChange={(e) => setFilters({ ...filters, unidade_tematica_id: e.target.value })}
                              >
                                <option value="">Todas</option>
                                {unidadesTematicas.map(ut => (
                                  <option key={ut.id} value={ut.id}>{ut.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.dificuldade}
                                onChange={(e) => setFilters({ ...filters, dificuldade: e.target.value })}
                              >
                                <option value="">Todas</option>
                                {DIFICULDADE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Habilidade BNCC</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.habilidade_bncc_id}
                                onChange={(e) => setFilters({ ...filters, habilidade_bncc_id: e.target.value })}
                              >
                                <option value="">Todas</option>
                                {habilidades.map(h => (
                                  <option key={h.id} value={h.id}>{h.codigo}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Descritor SAEB</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.descritor_saeb_id}
                                onChange={(e) => setFilters({ ...filters, descritor_saeb_id: e.target.value })}
                              >
                                <option value="">Todos</option>
                                {descritores.map(d => (
                                  <option key={d.id} value={d.id}>{d.codigo}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contexto</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.contexto_id}
                                onChange={(e) => setFilters({ ...filters, contexto_id: e.target.value })}
                              >
                                <option value="">Todos</option>
                                {contextos.map(c => (
                                  <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              <X className="w-4 h-4 mr-1" /> Limpar filtros
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600">Fáceis</p>
                        <p className="text-lg font-bold text-green-600">{stats.faceis}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600">Médias</p>
                        <p className="text-lg font-bold text-yellow-600">{stats.medias}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600">Difíceis</p>
                        <p className="text-lg font-bold text-red-600">{stats.dificeis}</p>
                      </div>
                    </div>

                    {/* Lista de questões */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {loadingBanco ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                          <p className="mt-2 text-gray-600">Carregando questões...</p>
                        </div>
                      ) : questoesFiltradas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>Nenhuma questão encontrada</p>
                          <p className="text-sm">Ajuste os filtros para ver mais questões</p>
                        </div>
                      ) : (
                        questoesFiltradas.map(q => {
                          const isSelected = questoesSelecionadas.some(qs => qs.id === q.id)
                          return (
                            <div
                              key={q.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' 
                                  : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleQuestao(q)}
                                  className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                                    isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                  }`}
                                >
                                  {isSelected && <Check className="w-4 h-4 text-white" />}
                                </button>
                                <div className="flex-1 min-w-0" onClick={() => toggleQuestao(q)}>
                                  <div className="flex gap-1 mb-1 flex-wrap">
                                    <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                                    <Badge 
                                      variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'} 
                                      className="text-xs"
                                    >
                                      {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
                                    </Badge>
                                    {getHabilidadeCodigo(q.habilidade_bncc_id) && (
                                      <Badge className="text-xs">{getHabilidadeCodigo(q.habilidade_bncc_id)}</Badge>
                                    )}
                                    {getDescritorCodigo(q.descritor_saeb_id) && (
                                      <Badge className="text-xs">{getDescritorCodigo(q.descritor_saeb_id)}</Badge>
                                    )}
                                    {q.imagem_url && (
                                      <Badge variant="info" className="text-xs">
                                        <ImageIcon className="w-3 h-3 mr-1" />Imagem
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 line-clamp-2">{q.enunciado}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setViewingQuestao({ ...q, origem: 'banco' })
                                    setViewModalOpen(true)
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aba Criar Manual */}
              {abaAtiva === 'manual' && (
                <Card variant="bordered">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <PenLine className="w-5 h-5" />
                      Criar Questão Manual
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={questaoManual.ano_serie}
                          onChange={(e) => setQuestaoManual({ ...questaoManual, ano_serie: e.target.value })}
                        >
                          {ANO_SERIE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={questaoManual.dificuldade}
                          onChange={(e) => setQuestaoManual({ ...questaoManual, dificuldade: e.target.value })}
                        >
                          {DIFICULDADE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado *</label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        rows={4}
                        placeholder="Digite o enunciado da questão..."
                        value={questaoManual.enunciado}
                        onChange={(e) => setQuestaoManual({ ...questaoManual, enunciado: e.target.value })}
                      />
                    </div>

                    {/* Upload de imagem */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem (opcional)</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {uploadingImage ? 'Enviando...' : 'Selecionar imagem'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                        {questaoManual.imagem_url && (
                          <div className="flex items-center gap-2">
                            <img src={questaoManual.imagem_url} alt="Preview" className="h-12 rounded border" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setQuestaoManual({ ...questaoManual, imagem_url: '' })}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternativas */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Alternativas *</label>
                      {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                        <div key={letra} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQuestaoManual({ ...questaoManual, resposta_correta: letra })}
                            className={`w-10 h-10 rounded-full font-medium flex items-center justify-center ${
                              questaoManual.resposta_correta === letra 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {letra}
                          </button>
                          <Input
                            placeholder={`Alternativa ${letra}${letra === 'E' ? ' (opcional)' : ''}`}
                            value={questaoManual[`alternativa_${letra.toLowerCase()}` as keyof typeof questaoManual] as string}
                            onChange={(e) => setQuestaoManual({ 
                              ...questaoManual, 
                              [`alternativa_${letra.toLowerCase()}`]: e.target.value 
                            })}
                            className="flex-1"
                          />
                          {questaoManual.resposta_correta === letra && (
                            <span className="text-green-600 text-sm font-medium">✓ Correta</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={adicionarQuestaoManual}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar ao Simulado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aba Importar Arquivo */}
              {abaAtiva === 'importar' && (
                <Card variant="bordered">
                  <CardContent className="p-4">
                    <div className="text-center py-12">
                      <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Importar Arquivo</h3>
                      <p className="text-gray-600 mb-6">
                        Em breve! Você poderá fazer upload de arquivos Word ou PDF e a IA extrairá as questões automaticamente.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                        <FileText className="w-5 h-5" />
                        Funcionalidade em desenvolvimento
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna da direita: Questões selecionadas */}
            <div className="lg:col-span-1">
              <Card variant="bordered" className="sticky top-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Selecionadas ({questoesSelecionadas.length})</h3>
                    <span className="text-sm text-indigo-600 font-medium">{totalPontos.toFixed(1)} pts</span>
                  </div>

                  {/* Contagem por origem */}
                  {questoesSelecionadas.length > 0 && (
                    <div className="flex gap-2 mb-4 text-xs">
                      {questoesPorOrigem.banco > 0 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          📚 {questoesPorOrigem.banco}
                        </span>
                      )}
                      {questoesPorOrigem.manual > 0 && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✏️ {questoesPorOrigem.manual}
                        </span>
                      )}
                      {questoesPorOrigem.importada > 0 && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          📄 {questoesPorOrigem.importada}
                        </span>
                      )}
                    </div>
                  )}

                  {questoesSelecionadas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma questão selecionada</p>
                      <p className="text-sm">Selecione questões nas abas ao lado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {questoesSelecionadas.map((q, index) => (
                        <div key={q.id || q.tempId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moverQuestao(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moverQuestao(index, 'down')}
                              disabled={index === questoesSelecionadas.length - 1}
                              className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 line-clamp-1">{q.enunciado}</p>
                            <div className="flex gap-1 mt-0.5">
                              <span className={`text-xs px-1.5 rounded ${
                                q.origem === 'banco' ? 'bg-blue-100 text-blue-700' :
                                q.origem === 'manual' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {q.origem === 'banco' ? '📚' : q.origem === 'manual' ? '✏️' : '📄'}
                              </span>
                              <Badge 
                                variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'} 
                                className="text-xs"
                              >
                                {q.dificuldade === 'facil' ? 'F' : q.dificuldade === 'medio' ? 'M' : 'D'}
                              </Badge>
                            </div>
                          </div>
                          <button
                            onClick={() => removerQuestao(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botões de navegação */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={questoesSelecionadas.length === 0}>
              Próximo: Revisão
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Revisão */}
      {step === 3 && (
        <Card variant="bordered">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-6">Revisão do Simulado</h3>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Título</p>
                  <p className="font-medium text-lg">{formData.titulo}</p>
                </div>
                {formData.descricao && (
                  <div>
                    <p className="text-sm text-gray-500">Descrição</p>
                    <p className="text-gray-700">{formData.descricao}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Turma</p>
                  <p className="font-medium">{turmaSelected ? `${turmaSelected.nome} - ${turmaSelected.ano_serie}` : 'Não definida'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tempo</p>
                    <p className="font-medium">{formData.tempo_minutos} minutos</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pontuação</p>
                    <p className="font-medium">{formData.pontuacao_questao} pts/questão</p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-6">
                <h4 className="font-semibold text-indigo-900 mb-4">Resumo</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Total de questões:</span>
                    <span className="font-semibold text-indigo-900">{questoesSelecionadas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Pontuação total:</span>
                    <span className="font-semibold text-indigo-900">{totalPontos.toFixed(1)} pontos</span>
                  </div>
                  <hr className="border-indigo-200" />
                  <div className="flex justify-between">
                    <span className="text-indigo-700">📚 Banco xyMath:</span>
                    <span className="font-semibold">{questoesPorOrigem.banco}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">✏️ Manuais:</span>
                    <span className="font-semibold">{questoesPorOrigem.manual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">📄 Importadas:</span>
                    <span className="font-semibold">{questoesPorOrigem.importada}</span>
                  </div>
                  <hr className="border-indigo-200" />
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Fáceis:</span>
                    <span className="font-semibold">{questoesSelecionadas.filter(q => q.dificuldade === 'facil').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Médias:</span>
                    <span className="font-semibold">{questoesSelecionadas.filter(q => q.dificuldade === 'medio').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Difíceis:</span>
                    <span className="font-semibold">{questoesSelecionadas.filter(q => q.dificuldade === 'dificil').length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h4 className="font-semibold mb-4">Questões ({questoesSelecionadas.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questoesSelecionadas.map((q, i) => (
                  <div key={q.id || q.tempId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">{i + 1}</span>
                    <span className={`text-xs px-1.5 rounded ${
                      q.origem === 'banco' ? 'bg-blue-100 text-blue-700' :
                      q.origem === 'manual' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {q.origem === 'banco' ? '📚' : q.origem === 'manual' ? '✏️' : '📄'}
                    </span>
                    <p className="flex-1 text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                    <Badge 
                      variant={q.dificuldade === 'facil' ? 'success' : q.dificuldade === 'medio' ? 'warning' : 'danger'} 
                      className="text-xs"
                    >
                      {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleSave('rascunho')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />Salvar Rascunho
                </Button>
                <Button onClick={() => handleSave('publicado')} loading={saving}>
                  Publicar Simulado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Visualização */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Visualizar Questão" size="lg">
        {viewingQuestao && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{viewingQuestao.ano_serie}</Badge>
              <Badge 
                variant={viewingQuestao.dificuldade === 'facil' ? 'success' : viewingQuestao.dificuldade === 'medio' ? 'warning' : 'danger'}
              >
                {viewingQuestao.dificuldade === 'facil' ? 'Fácil' : viewingQuestao.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
              </Badge>
              {getHabilidadeCodigo(viewingQuestao.habilidade_bncc_id) && (
                <Badge>{getHabilidadeCodigo(viewingQuestao.habilidade_bncc_id)}</Badge>
              )}
              {getDescritorCodigo(viewingQuestao.descritor_saeb_id) && (
                <Badge>{getDescritorCodigo(viewingQuestao.descritor_saeb_id)}</Badge>
              )}
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-gray-900">{viewingQuestao.enunciado}</p>
              {viewingQuestao.imagem_url && (
                <div className="mt-4">
                  <img src={viewingQuestao.imagem_url} alt="Imagem da questão" className="max-w-full rounded-lg border" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                const alt = viewingQuestao[`alternativa_${letra.toLowerCase()}` as keyof QuestaoSelecionada] as string
                if (!alt) return null
                const isCorrect = viewingQuestao.resposta_correta === letra
                return (
                  <div key={letra} className={`p-3 rounded-lg border-2 ${isCorrect ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'}`}>
                    <span className={`font-bold ${isCorrect ? 'text-green-800' : 'text-gray-900'}`}>{letra})</span>
                    <span className={`ml-2 ${isCorrect ? 'text-green-800' : 'text-gray-900'}`}>{alt}</span>
                    {isCorrect && <span className="ml-2 text-green-700 text-sm font-medium">✓ Correta</span>}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setViewModalOpen(false)}>Fechar</Button>
              <Button 
                className="flex-1" 
                onClick={() => {
                  if (!questoesSelecionadas.some(q => q.id === viewingQuestao.id)) {
                    setQuestoesSelecionadas(prev => [...prev, viewingQuestao])
                  }
                  setViewModalOpen(false)
                }}
                disabled={questoesSelecionadas.some(q => q.id === viewingQuestao.id)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {questoesSelecionadas.some(q => q.id === viewingQuestao.id) ? 'Já Adicionada' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
