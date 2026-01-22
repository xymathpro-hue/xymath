import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx'
import { saveAs } from 'file-saver'

interface QuestaoProva {
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  habilidade_bncc?: string
}

interface DadosProva {
  titulo: string
  turma: string
  data: string
  duracao: number
  questoes: QuestaoProva[]
}

export async function gerarProvaWord(dados: DadosProva): Promise<void> {
  const { titulo, turma, data, duracao, questoes } = dados

  // Cabeçalho
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '________________________________', size: 24 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '(Nome da Escola)', size: 20, italics: true, color: '888888' }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: titulo, bold: true, size: 32 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Turma: ${turma}`, size: 22 }),
        new TextRun({ text: '   |   ', size: 22 }),
        new TextRun({ text: data ? `Data: ${new Date(data).toLocaleDateString('pt-BR')}` : 'Data: ___/___/______', size: 22 }),
        new TextRun({ text: '   |   ', size: 22 }),
        new TextRun({ text: `Duração: ${duracao} minutos`, size: 22 }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Nome: ', size: 22 }),
        new TextRun({ text: '________________________________________________________', size: 22 }),
        new TextRun({ text: '   Nº: ', size: 22 }),
        new TextRun({ text: '______', size: 22 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [],
      spacing: { after: 200 },
      border: {
        bottom: { color: '000000', size: 1, style: 'single' },
      },
    }),
  ]

  // Questões
  const questoesParagraphs: Paragraph[] = []

  questoes.forEach((q, idx) => {
    // Número da questão e habilidade
    questoesParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Questão ${idx + 1}`, bold: true, size: 24 }),
          ...(q.habilidade_bncc ? [
            new TextRun({ text: `  [${q.habilidade_bncc}]`, size: 18, italics: true, color: '666666' }),
          ] : []),
        ],
        spacing: { before: 300, after: 100 },
      })
    )

    // Enunciado
    questoesParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: q.enunciado, size: 22 }),
        ],
        spacing: { after: 150 },
      })
    )

    // Alternativas
    const alternativas = [
      { letra: 'A', texto: q.alternativa_a },
      { letra: 'B', texto: q.alternativa_b },
      { letra: 'C', texto: q.alternativa_c },
      { letra: 'D', texto: q.alternativa_d },
    ]

    alternativas.forEach(alt => {
      questoesParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `(   ) ${alt.letra}) `, bold: true, size: 22 }),
            new TextRun({ text: alt.texto, size: 22 }),
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
