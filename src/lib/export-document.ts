// src/lib/export-document.ts

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'

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
  habilidade_codigo?: string
}

interface ExportConfig {
  titulo: string
  subtitulo?: string
  instituicao?: string
  professor?: string
  turma?: string
  data?: string
  tempo?: number
  incluirGabarito?: boolean
  incluirCabecalho?: boolean
  questoes: Questao[]
}

// ==================== WORD ====================

export async function exportToWord(config: ExportConfig) {
  const {
    titulo,
    subtitulo,
    instituicao,
    turma,
    tempo,
    incluirGabarito = true,
    incluirCabecalho = true,
    questoes
  } = config

  const children: any[] = []

  if (incluirCabecalho) {
    if (instituicao) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      )
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: titulo, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    )

    if (subtitulo) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: subtitulo, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      )
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Nome: ', bold: true }),
          new TextRun({ text: '______________________________________________ ' }),
          new TextRun({ text: 'Nº: ', bold: true }),
          new TextRun({ text: '______' }),
        ],
        spacing: { after: 100 }
      })
    )

    const infoLine: TextRun[] = []
    if (turma) {
      infoLine.push(new TextRun({ text: 'Turma: ', bold: true }))
      infoLine.push(new TextRun({ text: `${turma}  ` }))
    }
    if (tempo) {
      infoLine.push(new TextRun({ text: 'Tempo: ', bold: true }))
      infoLine.push(new TextRun({ text: `${tempo} minutos` }))
    }

    if (infoLine.length > 0) {
      children.push(
        new Paragraph({
          children: infoLine,
          spacing: { after: 200 }
        })
      )
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(80) })],
        spacing: { after: 300 }
      })
    )
  }

  questoes.forEach((questao, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${index + 1}`, bold: true, size: 24 }),
          questao.habilidade_codigo ? new TextRun({ text: ` (${questao.habilidade_codigo})`, size: 20, color: '666666' }) : new TextRun({ text: '' })
        ],
        spacing: { before: 300, after: 150 }
      })
    )

    children.push(
      new Paragraph({
        children: [new TextRun({ text: questao.enunciado, size: 22 })],
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED
      })
    )

    const alternativas = [
      { letra: 'A', texto: questao.alternativa_a },
      { letra: 'B', texto: questao.alternativa_b },
      { letra: 'C', texto: questao.alternativa_c },
      { letra: 'D', texto: questao.alternativa_d },
      { letra: 'E', texto: questao.alternativa_e },
    ].filter(alt => alt.texto)

    alternativas.forEach(alt => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `(${alt.letra}) `, bold: true }),
            new TextRun({ text: alt.texto || '' })
          ],
          spacing: { after: 80 },
          indent: { left: 400 }
        })
      )
    })

    children.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 200 }
      })
    )
  })

  if (incluirGabarito) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        pageBreakBefore: true
      })
    )

    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'GABARITO', bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    )

    const gabaritoRows: TableRow[] = []
    const questoesPorLinha = 10

    for (let i = 0; i < questoes.length; i += questoesPorLinha) {
      const questoesLinha = questoes.slice(i, i + questoesPorLinha)

      gabaritoRows.push(
        new TableRow({
          children: questoesLinha.map((_, idx) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: `${i + idx + 1}`, bold: true })],
                alignment: AlignmentType.CENTER
              })],
              width: { size: 800, type: WidthType.DXA },
              shading: { fill: 'E8E8E8' }
            })
          )
        })
      )

      gabaritoRows.push(
        new TableRow({
          children: questoesLinha.map(q =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: q.resposta_correta || '-', bold: true })],
                alignment: AlignmentType.CENTER
              })],
              width: { size: 800, type: WidthType.DXA }
            })
          )
        })
      )
    }

    children.push(
      new Table({
        rows: gabaritoRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    )
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ==================== PDF ====================

export async function exportToPDF(config: ExportConfig) {
  const {
    titulo,
    subtitulo,
    instituicao,
    turma,
    tempo,
    incluirGabarito = true,
    incluirCabecalho = true,
    questoes
  } = config

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const checkNewPage = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize)
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = doc.getTextWidth(testLine)
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    return lines
  }

  // Cabeçalho
  if (incluirCabecalho) {
    if (instituicao) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(titulo, pageWidth / 2, y, { align: 'center' })
    y += 7

    if (subtitulo) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(subtitulo, pageWidth / 2, y, { align: 'center' })
      y += 7
    }

    y += 5

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Nome: ________________________________________________  Nº: ______', margin, y)
    y += 7

    let infoText = ''
    if (turma) infoText += `Turma: ${turma}    `
    if (tempo) infoText += `Tempo: ${tempo} minutos`
    if (infoText) {
      doc.text(infoText, margin, y)
      y += 7
    }

    // Linha divisória
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10
  }

  // Questões
  questoes.forEach((questao, index) => {
    checkNewPage(50)

    // Número da questão
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    let questaoHeader = `Questão ${index + 1}`
    if (questao.habilidade_codigo) {
      questaoHeader += ` (${questao.habilidade_codigo})`
    }
    doc.text(questaoHeader, margin, y)
    y += 6

    // Enunciado
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const enunciadoLines = wrapText(questao.enunciado, contentWidth, 10)
    enunciadoLines.forEach(line => {
      checkNewPage(6)
      doc.text(line, margin, y)
      y += 5
    })
    y += 3

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: questao.alternativa_a },
      { letra: 'B', texto: questao.alternativa_b },
      { letra: 'C', texto: questao.alternativa_c },
      { letra: 'D', texto: questao.alternativa_d },
      { letra: 'E', texto: questao.alternativa_e },
    ].filter(alt => alt.texto)

    alternativas.forEach(alt => {
      checkNewPage(6)
      doc.setFont('helvetica', 'bold')
      doc.text(`(${alt.letra})`, margin + 5, y)
      doc.setFont('helvetica', 'normal')
      
      const altLines = wrapText(alt.texto || '', contentWidth - 15, 10)
      altLines.forEach((line, lineIdx) => {
        if (lineIdx > 0) checkNewPage(5)
        doc.text(line, margin + 15, y)
        y += 5
      })
    })

    y += 8
  })

  // Gabarito
  if (incluirGabarito) {
    doc.addPage()
    y = margin

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('GABARITO', pageWidth / 2, y, { align: 'center' })
    y += 15

    doc.setFontSize(10)
    const questoesPorLinha = 10
    const cellWidth = contentWidth / questoesPorLinha
    const cellHeight = 8

    for (let i = 0; i < questoes.length; i += questoesPorLinha) {
      const questoesLinha = questoes.slice(i, i + questoesPorLinha)

      // Linha com números
      doc.setFillColor(232, 232, 232)
      questoesLinha.forEach((_, idx) => {
        const x = margin + idx * cellWidth
        doc.rect(x, y, cellWidth, cellHeight, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + idx + 1}`, x + cellWidth / 2, y + 5.5, { align: 'center' })
      })
      y += cellHeight

      // Linha com respostas
      questoesLinha.forEach((q, idx) => {
        const x = margin + idx * cellWidth
        doc.rect(x, y, cellWidth, cellHeight)
        doc.setFont('helvetica', 'bold')
        doc.text(q.resposta_correta || '-', x + cellWidth / 2, y + 5.5, { align: 'center' })
      })
      y += cellHeight + 5
    }
  }

  const fileName = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(fileName)
}

