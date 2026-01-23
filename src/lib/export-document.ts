import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
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
  questoes: Questao[]
  turma?: string
  incluirGabarito?: boolean
  instituicao?: string
}) {
  const { titulo, questoes, turma, incluirGabarito = true, instituicao = 'xyMath - Plataforma de Matemática' } = config

  // Valor total sempre = 10
  const valorTotal = 10
  const valorQuestao = valorTotal / questoes.length

  const children: Paragraph[] = []

  // Cabeçalho
  children.push(
    new Paragraph({
      children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  )

  children.push(
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  )

  if (turma) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Turma: ${turma}`, size: 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    )
  }

  // Informações de valor
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Total de questões: ${questoes.length}`, size: 20 }),
        new TextRun({ text: `     Valor: ${valorTotal.toFixed(1)} pontos`, size: 20 }),
        new TextRun({ text: `     Cada questão: ${valorQuestao.toFixed(2)} pts`, size: 20 })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  )

  // Linha separadora
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '─'.repeat(80), size: 20, color: 'CCCCCC' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  )

  // Campo nome/data
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Nome: _________________________________________________', size: 22 }),
        new TextRun({ text: '     Data: ___/___/______', size: 22 })
      ],
      spacing: { after: 400 }
    })
  )

  // Questões
  questoes.forEach((questao, index) => {
    // Número e enunciado
    const enunciadoLimpo = questao.enunciado?.replace(/<[^>]*>/g, '') || ''
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true, size: 22 }),
          new TextRun({ text: enunciadoLimpo, size: 22 })
        ],
        spacing: { before: 300, after: 100 }
      })
    )

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: questao.alternativa_a },
      { letra: 'B', texto: questao.alternativa_b },
      { letra: 'C', texto: questao.alternativa_c },
      { letra: 'D', texto: questao.alternativa_d },
    ]

    if (questao.alternativa_e) {
      alternativas.push({ letra: 'E', texto: questao.alternativa_e })
    }

    alternativas.forEach(alt => {
      if (alt.texto) {
        const textoLimpo = alt.texto.replace(/<[^>]*>/g, '')
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `(${alt.letra}) `, size: 22 }),
              new TextRun({ text: textoLimpo, size: 22 })
            ],
            indent: { left: 400 },
            spacing: { after: 50 }
          })
        )
      }
    })
  })

  // Gabarito
  if (incluirGabarito) {
    children.push(
      new Paragraph({
        children: [],
        pageBreakBefore: true
      })
    )

    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'GABARITO OFICIAL', bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    )

    children.push(
      new Paragraph({
        children: [new TextRun({ text: titulo, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 }
      })
    )

    if (turma) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Turma: ${turma}`, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        })
      )
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Valor total: ${valorTotal.toFixed(1)} pontos`, size: 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    )

    // Tabela do gabarito
    const questoesPorLinha = 10
    const tableRows: TableRow[] = []

    for (let i = 0; i < questoes.length; i += questoesPorLinha) {
      const questoesLinha = questoes.slice(i, i + questoesPorLinha)

      // Linha com números
      const numCells = questoesLinha.map((_, idx) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: `${i + idx + 1}`, bold: true, size: 20 })],
            alignment: AlignmentType.CENTER
          })],
          shading: { fill: 'E8E8E8' },
          width: { size: 800, type: WidthType.DXA }
        })
      )

      // Linha com respostas
      const respCells = questoesLinha.map(q =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: q.resposta_correta?.toUpperCase() || '-', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 800, type: WidthType.DXA }
        })
      )

      tableRows.push(new TableRow({ children: numCells }))
      tableRows.push(new TableRow({ children: respCells }))
    }

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER
    })

    children.push(new Paragraph({ children: [] }))
    children.push(table as any)

    // Rodapé
    children.push(
      new Paragraph({
        children: [new TextRun({ 
          text: 'Documento exclusivo do professor - Não divulgar aos alunos', 
          italics: true, 
          size: 18, 
          color: '888888' 
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 }
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

// ==================== PROVA PDF ====================

export async function exportToPDF(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
  incluirGabarito?: boolean
  instituicao?: string
}) {
  const { titulo, questoes, turma, incluirGabarito = true, instituicao = 'xyMath - Plataforma de Matemática' } = config

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Valor total sempre = 10
  const valorTotal = 10
  const valorQuestao = valorTotal / questoes.length

  // Cabeçalho
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, pageWidth / 2, y, { align: 'center' })
  y += 8

  if (turma) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 8
  }

  // Informações
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de questões: ${questoes.length}`, margin, y)
  doc.text(`Valor: ${valorTotal.toFixed(1)} pontos`, pageWidth - margin, y, { align: 'right' })
  y += 6
  doc.text(`Cada questão: ${valorQuestao.toFixed(2)} pontos`, margin, y)
  y += 10

  // Linha separadora
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Campo nome/data
  doc.setFontSize(10)
  doc.text('Nome: _______________________________________', margin, y)
  doc.text(`Data: ___/___/______`, pageWidth - margin - 40, y)
  y += 15

  // Questões
  questoes.forEach((questao, index) => {
    // Verifica se precisa nova página
    if (y > pageHeight - 60) {
      doc.addPage()
      y = margin
    }

    // Número da questão
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}.`, margin, y)

    // Enunciado
    doc.setFont('helvetica', 'normal')
    const enunciadoLimpo = questao.enunciado?.replace(/<[^>]*>/g, '') || ''
    const linhasEnunciado = doc.splitTextToSize(enunciadoLimpo, contentWidth - 10)
    doc.text(linhasEnunciado, margin + 8, y)
    y += linhasEnunciado.length * 5 + 3

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: questao.alternativa_a },
      { letra: 'B', texto: questao.alternativa_b },
      { letra: 'C', texto: questao.alternativa_c },
      { letra: 'D', texto: questao.alternativa_d },
    ]

    if (questao.alternativa_e) {
      alternativas.push({ letra: 'E', texto: questao.alternativa_e })
    }

    alternativas.forEach(alt => {
      if (alt.texto) {
        if (y > pageHeight - 20) {
          doc.addPage()
          y = margin
        }
        const textoAlt = `(${alt.letra}) ${alt.texto.replace(/<[^>]*>/g, '')}`
        const linhasAlt = doc.splitTextToSize(textoAlt, contentWidth - 15)
        doc.text(linhasAlt, margin + 10, y)
        y += linhasAlt.length * 5
      }
    })

    y += 8
  })

  // Gabarito
  if (incluirGabarito) {
    doc.addPage()
    y = margin

    // Marcadores de canto para OpenCV
    const markerSize = 8
    const markerMargin = 10
    doc.setFillColor(0, 0, 0)
    doc.rect(markerMargin, markerMargin, markerSize, markerSize, 'F')
    doc.rect(pageWidth - markerMargin - markerSize, markerMargin, markerSize, markerSize, 'F')
    doc.rect(markerMargin, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')
    doc.rect(pageWidth - markerMargin - markerSize, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')

    y = 30

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
    y += 10

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('GABARITO OFICIAL', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(titulo, pageWidth / 2, y, { align: 'center' })
    y += 7

    doc.setFontSize(11)
    doc.text(`Turma: ${turma || ''}`, pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.text(`Valor total: ${valorTotal.toFixed(1)} pontos`, pageWidth / 2, y, { align: 'center' })
    y += 15

    // Tabela do gabarito
    doc.setFontSize(10)
    const questoesPorLinha = 10
    const cellWidth = contentWidth / questoesPorLinha
    const cellHeight = 12

    for (let i = 0; i < questoes.length; i += questoesPorLinha) {
      const questoesLinha = questoes.slice(i, i + questoesPorLinha)
      const numCells = questoesLinha.length
      const startX = margin + (contentWidth - numCells * cellWidth) / 2

      // Linha com números (fundo cinza)
      doc.setFillColor(232, 232, 232)
      questoesLinha.forEach((_, idx) => {
        const x = startX + idx * cellWidth
        doc.rect(x, y, cellWidth, cellHeight, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + idx + 1}`, x + cellWidth / 2, y + 8, { align: 'center' })
      })
      y += cellHeight

      // Linha com respostas corretas
      doc.setFontSize(14)
      questoesLinha.forEach((q, idx) => {
        const x = startX + idx * cellWidth
        doc.rect(x, y, cellWidth, cellHeight)
        doc.setFont('helvetica', 'bold')
        // Pega a resposta correta da questão
        const resposta = q.resposta_correta?.toUpperCase() || '-'
        doc.text(resposta, x + cellWidth / 2, y + 9, { align: 'center' })
      })
      doc.setFontSize(10)
      y += cellHeight + 8
    }

    // Rodapé
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100)
    doc.text('Documento exclusivo do professor - Não divulgar aos alunos', pageWidth / 2, pageHeight - 15, { align: 'center' })
  }

  const fileName = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(fileName)
}

// ==================== GABARITO SEPARADO ====================

export async function exportGabaritoPDF(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
  instituicao?: string
}) {
  const { titulo, questoes, turma, instituicao = 'xyMath - Plataforma de Matemática' } = config

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Valor total sempre = 10
  const valorTotal = 10

  // Marcadores de canto para OpenCV
  const markerSize = 8
  const markerMargin = 10
  doc.setFillColor(0, 0, 0)
  doc.rect(markerMargin, markerMargin, markerSize, markerSize, 'F')
  doc.rect(pageWidth - markerMargin - markerSize, markerMargin, markerSize, markerSize, 'F')
  doc.rect(markerMargin, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')
  doc.rect(pageWidth - markerMargin - markerSize, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')

  y = 30

  // Cabeçalho
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('GABARITO OFICIAL', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, pageWidth / 2, y, { align: 'center' })
  y += 7

  if (turma) {
    doc.setFontSize(11)
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  doc.text(`Valor total: ${valorTotal.toFixed(1)} pontos`, pageWidth / 2, y, { align: 'center' })
  y += 15

  // Tabela do gabarito
  doc.setFontSize(10)
  const questoesPorLinha = 10
  const cellWidth = contentWidth / questoesPorLinha
  const cellHeight = 12

  for (let i = 0; i < questoes.length; i += questoesPorLinha) {
    const questoesLinha = questoes.slice(i, i + questoesPorLinha)
    const numCells = questoesLinha.length
    const startX = margin + (contentWidth - numCells * cellWidth) / 2

    // Linha com números (fundo cinza)
    doc.setFillColor(232, 232, 232)
    questoesLinha.forEach((_, idx) => {
      const x = startX + idx * cellWidth
      doc.rect(x, y, cellWidth, cellHeight, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + idx + 1}`, x + cellWidth / 2, y + 8, { align: 'center' })
    })
    y += cellHeight

    // Linha com respostas corretas
    doc.setFontSize(14)
    questoesLinha.forEach((q, idx) => {
      const x = startX + idx * cellWidth
      doc.rect(x, y, cellWidth, cellHeight)
      doc.setFont('helvetica', 'bold')
      // Pega a resposta correta da questão
      const resposta = q.resposta_correta?.toUpperCase() || '-'
      doc.text(resposta, x + cellWidth / 2, y + 9, { align: 'center' })
    })
    doc.setFontSize(10)
    y += cellHeight + 8
  }

  // Rodapé
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100)
  doc.text('Documento exclusivo do professor - Não divulgar aos alunos', pageWidth / 2, pageHeight - 15, { align: 'center' })

  const fileName = `Gabarito_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(fileName)
}
