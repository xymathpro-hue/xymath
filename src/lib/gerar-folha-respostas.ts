import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface Aluno {
  id: string
  nome: string
  numero?: number
}

interface DadosFolha {
  simulado: {
    id: string
    titulo: string
    duracao: number
  }
  turma: {
    id: string
    nome: string
    ano_escolar: string
  }
  alunos: Aluno[]
  totalQuestoes: number
}

// Configurações dos marcadores de canto para OpenCV
const MARKER_SIZE = 5 // mm
const MARKER_MARGIN = 8 // mm da borda

// Gera QR Code como Data URL
async function gerarQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    return ''
  }
}

// Desenha um marcador de canto (quadrado preto)
function desenharMarcador(pdf: jsPDF, x: number, y: number, size: number) {
  pdf.setFillColor(0, 0, 0)
  pdf.rect(x, y, size, size, 'F')
}

// Desenha os 4 marcadores de canto
function desenharMarcadoresCanto(
  pdf: jsPDF, 
  offsetX: number, 
  offsetY: number, 
  width: number, 
  height: number
) {
  // Superior esquerdo
  desenharMarcador(pdf, offsetX + MARKER_MARGIN, offsetY + MARKER_MARGIN, MARKER_SIZE)
  
  // Superior direito
  desenharMarcador(pdf, offsetX + width - MARKER_MARGIN - MARKER_SIZE, offsetY + MARKER_MARGIN, MARKER_SIZE)
  
  // Inferior esquerdo
  desenharMarcador(pdf, offsetX + MARKER_MARGIN, offsetY + height - MARKER_MARGIN - MARKER_SIZE, MARKER_SIZE)
  
  // Inferior direito
  desenharMarcador(pdf, offsetX + width - MARKER_MARGIN - MARKER_SIZE, offsetY + height - MARKER_MARGIN - MARKER_SIZE, MARKER_SIZE)
}