// ==================== GABARITO WORD ====================

export async function exportGabaritoWord(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
}) {
  const { titulo, questoes, turma } = config

  const children: any[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `GABARITO - ${titulo}`, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  )

  if (turma) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Turma: ${turma}`, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    )
  }

  const gabaritoRows: TableRow[] = []
  const questoesPorLinha = 10

  for (let i = 0; i < questoes.length; i += questoesPorLinha) {
    const questoesLinha = questoes.slice(i, i + questoesPorLinha)

    gabaritoRows.push(
      new TableRow({
        children: questoesLinha.map((_, idx) =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `${i + idx + 1}`, bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 800, type: WidthType.DXA },
            shading: { fill: 'E8E8E8' }
          })
        )
      })
    )

    gabaritoRows.push(
      new TableRow({
        children: questoesLinha.map(q =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: q.resposta_correta || '-', bold: true, size: 28 })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 800, type: WidthType.DXA }
          })
        )
      })
    )
  }

  children.push(
    new Table({
      rows: gabaritoRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  )

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `Gabarito_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ==================== GABARITO PDF ====================

export async function exportGabaritoPDF(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
}) {
  const { titulo, questoes, turma } = config

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`GABARITO - ${titulo}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  if (turma) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 10
  }

  y += 10

  doc.setFontSize(10)
  const questoesPorLinha = 10
  const cellWidth = contentWidth / questoesPorLinha
  const cellHeight = 10

  for (let i = 0; i < questoes.length; i += questoesPorLinha) {
    const questoesLinha = questoes.slice(i, i + questoesPorLinha)

    // Linha com números
    doc.setFillColor(232, 232, 232)
    questoesLinha.forEach((_, idx) => {
      const x = margin + idx * cellWidth
      doc.rect(x, y, cellWidth, cellHeight, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + idx + 1}`, x + cellWidth / 2, y + 7, { align: 'center' })
    })
    y += cellHeight

    // Linha com respostas
    doc.setFontSize(14)
    questoesLinha.forEach((q, idx) => {
      const x = margin + idx * cellWidth
      doc.rect(x, y, cellWidth, cellHeight)
      doc.setFont('helvetica', 'bold')
      doc.text(q.resposta_correta || '-', x + cellWidth / 2, y + 7, { align: 'center' })
    })
    doc.setFontSize(10)
    y += cellHeight + 8
  }

  const fileName = `Gabarito_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(fileName)
                                      }
