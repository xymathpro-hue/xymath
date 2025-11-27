// Utilitário para geração de documentos DOCX
// Usa a biblioteca docx para criar documentos Word editáveis

import { 
  Document, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx'
import { Questao } from '@/types'

interface SimuladoDocConfig {
  titulo: string
  descricao?: string
  turma?: string
  professor?: string
  data?: string
  tempo?: number
  pontuacaoPorQuestao: number
  questoes: Questao[]
  mostrarGabarito?: boolean
  cabecalhoPersonalizado?: {
    escola?: string
    endereco?: string
    disciplina?: string
    bimestre?: string
  }
}

export function gerarSimuladoDocx(config: SimuladoDocConfig): Document {
  const {
    titulo,
    descricao,
    turma,
    professor,
    data,
    tempo,
    pontuacaoPorQuestao,
    questoes,
    mostrarGabarito = false,
    cabecalhoPersonalizado
  } = config

  const sections = []

  // Cabeçalho editável
  const cabecalhoChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: cabecalhoPersonalizado?.escola || '[NOME DA ESCOLA]',
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: cabecalhoPersonalizado?.endereco || '[Endereço da escola]',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '━'.repeat(60) }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ]

  // Informações do simulado
  const infoSimulado = [
    new Paragraph({
      children: [
        new TextRun({
          text: titulo,
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ]

  if (descricao) {
    infoSimulado.push(
      new Paragraph({
        children: [
          new TextRun({
            text: descricao,
            italics: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
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
            children: [new Paragraph({ children: [new TextRun({ text: 'Disciplina: ', bold: true }), new TextRun({ text: cabecalhoPersonalizado?.disciplina || 'Matemática' })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Turma: ', bold: true }), new TextRun({ text: turma || '________' })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Professor(a): ', bold: true }), new TextRun({ text: professor || '________________' })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Data: ', bold: true }), new TextRun({ text: data || '___/___/______' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Aluno(a): ', bold: true }), new TextRun({ text: '________________________________________' })] })],
            columnSpan: 2,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `Tempo: ${tempo || 60} minutos`, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `Valor: ${(questoes.length * pontuacaoPorQuestao).toFixed(1)} pontos (${pontuacaoPorQuestao} cada)`, size: 20 })] })],
          }),
        ],
      }),
    ],
  })

  // Instruções
  const instrucoes = [
    new Paragraph({
      children: [new TextRun({ text: '' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'INSTRUÇÕES:',
          bold: true,
          size: 22,
        }),
      ],
      spacing: { after: 100 },
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
      children: [new TextRun({ text: '• Utilize caneta azul ou preta para marcar as respostas.', size: 20 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '• Não é permitido o uso de calculadora, exceto quando indicado.', size: 20 })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '• Questões rasuradas serão anuladas.', size: 20 })],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '━'.repeat(60) })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ]

  // Questões
  const questoesContent: Paragraph[] = []
  
  questoes.forEach((questao, index) => {
    // Número e enunciado
    questoesContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Questão ${index + 1}`,
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: ` (${pontuacaoPorQuestao} ${pontuacaoPorQuestao === 1 ? 'ponto' : 'pontos'})`,
            size: 20,
          }),
        ],
        spacing: { before: 300, after: 150 },
      })
    )

    // Tags da questão (habilidade, descritor)
    const tags: string[] = []
    if ((questao as any).habilidade_codigo) tags.push((questao as any).habilidade_codigo)
    if ((questao as any).descritor_codigo) tags.push((questao as any).descritor_codigo)
    
    if (tags.length > 0) {
      questoesContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${tags.join(' | ')}]`,
              size: 18,
              italics: true,
              color: '666666',
            }),
          ],
          spacing: { after: 100 },
        })
      )
    }

    // Enunciado
    questoesContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: questao.enunciado,
            size: 22,
          }),
        ],
        spacing: { after: 200 },
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
      questoesContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `(   ) ${alt.letra}) `,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: alt.texto,
              size: 22,
            }),
          ],
          spacing: { after: 80 },
        })
      )
    })

    // Espaço entre questões
    questoesContent.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 200 },
      })
    )
  })

  // Gabarito (opcional, em página separada)
 const gabaritoContent: (Paragraph | Table)[] = []
  
  if (mostrarGabarito) {
    gabaritoContent.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'GABARITO - ' + titulo,
            bold: true,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '(Documento exclusivo do professor)',
            italics: true,
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    )

    // Tabela de gabarito
    const gabaritoRows = []
    const itemsPerRow = 5
    
    for (let i = 0; i < questoes.length; i += itemsPerRow) {
      const cells = []
      for (let j = i; j < Math.min(i + itemsPerRow, questoes.length); j++) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${j + 1}. `, bold: true }),
                  new TextRun({ text: questoes[j].resposta_correta, bold: true, color: '008000' }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          })
        )
      }
      // Preencher células vazias se necessário
      while (cells.length < itemsPerRow) {
        cells.push(new TableCell({ children: [new Paragraph({ children: [] })] }))
      }
      gabaritoRows.push(new TableRow({ children: cells }))
    }

    gabaritoContent.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: gabaritoRows,
      })
    )
  }

  // Montar documento
  const doc = new Document({
    sections: [
      {
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
        children: [
          ...cabecalhoChildren,
          ...infoSimulado,
          infoTable,
          ...instrucoes,
          ...questoesContent,
          ...gabaritoContent,
        ],
      },
    ],
  })

  return doc
}

// Gerar apenas o gabarito para o professor
export function gerarGabaritoDocx(config: {
  titulo: string
  turma: string
  questoes: Questao[]
}): Document {
  const { titulo, turma, questoes } = config

  const gabaritoRows = []
  const itemsPerRow = 10
  
  for (let i = 0; i < questoes.length; i += itemsPerRow) {
    const headerCells = []
    const answerCells = []
    
    for (let j = i; j < Math.min(i + itemsPerRow, questoes.length); j++) {
      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${j + 1}`, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: 'E0E0E0' },
        })
      )
      answerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: questoes[j].resposta_correta, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
      )
    }
    
    gabaritoRows.push(new TableRow({ children: headerCells }))
    gabaritoRows.push(new TableRow({ children: answerCells }))
  }

  return new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `GABARITO - ${titulo}`, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Turma: ${turma}`, size: 22 })],
            spacing: { after: 300 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: gabaritoRows,
          }),
        ],
      },
    ],
  })
}
