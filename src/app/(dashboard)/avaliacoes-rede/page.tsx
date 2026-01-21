'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Upload, FileText, Users, Check, X, AlertCircle, Search,
  Trash2, Eye, Download, RefreshCw, Link2, Link2Off, ChevronDown,
  ChevronUp, FileSpreadsheet, Calendar, School, BookOpen, Target,
  CheckCircle, XCircle, HelpCircle, Edit, Save
} from 'lucide-react'

// ============================================================
// INTERFACES
// ============================================================

interface AvaliacaoRede {
  id: string
  usuario_id: string
  turma_id?: string
  titulo: string
  escola_origem?: string
  disciplina: string
  total_questoes?: number
  arquivo_nome?: string
  arquivo_tipo?: string
  componente_nota_id?: string
  periodo?: number
  ano_letivo?: number
  total_alunos: number
  alunos_vinculados: number
  media_turma?: number
  status: 'pendente' | 'processado' | 'erro'
  created_at: string
}

interface NotaRede {
  id: string
  avaliacao_id: string
  aluno_id?: string
  nome_original: string
  nota?: number
  acertos?: number
  total_questoes?: number
  percentual?: number
  vinculado: boolean
  similaridade?: number
  vinculado_manualmente: boolean
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Aluno {
  id: string
  nome: string
  turma_id: string
}

interface ComponenteAvaliacao {
  id: string
  nome: string
  peso: number
}

interface DadosExtraidos {
  titulo: string
  escola?: string
  turma?: string
  disciplina?: string
  totalQuestoes?: number
  alunos: {
    nome: string
    nota: number
    acertos?: number
    totalQuestoes?: number
  }[]
}

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================

// Normaliza nome para comparação
const normalizarNome = (nome: string): string => {
  return nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Z\s]/g, '') // remove caracteres especiais
    .replace(/\s+/g, ' ') // normaliza espaços
    .trim()
}

// Calcula similaridade entre dois nomes (Levenshtein simplificado)
const calcularSimilaridade = (nome1: string, nome2: string): number => {
  const n1 = normalizarNome(nome1)
  const n2 = normalizarNome(nome2)
  
  if (n1 === n2) return 100
  
  // Compara primeiro e último nome
  const partes1 = n1.split(' ')
  const partes2 = n2.split(' ')
  
  const primeiro1 = partes1[0]
  const ultimo1 = partes1[partes1.length - 1]
  const primeiro2 = partes2[0]
  const ultimo2 = partes2[partes2.length - 1]
  
  // Se primeiro e último nome são iguais
  if (primeiro1 === primeiro2 && ultimo1 === ultimo2) return 95
  
  // Se apenas primeiro nome é igual
  if (primeiro1 === primeiro2) return 70
  
  // Calcula distância de Levenshtein simplificada
  const maxLen = Math.max(n1.length, n2.length)
  if (maxLen === 0) return 100
  
  let matches = 0
  const minLen = Math.min(n1.length, n2.length)
  for (let i = 0; i < minLen; i++) {
    if (n1[i] === n2[i]) matches++
  }
  
  return Math.round((matches / maxLen) * 100)
}

// Parser de CSV
const parseCSV = (content: string): DadosExtraidos => {
  const lines = content.split('\n').filter(line => line.trim())
  const alunos: DadosExtraidos['alunos'] = []
  
  // Tenta identificar cabeçalho
  let startIndex = 0
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('aluno') || lower.includes('nome') || lower.includes('nota')) {
      startIndex = i + 1
      break
    }
  }
  
  // Processa linhas de dados
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''))
    if (cols.length >= 2) {
      const nome = cols[0]
      const notaStr = cols.find(c => /^\d+([.,]\d+)?$/.test(c.replace(',', '.')))
      const acertosMatch = cols.find(c => /^\d+\/\d+$/.test(c))
      
      if (nome && nome.length > 3) {
        let nota = 0
        let acertos: number | undefined
        let totalQuestoes: number | undefined
        
        if (notaStr) {
          nota = parseFloat(notaStr.replace(',', '.'))
        }
        
        if (acertosMatch) {
          const [a, t] = acertosMatch.split('/')
          acertos = parseInt(a)
          totalQuestoes = parseInt(t)
          if (!notaStr && totalQuestoes > 0) {
            nota = Math.round((acertos / totalQuestoes) * 10 * 10) / 10
          }
        }
        
        alunos.push({ nome, nota, acertos, totalQuestoes })
      }
    }
  }
  
  return {
    titulo: 'Avaliação Importada',
    alunos
  }
}

