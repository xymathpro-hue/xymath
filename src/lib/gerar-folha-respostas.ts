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

  const pageWidth = 210 // A4
  const pageHeight = 297 // A4
  const halfHeight = pageHeight / 2

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const posicaoNaPagina = i % 2 // 0 = topo, 1 = baixo
    const matricula = `${turma.nome}-${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`

    // Nova página a cada 2 alunos (exceto no primeiro)
    if (i > 0 && posicaoNaPagina === 0) {
      pdf.addPage()
    }

    // Calcular posição Y
    const offsetY = posicaoNaPagina === 0 ? 0 : halfHeight

    // ========== MARCADORES DE CANTO (8mm) ==========
    pdf.setFillColor(0, 0, 0)
    // Superior esquerdo
    pdf.rect(5, offsetY + 5, 8, 8, 'F')
    // Superior direito
    pdf.rect(pageWidth - 13, offsetY + 5, 8, 8, 'F')
    // Inferior esquerdo
    pdf.rect(5, offsetY + halfHeight - 13, 8, 8, 'F')
    // Inferior direito
    pdf.rect(pageWidth - 13, offsetY + halfHeight - 13, 8, 8, 'F')

    // ========== CABEÇALHO ==========
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('[NOME DA ESCOLA]', pageWidth / 2, offsetY + 18, { align: 'center' })

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Matemática - ${turma.ano_escolar}`, pageWidth / 2, offsetY + 24, { align: 'center' })

    // Linha
    pdf.setLineWidth(0.5)
    pdf.line(20, offsetY + 27, pageWidth - 20, offsetY + 27)

    // ========== TÍTULO ==========
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, offsetY + 35, { align: 'center' })

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    const tituloTruncado = simulado.titulo.length > 50 ? simulado.titulo.substring(0, 50) + '...' : simulado.titulo
    pdf.text(tituloTruncado, pageWidth / 2, offsetY + 41, { align: 'center' })

    // ========== BOX DADOS DO ALUNO ==========
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.3)
    pdf.rect(20, offsetY + 46, 130, 22)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Aluno(a):', 25, offsetY + 54)
    pdf.setFont('helvetica', 'normal')
    const nomeExibicao = aluno.numero ? String(aluno.numero) : aluno.nome.substring(0, 30)
    pdf.text(nomeExibicao, 48, offsetY + 54)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Matrícula:', 25, offsetY + 62)
    pdf.setFont('helvetica', 'normal')
    pdf.text(matricula, 48, offsetY + 62)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Turma:', 100, offsetY + 54)
    pdf.setFont('helvetica', 'normal')
    pdf.text(turma.nome, 118, offsetY + 54)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Data:', 100, offsetY + 62)
    pdf.setFont('helvetica', 'normal')
    pdf.text(new Date().toLocaleDateString('pt-BR'), 115, offsetY + 62)

    // ========== QR CODE ==========
    const qrData = JSON.stringify({
      s: simulado.id.substring(0, 8),
      a: aluno.id.substring(0, 8),
      t: turma.id.substring(0, 8),
      m: matricula
    })

    try {
      const qrDataUrl = await gerarQRCode(qrData)
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', 155, offsetY + 46, 22, 22)
      }
    } catch (e) {
      pdf.rect(155, offsetY + 46, 22, 22)
    }

    // ========== INSTRUÇÕES ==========
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
      pageWidth / 2,
      offsetY + 74,
      { align: 'center' }
    )

    // ========== GRADE DE RESPOSTAS ==========
    const gradeY = offsetY + 80
    const questoesPerColuna = Math.ceil(totalQuestoes / 2)
    const colSpacing = 8
    const rowSpacing = 7

    // Cabeçalhos
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')

    const col1X = 25
    const col2X = 115

    // Coluna 1
    pdf.text('Nº', col1X, gradeY)
    ;['A', 'B', 'C', 'D', 'E'].forEach((letra, idx) => {
      pdf.text(letra, col1X + 12 + (idx * colSpacing), gradeY)
    })

    // Coluna 2
    if (totalQuestoes > questoesPerColuna) {
      pdf.text('Nº', col2X, gradeY)
      ;['A', 'B', 'C', 'D', 'E'].forEach((letra, idx) => {
        pdf.text(letra, col2X + 12 + (idx * colSpacing), gradeY)
      })
    }

    // Linhas abaixo cabeçalho
    pdf.setLineWidth(0.2)
    pdf.line(col1X, gradeY + 2, col1X + 55, gradeY + 2)
    if (totalQuestoes > questoesPerColuna) {
      pdf.line(col2X, gradeY + 2, col2X + 55, gradeY + 2)
    }

    // Desenhar questões
    pdf.setFont('helvetica', 'normal')
    pdf.setLineWidth(0.4)

    for (let q = 0; q < totalQuestoes; q++) {
      const coluna = q < questoesPerColuna ? 0 : 1
      const linha = coluna === 0 ? q : q - questoesPerColuna

      const baseX = coluna === 0 ? col1X : col2X
      const y = gradeY + 8 + (linha * rowSpacing)

      // Número da questão
      pdf.setFontSize(8)
      const numQuestao = (q + 1).toString().padStart(2, '0')
      pdf.text(numQuestao, baseX, y + 2)

      // Círculos
      for (let alt = 0; alt < 5; alt++) {
        const circleX = baseX + 14 + (alt * colSpacing)
        pdf.circle(circleX, y, 3)
      }
    }

    // ========== RODAPÉ ==========
    pdf.setFontSize(6)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
      pageWidth / 2,
      offsetY + halfHeight - 18,
      { align: 'center' }
    )

    pdf.setFont('helvetica', 'normal')
    pdf.text(`ID: ${aluno.id.substring(0, 8)}`, pageWidth - 20, offsetY + halfHeight - 14, { align: 'right' })

    // ========== LINHA DE CORTE (entre os dois gabaritos) ==========
    if (posicaoNaPagina === 0 && i + 1 < alunos.length) {
      pdf.setDrawColor(150)
      pdf.setLineWidth(0.3)
      pdf.setLineDashPattern([3, 3], 0)
      pdf.line(15, halfHeight, pageWidth - 15, halfHeight)
      pdf.setLineDashPattern([], 0)

      // Tesoura
      pdf.setFontSize(10)
      pdf.setTextColor(150)
      pdf.text('✂', 8, halfHeight + 1)
      pdf.setTextColor(0)
    }
  }

  // Baixar PDF
  const nomeArquivo = `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}

