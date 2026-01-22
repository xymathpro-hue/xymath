import jsPDF from 'jspdf'

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

export async function gerarFolhasRespostas(dados: DadosFolha): Promise<void> {
  const { simulado, turma, alunos, totalQuestoes } = dados

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15

  alunos.forEach((aluno, alunoIndex) => {
    if (alunoIndex > 0) {
      pdf.addPage()
    }

    // Cabeçalho
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(simulado.titulo, pageWidth / 2, 20, { align: 'center' })

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Turma: ${turma.nome} - ${turma.ano_escolar}`, margin, 30)
    pdf.text(`Duração: ${simulado.duracao} minutos`, pageWidth - margin, 30, { align: 'right' })

    // Dados do aluno
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    const numeroStr = aluno.numero ? `Nº ${aluno.numero} - ` : ''
    pdf.text(`${numeroStr}${aluno.nome}`, margin, 42)

    // Linha separadora
    pdf.setLineWidth(0.5)
    pdf.line(margin, 47, pageWidth - margin, 47)

    // Instruções
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Marque apenas UMA alternativa por questão. Use caneta azul ou preta.', margin, 54)

    // Grade de respostas
    const startY = 62
    const colWidth = 35
    const rowHeight = 8
    const questoesPerCol = Math.ceil(totalQuestoes / 4)
    const cols = Math.min(4, Math.ceil(totalQuestoes / questoesPerCol))

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    for (let i = 0; i < totalQuestoes; i++) {
      const col = Math.floor(i / questoesPerCol)
      const row = i % questoesPerCol
      
      const x = margin + (col * colWidth)
      const y = startY + (row * rowHeight)

      // Número da questão
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${(i + 1).toString().padStart(2, '0')}.`, x, y + 5)

      // Alternativas
      pdf.setFont('helvetica', 'normal')
      const altX = x + 10
      const alternatives = ['A', 'B', 'C', 'D']
      
      alternatives.forEach((alt, altIndex) => {
        const circleX = altX + (altIndex * 6)
        
        // Círculo
        pdf.circle(circleX, y + 3.5, 2)
        
        // Letra
        pdf.setFontSize(7)
        pdf.text(alt, circleX - 1.2, y + 4.5)
        pdf.setFontSize(10)
      })
    }

    // QR Code placeholder (área para QR)
    const qrSize = 25
    const qrX = pageWidth - margin - qrSize
    const qrY = pageHeight - margin - qrSize - 15

    // Gerar dados do QR Code
    const qrData = JSON.stringify({
      s: simulado.id,
      a: aluno.id,
      t: turma.id
    })

    // Desenhar área do QR Code
    pdf.setDrawColor(200)
    pdf.setLineWidth(0.3)
    pdf.rect(qrX, qrY, qrSize, qrSize)

    // Texto do QR Code (simulado - em produção usaria biblioteca de QR)
    pdf.setFontSize(6)
    pdf.setFont('helvetica', 'normal')
    pdf.text('QR Code', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' })
    pdf.text(aluno.id.substring(0, 8), qrX + qrSize/2, qrY + qrSize/2 + 3, { align: 'center' })

    // Rodapé
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`ID: ${aluno.id.substring(0, 8)}`, margin, pageHeight - margin)
    pdf.text(`Página ${alunoIndex + 1} de ${alunos.length}`, pageWidth / 2, pageHeight - margin, { align: 'center' })

    // Assinatura do aluno
    pdf.setFontSize(9)
    pdf.text('Assinatura do aluno: _______________________________', margin, pageHeight - margin - 20)
  })

  // Baixar PDF
  const nomeArquivo = `Folhas_Respostas_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${turma.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  pdf.save(nomeArquivo)
}
