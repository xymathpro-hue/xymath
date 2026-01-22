import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface AlunoFolha {
  id: string
  nome: string
  numero?: number
}

interface ConfiguracaoFolha {
  simuladoId: string
  simuladoTitulo: string
  turmaId: string
  turmaNome: string
  totalQuestoes: number
  opcoesLetra: number
  alunos: AlunoFolha[]
}

/**
 * Gera folhas de respostas em PDF para correção automática via OpenCV
 */
export async function gerarFolhasRespostas(config: ConfiguracaoFolha): Promise<Blob> {
  const { simuladoId, simuladoTitulo, turmaId, turmaNome, totalQuestoes, opcoesLetra, alunos } = config
  
  const pdf = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const markerSize = 8
  
  for (let alunoIdx = 0; alunoIdx < alunos.length; alunoIdx++) {
    const aluno = alunos[alunoIdx]
    
    if (alunoIdx > 0) {
      pdf.addPage()
    }
    
    // MARCADORES DE CANTO (para OpenCV detectar)
    pdf.setFillColor(0, 0, 0)
    pdf.rect(margin, margin, markerSize, markerSize, 'F')
    pdf.rect(pageWidth - margin - markerSize, margin, markerSize, markerSize, 'F')
    pdf.rect(margin, pageHeight - margin - markerSize, markerSize, markerSize, 'F')
    pdf.rect(pageWidth - margin - markerSize, pageHeight - margin - markerSize, markerSize, markerSize, 'F')
    
    // QR CODE
    const qrData = `${simuladoId}|${aluno.id}|${turmaId}|${totalQuestoes}`
    
    try {
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H'
      })
      
      const qrX = margin + markerSize + 5
      const qrY = margin + markerSize + 5
      const qrSize = 30
      
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
    }
    
    // CABEÇALHO
    const headerX = margin + markerSize + 45
    const headerY = margin + markerSize + 10
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FOLHA DE RESPOSTAS', headerX, headerY)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(simuladoTitulo, headerX, headerY + 6)
    pdf.text(`Turma: ${turmaNome}`, headerX, headerY + 12)
    
    // Nome do aluno
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    const nomeY = headerY + 22
    pdf.text('Aluno:', headerX, nomeY)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aluno.nome, headerX + 15, nomeY)
    
    if (aluno.numero) {
      pdf.text(`Nº: ${aluno.numero}`, headerX + 100, nomeY)
    }
    
    // Linha separadora
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin + markerSize, nomeY + 8, pageWidth - margin - markerSize, nomeY + 8)
    
    // INSTRUÇÕES
    const instrY = nomeY + 15
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Preencha completamente o círculo da alternativa escolhida usando caneta preta ou azul escuro.', margin + markerSize + 5, instrY)
    pdf.text('Não rasure. Não use corretivo. Apenas uma resposta por questão.', margin + markerSize + 5, instrY + 4)
    
    // GRADE DE BOLHAS
    const gradeStartY = instrY + 15
    const gradeStartX = margin + markerSize + 10
    
    const questoesPorColuna = Math.ceil(totalQuestoes / 2)
    const colunaWidth = (pageWidth - 2 * margin - 2 * markerSize - 20) / 2
    const linhaHeight = 8
    const bolhaRadius = 3
    const bolhaSpacing = 12
    
    const letras = ['A', 'B', 'C', 'D', 'E'].slice(0, opcoesLetra)
    
    for (let col = 0; col < 2; col++) {
      const colX = gradeStartX + col * colunaWidth
      const questaoInicio = col * questoesPorColuna
      const questaoFim = Math.min(questaoInicio + questoesPorColuna, totalQuestoes)
      
      // Cabeçalho da coluna
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Nº', colX, gradeStartY)
      
      letras.forEach((letra, idx) => {
        const letraX = colX + 15 + idx * bolhaSpacing
        pdf.text(letra, letraX, gradeStartY)
      })
      
      // Questões
      pdf.setFont('helvetica', 'normal')
      for (let q = questaoInicio; q < questaoFim; q++) {
        const linhaY = gradeStartY + 5 + (q - questaoInicio) * linhaHeight
        
        pdf.setFontSize(9)
        const numQuestao = String(q + 1).padStart(2, '0')
        pdf.text(numQuestao, colX, linhaY + 2.5)
        
        // Bolhas
        letras.forEach((_, idx) => {
          const bolhaX = colX + 15 + idx * bolhaSpacing
          const bolhaY = linhaY
          
          pdf.setDrawColor(0, 0, 0)
          pdf.setLineWidth(0.3)
          pdf.circle(bolhaX, bolhaY + 1.5, bolhaRadius, 'S')
        })
      }
    }
    
    // RODAPÉ
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(128, 128, 128)
    pdf.text(
      'xyMath - Sistema de Correção Automática | Não dobre ou amasse esta folha',
      pageWidth / 2,
      pageHeight - margin - markerSize - 5,
      { align: 'center' }
    )
    pdf.setTextColor(0, 0, 0)
  }
  
  return pdf.output('blob')
}

/**
 * Gera folhas em branco (sem nome do aluno)
 */
export async function gerarFolhaEmBranco(config: {
  simuladoId: string
  simuladoTitulo: string
  turmaId: string
  turmaNome: string
  totalQuestoes: number
  opcoesLetra: number
  quantidade: number
}): Promise<Blob> {
  const alunos: AlunoFolha[] = []
  
  for (let i = 0; i < config.quantidade; i++) {
    alunos.push({
      id: `blank_${i + 1}`,
      nome: '_______________________________________________',
      numero: undefined
    })
  }
  
  return gerarFolhasRespostas({
    ...config,
    alunos
  })
}

/**
 * Baixa o PDF gerado
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
