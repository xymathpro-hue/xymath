'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Download, Users, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

interface Simulado {
  id: string
  titulo: string
  total_questoes: number
  gabarito: string[]
  turmas_ids: string[]
  turma_id: string | null
  configuracoes: {
    cabecalho_escola?: string
    cabecalho_endereco?: string
  }
}

interface Aluno {
  id: string
  nome: string
  matricula: string | null
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const { data: simData, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !simData) {
        alert('Simulado não encontrado')
        router.push('/simulados')
        return
      }

      setSimulado(simData)

      const turmaIds = simData.turmas_ids?.length > 0 
        ? simData.turmas_ids 
        : simData.turma_id ? [simData.turma_id] : []

      if (turmaIds.length > 0) {
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
          .in('id', turmaIds)

        if (turmasData) {
          setTurmas(turmasData)
          setTurmaSelecionada(turmasData[0]?.id || '')
        }
      }

      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  useEffect(() => {
    const carregarAlunos = async () => {
      if (!turmaSelecionada) {
        setAlunos([])
        return
      }

      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])
    }

    carregarAlunos()
  }, [turmaSelecionada, supabase])

  const gerarPDF = async () => {
    if (!simulado || alunos.length === 0) return

    setGerando(true)

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 10
      const halfHeight = pageHeight / 2

      const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

      for (let i = 0; i < alunos.length; i++) {
        const aluno = alunos[i]
        const isTopHalf = i % 2 === 0
        const yOffset = isTopHalf ? 0 : halfHeight

        // Nova página a cada 2 alunos
        if (i > 0 && i % 2 === 0) {
          doc.addPage()
        }

        // Gerar QR Code com dados completos
        const qrData = JSON.stringify({
          s: simulado.id,
          a: aluno.id,
          t: turmaSelecionada,
          q: simulado.total_questoes
        })

        // QR Code maior para melhor leitura
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 150,
          margin: 2,
          errorCorrectionLevel: 'H' // Alta correção de erros
        })

        // === DESENHAR FOLHA ===

        // Marcadores de canto (quadrados pretos) - MAIORES para melhor detecção
        const markerSize = 6
        doc.setFillColor(0, 0, 0)
        // Superior esquerdo
        doc.rect(margin, yOffset + margin, markerSize, markerSize, 'F')
        // Superior direito
        doc.rect(pageWidth - margin - markerSize, yOffset + margin, markerSize, markerSize, 'F')
        // Inferior esquerdo
        doc.rect(margin, yOffset + halfHeight - margin - markerSize, markerSize, markerSize, 'F')
        // Inferior direito
        doc.rect(pageWidth - margin - markerSize, yOffset + halfHeight - margin - markerSize, markerSize, markerSize, 'F')

        // Linha divisória (tracejada) entre as duas folhas
        if (!isTopHalf) {
          doc.setDrawColor(180, 180, 180)
          doc.setLineWidth(0.3)
          doc.setLineDashPattern([2, 2], 0)
          doc.line(margin, halfHeight, pageWidth - margin, halfHeight)
          doc.setLineDashPattern([], 0)
        }

        // QR Code - MAIOR e bem posicionado (canto superior direito)
        const qrSize = 28
        const qrX = pageWidth - margin - qrSize - 2
        const qrY = yOffset + margin + markerSize + 2
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

        // Cabeçalho
        let currentY = yOffset + margin + markerSize + 4

        if (simulado.configuracoes?.cabecalho_escola) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(simulado.configuracoes.cabecalho_escola, margin + markerSize + 2, currentY)
          currentY += 4
        }

        if (simulado.configuracoes?.cabecalho_endereco) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.text(simulado.configuracoes.cabecalho_endereco, margin + markerSize + 2, currentY)
          currentY += 4
        }

        // Título do simulado
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(simulado.titulo, margin + markerSize + 2, currentY + 2)
        currentY += 10

        // Linha separadora
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.3)
        doc.line(margin, currentY, pageWidth - margin, currentY)
        currentY += 5

        // Dados do aluno
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('ALUNO:', margin + 2, currentY)
        doc.setFont('helvetica', 'normal')
        const nomeAluno = aluno.nome.length > 40 ? aluno.nome.substring(0, 40) + '...' : aluno.nome
        doc.text(nomeAluno, margin + 17, currentY)
        currentY += 5

        doc.setFont('helvetica', 'bold')
        doc.text('TURMA:', margin + 2, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(`${turmaAtual?.nome || ''} - ${turmaAtual?.ano_serie || ''}`, margin + 17, currentY)

        if (aluno.matricula) {
          doc.setFont('helvetica', 'bold')
          doc.text('MAT:', margin + 70, currentY)
          doc.setFont('helvetica', 'normal')
          doc.text(aluno.matricula, margin + 80, currentY)
        }
        currentY += 7

        // Instruções
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, currentY, pageWidth - 2 * margin, 7, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('INSTRUÇÕES: Preencha COMPLETAMENTE o círculo. Use caneta PRETA. Não rasure. Marque apenas UMA alternativa.', margin + 2, currentY + 4.5)
        currentY += 10
        // Grade de respostas - FORMATO 2 COLUNAS (de cima para baixo)
        // BOLINHAS MENORES para facilitar preenchimento
        const totalQuestoes = simulado.total_questoes
        const questoesPorColuna = Math.ceil(totalQuestoes / 2)
        const colunaWidth = (pageWidth - 2 * margin) / 2
        const linhaHeight = 6.5
        const circleRadius = 2.0 // REDUZIDO de 2.8 para 2.0

        for (let q = 0; q < totalQuestoes; q++) {
          // Determina coluna e linha (numeração de cima para baixo)
          const col = q < questoesPorColuna ? 0 : 1
          const row = q < questoesPorColuna ? q : q - questoesPorColuna
          
          const baseX = margin + col * colunaWidth
          const y = currentY + row * linhaHeight

          // Número da questão (fora das bolinhas, à esquerda)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          const numQuestao = String(q + 1).padStart(2, '0')
          doc.text(numQuestao, baseX + 2, y + 3)

          // Alternativas A, B, C, D, E
          const alternativas = ['A', 'B', 'C', 'D', 'E']
          const startX = baseX + 12

          alternativas.forEach((alt, idx) => {
            const circleX = startX + idx * 10
            const circleY = y + 2

            // Círculo com borda mais fina
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.3)
            doc.setFillColor(255, 255, 255)
            doc.circle(circleX, circleY, circleRadius)

            // Letra dentro do círculo
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.text(alt, circleX, circleY + 0.7, { align: 'center' })
          })
        }

        // Rodapé
        const footerY = yOffset + halfHeight - margin - 2
        doc.setFontSize(5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`ID: ${aluno.id.substring(0, 8)}`, margin + markerSize + 2, footerY)
        doc.text('xyMath - Sistema de Avaliação', pageWidth / 2, footerY, { align: 'center' })
        doc.text(`Folha ${i + 1} de ${alunos.length}`, pageWidth - margin - markerSize - 2, footerY, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      // Baixar PDF
      const turmaName = turmaAtual?.nome?.replace(/\s+/g, '_') || 'turma'
      doc.save(`folhas_respostas_${simulado.titulo.replace(/\s+/g, '_')}_${turmaName}.pdf`)

    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF')
    } finally {
      setGerando(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!simulado) return null

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controles */}
      <div className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Folha de Respostas</h1>
              <p className="text-gray-600">{simulado.titulo}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {turmas.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <select
                  value={turmaSelecionada}
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  {turmas.map(turma => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.ano_serie}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                {alunos.length} alunos
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                {simulado.total_questoes} questões
              </span>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={gerarPDF}
              disabled={alunos.length === 0 || gerando}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {gerando ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          </div>

          {alunos.length === 0 && turmaSelecionada && (
            <p className="mt-4 text-amber-600 bg-amber-50 p-3 rounded-lg">
              Nenhum aluno encontrado nesta turma. Cadastre alunos primeiro.
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pré-visualização do Layout</h2>
            
            {/* Exemplo visual do formato */}
            <div className="border rounded-lg p-4 bg-gray-50 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-gray-900">Nome do Aluno</p>
                  <p className="text-sm text-gray-600">Turma - Ano/Série</p>
                </div>
                <div className="w-20 h-20 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">QR CODE</span>
                </div>
              </div>
              
              {/* Layout 2 colunas */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-5 text-gray-900">{String(n).padStart(2, '0')}</span>
                      <div className="flex gap-1">
                        {['A', 'B', 'C', 'D', 'E'].map(alt => (
                          <div key={alt} className="w-4 h-4 border border-gray-600 rounded-full flex items-center justify-center text-[7px] font-bold text-gray-900">
                            {alt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {[6, 7, 8, 9, 10].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-5 text-gray-900">{String(n).padStart(2, '0')}</span>
                      <div className="flex gap-1">
                        {['A', 'B', 'C', 'D', 'E'].map(alt => (
                          <div key={alt} className="w-4 h-4 border border-gray-600 rounded-full flex items-center justify-center text-[7px] font-bold text-gray-900">
                            {alt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de alunos */}
            <h3 className="font-medium text-gray-900 mb-2">Alunos ({alunos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {alunos.map((aluno, index) => (
                <div key={aluno.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                  <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                    {index + 1}
                  </span>
                  <span className="truncate text-gray-900">{aluno.nome}</span>
                </div>
              ))}
            </div>

            {alunos.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700">
                  <FileText className="w-4 h-4 inline mr-2" />
                  O PDF terá <strong>{Math.ceil(alunos.length / 2)}</strong> página(s) A4 
                  com <strong>2 folhas por página</strong>.
                </p>
              </div>
            )}

            {/* Dicas de preenchimento */}
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Dicas para o aluno:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Preencha <strong>completamente</strong> o círculo da alternativa</li>
                <li>• Use caneta <strong>PRETA</strong></li>
                <li>• Marque apenas <strong>UMA</strong> alternativa por questão</li>
                <li>• <strong>Não rasure</strong> - se errar, peça outra folha</li>
                <li>• <strong>Não dobre</strong> a folha sobre o QR Code</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