// ============================================
// VERSÃO GRANDE - 1 GABARITO POR PÁGINA
// ============================================
export async function gerarFolhasRespostasGrande(dados: DadosFolha): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const matricula = `${turma.nome}-${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`

    if (i > 0) {
      pdf.addPage()
    }

    // ========== MARCADORES DE CANTO (10mm) ==========
    pdf.setFillColor(0, 0, 0)
    pdf.rect(8, 8, 10, 10, 'F')
    pdf.rect(pageWidth - 18, 8, 10, 10, 'F')
    pdf.rect(8, pageHeight - 18, 10, 10, 'F')
    pdf.rect(pageWidth - 18, pageHeight - 18, 10, 10, 'F')

    // ========== CABEÇALHO ==========
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('[NOME DA ESCOLA]', pageWidth / 2, 28, { align: 'center' })

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Matemática - ${turma.ano_escolar}`, pageWidth / 2, 36, { align: 'center' })

    pdf.setLineWidth(0.5)
    pdf.line(20, 40, pageWidth - 20, 40)

    // ========== TÍTULO ==========
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, 52, { align: 'center' })

    pdf.setFontSize(12)
    pdf.text(simulado.titulo, pageWidth / 2, 60, { align: 'center' })

    // ========== BOX DADOS ==========
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.5)
    pdf.rect(20, 68, 140, 28)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Aluno(a):', 25, 80)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aluno.numero ? String(aluno.numero) : aluno.nome, 48, 80)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Matrícula:', 25, 90)
    pdf.setFont('helvetica', 'normal')
    pdf.text(matricula, 48, 90)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Turma:', 100, 80)
    pdf.setFont('helvetica', 'normal')
    pdf.text(turma.nome, 120, 80)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Data:', 100, 90)
    pdf.setFont('helvetica', 'normal')
    pdf.text(new Date().toLocaleDateString('pt-BR'), 115, 90)

    // ========== QR CODE ==========
    const qrData = JSON.stringify({
      s: simulado.id.substring(0, 8),
      a: aluno.id.substring(0, 8),
      t: turma.id.substring(0, 8),
      m: matricula
    })

    try {
      const qrDataUrl = await gerarQRCode(qrData)
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', 165, 68, 28, 28)
      }
    } catch (e) {
      pdf.rect(165, 68, 28, 28)
    }

    // ========== INSTRUÇÕES ==========
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      'Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.',
      pageWidth / 2,
      106,
      { align: 'center' }
    )

    // ========== GRADE DE RESPOSTAS ==========
    const gradeY = 115
    const questoesPerColuna = Math.ceil(totalQuestoes / 2)
    const colSpacing = 10
    const rowSpacing = 10

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')

    const col1X = 30
    const col2X = 120

    // Coluna 1
    pdf.text('Nº', col1X, gradeY)
    ;['A', 'B', 'C', 'D', 'E'].forEach((letra, idx) => {
      pdf.text(letra, col1X + 15 + (idx * colSpacing), gradeY)
    })

    // Coluna 2
    if (totalQuestoes > questoesPerColuna) {
      pdf.text('Nº', col2X, gradeY)
      ;['A', 'B', 'C', 'D', 'E'].forEach((letra, idx) => {
        pdf.text(letra, col2X + 15 + (idx * colSpacing), gradeY)
      })
    }

    // Linhas
    pdf.setLineWidth(0.3)
    pdf.line(col1X, gradeY + 4, col1X + 65, gradeY + 4)
    if (totalQuestoes > questoesPerColuna) {
      pdf.line(col2X, gradeY + 4, col2X + 65, gradeY + 4)
    }

    // Questões
    pdf.setFont('helvetica', 'normal')
    pdf.setLineWidth(0.5)

    for (let q = 0; q < totalQuestoes; q++) {
      const coluna = q < questoesPerColuna ? 0 : 1
      const linha = coluna === 0 ? q : q - questoesPerColuna

      const baseX = coluna === 0 ? col1X : col2X
      const y = gradeY + 12 + (linha * rowSpacing)

      pdf.setFontSize(10)
      const numQuestao = (q + 1).toString().padStart(2, '0')
      pdf.text(numQuestao, baseX, y + 2)

      for (let alt = 0; alt < 5; alt++) {
        const circleX = baseX + 18 + (alt * colSpacing)
        pdf.circle(circleX, y, 3.5)
      }
    }

    // ========== RODAPÉ ==========
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      'Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.',
      pageWidth / 2,
      pageHeight - 25,
      { align: 'center' }
    )

    pdf.setFontSize(6)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`ID: ${aluno.id.substring(0, 8)}`, pageWidth - 20, pageHeight - 20, { align: 'right' })
  }

  const nomeArquivo = `Folhas_Respostas_${turma.nome}_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}
