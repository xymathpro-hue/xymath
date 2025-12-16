// src/lib/export-document.ts

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
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

export async function exportToWord(config: ExportConfig) {
  const {
    titulo,
    subtitulo,
    instituicao,
    professor,
    turma,
    data,
    tempo,
    incluirGabarito = true,
    incluirCabecalho = true,
    questoes
  } = config

  const children: any[] = []

  // Cabeçalho
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

    // Informações do aluno
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
    if (data) {
      infoLine.push(new TextRun({ text: 'Data: ', bold: true }))
      infoLine.push(new TextRun({ text: `${data}  ` }))
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

    // Linha divisória
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(80) })],
        spacing: { after: 300 }
      })
    )
  }

  // Questões
  questoes.forEach((questao, index) => {
    // Número da questão
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${index + 1}`, bold: true, size: 24 }),
          questao.habilidade_codigo ? new TextRun({ text: ` (${questao.habilidade_codigo})`, size: 20, color: '666666' }) : new TextRun({ text: '' })
        ],
        spacing: { before: 300, after: 150 }
      })
    )

    // Enunciado
    children.push(
      new Paragraph({
        children: [new TextRun({ text: questao.enunciado, size: 22 })],
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
            new TextRun({ text: `(${alt.letra}) `, bold: true }),
            new TextRun({ text: alt.texto || '' })
          ],
          spacing: { after: 80 },
          indent: { left: 400 }
        })
      )
    })

    // Espaço após questão
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 200 }
      })
    )
  })

  // Gabarito
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

    // Tabela de gabarito
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
                children: [new TextRun({ text: `${i + idx + 1}`, bold: true })],
                alignment: AlignmentType.CENTER 
              })],
              width: { size: 800, type: WidthType.DXA },
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

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  })

  // Gerar e baixar
  const blob = await Packer.toBlob(doc)
  const fileName = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, fileName)
}

export async function exportGabaritoWord(config: {
  titulo: string
  questoes: Questao[]
  turma?: string
}) {
  const { titulo, questoes, turma } = config

  const children: any[] = []

  // Título
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

  // Tabela de gabarito
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
              children: [new TextRun({ text: `${i + idx + 1}`, bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 800, type: WidthType.DXA },
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

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  })

  // Gerar e baixar
  const blob = await Packer.toBlob(doc)
  const fileName = `Gabarito_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, fileName)
      }
