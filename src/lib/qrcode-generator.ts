// Utilitário para geração de QR Codes e Folhas de Respostas
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { Aluno, Simulado, Questao } from '@/types'

interface QRCodeData {
  tipo: 'gabarito'
  simulado_id: string
  aluno_id: string
  turma_id: string
  timestamp: number
  versao: string
}

// Gerar dados para QR Code
export function gerarDadosQRCode(simuladoId: string, alunoId: string, turmaId: string): string {
  const data: QRCodeData = {
    tipo: 'gabarito',
    simulado_id: simuladoId,
    aluno_id: alunoId,
    turma_id: turmaId,
    timestamp: Date.now(),
    versao: '1.0'
  }
  return JSON.stringify(data)
}

// Decodificar QR Code
export function decodificarQRCode(data: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed.tipo === 'gabarito') {
      return parsed as QRCodeData
    }
    return null
  } catch {
    return null
  }
}

// Gerar QR Code como Data URL
export async function gerarQRCodeDataURL(data: string): Promise<string> {
  return await QRCode.toDataURL(data, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
}

interface FolhaRespostasConfig {
  simulado: {
    id: string
    titulo: string
    tempo_minutos?: number
  }
  turma: {
    id: string
    nome: string
    ano_serie: string
  }
  alunos: Aluno[]
  totalQuestoes: number
  alternativasPorQuestao: number // 4 ou 5
  cabecalho?: {
    escola?: string
    professor?: string
    data?: string
    disciplina?: string
  }
}

// Gerar PDF com folhas de respostas para toda a turma
export async function gerarFolhasRespostasPDF(config: FolhaRespostasConfig): Promise<Blob> {
  const { simulado, turma, alunos, totalQuestoes, alternativasPorQuestao, cabecalho } = config
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15

  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i]
    
    if (i > 0) {
      pdf.addPage()
    }

    let yPos = margin

    // Cabeçalho da escola
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(cabecalho?.escola || '[NOME DA ESCOLA]', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${cabecalho?.disciplina || 'Matemática'} - ${turma.ano_serie}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    // Linha separadora
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    // Título do simulado
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FOLHA DE RESPOSTAS', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    pdf.setFontSize(12)
    pdf.text(simulado.titulo, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    // Informações do aluno
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    // Box com informações
    const boxHeight = 25
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.3)
    pdf.rect(margin, yPos, pageWidth - 2 * margin, boxHeight)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Aluno(a):', margin + 3, yPos + 6)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aluno.nome, margin + 25, yPos + 6)
    
    if (aluno.matricula) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Matrícula:', margin + 3, yPos + 13)
      pdf.setFont('helvetica', 'normal')
      pdf.text(aluno.matricula, margin + 28, yPos + 13)
    }
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Turma:', margin + 100, yPos + 6)
    pdf.setFont('helvetica', 'normal')
    pdf.text(turma.nome, margin + 118, yPos + 6)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Data:', margin + 100, yPos + 13)
    pdf.setFont('helvetica', 'normal')
    pdf.text(cabecalho?.data || '___/___/______', margin + 115, yPos + 13)

    // QR Code no canto superior direito do box
    const qrData = gerarDadosQRCode(simulado.id, aluno.id, turma.id)
    const qrCodeDataURL = await gerarQRCodeDataURL(qrData)
    const qrSize = 22
    pdf.addImage(qrCodeDataURL, 'PNG', pageWidth - margin - qrSize - 3, yPos + 1, qrSize, qrSize)

    yPos += boxHeight + 10

    // Instruções
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8

    // Grade de respostas
    const questoesPorColuna = Math.ceil(totalQuestoes / 2)
    const colunaWidth = (pageWidth - 2 * margin - 20) / 2
    const linhaHeight = 8
    const circleRadius = 2.5
    const alternativas = alternativasPorQuestao === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D']

    // Desenhar grade
    for (let col = 0; col < 2; col++) {
      const xBase = margin + col * (colunaWidth + 20)
      let yBase = yPos

      // Cabeçalho da coluna
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Nº', xBase, yBase)
      
      alternativas.forEach((alt, idx) => {
        pdf.text(alt, xBase + 15 + idx * 12, yBase)
      })
      
      yBase += 5
      pdf.setLineWidth(0.2)
      pdf.line(xBase, yBase, xBase + 15 + alternativas.length * 12, yBase)
      yBase += 3

      // Questões
      pdf.setFont('helvetica', 'normal')
      const startQ = col * questoesPorColuna
      const endQ = Math.min(startQ + questoesPorColuna, totalQuestoes)

      for (let q = startQ; q < endQ; q++) {
        const questaoNum = q + 1
        
        // Número da questão
        pdf.setFontSize(9)
        pdf.text(questaoNum.toString().padStart(2, '0'), xBase, yBase + 2)
        
        // Círculos para marcar
        alternativas.forEach((alt, idx) => {
          const cx = xBase + 15 + idx * 12
          const cy = yBase
          
          pdf.setDrawColor(0)
          pdf.setLineWidth(0.3)
          pdf.circle(cx, cy, circleRadius)
        })
        
        yBase += linhaHeight
      }
    }

    // Rodapé
    const footerY = pageHeight - 15
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100)
    pdf.text('Não dobre ou amasse esta folha. O QR Code é necessário para correção automática.', pageWidth / 2, footerY, { align: 'center' })
    pdf.setTextColor(0)

    // ID único pequeno no rodapé
    pdf.setFontSize(6)
    pdf.text(`ID: ${aluno.id.substring(0, 8)}`, pageWidth - margin, footerY + 5, { align: 'right' })
  }

  return pdf.output('blob')
}

