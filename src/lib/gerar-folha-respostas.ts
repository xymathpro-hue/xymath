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

// ===============================
// GERAR QR CODE
// ===============================
async function gerarQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
}

// ============================================
// 2 FOLHAS POR PÁGINA (PADRÃO)
// ============================================
export async function gerarFolhasRespostas(
  dados: DadosFolha
): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const blocoHeight = pageHeight / 2

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    const bloco = i % 2
    const offsetY = bloco === 0 ? 0 : blocoHeight

    if (i > 0 && bloco === 0) {
      pdf.addPage()
    }

    const matricula = `${turma.nome}-${new Date().getFullYear()}-${String(
      i + 1
    ).padStart(3, '0')}`

    // ===============================
    // MARCADORES DE CANTO
    // ===============================
    pdf.setFillColor(0, 0, 0)
    pdf.rect(6, offsetY + 6, 8, 8, 'F')
    pdf.rect(pageWidth - 14, offsetY + 6, 8, 8, 'F')
    pdf.rect(6, offsetY + blocoHeight - 14, 8, 8, 'F')
    pdf.rect(pageWidth - 14, offsetY + blocoHeight - 14, 8, 8, 'F')

    // 🔴 IMPORTANTE: voltar para branco
    pdf.setFillColor(255, 255, 255)

    // ===============================
    // CABEÇALHO
    // ===============================
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('[NOME DA ESCOLA]', pageWidth / 2, offsetY + 18, {
      align: 'center'
    })

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `Matemática - ${turma.ano_escolar}`,
      pageWidth / 2,
      offsetY + 24,
      { align: 'center' }
    )

    pdf.line(20, offsetY + 27, pageWidth - 20, offsetY + 27)

    // ===============================
    // TÍTULO
    // ===============================
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, offsetY + 35, {
      align: 'center'
    })

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(simulado.titulo, pageWidth / 2, offsetY + 41, {
      align: 'center'
    })

    // ===============================
    // DADOS DO ALUNO
    // ===============================
    pdf.rect(20, offsetY + 46, 130, 22)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Aluno:', 25, offsetY + 54)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aluno.nome.substring(0, 30), 45, offsetY + 54)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Matrícula:', 25, offsetY + 62)
    pdf.setFont('helvetica', 'normal')
    pdf.text(matricula, 45, offsetY + 62)

    // ===============================
    // QR CODE
    // ===============================
    const qrPayload = JSON.stringify({
      simulado: simulado.id,
      aluno: aluno.id,
      matricula
    })

    const qr = await gerarQRCode(qrPayload)
    pdf.addImage(qr, 'PNG', 155, offsetY + 46, 22, 22)

    // ===============================
    // GRADE DE RESPOSTAS
    // ===============================
    const inicioY = offsetY + 80
    const porColuna = Math.ceil(totalQuestoes / 2)
    const col1X = 25
    const col2X = 115
    const colSpacing = 8
    const rowSpacing = 7

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')

    for (let q = 0; q < totalQuestoes; q++) {
      const coluna = q < porColuna ? 0 : 1
      const linha = coluna === 0 ? q : q - porColuna

      const baseX = coluna === 0 ? col1X : col2X
      const y = inicioY + linha * rowSpacing

      pdf.text(String(q + 1).padStart(2, '0'), baseX, y + 2)

      for (let a = 0; a < 5; a++) {
        pdf.circle(baseX + 14 + a * colSpacing, y, 3)
      }
    }

    // ===============================
    // LINHA DE CORTE
    // ===============================
    if (bloco === 0 && i + 1 < alunos.length) {
      pdf.setDrawColor(150)
      pdf.setLineDashPattern([3, 3], 0)
      pdf.line(15, blocoHeight, pageWidth - 15, blocoHeight)
      pdf.setLineDashPattern([], 0)
    }
  }

  pdf.save(`Folhas_Respostas_${turma.nome}.pdf`)
}

// ==================================================
// EXPORT DE COMPATIBILIDADE (1 POR PÁGINA)
// ==================================================
export async function gerarFolhasRespostasGrande(
  dados: DadosFolha
): Promise<void> {
  // Por enquanto, reutiliza a versão padrão
  // (mantém compatibilidade com o modal)
  return gerarFolhasRespostas(dados)
}
