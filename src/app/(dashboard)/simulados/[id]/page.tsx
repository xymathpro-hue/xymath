'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Simulado, Turma, Questao, Aluno } from '@/types'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { gerarFolhasRespostasPDF, gerarGabaritoProfessorPDF } from '@/lib/qrcode-generator'
import { 
  ArrowLeft, Download, FileText, QrCode, Edit, Play, Users, Clock, 
  Award, BarChart3, Printer, Eye, CheckCircle, XCircle
} from 'lucide-react'

export default function SimuladoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { usuario } = useAuth()
  const supabase = createClient()
  const simuladoId = params.id as string

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [cabecalhoModal, setCabecalhoModal] = useState(false)
  const [cabecalho, setCabecalho] = useState({
    escola: '',
    endereco: '',
    professor: '',
    data: new Date().toLocaleDateString('pt-BR'),
    disciplina: 'Matemática',
  })

  const fetchData = useCallback(async () => {
    if (!usuario?.id || !simuladoId) return
    try {
      // Buscar simulado
      const { data: simData } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', simuladoId)
        .eq('usuario_id', usuario.id)
        .single()
      
      if (!simData) {
        router.push('/simulados')
        return
      }
      setSimulado(simData)

      // Carregar cabecalho salvo
      if (simData.configuracoes) {
        setCabecalho(prev => ({
          ...prev,
          escola: simData.configuracoes.cabecalho_escola || '',
          endereco: simData.configuracoes.cabecalho_endereco || '',
        }))
      }

      // Buscar turma se definida
      if (simData.turma_id) {
        const { data: turmaData } = await supabase
          .from('turmas')
          .select('*')
          .eq('id', simData.turma_id)
          .single()
        setTurma(turmaData)

        // Buscar alunos da turma
        const { data: alunosData } = await supabase
          .from('alunos')
          .select('*')
          .eq('turma_id', simData.turma_id)
          .eq('ativo', true)
          .order('nome')
        setAlunos(alunosData || [])
      }

      // Buscar questões
      if (simData.questoes_ids && simData.questoes_ids.length > 0) {
        const { data: questoesData } = await supabase
          .from('questoes')
          .select('*')
          .in('id', simData.questoes_ids)
        
        // Ordenar na ordem do simulado
        const questoesOrdenadas = simData.questoes_ids
          .map((id: string) => questoesData?.find(q => q.id === id))
          .filter(Boolean) as Questao[]
        setQuestoes(questoesOrdenadas)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, simuladoId, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Gerar DOCX da prova
  const handleDownloadDocx = async () => {
    if (!simulado || questoes.length === 0) return
    setDownloading('docx')

    try {
      const pontuacao = simulado.configuracoes?.pontuacao_questao || 1

      // Criar documento
      const doc = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }
          },
          children: [
            // Cabeçalho
            new Paragraph({
              children: [new TextRun({ text: cabecalho.escola || '[NOME DA ESCOLA]', bold: true, size: 28 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: cabecalho.endereco || '[Endereço da escola]', size: 20 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: '─'.repeat(70) })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            // Título
            new Paragraph({
              children: [new TextRun({ text: simulado.titulo, bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            ...(simulado.descricao ? [
              new Paragraph({
                children: [new TextRun({ text: simulado.descricao, italics: true, size: 22 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              })
            ] : []),
            // Info box
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Disciplina: ${cabecalho.disciplina}`, size: 20 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Turma: ${turma?.nome || '________'}`, size: 20 })] })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Professor(a): ${cabecalho.professor || '________________'}`, size: 20 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Data: ${cabecalho.data}`, size: 20 })] })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: 'Aluno(a): ________________________________________________', size: 20 })] })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Tempo: ${simulado.tempo_minutos} minutos`, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Valor: ${(questoes.length * pontuacao).toFixed(1)} pontos`, size: 18 })] })] }),
                  ],
                }),
              ],
            }),
            // Instruções
            new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'INSTRUÇÕES:', bold: true, size: 22 })], spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '• Leia atentamente cada questão antes de responder.', size: 20 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: '• Marque apenas UMA alternativa para cada questão.', size: 20 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: '• Utilize caneta azul ou preta.', size: 20 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: '─'.repeat(70) })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 300 } }),
            // Questões
            ...questoes.flatMap((q, index) => {
              const alternativas = [
                { letra: 'A', texto: q.alternativa_a },
                { letra: 'B', texto: q.alternativa_b },
                { letra: 'C', texto: q.alternativa_c },
                { letra: 'D', texto: q.alternativa_d },
                ...(q.alternativa_e ? [{ letra: 'E', texto: q.alternativa_e }] : [])
              ]
              
              return [
                new Paragraph({
                  children: [
                    new TextRun({ text: `Questão ${index + 1}`, bold: true, size: 24 }),
                    new TextRun({ text: ` (${pontuacao} ${pontuacao === 1 ? 'ponto' : 'pontos'})`, size: 20 }),
                  ],
                  spacing: { before: 300, after: 100 },
                }),
                ...((q as any).habilidade_codigo ? [
                  new Paragraph({
                    children: [new TextRun({ text: `[${(q as any).habilidade_codigo}${(q as any).descritor_codigo ? ' | ' + (q as any).descritor_codigo : ''}]`, size: 18, italics: true, color: '666666' })],
                    spacing: { after: 100 },
                  })
                ] : []),
                new Paragraph({
                  children: [new TextRun({ text: q.enunciado, size: 22 })],
                  spacing: { after: 150 },
                }),
                ...alternativas.map(alt => new Paragraph({
                  children: [
                    new TextRun({ text: `(   ) ${alt.letra}) `, bold: true, size: 22 }),
                    new TextRun({ text: alt.texto, size: 22 }),
                  ],
                  spacing: { after: 80 },
                })),
                new Paragraph({ children: [], spacing: { after: 200 } }),
              ]
            }),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`)
    } catch (e) {
      console.error('Erro ao gerar DOCX:', e)
    } finally {
      setDownloading(null)
    }
  }

  // Gerar folhas de respostas com QR Code
  const handleDownloadFolhasRespostas = async () => {
    if (!simulado || !turma || alunos.length === 0) return
    setDownloading('folhas')

    try {
      const blob = await gerarFolhasRespostasPDF({
        simulado: { id: simulado.id, titulo: simulado.titulo, tempo_minutos: simulado.tempo_minutos },
        turma: { id: turma.id, nome: turma.nome, ano_serie: turma.ano_serie },
        alunos: alunos,
        totalQuestoes: questoes.length,
        alternativasPorQuestao: questoes.some(q => q.alternativa_e) ? 5 : 4,
        cabecalho: {
          escola: cabecalho.escola,
          professor: cabecalho.professor,
          data: cabecalho.data,
          disciplina: cabecalho.disciplina,
        },
      })

      saveAs(blob, `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
    } catch (e) {
      console.error('Erro ao gerar folhas:', e)
    } finally {
      setDownloading(null)
    }
  }

  // Gerar gabarito do professor
  const handleDownloadGabarito = async () => {
    if (!simulado || questoes.length === 0) return
    setDownloading('gabarito')

    try {
      const blob = await gerarGabaritoProfessorPDF({
        simulado: { titulo: simulado.titulo },
        turma: { nome: turma?.nome || 'Geral' },
        questoes: questoes,
        cabecalho: { escola: cabecalho.escola, data: cabecalho.data },
      })

      saveAs(blob, `Gabarito_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
    } catch (e) {
      console.error('Erro ao gerar gabarito:', e)
    } finally {
      setDownloading(null)
    }
  }

  // Publicar simulado
  const handlePublish = async () => {
    if (!simulado) return
    await supabase.from('simulados').update({ status: 'publicado' }).eq('id', simulado.id)
    fetchData()
  }

  const pontuacao = simulado?.configuracoes?.pontuacao_questao || 1
  const totalPontos = questoes.length * pontuacao

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
  }

  if (!simulado) return null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/simulados" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{simulado.titulo}</h1>
              <Badge variant={simulado.status === 'publicado' ? 'success' : simulado.status === 'rascunho' ? 'warning' : 'default'}>
                {simulado.status}
              </Badge>
            </div>
            {simulado.descricao && <p className="text-gray-600">{simulado.descricao}</p>}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Link href={`/simulados/novo?edit=${simulado.id}`}>
              <Button variant="outline"><Edit className="w-4 h-4 mr-2" />Editar</Button>
            </Link>
            {simulado.status === 'rascunho' && (
              <Button onClick={handlePublish}><Play className="w-4 h-4 mr-2" />Publicar</Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-2xl font-bold">{questoes.length}</p><p className="text-xs text-gray-500">Questões</p></div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-2xl font-bold">{totalPontos.toFixed(1)}</p><p className="text-xs text-gray-500">Pontos</p></div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div><p className="text-2xl font-bold">{simulado.tempo_minutos}</p><p className="text-xs text-gray-500">Minutos</p></div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div><p className="text-2xl font-bold">{turma?.nome || '-'}</p><p className="text-xs text-gray-500">Turma</p></div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="text-2xl font-bold">{alunos.length}</p><p className="text-xs text-gray-500">Alunos</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Downloads */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Downloads</h2>
            <Button variant="ghost" size="sm" onClick={() => setCabecalhoModal(true)}>
              Configurar Cabeçalho
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={handleDownloadDocx}
              disabled={downloading === 'docx'}
              className="p-4 border-2 border-dashed rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Prova (Word)</p>
                  <p className="text-xs text-gray-500">.docx editável</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Baixe a prova em formato Word para editar o cabeçalho da sua escola.</p>
              {downloading === 'docx' && <p className="text-xs text-indigo-600 mt-2">Gerando...</p>}
            </button>

            <button
              onClick={handleDownloadFolhasRespostas}
              disabled={downloading === 'folhas' || !turma || alunos.length === 0}
              className="p-4 border-2 border-dashed rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Folhas de Respostas</p>
                  <p className="text-xs text-gray-500">PDF com QR Code</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {turma && alunos.length > 0 
                  ? `Gera ${alunos.length} folhas com QR Code único por aluno.`
                  : 'Selecione uma turma com alunos cadastrados.'
                }
              </p>
              {downloading === 'folhas' && <p className="text-xs text-green-600 mt-2">Gerando...</p>}
            </button>

            <button
              onClick={handleDownloadGabarito}
              disabled={downloading === 'gabarito'}
              className="p-4 border-2 border-dashed rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Gabarito Oficial</p>
                  <p className="text-xs text-gray-500">PDF para o professor</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Gabarito com todas as respostas corretas.</p>
              {downloading === 'gabarito' && <p className="text-xs text-purple-600 mt-2">Gerando...</p>}
            </button>
          </div>

          {simulado.status === 'publicado' && turma && (
            <div className="mt-4 pt-4 border-t">
              <Link href={`/simulados/${simulado.id}/corrigir`}>
                <Button className="w-full sm:w-auto">
                  <QrCode className="w-5 h-5 mr-2" />
                  Corrigir Gabaritos (Escanear QR Code)
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questões */}
      <Card variant="bordered">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Questões ({questoes.length})</h2>
            <Button variant="ghost" size="sm" onClick={() => setPreviewModalOpen(true)}>
              <Eye className="w-4 h-4 mr-2" />Visualizar
            </Button>
          </div>

          <div className="space-y-3">
            {questoes.map((q, index) => (
              <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                    <Badge className="text-xs">{q.dificuldade}</Badge>
                    <span className="text-xs text-green-600 font-medium">Resp: {q.resposta_correta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Cabeçalho */}
      <Modal isOpen={cabecalhoModal} onClose={() => setCabecalhoModal(false)} title="Configurar Cabeçalho">
        <div className="space-y-4">
          <Input label="Nome da Escola" value={cabecalho.escola} onChange={(e) => setCabecalho({ ...cabecalho, escola: e.target.value })} placeholder="Ex: Escola Municipal João da Silva" />
          <Input label="Endereço" value={cabecalho.endereco} onChange={(e) => setCabecalho({ ...cabecalho, endereco: e.target.value })} placeholder="Ex: Rua das Flores, 123" />
          <Input label="Professor(a)" value={cabecalho.professor} onChange={(e) => setCabecalho({ ...cabecalho, professor: e.target.value })} placeholder="Seu nome" />
          <Input label="Data" value={cabecalho.data} onChange={(e) => setCabecalho({ ...cabecalho, data: e.target.value })} placeholder="DD/MM/AAAA" />
          <Input label="Disciplina" value={cabecalho.disciplina} onChange={(e) => setCabecalho({ ...cabecalho, disciplina: e.target.value })} />
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCabecalhoModal(false)}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Preview */}
      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title="Pré-visualização" size="xl">
        <div className="max-h-[70vh] overflow-y-auto space-y-6">
          {questoes.map((q, index) => (
            <div key={q.id} className="border-b pb-4">
              <p className="font-semibold mb-2">Questão {index + 1}</p>
              <p className="text-gray-700 mb-3">{q.enunciado}</p>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D', 'E'].map(letra => {
                  const alt = q[`alternativa_${letra.toLowerCase()}` as keyof Questao] as string
                  if (!alt) return null
                  const isCorrect = q.resposta_correta === letra
                  return (
                    <div key={letra} className={`p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                      <span className="font-medium">{letra})</span> {alt}
                      {isCorrect && <span className="ml-2 text-green-600 text-sm">(Correta)</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
