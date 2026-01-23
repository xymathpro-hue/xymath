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

// ============================================
// CONFIGURAÇÕES DOS MARCADORES PARA OPENCV
// ============================================
const MARKER_SIZE = 8 // mm - tamanho do quadrado preto
const MARKER_MARGIN = 5 // mm - distância da borda da área do gabarito

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

// Desenha um marcador de canto (quadrado preto sólido)
function desenharMarcador(pdf: jsPDF, x: number, y: number, size: number) {
  pdf.setFillColor(0, 0, 0)
  pdf.rect(x, y, size, size, 'F')
}

// Desenha os 4 marcadores de canto em uma área específica
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

// ============================================
// DESENHA UM GABARITO INDIVIDUAL (MEIA PÁGINA)
// ============================================
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
  const margin = 15 // margem interna do conteúdo

  // ========== MARCADORES DE CANTO (OPENCV) ==========
  desenharMarcadoresCanto(pdf, offsetX, offsetY, width, height)

  // ========== BORDA DO GABARITO ==========
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.5)
  pdf.rect(offsetX + MARKER_MARGIN + MARKER_SIZE + 2, offsetY + MARKER_MARGIN + MARKER_SIZE + 2, 
           width - (MARKER_MARGIN + MARKER_SIZE + 2) * 2, height - (MARKER_MARGIN + MARKER_SIZE + 2) * 2)

  // ========== CABEÇALHO ==========
  const contentStartY = offsetY + MARKER_MARGIN + MARKER_SIZE + 5
  
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text('[NOME DA ESCOLA]', offsetX + width / 2, contentStartY + 5, { align: 'center' })

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Matemática - ${turma.ano_escolar}`, offsetX + width / 2, contentStartY + 10, { align: 'center' })

  // Linha separadora
  pdf.setLineWidth(0.5)
  pdf.line(offsetX + margin, contentStartY + 13, offsetX + width - margin, contentStartY + 13)

  // ========== TÍTULO ==========
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE RESPOSTAS', offsetX + width / 2, contentStartY + 20, { align: 'center' })
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  const tituloTruncado = simulado.titulo.length > 40 ? simulado.titulo.substring(0, 40) + '...' : simulado.titulo
  pdf.text(tituloTruncado, offsetX + width / 2, contentStartY + 26, { align: 'center' })

  // ========== BOX DE DADOS DO ALUNO ==========
  const boxY = contentStartY + 30
  const boxHeight = 20
  const boxWidth = width - margin * 2 - 30 // Espaço para QR Code
  
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.rect(offsetX + margin, boxY, boxWidth, boxHeight)

  // Dados do aluno
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Aluno(a):', offsetX + margin + 3, boxY + 6)
  pdf.setFont('helvetica', 'normal')
  const nomeExibicao = aluno.numero ? String(aluno.numero) : aluno.nome.substring(0, 25)
  pdf.text(nomeExibicao, offsetX + margin + 22, boxY + 6)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Matrícula:', offsetX + margin + 3, boxY + 12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(matricula, offsetX + margin + 24, boxY + 12)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Turma:', offsetX + margin + 70, boxY + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.text(turma.nome, offsetX + margin + 85, boxY + 6)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Data:', offsetX + margin + 70, boxY + 12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString('pt-BR'), offsetX + margin + 82, boxY + 12)

  // ========== QR CODE ==========
  const qrSize = 20
  const qrX = offsetX + width - margin - qrSize
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
    // Fallback: desenhar placeholder
    pdf.setDrawColor(150)
    pdf.rect(qrX, qrY, qrSize, qrSize)
    pdf.setFontSize(6)
    pdf.text('QR', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' })
  }

  // ========== INSTRUÇÕES ==========
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
    offsetX + width / 2,
    boxY + boxHeight + 5,
    { align: 'center' }
  )

  // ========== GRADE DE RESPOSTAS ==========
  const gradeY = boxY + boxHeight + 10
  const circleRadius = 2.8
  const colSpacing = 7
  const rowSpacing = 6.5
  const questoesPerColuna = Math.ceil(totalQuestoes / 2)
  
  // Cabeçalho da grade
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  
  // Posição das colunas
  const col1X = offsetX + margin + 5
  const col2X = offsetX + width / 2 + 10

  // Cabeçalho Coluna 1
  pdf.text('Nº', col1X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col1X + 10 + (i * colSpacing), gradeY)
  })

  // Cabeçalho Coluna 2
  if (totalQuestoes > questoesPerColuna) {
    pdf.text('Nº', col2X, gradeY)
    ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
      pdf.text(letra, col2X + 10 + (i * colSpacing), gradeY)
    })
  }

  // Linha abaixo do cabeçalho
  pdf.setLineWidth(0.2)
  pdf.line(col1X, gradeY + 2, col1X + 48, gradeY + 2)
  if (totalQuestoes > questoesPerColuna) {
    pdf.line(col2X, gradeY + 2, col2X + 48, gradeY + 2)
  }

  // Desenhar questões
  pdf.setFont('helvetica', 'normal')
  
  for (let i = 0; i < totalQuestoes; i++) {
    const coluna = i < questoesPerColuna ? 0 : 1
    const linha = coluna === 0 ? i : i - questoesPerColuna
    
    const baseX = coluna === 0 ? col1X : col2X
    const y = gradeY + 7 + (linha * rowSpacing)

    // Número da questão
    pdf.setFontSize(7)
    const numQuestao = (i + 1).toString().padStart(2, '0')
    pdf.text(numQuestao, baseX, y + 1.5)

    // Círculos das alternativas
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.4)
    
    for (let alt = 0; alt < 5; alt++) {
      const circleX = baseX + 12 + (alt * colSpacing)
      pdf.circle(circleX, y, circleRadius)
    }
  }

  // ========== RODAPÉ ==========
  const footerY = offsetY + height - MARKER_MARGIN - MARKER_SIZE - 8
  
  pdf.setFontSize(5)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
    offsetX + width / 2,
    footerY,
    { align: 'center' }
  )

  // ID único no canto
  pdf.setFontSize(5)
  pdf.setFont('helvetica', 'normal')
  const idUnico = aluno.id.substring(0, 8)
  pdf.text(`ID: ${idUnico}`, offsetX + width - margin, footerY + 4, { align: 'right' })
}

// ============================================
// FUNÇÃO PRINCIPAL - 2 GABARITOS POR PÁGINA
// ============================================
export async function gerarFolhasRespostas(dados: DadosFolha): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth() // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight() // 297mm
  
  // Cada gabarito ocupa metade da página (com espaço para corte)
  const gabaritoWidth = pageWidth
  const gabaritoHeight = (pageHeight / 2) - 3 // 3mm para linha de corte

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const posicaoNaPagina = i % 2 // 0 = topo, 1 = baixo
    const matricula = `${turma.nome}-${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`

    // Nova página a cada 2 alunos (exceto no primeiro)
    if (i > 0 && posicaoNaPagina === 0) {
      pdf.addPage()
    }

    // Calcular offset Y baseado na posição
    const offsetY = posicaoNaPagina === 0 ? 0 : gabaritoHeight + 6

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

    // Linha pontilhada de corte entre os dois gabaritos (só depois do primeiro)
    if (posicaoNaPagina === 0 && alunos.length > 1) {
      const cutY = gabaritoHeight + 3
      
      pdf.setDrawColor(150)
      pdf.setLineWidth(0.3)
      pdf.setLineDashPattern([3, 3], 0)
      pdf.line(15, cutY, pageWidth - 15, cutY)
      pdf.setLineDashPattern([], 0) // Reset
      
      // Ícone de tesoura
      pdf.setFontSize(10)
      pdf.setTextColor(150)
      pdf.text('✂', 8, cutY + 1)
      pdf.setTextColor(0) // Reset
    }
  }

  // Baixar PDF
  const nomeArquivo = `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}

