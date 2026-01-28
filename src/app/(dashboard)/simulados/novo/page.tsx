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

  // Dados do formulário (Step 1)
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turmas_ids: [] as string[],
    valor_total: 10,
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
    habilidades_ids: [] as string[],
    descritores_ids: [] as string[],
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
            valor_total: simulado.configuracoes?.valor_total || 10,
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
  }, [fetchData])