// Desenha um gabarito individual
async function desenharGabarito(
  pdf: jsPDF,
  aluno: Aluno,
  simulado: DadosFolha['simulado'],
  turma: DadosFolha['turma'],
  totalQuestoes: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  matricula: string
) {
  const margin = 5
  const innerMargin = offsetX + margin
  const innerWidth = width - (margin * 2)

  // Desenhar borda do gabarito
  pdf.setDrawColor(180)
  pdf.setLineWidth(0.3)
  pdf.rect(offsetX + 2, offsetY + 2, width - 4, height - 4)

  // Desenhar marcadores de canto
  desenharMarcadoresCanto(pdf, offsetX, offsetY, width, height)

  // Cabeçalho - Nome da escola
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('[NOME DA ESCOLA]', offsetX + width / 2, offsetY + 12, { align: 'center' })

  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Matemática - ${turma.ano_escolar}`, offsetX + width / 2, offsetY + 17, { align: 'center' })

  // Linha separadora
  pdf.setLineWidth(0.5)
  pdf.setDrawColor(0)
  pdf.line(innerMargin, offsetY + 20, offsetX + width - margin, offsetY + 20)

  // Título
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE RESPOSTAS', offsetX + width / 2, offsetY + 27, { align: 'center' })
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(simulado.titulo, offsetX + width / 2, offsetY + 32, { align: 'center' })

  // Box de dados do aluno
  const boxY = offsetY + 36
  const boxHeight = 18
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.rect(innerMargin, boxY, innerWidth - 25, boxHeight)

  // Dados do aluno dentro do box
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Aluno(a):', innerMargin + 2, boxY + 5)
  pdf.setFont('helvetica', 'normal')
  const nomeExibicao = aluno.numero ? `${aluno.numero}` : aluno.nome.substring(0, 20)
  pdf.text(nomeExibicao, innerMargin + 18, boxY + 5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Matrícula:', innerMargin + 2, boxY + 10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(matricula, innerMargin + 20, boxY + 10)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Turma:', innerMargin + 45, boxY + 5)
  pdf.setFont('helvetica', 'normal')
  pdf.text(turma.nome, innerMargin + 58, boxY + 5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Data:', innerMargin + 45, boxY + 10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString('pt-BR'), innerMargin + 55, boxY + 10)

  // QR Code
  const qrSize = 18
  const qrX = offsetX + width - margin - qrSize - 5
  const qrY = boxY - 1

  const qrData = JSON.stringify({
    s: simulado.id.substring(0, 8),
    a: aluno.id.substring(0, 8),
    t: turma.id.substring(0, 8),
    m: matricula
  })

  try {
    const qrDataUrl = await gerarQRCode(qrData)
    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    }
  } catch (e) {
    // Fallback: desenhar placeholder
    pdf.setDrawColor(150)
    pdf.rect(qrX, qrY, qrSize, qrSize)
    pdf.setFontSize(5)
    pdf.text('QR', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' })
  }

  // Instruções
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
    offsetX + width / 2,
    offsetY + 58,
    { align: 'center' }
  )

  // Grade de respostas
  const gradeY = offsetY + 63
  const circleRadius = 2.5
  const colSpacing = 6.5
  const rowSpacing = 7
  const questoesPerColuna = Math.ceil(totalQuestoes / 2)
  
  // Cabeçalho da grade
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'bold')
  
  // Coluna 1
  const col1X = innerMargin + 5
  pdf.text('Nº', col1X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col1X + 8 + (i * colSpacing), gradeY)
  })

  // Coluna 2
  const col2X = offsetX + width / 2 + 5
  pdf.text('Nº', col2X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col2X + 8 + (i * colSpacing), gradeY)
  })

  // Linha abaixo do cabeçalho
  pdf.setLineWidth(0.2)
  pdf.line(col1X, gradeY + 2, col1X + 40, gradeY + 2)
  pdf.line(col2X, gradeY + 2, col2X + 40, gradeY + 2)

  // Desenhar questões
  pdf.setFont('helvetica', 'normal')
  
  for (let i = 0; i < totalQuestoes; i++) {
    const coluna = i < questoesPerColuna ? 0 : 1
    const linha = coluna === 0 ? i : i - questoesPerColuna
    
    const baseX = coluna === 0 ? col1X : col2X
    const y = gradeY + 6 + (linha * rowSpacing)

    // Número da questão
    pdf.setFontSize(7)
    const numQuestao = (i + 1).toString().padStart(2, '0')
    pdf.text(numQuestao, baseX, y + 2)

    // Círculos das alternativas
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.3)
    
    for (let alt = 0; alt < 5; alt++) {
      const circleX = baseX + 10 + (alt * colSpacing)
      pdf.circle(circleX, y, circleRadius)
    }
  }

  // Rodapé
  pdf.setFontSize(5)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
    offsetX + width / 2,
    offsetY + height - 8,
    { align: 'center' }
  )

  // ID único no canto
  pdf.setFontSize(5)
  pdf.setFont('helvetica', 'normal')
  const idUnico = aluno.id.substring(0, 8)
  pdf.text(`ID: ${idUnico}`, offsetX + width - margin - 2, offsetY + height - 5, { align: 'right' })
}

// Função principal - gera 2 gabaritos por página
export async function gerarFolhasRespostas(dados: DadosFolha): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth() // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight() // 297mm
  
  // Cada gabarito ocupa metade da página
  const gabaritoWidth = pageWidth
  const gabaritoHeight = pageHeight / 2 - 2 // Pequeno espaço para linha de corte

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const posicaoNaPagina = i % 2 // 0 = topo, 1 = baixo
    const matricula = `${turma.nome}-${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`

    // Nova página a cada 2 alunos (exceto no primeiro)
    if (i > 0 && posicaoNaPagina === 0) {
      pdf.addPage()
    }

    const offsetY = posicaoNaPagina === 0 ? 0 : gabaritoHeight + 4

    await desenharGabarito(
      pdf,
      aluno,
      simulado,
      turma,
      totalQuestoes,
      0, // offsetX
      offsetY,
      gabaritoWidth,
      gabaritoHeight,
      matricula
    )

    // Linha pontilhada de corte entre os dois gabaritos
    if (posicaoNaPagina === 0) {
      pdf.setDrawColor(150)
      pdf.setLineWidth(0.2)
      pdf.setLineDashPattern([2, 2], 0)
      pdf.line(10, gabaritoHeight + 2, pageWidth - 10, gabaritoHeight + 2)
      pdf.setLineDashPattern([], 0) // Reset
      
      // Ícone de tesoura (texto simples)
      pdf.setFontSize(8)
      pdf.text('✂', 5, gabaritoHeight + 3)
    }
  }

  // Baixar PDF
  const nomeArquivo = `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}

// Função alternativa - 1 gabarito por página (para provas maiores)
export async function gerarFolhasRespostasGrande(dados: DadosFolha): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const matricula = `${turma.nome}-${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`

    if (i > 0) {
      pdf.addPage()
    }

    await desenharGabaritoGrande(
      pdf,
      aluno,
      simulado,
      turma,
      totalQuestoes,
      pageWidth,
      pageHeight,
      matricula
    )
  }

  const nomeArquivo = `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}

// Versão grande (página inteira) para provas com muitas questões
async function desenharGabaritoGrande(
  pdf: jsPDF,
  aluno: Aluno,
  simulado: DadosFolha['simulado'],
  turma: DadosFolha['turma'],
  totalQuestoes: number,
  pageWidth: number,
  pageHeight: number,
  matricula: string
) {
  const margin = 15

  // Marcadores de canto
  desenharMarcadoresCanto(pdf, 0, 0, pageWidth, pageHeight)

  // Cabeçalho
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('[NOME DA ESCOLA]', pageWidth / 2, 20, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Matemática - ${turma.ano_escolar}`, pageWidth / 2, 27, { align: 'center' })

  // Linha
  pdf.setLineWidth(0.5)
  pdf.line(margin, 32, pageWidth - margin, 32)

  // Título
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, 42, { align: 'center' })
  
  pdf.setFontSize(12)
  pdf.text(simulado.titulo, pageWidth / 2, 50, { align: 'center' })

  // Box de dados
  const boxY = 58
  const boxHeight = 25
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, boxY, pageWidth - margin * 2 - 35, boxHeight)

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Aluno(a):', margin + 3, boxY + 8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(aluno.numero ? String(aluno.numero) : aluno.nome, margin + 25, boxY + 8)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Matrícula:', margin + 3, boxY + 15)
  pdf.setFont('helvetica', 'normal')
  pdf.text(matricula, margin + 28, boxY + 15)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Turma:', margin + 80, boxY + 8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(turma.nome, margin + 95, boxY + 8)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Data:', margin + 80, boxY + 15)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString('pt-BR'), margin + 93, boxY + 15)

  // QR Code
  const qrSize = 25
  const qrX = pageWidth - margin - qrSize
  const qrY = boxY

  const qrData = JSON.stringify({
    s: simulado.id.substring(0, 8),
    a: aluno.id.substring(0, 8),
    t: turma.id.substring(0, 8),
    m: matricula
  })

  try {
    const qrDataUrl = await gerarQRCode(qrData)
    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    }
  } catch (e) {
    pdf.rect(qrX, qrY, qrSize, qrSize)
  }

  // Instruções
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
    pageWidth / 2,
    boxY + boxHeight + 8,
    { align: 'center' }
  )

  // Grade de respostas
  const gradeY = boxY + boxHeight + 15
  const circleRadius = 3
  const colSpacing = 8
  const rowSpacing = 9
  const questoesPerColuna = Math.ceil(totalQuestoes / 2)

  // Cabeçalho da grade
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')

  const col1X = margin + 10
  const col2X = pageWidth / 2 + 10

  // Coluna 1
  pdf.text('Nº', col1X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col1X + 12 + (i * colSpacing), gradeY)
  })

  // Coluna 2
  pdf.text('Nº', col2X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col2X + 12 + (i * colSpacing), gradeY)
  })

  // Linhas
  pdf.setLineWidth(0.3)
  pdf.line(col1X, gradeY + 3, col1X + 55, gradeY + 3)
  pdf.line(col2X, gradeY + 3, col2X + 55, gradeY + 3)

  // Desenhar questões
  pdf.setFont('helvetica', 'normal')

  for (let i = 0; i < totalQuestoes; i++) {
    const coluna = i < questoesPerColuna ? 0 : 1
    const linha = coluna === 0 ? i : i - questoesPerColuna

    const baseX = coluna === 0 ? col1X : col2X
    const y = gradeY + 10 + (linha * rowSpacing)

    // Número da questão
    pdf.setFontSize(9)
    const numQuestao = (i + 1).toString().padStart(2, '0')
    pdf.text(numQuestao, baseX, y + 2)

    // Círculos
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.4)

    for (let alt = 0; alt < 5; alt++) {
      const circleX = baseX + 15 + (alt * colSpacing)
      pdf.circle(circleX, y, circleRadius)
    }
  }

  // Rodapé
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )

  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`ID: ${aluno.id.substring(0, 8)}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
}