// ============================================
// VERSÃO GRANDE - 1 GABARITO POR PÁGINA
// (Para provas com mais de 30 questões)
// ============================================
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

// ============================================
// DESENHA GABARITO GRANDE (PÁGINA INTEIRA)
// ============================================
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

  // ========== MARCADORES DE CANTO (OPENCV) ==========
  // Marcadores maiores para página inteira
  const markerSize = 10
  const markerMargin = 8
  
  // Superior esquerdo
  desenharMarcador(pdf, markerMargin, markerMargin, markerSize)
  // Superior direito
  desenharMarcador(pdf, pageWidth - markerMargin - markerSize, markerMargin, markerSize)
  // Inferior esquerdo
  desenharMarcador(pdf, markerMargin, pageHeight - markerMargin - markerSize, markerSize)
  // Inferior direito
  desenharMarcador(pdf, pageWidth - markerMargin - markerSize, pageHeight - markerMargin - markerSize, markerSize)

  // ========== CABEÇALHO ==========
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('[NOME DA ESCOLA]', pageWidth / 2, 25, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Matemática - ${turma.ano_escolar}`, pageWidth / 2, 32, { align: 'center' })

  // Linha
  pdf.setLineWidth(0.5)
  pdf.line(margin, 37, pageWidth - margin, 37)

  // ========== TÍTULO ==========
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, 47, { align: 'center' })
  
  pdf.setFontSize(12)
  pdf.text(simulado.titulo, pageWidth / 2, 55, { align: 'center' })

  // ========== BOX DE DADOS ==========
  const boxY = 62
  const boxHeight = 28
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, boxY, pageWidth - margin * 2 - 40, boxHeight)

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Aluno(a):', margin + 5, boxY + 10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(aluno.numero ? String(aluno.numero) : aluno.nome, margin + 28, boxY + 10)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Matrícula:', margin + 5, boxY + 18)
  pdf.setFont('helvetica', 'normal')
  pdf.text(matricula, margin + 30, boxY + 18)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Turma:', margin + 90, boxY + 10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(turma.nome, margin + 108, boxY + 10)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Data:', margin + 90, boxY + 18)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString('pt-BR'), margin + 103, boxY + 18)

  // ========== QR CODE ==========
  const qrSize = 28
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

  // ========== INSTRUÇÕES ==========
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
    pageWidth / 2,
    boxY + boxHeight + 10,
    { align: 'center' }
  )

  // ========== GRADE DE RESPOSTAS ==========
  const gradeY = boxY + boxHeight + 18
  const circleRadius = 3.5
  const colSpacing = 9
  const rowSpacing = 10
  const questoesPerColuna = Math.ceil(totalQuestoes / 2)

  // Cabeçalho da grade
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')

  const col1X = margin + 15
  const col2X = pageWidth / 2 + 15

  // Coluna 1
  pdf.text('Nº', col1X, gradeY)
  ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
    pdf.text(letra, col1X + 14 + (i * colSpacing), gradeY)
  })

  // Coluna 2
  if (totalQuestoes > questoesPerColuna) {
    pdf.text('Nº', col2X, gradeY)
    ;['A', 'B', 'C', 'D', 'E'].forEach((letra, i) => {
      pdf.text(letra, col2X + 14 + (i * colSpacing), gradeY)
    })
  }

  // Linhas
  pdf.setLineWidth(0.3)
  pdf.line(col1X, gradeY + 4, col1X + 60, gradeY + 4)
  if (totalQuestoes > questoesPerColuna) {
    pdf.line(col2X, gradeY + 4, col2X + 60, gradeY + 4)
  }

  // Desenhar questões
  pdf.setFont('helvetica', 'normal')

  for (let i = 0; i < totalQuestoes; i++) {
    const coluna = i < questoesPerColuna ? 0 : 1
    const linha = coluna === 0 ? i : i - questoesPerColuna

    const baseX = coluna === 0 ? col1X : col2X
    const y = gradeY + 12 + (linha * rowSpacing)

    // Número da questão
    pdf.setFontSize(9)
    const numQuestao = (i + 1).toString().padStart(2, '0')
    pdf.text(numQuestao, baseX, y + 2)

    // Círculos
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.5)

    for (let alt = 0; alt < 5; alt++) {
      const circleX = baseX + 17 + (alt * colSpacing)
      pdf.circle(circleX, y, circleRadius)
    }
  }

  // ========== RODAPÉ ==========
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  )

  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`ID: ${aluno.id.substring(0, 8)}`, pageWidth - margin, pageHeight - 15, { align: 'right' })
}
