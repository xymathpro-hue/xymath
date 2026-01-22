'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Upload, FileText, Trash2, Save, Plus, CheckCircle, AlertCircle, 
  Loader2, Eye, XCircle, Link2, Search, Download, Calendar,
  Users, FileSpreadsheet, RefreshCw
} from 'lucide-react'

// ============================================================
// TIPOS
// ============================================================

interface AvaliacaoRede {
  id: string
  usuario_id: string
  titulo: string
  escola?: string
  turma_origem?: string
  disciplina?: string
  data_aplicacao?: string
  total_questoes?: number
  arquivo_nome?: string
  created_at: string
}

interface NotaRede {
  id?: string
  avaliacao_id: string
  nome_pdf: string
  turma_pdf?: string
  nota: number
  acertos?: number
  total_questoes?: number
  aluno_id?: string
  vinculado: boolean
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

interface ComponenteAvaliacao {
  id: string
  nome: string
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Calcular similaridade entre nomes (Levenshtein simplificado)
const calcularSimilaridade = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1
  
  // Verificar se um contém o outro
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.85
  }
  
  // Levenshtein distance
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  
  return (longer.length - costs[s2.length]) / longer.length
}

// Encontrar melhor match para um nome
const encontrarMelhorMatch = (nomePdf: string, alunos: Aluno[]): { aluno: Aluno | null, score: number } => {
  let melhorMatch: Aluno | null = null
  let melhorScore = 0
  
  for (const aluno of alunos) {
    const score = calcularSimilaridade(nomePdf, aluno.nome)
    if (score > melhorScore && score >= 0.7) {
      melhorScore = score
      melhorMatch = aluno
    }
  }
  
  return { aluno: melhorMatch, score: melhorScore }
}