// Gerar PDF de uma única folha de resposta (para preview)
export async function gerarFolhaRespostaPreview(config: Omit<FolhaRespostasConfig, 'alunos'> & { aluno: Aluno }): Promise<Blob> {
  return gerarFolhasRespostasPDF({
    ...config,
    alunos: [config.aluno]
  })
}

// Gerar gabarito oficial do professor em PDF
export async function gerarGabaritoProfessorPDF(config: {
  simulado: { titulo: string }
  turma: { nome: string }
  questoes: Questao[]
  cabecalho?: { escola?: string; data?: string }
}): Promise<Blob> {
  const { simulado, turma, questoes, cabecalho } = config
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  let yPos = margin

  // Cabeçalho
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(cabecalho?.escola || '[NOME DA ESCOLA]', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  pdf.setFontSize(18)
  pdf.text('GABARITO OFICIAL', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(simulado.titulo, pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  pdf.text(`Turma: ${turma.nome}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Tabela de gabarito
  const questoesPorLinha = 10
  const cellWidth = (pageWidth - 2 * margin) / questoesPorLinha
  const cellHeight = 12

  for (let i = 0; i < questoes.length; i += questoesPorLinha) {
    // Linha de números
    pdf.setFillColor(230, 230, 230)
    for (let j = 0; j < questoesPorLinha && i + j < questoes.length; j++) {
      const x = margin + j * cellWidth
      pdf.rect(x, yPos, cellWidth, cellHeight / 2, 'FD')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text((i + j + 1).toString(), x + cellWidth / 2, yPos + 4, { align: 'center' })
    }
    yPos += cellHeight / 2

    // Linha de respostas
    pdf.setFillColor(255, 255, 255)
    for (let j = 0; j < questoesPorLinha && i + j < questoes.length; j++) {
      const x = margin + j * cellWidth
      pdf.rect(x, yPos, cellWidth, cellHeight / 2, 'D')
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 100, 0)
      pdf.text(questoes[i + j].resposta_correta, x + cellWidth / 2, yPos + 4, { align: 'center' })
      pdf.setTextColor(0)
    }
    yPos += cellHeight / 2 + 5
  }

  // Rodapé
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.text('Documento exclusivo do professor - Não divulgar aos alunos', pageWidth / 2, yPos + 20, { align: 'center' })

  return pdf.output('blob')
}
