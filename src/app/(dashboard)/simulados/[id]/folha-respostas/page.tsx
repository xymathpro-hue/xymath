'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Printer, Download, Users } from 'lucide-react'
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
  const printRef = useRef<HTMLDivElement>(null)

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      // Carregar simulado
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

      // Carregar turmas
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

  // Carregar alunos quando selecionar turma
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

  // Gerar QR Codes para todos os alunos
  const gerarQRCodes = async () => {
    if (!simulado || alunos.length === 0) return

    setGerando(true)
    const codes: { [key: string]: string } = {}

    for (const aluno of alunos) {
      const qrData = JSON.stringify({
        s: simulado.id.substring(0, 8), // simulado_id (abreviado)
        a: aluno.id.substring(0, 8),    // aluno_id (abreviado)
        t: turmaSelecionada.substring(0, 8), // turma_id (abreviado)
        q: simulado.total_questoes      // total questões
      })

      try {
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        })
        codes[aluno.id] = qrDataUrl
      } catch (err) {
        console.error('Erro ao gerar QR:', err)
      }
    }

    setQrCodes(codes)
    setGerando(false)
  }

  // Gerar quando alunos carregarem
  useEffect(() => {
    if (alunos.length > 0 && simulado) {
      gerarQRCodes()
    }
  }, [alunos, simulado])

  const handlePrint = () => {
    window.print()
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
      {/* CONTROLES (não imprime) */}
      <div className="print:hidden p-6 bg-white border-b sticky top-0 z-10">
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
              onClick={handlePrint}
              disabled={alunos.length === 0 || gerando}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {gerando ? 'Gerando...' : 'Imprimir Folhas'}
            </button>
          </div>

          {alunos.length === 0 && turmaSelecionada && (
            <p className="mt-4 text-amber-600 bg-amber-50 p-3 rounded-lg">
              Nenhum aluno encontrado nesta turma. Cadastre alunos primeiro.
            </p>
          )}
        </div>
      </div>

      {/* PREVIEW DAS FOLHAS */}
      <div className="print:hidden p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-gray-500 mb-4">
            Pré-visualização: {alunos.length} folhas serão geradas (2 por página A4)
          </p>
        </div>
      </div>

      {/* FOLHAS PARA IMPRESSÃO */}
      <div ref={printRef} className="print:block">
        {alunos.map((aluno, index) => (
          <div
            key={aluno.id}
            className="folha-resposta bg-white mx-auto mb-8 print:mb-0 print:break-after-page"
            style={{ 
              width: '210mm', 
              minHeight: '148.5mm', // Metade do A4
              padding: '8mm',
              boxSizing: 'border-box'
            }}
          >
            {/* Marcadores de canto para leitura óptica */}
            <div className="relative">
              {/* Marcador superior esquerdo */}
              <div className="absolute top-0 left-0 w-6 h-6 border-4 border-black"></div>
              {/* Marcador superior direito */}
              <div className="absolute top-0 right-0 w-6 h-6 border-4 border-black"></div>
              {/* Marcador inferior esquerdo */}
              <div className="absolute bottom-0 left-0 w-6 h-6 border-4 border-black" style={{ position: 'fixed', bottom: '8mm', left: '8mm' }}></div>
              {/* Marcador inferior direito */}
              <div className="absolute bottom-0 right-0 w-6 h-6 border-4 border-black" style={{ position: 'fixed', bottom: '8mm', right: '8mm' }}></div>
            </div>

            {/* Cabeçalho */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              {simulado.configuracoes?.cabecalho_escola && (
                <p className="text-sm font-bold text-black">{simulado.configuracoes.cabecalho_escola}</p>
              )}
              {simulado.configuracoes?.cabecalho_endereco && (
                <p className="text-xs text-black">{simulado.configuracoes.cabecalho_endereco}</p>
              )}
              <p className="text-base font-bold text-black mt-1">{simulado.titulo}</p>
            </div>

            {/* Dados do Aluno */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-black">ALUNO:</span>
                  <span className="text-sm font-bold text-black border-b border-black flex-1 pb-0.5">
                    {aluno.nome}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-black">TURMA:</span>
                    <span className="text-xs text-black">{turmaAtual?.nome} - {turmaAtual?.ano_serie}</span>
                  </div>
                  {aluno.matricula && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-black">MATRÍCULA:</span>
                      <span className="text-xs text-black">{aluno.matricula}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="ml-4 text-center">
                {qrCodes[aluno.id] ? (
                  <img 
                    src={qrCodes[aluno.id]} 
                    alt="QR Code" 
                    className="w-20 h-20"
                  />
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center">
                    <span className="text-xs text-gray-500">QR</span>
                  </div>
                )}
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-gray-100 p-2 rounded mb-3 text-xs text-black">
              <strong>INSTRUÇÕES:</strong> Preencha completamente o círculo da alternativa escolhida usando caneta PRETA.
              Não rasure. Não use corretivo.
            </div>

            {/* Grade de Respostas */}
            <div className="grid grid-cols-5 gap-x-4 gap-y-1">
              {Array.from({ length: simulado.total_questoes }).map((_, i) => (
                <div key={i} className="flex items-center gap-1 py-0.5">
                  <span className="w-5 text-xs font-bold text-black text-right">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex gap-1">
                    {['A', 'B', 'C', 'D', 'E'].map((alt) => (
                      <div key={alt} className="flex flex-col items-center">
                        <span className="text-[8px] text-black font-semibold">{alt}</span>
                        <div className="w-4 h-4 border-2 border-black rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé */}
            <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between text-[8px] text-gray-600">
              <span>ID: {aluno.id.substring(0, 8)}</span>
              <span>xyMath - Sistema de Avaliação</span>
              <span>Folha {index + 1} de {alunos.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .folha-resposta {
            page-break-inside: avoid;
            margin: 0 !important;
            box-shadow: none !important;
          }
          
          .folha-resposta:nth-child(odd) {
            page-break-after: avoid;
          }
          
          .folha-resposta:nth-child(even) {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}