// Parser de CSV
const parseCSV = (content: string): DadosExtraidos => {
  const lines = content.split('\n').filter(line => line.trim())
  const alunos: DadosExtraidos['alunos'] = []
  
  // Pular cabeçalho se existir
  const startIndex = lines[0]?.toLowerCase().includes('aluno') ? 1 : 0
  
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(/[;,\t]/).map(c => c.trim().replace(/"/g, ''))
    
    if (cols.length >= 2) {
      const nome = cols[0]
      const notaStr = cols.find(c => /^\d+[.,]?\d*$/.test(c))
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

// Parser de texto extraído do PDF
const parsePDFText = (text: string): DadosExtraidos => {
  const lines = text.split('\n').filter(line => line.trim())
  const alunos: DadosExtraidos['alunos'] = []
  
  let titulo = ''
  let escola = ''
  let turma = ''
  let disciplina = ''
  let totalQuestoes: number | undefined
  
  // Extrai metadados das primeiras linhas
  for (const line of lines.slice(0, 15)) {
    const lineLower = line.toLowerCase()
    
    if (line.includes('SIMULADO') || line.includes('AVALIAÇÃO') || line.includes('PROVA')) {
      titulo = line.trim()
    }
    if (lineLower.includes('escola:')) {
      escola = line.split(':')[1]?.trim() || ''
    }
    if (lineLower.includes('turma:')) {
      turma = line.split(':')[1]?.trim() || ''
    }
    if (lineLower.includes('disciplina:')) {
      disciplina = line.split(':')[1]?.trim() || ''
    }
  }
  
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    if (lineLower.includes('aluno') && lineLower.includes('nota')) continue
    if (lineLower.includes('turma') && lineLower.includes('acertos')) continue
    if (line.includes('Escola:') || line.includes('Disciplina:')) continue
    
    // Formato: NOME_COMPLETO TURMA NOTA ACERTOS/TOTAL
    const match1 = line.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)\s+(\d{3}\w+)\s+(\d+[.,]?\d*)\s+(\d+)\/(\d+)/i)
    if (match1) {
      const nome = match1[1].trim()
      const nota = parseFloat(match1[3].replace(',', '.'))
      const acertos = parseInt(match1[4])
      const total = parseInt(match1[5])
      
      if (nome.length > 3 && !nome.includes('ALUNO')) {
        alunos.push({ nome, nota, acertos, totalQuestoes: total })
        if (!totalQuestoes) totalQuestoes = total
        continue
      }
    }
    
    // Formato: NOME_COMPLETO NOTA ACERTOS/TOTAL
    const match2 = line.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,}?)\s+(\d+[.,]?\d*)\s+(\d+)\/(\d+)/i)
    if (match2) {
      const nome = match2[1].trim()
      const nota = parseFloat(match2[2].replace(',', '.'))
      const acertos = parseInt(match2[3])
      const total = parseInt(match2[4])
      
      if (nome.length > 3 && !nome.includes('ALUNO')) {
        alunos.push({ nome, nota, acertos, totalQuestoes: total })
        if (!totalQuestoes) totalQuestoes = total
        continue
      }
    }
    
    // Formato simples: NOME NOTA
    const match3 = line.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,}?)\s+(\d+[.,]\d+)\s*$/i)
    if (match3) {
      const nome = match3[1].trim()
      const nota = parseFloat(match3[2].replace(',', '.'))
      
      if (nome.length > 3 && !nome.includes('ALUNO')) {
        alunos.push({ nome, nota })
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

declare global {
  interface Window {
    pdfjsLib: any
  }
}

export default function AvaliacoesRedePage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados principais
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoRede[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfReady, setPdfReady] = useState(false)

  // Estados do upload
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [processando, setProcessando] = useState(false)
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null)
  const [textoExtraido, setTextoExtraido] = useState<string>('')
  const [notasPreview, setNotasPreview] = useState<NotaRede[]>([])

  // Estados do modal
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showTextoModal, setShowTextoModal] = useState(false)
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoRede | null>(null)
  const [notasAvaliacao, setNotasAvaliacao] = useState<NotaRede[]>([])

  // Estados do formulário
  const [formData, setFormData] = useState({
    titulo: '',
    turma_id: '',
    componente_id: '',
    data_aplicacao: new Date().toISOString().split('T')[0]
  })

  const [etapa, setEtapa] = useState<'upload' | 'preview' | 'config'>('upload')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Carregar PDF.js via CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.pdfjsLib) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        setPdfReady(true)
      }
      document.body.appendChild(script)
    } else if (window.pdfjsLib) {
      setPdfReady(true)
    }
  }, [])

  // Carregar dados iniciais
  const carregarDados = useCallback(async () => {
    if (!usuario) return
    
    setLoading(true)
    try {
      // Carregar avaliações
      const { data: avData } = await supabase
        .from('avaliacoes_rede')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('created_at', { ascending: false })
      
      if (avData) setAvaliacoes(avData)

      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .order('nome')
      
      if (turmasData) setTurmas(turmasData)

      // Carregar alunos de todas as turmas
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, turma_id')
        .in('turma_id', turmasData?.map(t => t.id) || [])
      
      if (alunosData) setAlunos(alunosData)

      // Carregar componentes de avaliação
      const { data: compData } = await supabase
        .from('componentes_avaliacao')
        .select('id, nome')
        .eq('usuario_id', usuario.id)
        .eq('ativo', true)
      
      if (compData) setComponentes(compData)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario, supabase])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Extrair texto do PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js não carregado')
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      // Agrupa itens por linha (baseado na posição Y)
      const items = textContent.items as any[]
      const lineMap = new Map<number, string[]>()
      
      items.forEach((item: any) => {
        const y = Math.round(item.transform[5])
        if (!lineMap.has(y)) {
          lineMap.set(y, [])
        }
        lineMap.get(y)!.push(item.str)
      })
      
      // Ordena por Y (do topo para baixo) e junta as linhas
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
      sortedYs.forEach(y => {
        const lineText = lineMap.get(y)!.join(' ').trim()
        if (lineText) {
          fullText += lineText + '\n'
        }
      })
      
      fullText += '\n--- Página ' + i + ' ---\n\n'
    }
    
    return fullText
  }

  // Processar arquivo
  const processarArquivo = async () => {
    if (!arquivo) return
    
    setProcessando(true)
    setErro(null)
    
    try {
      let dados: DadosExtraidos
      
      if (arquivo.name.endsWith('.csv') || arquivo.name.endsWith('.txt')) {
        const content = await arquivo.text()
        dados = parseCSV(content)
        setTextoExtraido(content)
      } else if (arquivo.name.endsWith('.pdf')) {
        if (!pdfReady) {
          throw new Error('Aguarde o carregamento do leitor de PDF')
        }
        const text = await extractTextFromPDF(arquivo)
        setTextoExtraido(text)
        dados = parsePDFText(text)
      } else {
        throw new Error('Formato não suportado. Use PDF ou CSV.')
      }
      
      if (dados.alunos.length === 0) {
        throw new Error('Nenhum aluno encontrado no arquivo. Verifique o formato.')
      }
      
      setDadosExtraidos(dados)
      setFormData(prev => ({
        ...prev,
        titulo: dados.titulo || arquivo.name.replace(/\.[^.]+$/, '')
      }))
      
      // Preparar preview das notas
      const preview: NotaRede[] = dados.alunos.map(a => ({
        avaliacao_id: '',
        nome_pdf: a.nome,
        nota: a.nota,
        acertos: a.acertos,
        total_questoes: a.totalQuestoes,
        vinculado: false
      }))
      
      setNotasPreview(preview)
      setEtapa('preview')
      
    } catch (error: any) {
      setErro(error.message || 'Erro ao processar arquivo')
    } finally {
      setProcessando(false)
    }
  }

  // Vincular alunos automaticamente
  const vincularAutomaticamente = () => {
    if (!formData.turma_id) {
      setErro('Selecione uma turma primeiro')
      return
    }
    
    const alunosTurma = alunos.filter(a => a.turma_id === formData.turma_id)
    
    const novasNotas = notasPreview.map(nota => {
      const match = encontrarMelhorMatch(nota.nome_pdf, alunosTurma)
      
      if (match.aluno && match.score >= 0.7) {
        return {
          ...nota,
          aluno_id: match.aluno.id,
          vinculado: true
        }
      }
      
      return nota
    })
    
    setNotasPreview(novasNotas)
  }

  // Vincular manualmente
  const vincularManualmente = (index: number, alunoId: string) => {
    const novasNotas = [...notasPreview]
    novasNotas[index] = {
      ...novasNotas[index],
      aluno_id: alunoId || undefined,
      vinculado: !!alunoId
    }
    setNotasPreview(novasNotas)
  }

  // Salvar avaliação
  const salvarAvaliacao = async () => {
    if (!usuario || !dadosExtraidos) return
    
    if (!formData.titulo.trim()) {
      setErro('Informe o título da avaliação')
      return
    }
    
    if (!formData.turma_id) {
      setErro('Selecione uma turma')
      return
    }
    
    setSalvando(true)
    setErro(null)
    
    try {
      // Criar avaliação
      const { data: avaliacao, error: avError } = await supabase
        .from('avaliacoes_rede')
        .insert({
          usuario_id: usuario.id,
          titulo: formData.titulo,
          escola: dadosExtraidos.escola,
          turma_origem: dadosExtraidos.turma,
          disciplina: dadosExtraidos.disciplina,
          data_aplicacao: formData.data_aplicacao,
          total_questoes: dadosExtraidos.totalQuestoes,
          arquivo_nome: arquivo?.name
        })
        .select()
        .single()
      
      if (avError) throw avError
      
      // Inserir notas
      const notasParaInserir = notasPreview.map(nota => ({
        avaliacao_id: avaliacao.id,
        nome_pdf: nota.nome_pdf,
        nota: nota.nota,
        acertos: nota.acertos,
        total_questoes: nota.total_questoes,
        aluno_id: nota.aluno_id,
        vinculado: nota.vinculado
      }))
      
      const { error: notasError } = await supabase
        .from('notas_rede')
        .insert(notasParaInserir)
      
      if (notasError) throw notasError
      
      // Se tiver componente selecionado, vincular às notas do sistema
      if (formData.componente_id) {
        const notasVinculadas = notasPreview.filter(n => n.aluno_id)
        
        for (const nota of notasVinculadas) {
          // Verificar se já existe nota para este aluno/componente/período
          const { data: existing } = await supabase
            .from('notas')
            .select('id')
            .eq('aluno_id', nota.aluno_id)
            .eq('componente_id', formData.componente_id)
            .eq('ano_letivo', new Date().getFullYear())
            .single()
          
          if (existing) {
            // Atualizar
            await supabase
              .from('notas')
              .update({ nota: nota.nota })
              .eq('id', existing.id)
          } else {
            // Inserir
            await supabase
              .from('notas')
              .insert({
                aluno_id: nota.aluno_id,
                turma_id: formData.turma_id,
                componente_id: formData.componente_id,
                periodo: 1,
                ano_letivo: new Date().getFullYear(),
                nota: nota.nota
              })
          }
        }
      }
      
      // Resetar e fechar
      resetarFormulario()
      setShowUploadModal(false)
      carregarDados()
      
    } catch (error: any) {
      setErro(error.message || 'Erro ao salvar avaliação')
    } finally {
      setSalvando(false)
    }
  }

  // Resetar formulário
  const resetarFormulario = () => {
    setArquivo(null)
    setDadosExtraidos(null)
    setTextoExtraido('')
    setNotasPreview([])
    setEtapa('upload')
    setErro(null)
    setFormData({
      titulo: '',
      turma_id: '',
      componente_id: '',
      data_aplicacao: new Date().toISOString().split('T')[0]
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Abrir detalhes da avaliação
  const abrirDetalhes = async (avaliacao: AvaliacaoRede) => {
    setAvaliacaoSelecionada(avaliacao)
    
    const { data } = await supabase
      .from('notas_rede')
      .select('*')
      .eq('avaliacao_id', avaliacao.id)
      .order('nome_pdf')
    
    setNotasAvaliacao(data || [])
    setShowDetalhesModal(true)
  }

  // Excluir avaliação
  const excluirAvaliacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return
    
    await supabase.from('notas_rede').delete().eq('avaliacao_id', id)
    await supabase.from('avaliacoes_rede').delete().eq('id', id)
    
    carregarDados()
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avaliações de Rede</h1>
          <p className="text-gray-600">Importe resultados de avaliações externas (SAEB, simulados da rede)</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Importar Avaliação
        </Button>
      </div>

      {/* Lista de avaliações */}
      {avaliacoes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma avaliação importada
            </h3>
            <p className="text-gray-500 mb-4">
              Importe PDFs ou planilhas com resultados de avaliações da rede
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar primeira avaliação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {avaliacoes.map(av => (
            <Card key={av.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{av.titulo}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {av.escola && <span>{av.escola}</span>}
                      {av.turma_origem && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {av.turma_origem}
                        </span>
                      )}
                      {av.data_aplicacao && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(av.data_aplicacao).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {av.total_questoes && (
                        <Badge variant="secondary">{av.total_questoes} questões</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => abrirDetalhes(av)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Notas
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => excluirAvaliacao(av.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      <Modal 
        isOpen={showUploadModal} 
        onClose={() => { resetarFormulario(); setShowUploadModal(false) }}
        title="Importar Avaliação de Rede"
        size="xl"
      >
        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {erro}
          </div>
        )}

        {/* Etapa 1: Upload */}
        {etapa === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                Clique para selecionar ou arraste o arquivo
              </p>
              <p className="text-sm text-gray-400">
                Formatos aceitos: PDF, CSV
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </div>

            {arquivo && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{arquivo.name}</span>
                  <span className="text-gray-400 text-sm">
                    ({(arquivo.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setArquivo(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowUploadModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={processarArquivo}
                disabled={!arquivo || processando || !pdfReady}
              >
                {processando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : !pdfReady && arquivo?.name.endsWith('.pdf') ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando leitor...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Extrair Dados
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Preview */}
        {etapa === 'preview' && dadosExtraidos && (
          <div className="space-y-4">
            {/* Info extraída */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm text-gray-500">Título</label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Data de Aplicação</label>
                <Input
                  type="date"
                  value={formData.data_aplicacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_aplicacao: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Turma para vincular</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={formData.turma_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, turma_id: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Componente de nota (opcional)</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={formData.componente_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, componente_id: e.target.value }))}
                >
                  <option value="">Não vincular a notas</option>
                  {componentes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {dadosExtraidos.alunos.length} alunos encontrados
                </Badge>
                {dadosExtraidos.totalQuestoes && (
                  <Badge variant="secondary">
                    {dadosExtraidos.totalQuestoes} questões
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowTextoModal(true)}>
                  <Eye className="w-4 h-4 mr-1" />
                  Ver texto extraído
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={vincularAutomaticamente}
                  disabled={!formData.turma_id}
                >
                  <Link2 className="w-4 h-4 mr-1" />
                  Vincular automaticamente
                </Button>
              </div>
            </div>

            {/* Tabela de notas */}
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Nome no PDF</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Nota</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Acertos</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Vincular a</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {notasPreview.map((nota, index) => (
                    <tr key={index} className={nota.vinculado ? 'bg-green-50' : ''}>
                      <td className="p-3 text-gray-900">{nota.nome_pdf}</td>
                      <td className="p-3 text-center font-medium">
                        <span className={nota.nota >= 6 ? 'text-green-600' : 'text-red-600'}>
                          {nota.nota.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-600">
                        {nota.acertos && nota.total_questoes 
                          ? `${nota.acertos}/${nota.total_questoes}`
                          : '-'
                        }
                      </td>
                      <td className="p-3">
                        <select
                          className="w-full p-1 text-sm border rounded"
                          value={nota.aluno_id || ''}
                          onChange={(e) => vincularManualmente(index, e.target.value)}
                        >
                          <option value="">Não vincular</option>
                          {alunos
                            .filter(a => a.turma_id === formData.turma_id)
                            .map(a => (
                              <option key={a.id} value={a.id}>{a.nome}</option>
                            ))
                          }
                        </select>
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

            {/* Rodapé */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setEtapa('upload')}>
                Voltar
              </Button>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 self-center">
                  {notasPreview.filter(n => n.vinculado).length} de {notasPreview.length} vinculados
                </span>
                <Button onClick={salvarAvaliacao} disabled={salvando}>
                  {salvando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Avaliação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de texto extraído */}
      <Modal
        isOpen={showTextoModal}
        onClose={() => setShowTextoModal(false)}
        title="Texto Extraído do Arquivo"
        size="xl"
      >
        <div className="max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg font-mono">
            {textoExtraido || 'Nenhum texto extraído'}
          </pre>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setShowTextoModal(false)}>Fechar</Button>
        </div>
      </Modal>

      {/* Modal de detalhes da avaliação */}
      <Modal
        isOpen={showDetalhesModal}
        onClose={() => setShowDetalhesModal(false)}
        title={avaliacaoSelecionada?.titulo || 'Detalhes da Avaliação'}
        size="xl"
      >
        {avaliacaoSelecionada && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
              {avaliacaoSelecionada.escola && (
                <div>
                  <span className="text-gray-500">Escola:</span>
                  <p className="font-medium">{avaliacaoSelecionada.escola}</p>
                </div>
              )}
              {avaliacaoSelecionada.turma_origem && (
                <div>
                  <span className="text-gray-500">Turma original:</span>
                  <p className="font-medium">{avaliacaoSelecionada.turma_origem}</p>
                </div>
              )}
              {avaliacaoSelecionada.data_aplicacao && (
                <div>
                  <span className="text-gray-500">Data:</span>
                  <p className="font-medium">
                    {new Date(avaliacaoSelecionada.data_aplicacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {notasAvaliacao.length}
                  </p>
                  <p className="text-xs text-gray-500">Alunos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {notasAvaliacao.length > 0 
                      ? (notasAvaliacao.reduce((acc, n) => acc + n.nota, 0) / notasAvaliacao.length).toFixed(1)
                      : '-'
                    }
                  </p>
                  <p className="text-xs text-gray-500">Média</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {notasAvaliacao.filter(n => n.nota >= 6).length}
                  </p>
                  <p className="text-xs text-gray-500">Aprovados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {notasAvaliacao.filter(n => n.vinculado).length}
                  </p>
                  <p className="text-xs text-gray-500">Vinculados</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de notas */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Aluno</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Nota</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Acertos</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-600">Vinculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {notasAvaliacao.map(nota => (
                    <tr key={nota.id}>
                      <td className="p-3 text-gray-900">{nota.nome_pdf}</td>
                      <td className="p-3 text-center">
                        <span className={`font-medium ${
                          nota.nota >= 6 ? 'text-green-600' : 'text-red-600'
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
