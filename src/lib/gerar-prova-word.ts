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
}

interface DadosProva {
  titulo: string
  turma: string
  data?: string
  duracao: number
  questoes: QuestaoProva[]
  escola?: {
    nome: string
    municipio?: string
    estado?: string
    rede?: string
  }
}

export async function gerarProvaWord(dados: DadosProva): Promise<void> {
  const { titulo, turma, data, duracao, questoes, escola } = dados

  // VALOR TOTAL SEMPRE = 10 PONTOS
  const valorTotal = 10
  const valorPorQuestao = questoes.length > 0 ? (valorTotal / questoes.length) : 1
  const valorPorQuestaoFormatado = valorPorQuestao.toFixed(2).replace('.', ',')

  // Nome da escola
  const nomeEscola = escola?.nome || '[NOME DA ESCOLA]'
  const subtituloEscola = escola?.municipio && escola?.estado 
    ? `${escola.rede ? escola.rede.charAt(0).toUpperCase() + escola.rede.slice(1) + ' - ' : ''}${escola.municipio} - ${escola.estado}`
    : '[Endereço da escola]'

  const children: any[] = []

  // ========== CABEÇALHO ==========
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: nomeEscola, bold: true, size: 28 }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: subtituloEscola, size: 20, italics: true, color: '666666' }),
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
    })
  )

  // ========== TABELA DE INFORMAÇÕES ==========
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
                new TextRun({ text: '________________________________' }),
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
                new TextRun({ text: '________________________________________________________________' }),
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
                new TextRun({ text: 'Nº: ', bold: true }),
                new TextRun({ text: '_______' }),
                new TextRun({ text: '          Tempo: ', bold: true }),
                new TextRun({ text: `${duracao} minutos` }),
              ]
            })],
            borders: noBorders(),
          }),
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({ text: 'Valor: ', bold: true }),
                new TextRun({ text: '10,0 pontos' }),
                new TextRun({ text: '     Nota: ', bold: true }),
                new TextRun({ text: '_______' }),
              ],
              alignment: AlignmentType.RIGHT,
            })],
            borders: noBorders(),
          }),
        ],
      }),
    ],
  })

  children.push(
    new Paragraph({ children: [], spacing: { after: 100 } }),
    // @ts-ignore
    infoTable,
    new Paragraph({ children: [], spacing: { after: 150 } })
  )

  // ========== INSTRUÇÕES ==========
  children.push(
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
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '• Não é permitido o uso de calculadora, salvo indicação contrária.', size: 20 })],
      spacing: { after: 150 },
    }),
    // Linha divisória
    new Paragraph({
      children: [new TextRun({ text: '─'.repeat(70) })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  )

  // ========== QUESTÕES ==========
  questoes.forEach((q, idx) => {
    // Número da questão com valor
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${idx + 1}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${valorPorQuestaoFormatado} ${valorPorQuestao === 1 ? 'ponto' : 'pontos'})`, size: 20 }),
        ],
        spacing: { before: 300, after: 100 },
      })
    )

    // Habilidade BNCC (se houver) + Enunciado
    if (q.habilidade_bncc) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${q.habilidade_bncc}] `, italics: true, size: 18, color: '666666' }),
          ],
          spacing: { after: 50 },
        })
      )
    }

    // Enunciado
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: q.enunciado, size: 22 }),
        ],
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED,
      })
    )

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: q.alternativa_a },
      { letra: 'B', texto: q.alternativa_b },
      { letra: 'C', texto: q.alternativa_c },
      { letra: 'D', texto: q.alternativa_d },
      { letra: 'E', texto: q.alternativa_e },
    ].filter(alt => alt.texto)

    alternativas.forEach(alt => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `(   ) ${alt.letra}) `, bold: true, size: 22 }),
            new TextRun({ text: alt.texto || '', size: 22 }),
          ],
          spacing: { after: 80 },
        })
      )
    })

    // Espaçamento entre questões
    children.push(
      new Paragraph({
        children: [],
        spacing: { after: 200 },
      })
    )
  })

  // ========== CRIAR DOCUMENTO ==========
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 567,    // ~0.4 inch = 1cm
            right: 720,  // 0.5 inch
            bottom: 567,
            left: 720,
          },
        },
      },
      children
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
