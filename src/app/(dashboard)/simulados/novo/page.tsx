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
  tempId?: string
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

  // Dados do formulário (Step 1) - REMOVIDO tempo_minutos
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turmas_ids: [] as string[], // MUDOU: agora é array para múltiplas turmas
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
  
  // MUDOU: filtros agora suportam múltipla seleção para habilidade e descritor
  const [filters, setFilters] = useState({
    ano_serie: '',
    unidade_tematica_id: '',
    habilidades_bncc_ids: [] as string[], // MUDOU: array
    descritores_saeb_ids: [] as string[], // MUDOU: array
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
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
      setTurmas(turmasData || [])

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
            turmas_ids: simulado.turmas_ids || (simulado.turma_id ? [simulado.turma_id] : []),
            pontuacao_questao: simulado.configuracoes?.pontuacao_questao || 1.0,
            embaralhar_questoes: simulado.configuracoes?.embaralhar_questoes ?? false,
            embaralhar_alternativas: simulado.configuracoes?.embaralhar_alternativas ?? false,
            cabecalho_escola: simulado.configuracoes?.cabecalho_escola || '',
            cabecalho_endereco: simulado.configuracoes?.cabecalho_endereco || '',
          })

          if (simulado.questoes_ids && simulado.questoes_ids.length > 0) {
            const { data: questoesData } = await supabase
              .from('questoes')
              .select('*')
              .in('id', simulado.questoes_ids)

            if (questoesData) {
              const questoesOrdenadas = simulado.questoes_ids
                .map((id: string) => {
                  const q = questoesData.find(q => q.id === id)
                  if (q) return { ...q, origem: 'banco' as const }
                  return null
                })
                .filter(Boolean) as QuestaoSelecionada[]
              setQuestoesSelecionadas(questoesOrdenadas)
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, editId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])// Buscar questões do banco com filtros - ATUALIZADO para múltiplos filtros
  const buscarQuestoes = useCallback(async () => {
    setLoadingBanco(true)
    try {
      let query = supabase
        .from('questoes')
        .select('*')
        .eq('ativa', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filters.ano_serie) {
        query = query.eq('ano_serie', filters.ano_serie)
      }
      if (filters.unidade_tematica_id) {
        query = query.eq('unidade_tematica_id', filters.unidade_tematica_id)
      }
      // MUDOU: suporta múltiplas habilidades
      if (filters.habilidades_bncc_ids.length > 0) {
        query = query.in('habilidade_bncc_id', filters.habilidades_bncc_ids)
      }
      // MUDOU: suporta múltiplos descritores
      if (filters.descritores_saeb_ids.length > 0) {
        query = query.in('descritor_saeb_id', filters.descritores_saeb_ids)
      }
      if (filters.dificuldade) {
        query = query.eq('dificuldade', filters.dificuldade)
      }
      if (filters.contexto_id) {
        query = query.eq('contexto_id', filters.contexto_id)
      }
      if (searchTerm) {
        query = query.ilike('enunciado', `%${searchTerm}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setQuestoesBanco(data || [])
    } catch (err) {
      console.error('Erro ao buscar questões:', err)
    } finally {
      setLoadingBanco(false)
    }
  }, [supabase, filters, searchTerm])

  useEffect(() => {
    if (abaAtiva === 'banco') {
      buscarQuestoes()
    }
  }, [abaAtiva, buscarQuestoes])

  // Toggle turma selecionada (múltiplas turmas)
  const toggleTurma = (turmaId: string) => {
    setFormData(prev => ({
      ...prev,
      turmas_ids: prev.turmas_ids.includes(turmaId)
        ? prev.turmas_ids.filter(id => id !== turmaId)
        : [...prev.turmas_ids, turmaId]
    }))
  }

  // Toggle habilidade no filtro (múltipla seleção)
  const toggleHabilidadeFilter = (habId: string) => {
    setFilters(prev => ({
      ...prev,
      habilidades_bncc_ids: prev.habilidades_bncc_ids.includes(habId)
        ? prev.habilidades_bncc_ids.filter(id => id !== habId)
        : [...prev.habilidades_bncc_ids, habId]
    }))
  }

  // Toggle descritor no filtro (múltipla seleção)
  const toggleDescritorFilter = (descId: string) => {
    setFilters(prev => ({
      ...prev,
      descritores_saeb_ids: prev.descritores_saeb_ids.includes(descId)
        ? prev.descritores_saeb_ids.filter(id => id !== descId)
        : [...prev.descritores_saeb_ids, descId]
    }))
  }

  // Helpers
  const getHabilidadeCodigo = (id?: string) => {
    if (!id) return ''
    return habilidades.find(h => h.id === id)?.codigo || ''
  }

  const getDescritorCodigo = (id?: string) => {
    if (!id) return ''
    return descritores.find(d => d.id === id)?.codigo || ''
  }

  // Adicionar questão do banco
  const addQuestaoFromBanco = (questao: Questao) => {
    if (questoesSelecionadas.some(q => q.id === questao.id)) return
    setQuestoesSelecionadas(prev => [...prev, { ...questao, origem: 'banco' }])
  }

  // Remover questão
  const removeQuestao = (index: number) => {
    setQuestoesSelecionadas(prev => prev.filter((_, i) => i !== index))
  }

  // Mover questão
  const moveQuestao = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === questoesSelecionadas.length - 1) return
    
    const newList = [...questoesSelecionadas]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newList[index], newList[newIndex]] = [newList[newIndex], newList[index]]
    setQuestoesSelecionadas(newList)
  }

  // Upload de imagem
  const handleImageUpload = async (file: File) => {
    if (!file || !usuario?.id) return
    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${usuario.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('questoes-imagens')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('questoes-imagens')
        .getPublicUrl(fileName)

      setQuestaoManual(prev => ({ ...prev, imagem_url: publicUrl }))
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao fazer upload da imagem')
    } finally {
      setUploadingImage(false)
    }
  }

  // Adicionar questão manual
  const addQuestaoManual = () => {
    if (!questaoManual.enunciado || !questaoManual.alternativa_a || 
        !questaoManual.alternativa_b || !questaoManual.alternativa_c || 
        !questaoManual.alternativa_d) {
      alert('Preencha o enunciado e as alternativas A, B, C e D')
      return
    }

    const novaQuestao: QuestaoSelecionada = {
      id: '',
      tempId: `manual_${Date.now()}`,
      ...questaoManual,
      origem: 'manual'
    }

    setQuestoesSelecionadas(prev => [...prev, novaQuestao])
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

  // Salvar simulado - ATUALIZADO para múltiplas turmas
  const handleSave = async (status: 'rascunho' | 'publicado') => {
    if (!usuario?.id) return
    if (!formData.titulo) {
      alert('Informe o título do simulado')
      return
    }
    if (questoesSelecionadas.length === 0) {
      alert('Adicione pelo menos uma questão')
      return
    }

    setSaving(true)
    try {
      // Salvar questões manuais primeiro
      const questoesParaSalvar = []
      for (const q of questoesSelecionadas) {
        if (q.origem === 'manual' && !q.id) {
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
              origem: 'manual',
              ativa: true
            })
            .select()
            .single()

          if (error) throw error
          questoesParaSalvar.push(novaQuestao.id)
        } else {
          questoesParaSalvar.push(q.id)
        }
      }

      // Montar gabarito
      const gabarito = questoesSelecionadas.map(q => q.resposta_correta)

      const simuladoData = {
        usuario_id: usuario.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        turmas_ids: formData.turmas_ids, // MUDOU: array de turmas
        turma_id: formData.turmas_ids[0] || null, // Mantém compatibilidade
        questoes_ids: questoesParaSalvar,
        gabarito: gabarito,
        total_questoes: questoesParaSalvar.length,
        status,
        configuracoes: {
          pontuacao_questao: formData.pontuacao_questao,
          embaralhar_questoes: formData.embaralhar_questoes,
          embaralhar_alternativas: formData.embaralhar_alternativas,
          cabecalho_escola: formData.cabecalho_escola,
          cabecalho_endereco: formData.cabecalho_endereco,
        }
      }

      if (editId) {
        const { error } = await supabase
          .from('simulados')
          .update(simuladoData)
          .eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('simulados')
          .insert(simuladoData)
        if (error) throw error
      }

      router.push('/simulados')
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar simulado')
    } finally {
      setSaving(false)
    }
  }

  // Limpar filtros
  const limparFiltros = () => {
    setFilters({
      ano_serie: '',
      unidade_tematica_id: '',
      habilidades_bncc_ids: [],
      descritores_saeb_ids: [],
      dificuldade: '',
      contexto_id: ''
    })
    setSearchTerm('')
  }

  // Estatísticas
  const stats = {
    total: questoesBanco.length,
    faceis: questoesBanco.filter(q => q.dificuldade === 'facil').length,
    medias: questoesBanco.filter(q => q.dificuldade === 'medio').length,
    dificeis: questoesBanco.filter(q => q.dificuldade === 'dificil').length,
  }

  const totalPontos = questoesSelecionadas.length * formData.pontuacao_questao

  const questoesPorOrigem = {
    banco: questoesSelecionadas.filter(q => q.origem === 'banco').length,
    manual: questoesSelecionadas.filter(q => q.origem === 'manual').length,
    importada: questoesSelecionadas.filter(q => q.origem === 'importada').length,
  }

  const activeFiltersCount = [
    filters.ano_serie,
    filters.unidade_tematica_id,
    filters.dificuldade,
    filters.contexto_id,
    ...filters.habilidades_bncc_ids,
    ...filters.descritores_saeb_ids
  ].filter(Boolean).length

  const turmasSelected = turmas.filter(t => formData.turmas_ids.includes(t.id))

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/simulados" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'Editar Simulado' : 'Novo Simulado'}
          </h1>
          <p className="text-gray-600">
            {step === 1 && 'Configure as informações básicas'}
            {step === 2 && 'Selecione as questões'}
            {step === 3 && 'Revise e publique'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
              step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Informações Básicas - ATUALIZADO */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos por questão
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.pontuacao_questao}
                  onChange={(e) => setFormData({ ...formData, pontuacao_questao: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Seleção de Múltiplas Turmas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turmas (selecione uma ou mais)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {turmas.map(turma => (
                  <label
                    key={turma.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.turmas_ids.includes(turma.id)
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.turmas_ids.includes(turma.id)}
                      onChange={() => toggleTurma(turma.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{turma.nome}</p>
                      <p className="text-xs text-gray-500">{turma.ano_serie}</p>
                    </div>
                  </label>
                ))}
              </div>
              {formData.turmas_ids.length > 0 && (
                <p className="mt-2 text-sm text-indigo-600">
                  {formData.turmas_ids.length} turma(s) selecionada(s)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Objetivo</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Descreva o objetivo deste simulado..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Cabeçalho do Documento</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escola</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Escola Municipal João da Silva"
                    value={formData.cabecalho_escola}
                    onChange={(e) => setFormData({ ...formData, cabecalho_escola: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    value={formData.cabecalho_endereco}
                    onChange={(e) => setFormData({ ...formData, cabecalho_endereco: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.embaralhar_questoes}
                  onChange={(e) => setFormData({ ...formData, embaralhar_questoes: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700">Embaralhar questões</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.embaralhar_alternativas}
                  onChange={(e) => setFormData({ ...formData, embaralhar_alternativas: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700">Embaralhar alternativas</span>
              </label>
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
              {/* Aba Banco xyMath - FILTROS ATUALIZADOS */}
              {abaAtiva === 'banco' && (
                <Card variant="bordered">
                  <CardContent className="p-4">
                    {/* Busca e Filtros */}
                    <div className="space-y-4 mb-4">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar questões..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

                      {/* Filtros expandidos - ATUALIZADOS */}
                      {filterOpen && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contexto</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                                value={filters.contexto_id}
                                onChange={(e) => setFilters({ ...filters, contexto_id: e.target.value })}
                              >
                                <option value="">Todos</option>
                                {contextos.map(ctx => (
                                  <option key={ctx.id} value={ctx.id}>{ctx.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Habilidades BNCC - Múltipla Seleção */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Habilidades BNCC (múltipla seleção)
                              {filters.habilidades_bncc_ids.length > 0 && (
                                <span className="ml-2 text-indigo-600">({filters.habilidades_bncc_ids.length} selecionadas)</span>
                              )}
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-1">
                              {habilidades.map(hab => (
                                <label
                                  key={hab.id}
                                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                    filters.habilidades_bncc_ids.includes(hab.id) ? 'bg-indigo-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters.habilidades_bncc_ids.includes(hab.id)}
                                    onChange={() => toggleHabilidadeFilter(hab.id)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                  />
                                  <span className="text-sm text-gray-900">
                                    <strong>{hab.codigo}</strong> - {hab.descricao.substring(0, 60)}...
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Descritores SAEB - Múltipla Seleção */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Descritores SAEB (múltipla seleção)
                              {filters.descritores_saeb_ids.length > 0 && (
                                <span className="ml-2 text-indigo-600">({filters.descritores_saeb_ids.length} selecionados)</span>
                              )}
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-1">
                              {descritores.map(desc => (
                                <label
                                  key={desc.id}
                                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                    filters.descritores_saeb_ids.includes(desc.id) ? 'bg-indigo-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters.descritores_saeb_ids.includes(desc.id)}
                                    onChange={() => toggleDescritorFilter(desc.id)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                  />
                                  <span className="text-sm text-gray-900">
                                    <strong>{desc.codigo}</strong> - {desc.descricao.substring(0, 60)}...
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={limparFiltros}
                              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Limpar filtros
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="bg-gray-100 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600">Fáceis</p>
                        <p className="text-xl font-bold text-green-700">{stats.faceis}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-yellow-600">Médias</p>
                        <p className="text-xl font-bold text-yellow-700">{stats.medias}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-red-600">Difíceis</p>
                        <p className="text-xl font-bold text-red-700">{stats.dificeis}</p>
                      </div>
                    </div>

                    {/* Lista de questões */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {loadingBanco ? (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-gray-600">Carregando questões...</p>
                        </div>
                      ) : questoesBanco.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-600">Nenhuma questão encontrada</p>
                          <p className="text-sm text-gray-500">Ajuste os filtros para ver mais questões</p>
                        </div>
                      ) : (
                        questoesBanco.map((questao) => {
                          const jaSelecionada = questoesSelecionadas.some(q => q.id === questao.id)
                          return (
                            <div
                              key={questao.id}
                              className={`p-4 border rounded-lg transition-all ${
                                jaSelecionada 
                                  ? 'border-green-500 bg-green-50' 
                                  : 'border-gray-200 hover:border-indigo-300 bg-white'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="info" className="text-xs">{questao.ano_serie}</Badge>
                                    <Badge 
                                      variant={questao.dificuldade === 'facil' ? 'success' : questao.dificuldade === 'medio' ? 'warning' : 'danger'}
                                      className="text-xs"
                                    >
                                      {questao.dificuldade === 'facil' ? 'Fácil' : questao.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
                                    </Badge>
                                    {getHabilidadeCodigo(questao.habilidade_bncc_id) && (
                                      <Badge className="text-xs">{getHabilidadeCodigo(questao.habilidade_bncc_id)}</Badge>
                                    )}
                                    {getDescritorCodigo(questao.descritor_saeb_id) && (
                                      <Badge className="text-xs">{getDescritorCodigo(questao.descritor_saeb_id)}</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-900 line-clamp-2">{questao.enunciado}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setViewingQuestao({ ...questao, origem: 'banco' })
                                      setViewModalOpen(true)
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant={jaSelecionada ? 'outline' : 'primary'}
                                    size="sm"
                                    onClick={() => addQuestaoFromBanco(questao)}
                                    disabled={jaSelecionada}
                                  >
                                    {jaSelecionada ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                  </Button>
                                </div>
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
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">Criar Questão Manualmente</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado *</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={4}
                        placeholder="Digite o enunciado da questão..."
                        value={questaoManual.enunciado}
                        onChange={(e) => setQuestaoManual({ ...questaoManual, enunciado: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                          value={questaoManual.dificuldade}
                          onChange={(e) => setQuestaoManual({ ...questaoManual, dificuldade: e.target.value })}
                        >
                          {DIFICULDADE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Upload de imagem */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem (opcional)</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <ImageIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">
                            {uploadingImage ? 'Enviando...' : 'Adicionar imagem'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                            disabled={uploadingImage}
                          />
                        </label>
                        {questaoManual.imagem_url && (
                          <div className="flex items-center gap-2">
                            <img src={questaoManual.imagem_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                            <button
                              onClick={() => setQuestaoManual({ ...questaoManual, imagem_url: '' })}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternativas */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Alternativas *</label>
                      {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                        <div key={letra} className="flex items-center gap-3">
                          <label className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors ${
                            questaoManual.resposta_correta === letra 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="resposta_correta"
                              value={letra}
                              checked={questaoManual.resposta_correta === letra}
                              onChange={(e) => setQuestaoManual({ ...questaoManual, resposta_correta: e.target.value })}
                              className="sr-only"
                            />
                            {letra}
                          </label>
                          <input
                            type="text"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Alternativa ${letra}${letra === 'E' ? ' (opcional)' : ''}`}
                            value={questaoManual[`alternativa_${letra.toLowerCase()}` as keyof typeof questaoManual] as string}
                            onChange={(e) => setQuestaoManual({ 
                              ...questaoManual, 
                              [`alternativa_${letra.toLowerCase()}`]: e.target.value 
                            })}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-gray-500">Clique na letra para marcar a resposta correta</p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button onClick={addQuestaoManual}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Questão
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aba Importar */}
              {abaAtiva === 'importar' && (
                <Card variant="bordered">
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Importar Questões de Arquivo</h3>
                      <p className="text-gray-500 mb-6">Em breve você poderá importar questões de arquivos PDF ou Word</p>
                      <Button variant="outline" disabled>
                        <FileText className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna da direita: Questões Selecionadas */}
            <div className="lg:col-span-1">
              <Card variant="bordered" className="sticky top-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Selecionadas ({questoesSelecionadas.length})</h3>
                    <span className="text-indigo-600 font-semibold">{totalPontos.toFixed(1)} pts</span>
                  </div>

                  {questoesSelecionadas.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Nenhuma questão selecionada</p>
                      <p className="text-gray-400 text-xs">Selecione questões nas abas ao lado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {questoesSelecionadas.map((questao, index) => (
                        <div
                          key={questao.id || questao.tempId}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveQuestao(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveQuestao(index, 'down')}
                              disabled={index === questoesSelecionadas.length - 1}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{questao.enunciado}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-xs px-1 rounded ${
                                questao.origem === 'banco' ? 'bg-blue-100 text-blue-700' :
                                questao.origem === 'manual' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {questao.origem === 'banco' ? '📚' : questao.origem === 'manual' ? '✏️' : '📄'}
                              </span>
                              <Badge 
                                variant={questao.dificuldade === 'facil' ? 'success' : questao.dificuldade === 'medio' ? 'warning' : 'danger'}
                                className="text-xs py-0"
                              >
                                {questao.dificuldade === 'facil' ? 'F' : questao.dificuldade === 'medio' ? 'M' : 'D'}
                              </Badge>
                            </div>
                          </div>
                          <button
                            onClick={() => removeQuestao(index)}
                            className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* Navegação Step 2 */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Revisão do Simulado</h3>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Título</p>
                  <p className="font-medium text-lg text-gray-900">{formData.titulo}</p>
                </div>
                {formData.descricao && (
                  <div>
                    <p className="text-sm text-gray-500">Descrição</p>
                    <p className="text-gray-700">{formData.descricao}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Turmas</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {turmasSelected.length > 0 ? (
                      turmasSelected.map(t => (
                        <Badge key={t.id} variant="info">{t.nome} - {t.ano_serie}</Badge>
                      ))
                    ) : (
                      <span className="text-gray-500">Nenhuma turma selecionada</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pontuação</p>
                  <p className="font-medium text-gray-900">{formData.pontuacao_questao} pts/questão</p>
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
              <h4 className="font-semibold text-gray-900 mb-4">Questões ({questoesSelecionadas.length})</h4>
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
                <Button variant="outline" onClick={() => handleSave('rascunho')} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />Salvar Rascunho
                </Button>
                <Button onClick={() => handleSave('publicado')} disabled={saving}>
                  {saving ? 'Salvando...' : 'Publicar Simulado'}
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
