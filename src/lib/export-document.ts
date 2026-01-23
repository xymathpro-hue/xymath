import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
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
  dificuldade?: string
  habilidade_id?: string
  ano_serie?: string
}

// ==================== EXPORTAR PARA WORD ====================

export async function exportToWord(config: {
  titulo: string
  subtitulo?: string
  questoes: Questao[]
  turma?: string
  incluirGabarito?: boolean
  incluirCabecalho?: boolean
  instituicao?: string
  valorTotal?: number
}) {
  const { 
    titulo, 
    subtitulo,
    questoes, 
    turma, 
    incluirGabarito = true, 
    incluirCabecalho = true,
    instituicao = 'xyMath - Plataforma de Matemática',
    valorTotal = 10
  } = config

  const valorQuestao = valorTotal / questoes.length
  const children: Paragraph[] = []

  if (incluirCabecalho) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    )
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER
    })
  )

  if (turma) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Turma: ${turma}`, size: 22 })],
        alignment: AlignmentType.CENTER
      })
    )
  }

  questoes.forEach((q, i) => {
    const enunciado = q.enunciado.replace(/<[^>]*>/g, '')
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true }),
          new TextRun({ text: enunciado })
        ],
        spacing: { before: 300 }
      })
    )
  })

  if (incluirGabarito) {
    children.push(new Paragraph({ pageBreakBefore: true }))
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'GABARITO OFICIAL', bold: true, size: 32 })],
        alignment: AlignmentType.CENTER
      })
    )

    const rows: TableRow[] = []
    const porLinha = 10

    for (let i = 0; i < questoes.length; i += porLinha) {
      const linha = questoes.slice(i, i + porLinha)

      rows.push(
        new TableRow({
          children: linha.map((_, idx) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: `${i + idx + 1}`, bold: true })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: 'E8E8E8' }
            })
          )
        })
      )

      rows.push(
        new TableRow({
          children: linha.map(q =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: q.resposta_correta?.toUpperCase() || '-' })],
                alignment: AlignmentType.CENTER
              })]
            })
          )
        })
      )
    }

    children.push(new Table({ rows }) as any)
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${titulo}.docx`)
}

// ==================== PROVA PDF ====================

export async function exportToPDF(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
  instituicao?: string
  valorTotal?: number
}) {
  const { titulo, questoes, turma, instituicao = 'xyMath - Plataforma de Matemática', valorTotal = 10 } = config
  const doc = new jsPDF()

  questoes.forEach(() => {})

  doc.addPage()
  gerarPaginaGabarito(doc, { titulo, turma, questoes, instituicao, valorTotal })
  doc.save(`${titulo}.pdf`)
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
  gerarPaginaGabarito(doc, { titulo, turma, questoes, instituicao, valorTotal })
  doc.save(`Gabarito_${titulo}.pdf`)
}

// ==================== PÁGINA DO GABARITO ====================

function gerarPaginaGabarito(doc: jsPDF, config: {
  titulo: string
  turma?: string
  questoes: Questao[]
  instituicao: string
  valorTotal: number
}) {
  const { titulo, turma, questoes, instituicao, valorTotal } = config

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // 🔴 Marcadores OpenCV
  doc.setFillColor(0, 0, 0)
  doc.rect(5, 5, 5, 5, 'F')
  doc.rect(pageWidth - 10, 5, 5, 5, 'F')
  doc.rect(5, pageHeight - 10, 5, 5, 'F')
  doc.rect(pageWidth - 10, pageHeight - 10, 5, 5, 'F')

  // ✅ RESET ABSOLUTO DE CORES (CRÍTICO)
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(0, 0, 0)
  doc.setTextColor(0, 0, 0)

  let y = 25

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
    doc.setFontSize(10)
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  doc.text(`Valor total: ${valorTotal.toFixed(1)} pontos`, pageWidth / 2, y, { align: 'center' })
  y += 12

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

      doc.setDrawColor(100)
      doc.rect(x, y, cellWidth, cellHeight)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text(`${i + idx + 1}`, x + cellWidth / 2, y + 7, { align: 'center' })
    })

    y += cellHeight

    // RESPOSTAS
    linha.forEach((q, idx) => {
      const x = startX + idx * cellWidth

      doc.setFillColor(255, 255, 255)
      doc.rect(x, y, cellWidth, cellHeight, 'F')

      doc.setDrawColor(100)
      doc.rect(x, y, cellWidth, cellHeight)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text(q.resposta_correta?.toUpperCase() || '-', x + cellWidth / 2, y + 7, { align: 'center' })
    })

    y += cellHeight + 6
  }

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
