import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

interface QuestaoProva {
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e?: string
  resposta_correta?: string
  habilidade_bncc?: string
  imagem_url?: string
}

interface DadosProva {
  titulo: string
  turma: string
  data?: string
  duracao: number
  questoes: QuestaoProva[]
  valorTotal?: number // Se não informado, será 10
}

export async function gerarProvaWord(dados: DadosProva): Promise<void> {
  const { titulo, turma, data, duracao, questoes, valorTotal = 10 } = dados

  // Calcular valor de cada questão (total sempre = valorTotal, padrão 10)
  const valorPorQuestao = questoes.length > 0 ? (valorTotal / questoes.length).toFixed(1) : '1'
  const valorTotalFormatado = valorTotal.toFixed(1)

  // Cabeçalho
  const headerParagraphs = [
    // Nome da escola (placeholder)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '[NOME DA ESCOLA]', bold: true, size: 28 }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '[Endereço da escola]', size: 20, italics: true, color: '666666' }),
      ],
      spacing: { after: 150 },
    }),
    // Linha divisória
    new Paragraph({
      children: [new TextRun({ text: '─'.repeat(70) })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 },
    }),
    // Título do simulado
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: titulo, bold: true, size: 32 }),
      ],
      spacing: { after: 200 },
    }),
  ]

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
                new TextRun({ text: turma }),
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
                new TextRun({ text: data ? new Date(data).toLocaleDateString('pt-BR') : '___/___/______' }),
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
                new TextRun({ text: `${duracao} minutos` }),
              ]
            })],
            borders: noBorders(),
          }),
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({ text: 'Valor: ', bold: true }),
                new TextRun({ text: `${valorTotalFormatado} pontos` }),
              ],
              alignment: AlignmentType.RIGHT,
            })],
            borders: noBorders(),
          }),
        ],
      }),
    ],
  })

  headerParagraphs.push(
    new Paragraph({ children: [], spacing: { after: 100 } }),
    // @ts-ignore
    infoTable,
    new Paragraph({ children: [], spacing: { after: 150 } }),
  )

  // Instruções
  headerParagraphs.push(
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
    }),
  )

  // Questões
  const questoesParagraphs: Paragraph[] = []

  questoes.forEach((q, idx) => {
    // Número da questão com valor
    questoesParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${idx + 1}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${valorPorQuestao} ${parseFloat(valorPorQuestao) === 1 ? 'ponto' : 'pontos'})`, size: 20 }),
        ],
        spacing: { before: 300, after: 100 },
      })
    )

    // Habilidade BNCC (se houver)
    if (q.habilidade_bncc) {
      questoesParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[TEMA: ${q.habilidade_bncc}] `, italics: true, size: 18, color: '666666' }),
            new TextRun({ text: q.enunciado, size: 22 }),
          ],
          spacing: { after: 150 },
        })
      )
    } else {
      // Enunciado sem habilidade
      questoesParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: q.enunciado, size: 22 }),
          ],
          spacing: { after: 150 },
        })
      )
    }

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: q.alternativa_a },
      { letra: 'B', texto: q.alternativa_b },
      { letra: 'C', texto: q.alternativa_c },
      { letra: 'D', texto: q.alternativa_d },
      { letra: 'E', texto: q.alternativa_e },
    ].filter(alt => alt.texto)

    alternativas.forEach(alt => {
      questoesParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `( ) ${alt.letra}) `, bold: true, size: 22 }),
            new TextRun({ text: alt.texto || '', size: 22 }),
          ],
          spacing: { after: 80 },
        })
      )
    })

    // Espaçamento entre questões
    questoesParagraphs.push(
      new Paragraph({
        children: [],
        spacing: { after: 200 },
      })
    )
  })

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: [
        ...headerParagraphs,
        ...questoesParagraphs,
      ],
    }],
  })

  // Gerar e baixar
  const blob = await Packer.toBlob(doc)
  const nomeArquivo = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  saveAs(blob, nomeArquivo)
}

// Helper para remover bordas das células
function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  }
}
