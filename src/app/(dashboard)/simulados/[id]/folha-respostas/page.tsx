'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Download, Users, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

interface Simulado {
  id: string
  titulo: string
  total_questoes: number
  gabarito: string[]
  turmas_ids: string[]
  turma_id: string | null
  configuracoes: {
    cabecalho_escola?: string
    cabecalho_endereco?: string
  }
}

interface Aluno {
  id: string
  nome: string
  matricula: string | null
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const { data: simData, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !simData) {
        alert('Simulado não encontrado')
        router.push('/simulados')
        return
      }

      setSimulado(simData)

      const turmaIds = simData.turmas_ids?.length > 0 
        ? simData.turmas_ids 
        : simData.turma_id ? [simData.turma_id] : []

      if (turmaIds.length > 0) {
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
          .in('id', turmaIds)

        if (turmasData) {
          setTurmas(turmasData)
          setTurmaSelecionada(turmasData[0]?.id || '')
        }
      }

      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  useEffect(() => {
    const carregarAlunos = async () => {
      if (!turmaSelecionada) {
        setAlunos([])
        return
      }

      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])
    }

    carregarAlunos()
  }, [turmaSelecionada, supabase])

  const gerarPDF = async () => {
    if (!simulado || alunos.length === 0) return

    setGerando(true)

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 10
      const halfHeight = pageHeight / 2

      const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

      for (let i = 0; i < alunos.length; i++) {
        const aluno = alunos[i]
        const isTopHalf = i % 2 === 0
        const yOffset = isTopHalf ? 0 : halfHeight

        // Nova página a cada 2 alunos
        if (i > 0 && i % 2 === 0) {
          doc.addPage()
        }

        // Gerar QR Code
        const qrData = JSON.stringify({
          s: simulado.id.substring(0, 8),
          a: aluno.id.substring(0, 8),
          t: turmaSelecionada.substring(0, 8),
          q: simulado.total_questoes
        })

        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 80,
          margin: 1
        })

        // === DESENHAR FOLHA ===

        // Marcadores de canto (quadrados pretos)
        const markerSize = 5
        // Superior esquerdo
        doc.setFillColor(0, 0, 0)
        doc.rect(margin, yOffset + margin, markerSize, markerSize, 'F')
        // Superior direito
        doc.rect(pageWidth - margin - markerSize, yOffset + margin, markerSize, markerSize, 'F')
        // Inferior esquerdo
        doc.rect(margin, yOffset + halfHeight - margin - markerSize, markerSize, markerSize, 'F')
        // Inferior direito
        doc.rect(pageWidth - margin - markerSize, yOffset + halfHeight - margin - markerSize, markerSize, markerSize, 'F')

        // Linha divisória entre as duas folhas
        if (!isTopHalf) {
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.5)
          doc.line(margin, halfHeight, pageWidth - margin, halfHeight)
        }

        // Cabeçalho
        let currentY = yOffset + margin + 10

        if (simulado.configuracoes?.cabecalho_escola) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text(simulado.configuracoes.cabecalho_escola, pageWidth / 2, currentY, { align: 'center' })
          currentY += 5
        }

        if (simulado.configuracoes?.cabecalho_endereco) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(simulado.configuracoes.cabecalho_endereco, pageWidth / 2, currentY, { align: 'center' })
          currentY += 5
        }

        // Título do simulado
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(simulado.titulo, pageWidth / 2, currentY + 3, { align: 'center' })
        currentY += 10

        // Linha separadora
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.3)
        doc.line(margin, currentY, pageWidth - margin, currentY)
        currentY += 5

        // QR Code (lado direito)
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 25, currentY - 5, 22, 22)

        // Dados do aluno
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('ALUNO:', margin, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(aluno.nome, margin + 15, currentY)
        currentY += 5

        doc.setFont('helvetica', 'bold')
        doc.text('TURMA:', margin, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(`${turmaAtual?.nome || ''} - ${turmaAtual?.ano_serie || ''}`, margin + 15, currentY)

        if (aluno.matricula) {
          doc.setFont('helvetica', 'bold')
          doc.text('MATRÍCULA:', margin + 60, currentY)
          doc.setFont('helvetica', 'normal')
          doc.text(aluno.matricula, margin + 82, currentY)
        }
        currentY += 8

        // Instruções
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('INSTRUÇÕES:', margin + 2, currentY + 3)
        doc.setFont('helvetica', 'normal')
        doc.text('Preencha completamente o círculo da alternativa escolhida usando caneta PRETA. Não rasure.', margin + 22, currentY + 3)
        currentY += 12
        // Grade de respostas
        const questoesPorLinha = 5
        const colunaWidth = (pageWidth - 2 * margin) / questoesPorLinha
        const linhaHeight = 8
        const circleRadius = 2.5

        for (let q = 0; q < simulado.total_questoes; q++) {
          const col = q % questoesPorLinha
          const row = Math.floor(q / questoesPorLinha)
          const x = margin + col * colunaWidth
          const y = currentY + row * linhaHeight

          // Número da questão
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text(String(q + 1).padStart(2, '0'), x + 2, y + 4)

          // Alternativas A, B, C, D, E
          const alternativas = ['A', 'B', 'C', 'D', 'E']
          alternativas.forEach((alt, idx) => {
            const circleX = x + 12 + idx * 7
            const circleY = y + 3

            // Letra acima do círculo
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.text(alt, circleX, circleY - 3, { align: 'center' })

            // Círculo
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.4)
            doc.circle(circleX, circleY, circleRadius)
          })
        }

        // Calcular altura usada pelas questões
        const totalLinhas = Math.ceil(simulado.total_questoes / questoesPorLinha)
        currentY += totalLinhas * linhaHeight + 5

        // Rodapé
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(128, 128, 128)
        doc.text(`ID: ${aluno.id.substring(0, 8)}`, margin, yOffset + halfHeight - margin - 2)
        doc.text('xyMath - Sistema de Avaliação', pageWidth / 2, yOffset + halfHeight - margin - 2, { align: 'center' })
        doc.text(`Folha ${i + 1} de ${alunos.length}`, pageWidth - margin, yOffset + halfHeight - margin - 2, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      // Baixar PDF
      const turmaName = turmaAtual?.nome?.replace(/\s+/g, '_') || 'turma'
      doc.save(`folhas_respostas_${simulado.titulo.replace(/\s+/g, '_')}_${turmaName}.pdf`)

    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF')
    } finally {
      setGerando(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!simulado) return null

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controles */}
      <div className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Folha de Respostas</h1>
              <p className="text-gray-600">{simulado.titulo}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {turmas.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <select
                  value={turmaSelecionada}
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  {turmas.map(turma => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.ano_serie}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                {alunos.length} alunos
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                {simulado.total_questoes} questões
              </span>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={gerarPDF}
              disabled={alunos.length === 0 || gerando}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {gerando ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          </div>

          {alunos.length === 0 && turmaSelecionada && (
            <p className="mt-4 text-amber-600 bg-amber-50 p-3 rounded-lg">
              Nenhum aluno encontrado nesta turma. Cadastre alunos primeiro.
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pré-visualização</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alunos.slice(0, 4).map((aluno, index) => (
                <div key={aluno.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{aluno.nome}</p>
                      <p className="text-sm text-gray-500">
                        {turmaAtual?.nome} - {turmaAtual?.ano_serie}
                      </p>
                      {aluno.matricula && (
                        <p className="text-xs text-gray-400">Mat: {aluno.matricula}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">QR</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3].map(q => (
                      <div key={q} className="flex items-center gap-0.5">
                        <span className="text-xs font-bold text-gray-600">{q}</span>
                        {['A', 'B', 'C', 'D', 'E'].map(alt => (
                          <div key={alt} className="w-3 h-3 border border-gray-400 rounded-full"></div>
                        ))}
                      </div>
                    ))}
                    <span className="text-xs text-gray-400">...</span>
                  </div>
                </div>
              ))}
            </div>

            {alunos.length > 4 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                E mais {alunos.length - 4} alunos...
              </p>
            )}

            {alunos.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700">
                  <FileText className="w-4 h-4 inline mr-2" />
                  O PDF terá <strong>{Math.ceil(alunos.length / 2)}</strong> página(s) A4 
                  com <strong>2 folhas por página</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
