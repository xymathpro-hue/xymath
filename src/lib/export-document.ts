import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell } from 'docx'
import { saveAs } from 'file-saver'

interface Questao {
  id: string
  enunciado: string
  alternativa_a?: string
  alternativa_b?: string
  alternativa_c?: string
  alternativa_d?: string
  alternativa_e?: string
  resposta_correta?: string
}

// ==================== GABARITO PDF ====================

export async function exportGabaritoPDF(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
  instituicao?: string
  valorTotal?: number
}) {
  const { titulo, questoes, turma, instituicao = 'xyMath - Plataforma de Matemática', valorTotal = 10 } = config

  const doc = new jsPDF()
  gerarPaginaGabarito(doc, { titulo, questoes, turma, instituicao, valorTotal })
  doc.save(`Gabarito_${titulo}.pdf`)
}

// ==================== PÁGINA DO GABARITO ====================

function gerarPaginaGabarito(
  doc: jsPDF,
  config: {
    titulo: string
    questoes: Questao[]
    turma?: string
    instituicao: string
    valorTotal: number
  }
) {
  const { titulo, questoes, turma, instituicao, valorTotal } = config

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // 🔲 MARCADORES OPENCV
  doc.setFillColor(0, 0, 0)
  doc.rect(5, 5, 5, 5, 'F')
  doc.rect(pageWidth - 10, 5, 5, 5, 'F')
  doc.rect(5, pageHeight - 10, 5, 5, 'F')
  doc.rect(pageWidth - 10, pageHeight - 10, 5, 5, 'F')

  // 🔥 RESET TOTAL (OBRIGATÓRIO)
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(0, 0, 0)
  doc.setTextColor(0, 0, 0)

  let y = 25

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(16)
  doc.text('GABARITO OFICIAL', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(titulo, pageWidth / 2, y, { align: 'center' })
  y += 6

  if (turma) {
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  doc.text(`Valor total: ${valorTotal.toFixed(1)} pontos`, pageWidth / 2, y, { align: 'center' })
  y += 12

  // 🔢 TABELA DO GABARITO (SEM FD)
  const porLinha = 10
  const cellWidth = contentWidth / porLinha
  const cellHeight = 10

  for (let i = 0; i < questoes.length; i += porLinha) {
    const linha = questoes.slice(i, i + porLinha)
    const startX = margin + (contentWidth - linha.length * cellWidth) / 2

    // NÚMEROS
    linha.forEach((_, idx) => {
      const x = startX + idx * cellWidth

      doc.setFillColor(232, 232, 232)
      doc.rect(x, y, cellWidth, cellHeight, 'F')

      doc.setDrawColor(120)
      doc.rect(x, y, cellWidth, cellHeight)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text(String(i + idx + 1), x + cellWidth / 2, y + 7, { align: 'center' })
    })

    y += cellHeight

    // RESPOSTAS
    linha.forEach((q, idx) => {
      const x = startX + idx * cellWidth

      doc.setFillColor(255, 255, 255)
      doc.rect(x, y, cellWidth, cellHeight, 'F')

      doc.setDrawColor(120)
      doc.rect(x, y, cellWidth, cellHeight)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text(q.resposta_correta?.toUpperCase() || '-', x + cellWidth / 2, y + 7, { align: 'center' })
    })

    y += cellHeight + 6
  }

  // Rodapé
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120)
  doc.text(
    'Documento exclusivo do professor - Não divulgar aos alunos',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )
}
