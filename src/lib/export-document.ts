// src/lib/export-document.ts

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
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
  valorTotal?: number // Padrão = 10
  incluirGabarito?: boolean
  incluirCabecalho?: boolean
  questoes: Questao[]
}

// ==================== WORD ====================

export async function exportToWord(config: ExportConfig) {
  const {
    titulo,
    subtitulo,
    instituicao = '[NOME DA ESCOLA]',
    turma,
    tempo,
    valorTotal = 10,
    incluirGabarito = true,
    incluirCabecalho = true,
    questoes
  } = config

  // Calcular valor por questão
  const valorPorQuestao = questoes.length > 0 ? valorTotal / questoes.length : 1

  const children: any[] = []

  if (incluirCabecalho) {
    // Cabeçalho da escola
    children.push(
      new Paragraph({
        children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: '[Endereço da escola]', size: 18, italics: true, color: '888888' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 }
      }),
      // Linha divisória
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(70) })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 }
      }),
      // Título
      new Paragraph({
        children: [new TextRun({ text: titulo, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
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

    // Tabela de informações
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Disciplina: ', bold: true }),
                  new TextRun({ text: 'Matemática' }),
                ]
              })],
              borders: noBorders(),
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Turma: ', bold: true }),
                  new TextRun({ text: turma || '______' }),
                ],
                alignment: AlignmentType.RIGHT,
              })],
              borders: noBorders(),
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Professor(a): ', bold: true }),
                  new TextRun({ text: '________________' }),
                ]
              })],
              borders: noBorders(),
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Data: ', bold: true }),
                  new TextRun({ text: config.data ? new Date(config.data).toLocaleDateString('pt-BR') : '___/___/______' }),
                ],
                alignment: AlignmentType.RIGHT,
              })],
              borders: noBorders(),
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Aluno(a): ', bold: true }),
                  new TextRun({ text: '________________________________________________' }),
                ]
              })],
              borders: noBorders(),
              columnSpan: 2,
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Tempo: ', bold: true }),
                  new TextRun({ text: `${tempo || 60} minutos` }),
                ]
              })],
              borders: noBorders(),
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Valor: ', bold: true }),
                  new TextRun({ text: `${valorTotal.toFixed(1)} pontos` }),
                ],
                alignment: AlignmentType.RIGHT,
              })],
              borders: noBorders(),
            }),
          ],
        }),
      ],
    })

    children.push(infoTable)

    // Instruções
    children.push(
      new Paragraph({ children: [], spacing: { after: 150 } }),
      new Paragraph({
        children: [new TextRun({ text: 'INSTRUÇÕES:', bold: true, size: 22 })],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '• Leia atentamente cada questão antes de responder.', size: 20 })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '• Marque apenas UMA alternativa para cada questão.', size: 20 })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '• Utilize caneta azul ou preta.', size: 20 })],
        spacing: { after: 150 },
      }),
      // Linha divisória
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(70) })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    )
  }

  // Questões
  questoes.forEach((questao, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${index + 1}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${valorPorQuestao.toFixed(1)} ${valorPorQuestao === 1 ? 'ponto' : 'pontos'})`, size: 20 }),
        ],
        spacing: { before: 300, after: 100 }
      })
    )

    // Enunciado com habilidade
    const enunciadoChildren: TextRun[] = []
    if (questao.habilidade_codigo) {
      enunciadoChildren.push(new TextRun({ 
        text: `[TEMA: ${questao.habilidade_codigo}] `, 
        italics: true, 
        size: 18, 
        color: '666666' 
      }))
    }
    enunciadoChildren.push(new TextRun({ text: questao.enunciado, size: 22 }))

    children.push(
      new Paragraph({
        children: enunciadoChildren,
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED
      })
    )

    // Alternativas
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
            new TextRun({ text: `( ) ${alt.letra}) `, bold: true, size: 22 }),
            new TextRun({ text: alt.texto || '', size: 22 })
          ],
          spacing: { after: 80 },
          indent: { left: 200 }
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

  // Gabarito em página separada
  if (incluirGabarito) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        pageBreakBefore: true
      }),
      new Paragraph({
        children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'GABARITO OFICIAL', bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: titulo, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Turma: ${turma || ''}`, size: 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    )

    // Tabela do gabarito
    const gabaritoRows: TableRow[] = []
    const questoesPorLinha = 10

    for (let i = 0; i < questoes.length; i += questoesPorLinha) {
      const questoesLinha = questoes.slice(i, i + questoesPorLinha)

      // Linha com números
      gabaritoRows.push(
        new TableRow({
          children: questoesLinha.map((_, idx) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: `${i + idx + 1}`, bold: true, size: 22 })],
                alignment: AlignmentType.CENTER
              })],
              width: { size: 900, type: WidthType.DXA },
              shading: { fill: 'E8E8E8' }
            })
          )
        })
      )

      // Linha com respostas
      gabaritoRows.push(
        new TableRow({
          children: questoesLinha.map(q =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ 
                  text: q.resposta_correta?.toUpperCase() || '-', 
                  bold: true, 
                  size: 28 
                })],
                alignment: AlignmentType.CENTER
              })],
              width: { size: 900, type: WidthType.DXA }
            })
          )
        })
      )
    }

    children.push(
      new Table({
        rows: gabaritoRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
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
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, fileName)
}

// Helper para remover bordas
function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  }
}

// ==================== PDF ====================