// Parser de texto do PDF (simulado - na prática precisa de lib externa)
const parsePDFText = (text: string): DadosExtraidos => {
  const lines = text.split('\n').filter(line => line.trim())
  const alunos: DadosExtraidos['alunos'] = []
  
  let titulo = ''
  let escola = ''
  let turma = ''
  let disciplina = ''
  let totalQuestoes: number | undefined
  
  // Extrai metadados
  for (const line of lines.slice(0, 10)) {
    if (line.includes('SIMULADO') || line.includes('AVALIAÇÃO') || line.includes('PROVA')) {
      titulo = line.trim()
    }
    if (line.toLowerCase().includes('escola:')) {
      escola = line.split(':')[1]?.trim() || ''
    }
    if (line.toLowerCase().includes('turma:')) {
      turma = line.split(':')[1]?.trim() || ''
    }
    if (line.toLowerCase().includes('disciplina:')) {
      disciplina = line.split(':')[1]?.trim() || ''
    }
  }
  
  // Procura padrão de notas: NOME ... NOTA ... ACERTOS/TOTAL
  const padraoNota = /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+)\s+\d+\w*\s+(\d+[.,]?\d*)\s+(\d+)\/(\d+)/i
  const padraoSimples = /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,})\s+(\d+[.,]?\d*)\s*$/i
  
  for (const line of lines) {
    let match = line.match(padraoNota)
    if (match) {
      const nome = match[1].trim()
      const nota = parseFloat(match[2].replace(',', '.'))
      const acertos = parseInt(match[3])
      const total = parseInt(match[4])
      
      if (nome.length > 3 && !nome.includes('Aluno') && !nome.includes('ALUNO')) {
        alunos.push({ nome, nota, acertos, totalQuestoes: total })
        if (!totalQuestoes) totalQuestoes = total
      }
    } else {
      match = line.match(padraoSimples)
      if (match) {
        const nome = match[1].trim()
        const nota = parseFloat(match[2].replace(',', '.'))
        
        if (nome.length > 3 && !nome.includes('Aluno') && !nome.includes('ALUNO')) {
          alunos.push({ nome, nota })
        }
      }
    }
  }
  
  return {
    titulo: titulo || 'Avaliação Importada',
    escola,
    turma,
    disciplina,
    totalQuestoes,
    alunos
  }
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function AvaliacoesRedePage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados principais
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoRede[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Estados do modal de importação
  const [showImportModal, setShowImportModal] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'config'>('upload')
  const [uploading, setUploading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Estados dos dados importados
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null)
  const [alunosTurma, setAlunosTurma] = useState<Aluno[]>([])
  const [vinculacoes, setVinculacoes] = useState<Map<number, { alunoId: string | null, similaridade: number }>>(new Map())

  // Estados de configuração
  const [configImport, setConfigImport] = useState({
    turma_id: '',
    titulo: '',
    periodo: 1,
    ano_letivo: new Date().getFullYear()
  })

  // Estados do modal de detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoRede | null>(null)
  const [notasAvaliacao, setNotasAvaliacao] = useState<NotaRede[]>([])
  const [loadingNotas, setLoadingNotas] = useState(false)

  // Carregar dados
  const fetchData = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    
    try {
      const [avRes, tRes] = await Promise.all([
        supabase
          .from('avaliacoes_rede')
          .select('*')
          .eq('usuario_id', usuario.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('turmas')
          .select('*')
          .eq('usuario_id', usuario.id)
          .eq('ativa', true)
      ])
      
      setAvaliacoes(avRes.data || [])
      setTurmas(tRes.data || [])
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Carregar alunos da turma selecionada
  const carregarAlunosTurma = async (turmaId: string) => {
    if (!turmaId) {
      setAlunosTurma([])
      return
    }
    
    const { data } = await supabase
      .from('alunos')
      .select('id, nome, turma_id')
      .eq('turma_id', turmaId)
      .eq('ativo', true)
      .order('nome')
    
    setAlunosTurma(data || [])
  }

  // Processar arquivo selecionado
  const processarArquivo = async (file: File) => {
    setUploading(true)
    setImportError(null)
    
    try {
      const text = await file.text()
      let dados: DadosExtraidos
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        dados = parseCSV(text)
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        // Para PDF, usamos o texto extraído pelo navegador
        // Em produção, usar pdf.js ou similar
        dados = parsePDFText(text)
      } else {
        // Tenta como texto genérico
        dados = parsePDFText(text)
      }
      
      if (dados.alunos.length === 0) {
        throw new Error('Não foi possível extrair dados do arquivo. Verifique o formato.')
      }
      
      setDadosExtraidos(dados)
      setConfigImport(prev => ({
        ...prev,
        titulo: dados.titulo
      }))
      setImportStep('preview')
      
    } catch (e: any) {
      setImportError(e.message || 'Erro ao processar arquivo')
    } finally {
      setUploading(false)
    }
  }

  // Vincular alunos automaticamente
  const vincularAutomaticamente = () => {
    if (!dadosExtraidos || alunosTurma.length === 0) return
    
    const novasVinculacoes = new Map<number, { alunoId: string | null, similaridade: number }>()
    
    dadosExtraidos.alunos.forEach((alunoImport, index) => {
      let melhorMatch: { alunoId: string | null, similaridade: number } = { alunoId: null, similaridade: 0 }
      
      for (const alunoSistema of alunosTurma) {
        const sim = calcularSimilaridade(alunoImport.nome, alunoSistema.nome)
        if (sim > melhorMatch.similaridade && sim >= 70) {
          melhorMatch = { alunoId: alunoSistema.id, similaridade: sim }
        }
      }
      
      novasVinculacoes.set(index, melhorMatch)
    })
    
    setVinculacoes(novasVinculacoes)
  }

  // Efeito para vincular quando turma muda
  useEffect(() => {
    if (configImport.turma_id && dadosExtraidos) {
      carregarAlunosTurma(configImport.turma_id).then(() => {
        setTimeout(vincularAutomaticamente, 100)
      })
    }
  }, [configImport.turma_id, dadosExtraidos])

  // Atualizar vinculação manual
  const atualizarVinculacao = (index: number, alunoId: string | null) => {
    const novas = new Map(vinculacoes)
    novas.set(index, { alunoId, similaridade: alunoId ? 100 : 0 })
    setVinculacoes(novas)
  }

  // Salvar importação
  const salvarImportacao = async () => {
    if (!usuario?.id || !dadosExtraidos || !configImport.turma_id) return
    
    setUploading(true)
    setImportError(null)
    
    try {
      // 1. Criar registro da avaliação
      const { data: avaliacao, error: errAv } = await supabase
        .from('avaliacoes_rede')
        .insert({
          usuario_id: usuario.id,
          turma_id: configImport.turma_id,
          titulo: configImport.titulo,
          escola_origem: dadosExtraidos.escola,
          disciplina: dadosExtraidos.disciplina || 'MATEMÁTICA',
          total_questoes: dadosExtraidos.totalQuestoes,
          arquivo_nome: arquivoSelecionado?.name,
          arquivo_tipo: arquivoSelecionado?.name.split('.').pop()?.toLowerCase(),
          periodo: configImport.periodo,
          ano_letivo: configImport.ano_letivo,
          status: 'processado'
        })
        .select()
        .single()
      
      if (errAv) throw errAv
      
      // 2. Inserir notas dos alunos
      const notasParaInserir = dadosExtraidos.alunos.map((aluno, index) => {
        const vinc = vinculacoes.get(index)
        return {
          avaliacao_id: avaliacao.id,
          aluno_id: vinc?.alunoId || null,
          nome_original: aluno.nome,
          nota: aluno.nota,
          acertos: aluno.acertos,
          total_questoes: aluno.totalQuestoes || dadosExtraidos.totalQuestoes,
          percentual: aluno.totalQuestoes && aluno.acertos 
            ? Math.round((aluno.acertos / aluno.totalQuestoes) * 100) 
            : null,
          vinculado: !!vinc?.alunoId,
          similaridade: vinc?.similaridade || 0,
          vinculado_manualmente: vinc?.similaridade === 100 && vinc?.alunoId !== null
        }
      })
      
      const { error: errNotas } = await supabase
        .from('notas_rede')
        .insert(notasParaInserir)
      
      if (errNotas) throw errNotas
      
      // Fechar modal e recarregar
      setShowImportModal(false)
      resetarImportacao()
      fetchData()
      
    } catch (e: any) {
      setImportError(e.message || 'Erro ao salvar importação')
    } finally {
      setUploading(false)
    }
  }

  // Resetar estados de importação
  const resetarImportacao = () => {
    setImportStep('upload')
    setArquivoSelecionado(null)
    setDadosExtraidos(null)
    setVinculacoes(new Map())
    setAlunosTurma([])
    setConfigImport({
      turma_id: '',
      titulo: '',
      periodo: 1,
      ano_letivo: new Date().getFullYear()
    })
    setImportError(null)
  }

  // Abrir detalhes da avaliação
  const abrirDetalhes = async (avaliacao: AvaliacaoRede) => {
    setAvaliacaoSelecionada(avaliacao)
    setShowDetalhesModal(true)
    setLoadingNotas(true)
    
    const { data } = await supabase
      .from('notas_rede')
      .select('*')
      .eq('avaliacao_id', avaliacao.id)
      .order('nome_original')
    
    setNotasAvaliacao(data || [])
    setLoadingNotas(false)
  }

  // Excluir avaliação
  const excluirAvaliacao = async (id: string) => {
    if (!confirm('Excluir esta avaliação e todas as notas vinculadas?')) return
    
    await supabase.from('avaliacoes_rede').delete().eq('id', id)
    fetchData()
  }

  // Filtrar avaliações
  const avaliacoesFiltradas = avaliacoes.filter(a =>
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.escola_origem?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helpers
  const getTurmaNome = (turmaId?: string) => {
    if (!turmaId) return '-'
    return turmas.find(t => t.id === turmaId)?.nome || '-'
  }

  const getStatusBadge = (vinculados: number, total: number) => {
    const pct = total > 0 ? (vinculados / total) * 100 : 0
    if (pct === 100) return <Badge variant="success">100% vinculado</Badge>
    if (pct >= 80) return <Badge variant="warning">{Math.round(pct)}% vinculado</Badge>
    return <Badge variant="danger">{Math.round(pct)}% vinculado</Badge>
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avaliações de Rede</h1>
          <p className="text-gray-600">Importe resultados de avaliações externas (SAEB, municipal, etc)</p>
        </div>
        <Button onClick={() => { resetarImportacao(); setShowImportModal(true) }}>
          <Upload className="w-5 h-5 mr-2" />
          Importar Avaliação
        </Button>
      </div>

      {/* Busca */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar avaliações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{avaliacoes.length}</p>
            <p className="text-sm text-gray-600">Total Importadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {avaliacoes.filter(a => a.alunos_vinculados === a.total_alunos && a.total_alunos > 0).length}
            </p>
            <p className="text-sm text-gray-600">100% Vinculadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {avaliacoes.filter(a => a.alunos_vinculados < a.total_alunos && a.alunos_vinculados > 0).length}
            </p>
            <p className="text-sm text-gray-600">Parcialmente Vinculadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {avaliacoes.reduce((acc, a) => acc + a.total_alunos, 0)}
            </p>
            <p className="text-sm text-gray-600">Total de Notas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de avaliações */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : avaliacoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma avaliação encontrada' : 'Nenhuma avaliação importada'}
            </h3>
            <p className="text-gray-500 mb-6">
              Importe resultados de avaliações externas como SAEB, provas da rede municipal, etc.
            </p>
            <Button onClick={() => { resetarImportacao(); setShowImportModal(true) }}>
              <Upload className="w-5 h-5 mr-2" />
              Importar Primeira Avaliação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {avaliacoesFiltradas.map(av => (
            <Card key={av.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{av.titulo}</h3>
                      {getStatusBadge(av.alunos_vinculados, av.total_alunos)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {av.escola_origem && (
                        <span className="flex items-center gap-1">
                          <School className="w-4 h-4" />
                          {av.escola_origem}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {getTurmaNome(av.turma_id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {av.total_alunos} alunos
                      </span>
                      {av.total_questoes && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {av.total_questoes} questões
                        </span>
                      )}
                      {av.media_turma && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            Média: {av.media_turma.toFixed(1)}
                          </span>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      Importado em {new Date(av.created_at).toLocaleDateString('pt-BR')}
                      {av.arquivo_nome && ` • ${av.arquivo_nome}`}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => abrirDetalhes(av)} title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => excluirAvaliacao(av.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: IMPORTAR AVALIAÇÃO */}
      {/* ============================================================ */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Avaliação de Rede"
        size="xl"
      >
        <div className="space-y-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-2 ${importStep === 'upload' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">Upload</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${importStep === 'preview' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Conferir</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${importStep === 'config' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'config' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Salvar</span>
            </div>
          </div>

          {/* Erro */}
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{importError}</p>
              <button onClick={() => setImportError(null)} className="ml-auto">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}

          {/* Step 1: Upload */}
          {importStep === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-sm text-gray-400">
                  Formatos aceitos: PDF, CSV, TXT
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setArquivoSelecionado(file)
                      processarArquivo(file)
                    }
                  }}
                />
              </div>

              {arquivoSelecionado && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="w-8 h-8 text-indigo-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{arquivoSelecionado.name}</p>
                    <p className="text-sm text-gray-500">
                      {(arquivoSelecionado.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {uploading && (
                    <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📋 Formato esperado</h4>
                <p className="text-sm text-blue-700">
                  O arquivo deve conter o nome do aluno e a nota (ou acertos/total).
                  Exemplo: "JOÃO SILVA | 7,5 | 15/20"
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Preview e Vinculação */}
          {importStep === 'preview' && dadosExtraidos && (
            <div className="space-y-4">
              {/* Configuração da turma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título da Avaliação *
                  </label>
                  <Input
                    value={configImport.titulo}
                    onChange={(e) => setConfigImport({ ...configImport, titulo: e.target.value })}
                    placeholder="Ex: 1º Simulado SAEB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turma *
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    value={configImport.turma_id}
                    onChange={(e) => setConfigImport({ ...configImport, turma_id: e.target.value })}
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info extraída */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><strong>Alunos encontrados:</strong> {dadosExtraidos.alunos.length}</span>
                  {dadosExtraidos.escola && <span><strong>Escola:</strong> {dadosExtraidos.escola}</span>}
                  {dadosExtraidos.totalQuestoes && <span><strong>Questões:</strong> {dadosExtraidos.totalQuestoes}</span>}
                </div>
              </div>

              {/* Tabela de vinculação */}
              {configImport.turma_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Vinculação de Alunos</h4>
                    <Button variant="outline" size="sm" onClick={vincularAutomaticamente}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Revincular
                    </Button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Nome no Arquivo</th>
                          <th className="text-left p-2">Nota</th>
                          <th className="text-left p-2">Vincular com</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosExtraidos.alunos.map((aluno, index) => {
                          const vinc = vinculacoes.get(index)
                          const alunoVinculado = vinc?.alunoId 
                            ? alunosTurma.find(a => a.id === vinc.alunoId) 
                            : null
                          
                          return (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="p-2">
                                <span className="font-medium">{aluno.nome}</span>
                              </td>
                              <td className="p-2">
                                <span className="font-bold text-indigo-600">{aluno.nota}</span>
                                {aluno.acertos && (
                                  <span className="text-gray-500 text-xs ml-1">
                                    ({aluno.acertos}/{aluno.totalQuestoes})
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <select
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  value={vinc?.alunoId || ''}
                                  onChange={(e) => atualizarVinculacao(index, e.target.value || null)}
                                >
                                  <option value="">Não vincular</option>
                                  {alunosTurma.map(a => (
                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 text-center">
                                {vinc?.alunoId ? (
                                  vinc.similaridade >= 95 ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 inline" />
                                  ) : vinc.similaridade >= 70 ? (
                                    <HelpCircle className="w-5 h-5 text-yellow-500 inline" />
                                  ) : (
                                    <CheckCircle className="w-5 h-5 text-blue-500 inline" />
                                  )
                                ) : (
                                  <XCircle className="w-5 h-5 text-gray-300 inline" />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Legenda */}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Automático (95%+)
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-yellow-500" /> Sugerido (70-94%)
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-blue-500" /> Manual
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-gray-300" /> Não vinculado
                    </span>
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">Resumo da Importação</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">{dadosExtraidos.alunos.length}</p>
                    <p className="text-sm text-indigo-700">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Array.from(vinculacoes.values()).filter(v => v.alunoId).length}
                    </p>
                    <p className="text-sm text-green-700">Vinculados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-500">
                      {dadosExtraidos.alunos.length - Array.from(vinculacoes.values()).filter(v => v.alunoId).length}
                    </p>
                    <p className="text-sm text-gray-600">Sem vínculo</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setImportStep('upload')}>
                  Voltar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={salvarImportacao}
                  disabled={!configImport.turma_id || !configImport.titulo || uploading}
                  loading={uploading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Importação
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: DETALHES DA AVALIAÇÃO */}
      {/* ============================================================ */}
      <Modal
        isOpen={showDetalhesModal}
        onClose={() => setShowDetalhesModal(false)}
        title={avaliacaoSelecionada?.titulo || 'Detalhes'}
        size="xl"
      >
        {avaliacaoSelecionada && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{avaliacaoSelecionada.total_alunos}</p>
                <p className="text-sm text-gray-600">Alunos</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{avaliacaoSelecionada.alunos_vinculados}</p>
                <p className="text-sm text-gray-600">Vinculados</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {avaliacaoSelecionada.media_turma?.toFixed(1) || '-'}
                </p>
                <p className="text-sm text-gray-600">Média</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {avaliacaoSelecionada.total_questoes || '-'}
                </p>
                <p className="text-sm text-gray-600">Questões</p>
              </div>
            </div>

            {/* Tabela de notas */}
            {loadingNotas ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-center p-3">Nota</th>
                      <th className="text-center p-3">Acertos</th>
                      <th className="text-center p-3">Vinculado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasAvaliacao.map(nota => (
                      <tr key={nota.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-medium">{nota.nome_original}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${
                            (nota.nota || 0) >= 6 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {nota.nota?.toFixed(1) || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-600">
                          {nota.acertos && nota.total_questoes 
                            ? `${nota.acertos}/${nota.total_questoes}` 
                            : '-'
                          }
                        </td>
                        <td className="p-3 text-center">
                          {nota.vinculado ? (
                            <CheckCircle className="w-5 h-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