export async function exportToPDF(config: ExportConfig) {
  const {
    titulo,
    subtitulo,
    instituicao = '[NOME DA ESCOLA]',
    turma,
    tempo,
    valorTotal = 10,
    incluirGabarito = true,
    incluirCabecalho = true,
    questoes
  } = config

  const valorPorQuestao = questoes.length > 0 ? valorTotal / questoes.length : 1

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
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100)
    doc.text('[Endereço da escola]', pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0)
    y += 8

    // Linha divisória
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

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

    // Informações
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    doc.setFont('helvetica', 'bold')
    doc.text('Disciplina:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text('Matemática', margin + 25, y)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Turma:', pageWidth - margin - 30, y)
    doc.setFont('helvetica', 'normal')
    doc.text(turma || '______', pageWidth - margin - 15, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Professor(a):', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text('________________', margin + 28, y)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Data:', pageWidth - margin - 35, y)
    doc.setFont('helvetica', 'normal')
    doc.text(config.data ? new Date(config.data).toLocaleDateString('pt-BR') : '___/___/______', pageWidth - margin - 22, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Aluno(a):', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text('________________________________________________', margin + 20, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Tempo:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${tempo || 60} minutos`, margin + 16, y)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Valor:', pageWidth - margin - 35, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${valorTotal.toFixed(1)} pontos`, pageWidth - margin - 22, y)
    y += 8

    // Instruções
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTRUÇÕES:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text('• Leia atentamente cada questão antes de responder.', margin, y)
    y += 4
    doc.text('• Marque apenas UMA alternativa para cada questão.', margin, y)
    y += 4
    doc.text('• Utilize caneta azul ou preta.', margin, y)
    y += 6

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
    doc.text(`Questão ${index + 1} (${valorPorQuestao.toFixed(1)} ${valorPorQuestao === 1 ? 'ponto' : 'pontos'})`, margin, y)
    y += 6

    // Habilidade + Enunciado
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    let enunciadoCompleto = questao.enunciado
    if (questao.habilidade_codigo) {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100)
      doc.text(`[TEMA: ${questao.habilidade_codigo}]`, margin, y)
      doc.setTextColor(0)
      y += 5
      doc.setFont('helvetica', 'normal')
    }

    const enunciadoLines = wrapText(enunciadoCompleto, contentWidth, 10)
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
      doc.text(`( ) ${alt.letra})`, margin + 5, y)
      doc.setFont('helvetica', 'normal')
      
      const altLines = wrapText(alt.texto || '', contentWidth - 20, 10)
      altLines.forEach((line, lineIdx) => {
        if (lineIdx > 0) checkNewPage(5)
        doc.text(line, margin + 18, y)
        y += 5
      })
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

      // Linha com respostas
      doc.setFontSize(14)
      questoesLinha.forEach((q, idx) => {
        const x = startX + idx * cellWidth
        doc.rect(x, y, cellWidth, cellHeight)
        doc.setFont('helvetica', 'bold')
        doc.text(q.resposta_correta?.toUpperCase() || '-', x + cellWidth / 2, y + 9, { align: 'center' })
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
  const { titulo, questoes, turma, instituicao = '[NOME DA ESCOLA]' } = config

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // Marcadores de canto para OpenCV
  const markerSize = 8
  const markerMargin = 10
  doc.setFillColor(0, 0, 0)
  doc.rect(markerMargin, markerMargin, markerSize, markerSize, 'F')
  doc.rect(pageWidth - markerMargin - markerSize, markerMargin, markerSize, markerSize, 'F')
  doc.rect(markerMargin, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')
  doc.rect(pageWidth - markerMargin - markerSize, pageHeight - markerMargin - markerSize, markerSize, markerSize, 'F')

  let y = 30

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(instituicao, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(16)
  doc.text('GABARITO OFICIAL', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, pageWidth / 2, y, { align: 'center' })
  y += 7

  if (turma) {
    doc.setFontSize(11)
    doc.text(`Turma: ${turma}`, pageWidth / 2, y, { align: 'center' })
    y += 10
  }

  y += 10

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

    // Linha com respostas
    doc.setFontSize(14)
    questoesLinha.forEach((q, idx) => {
      const x = startX + idx * cellWidth
      doc.rect(x, y, cellWidth, cellHeight)
      doc.setFont('helvetica', 'bold')
      doc.text(q.resposta_correta?.toUpperCase() || '-', x + cellWidth / 2, y + 9, { align: 'center' })
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

export async function exportGabaritoWord(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
  instituicao?: string
}) {
  const { titulo, questoes, turma, instituicao = '[NOME DA ESCOLA]' } = config

  const children: any[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: instituicao, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'GABARITO OFICIAL', bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: titulo, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
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

  // Tabela do gabarito
  const gabaritoRows: TableRow[] = []
  const questoesPorLinha = 10

  for (let i = 0; i < questoes.length; i += questoesPorLinha) {
    const questoesLinha = questoes.slice(i, i + questoesPorLinha)

    // Linha com números
    gabaritoRows.push(
      new TableRow({
        children: questoesLinha.map((_, idx) =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `${i + idx + 1}`, bold: true, size: 22 })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 900, type: WidthType.DXA },
            shading: { fill: 'E8E8E8' }
          })
        )
      })
    )

    // Linha com respostas
    gabaritoRows.push(
      new TableRow({
        children: questoesLinha.map(q =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ 
                text: q.resposta_correta?.toUpperCase() || '-', 
                bold: true, 
                size: 28 
              })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 900, type: WidthType.DXA }
          })
        )
      })
    )
  }

  children.push(
    new Table({
      rows: gabaritoRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),
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
