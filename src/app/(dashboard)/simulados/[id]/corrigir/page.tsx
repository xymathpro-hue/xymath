'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Badge, Modal, Input, Select } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Simulado, Turma, Questao, Aluno } from '@/types'
import { decodificarQRCode } from '@/lib/qrcode-generator'
import { Html5Qrcode } from 'html5-qrcode'
import { 
  ArrowLeft, QrCode, Camera, CheckCircle, XCircle, User, 
  BarChart3, Save, Trash2, RefreshCw, AlertCircle
} from 'lucide-react'

interface RespostaAluno {
  aluno_id: string
  aluno_nome: string
  respostas: Record<string, string> // questao_id -> resposta
  acertos: number
  percentual: number
  corrigido_em?: string
}

export default function CorrigirSimuladoPage() {
  const params = useParams()
  const router = useRouter()
  const { usuario } = useAuth()
  const supabase = createClient()
  const simuladoId = params.id as string

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [selectedAluno, setSelectedAluno] = useState<string>('')
  const [manualRespostas, setManualRespostas] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<RespostaAluno[]>([])
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  // Carregar dados
  const fetchData = useCallback(async () => {
    if (!usuario?.id || !simuladoId) return
    try {
      const { data: simData } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', simuladoId)
        .eq('usuario_id', usuario.id)
        .single()
      
      if (!simData) {
        router.push('/simulados')
        return
      }
      setSimulado(simData)

      if (simData.turma_id) {
        const { data: turmaData } = await supabase.from('turmas').select('*').eq('id', simData.turma_id).single()
        setTurma(turmaData)

        const { data: alunosData } = await supabase.from('alunos').select('*').eq('turma_id', simData.turma_id).eq('ativo', true).order('nome')
        setAlunos(alunosData || [])
      }

      if (simData.questoes_ids?.length > 0) {
        const { data: questoesData } = await supabase.from('questoes').select('*').in('id', simData.questoes_ids)
        const questoesOrdenadas = simData.questoes_ids.map((id: string) => questoesData?.find(q => q.id === id)).filter(Boolean) as Questao[]
        setQuestoes(questoesOrdenadas)
      }

      // Carregar resultados existentes
      const { data: aplicacao } = await supabase
        .from('aplicacoes')
        .select('*')
        .eq('simulado_id', simData.id)
        .eq('turma_id', simData.turma_id)
        .single()

      if (aplicacao) {
        const { data: respostasData } = await supabase
          .from('resultados')
          .select('*, alunos(nome)')
          .eq('aplicacao_id', aplicacao.id)

        if (respostasData) {
          // Buscar respostas detalhadas
          const resultadosFormatados: RespostaAluno[] = []
          for (const r of respostasData) {
            const { data: respostasAluno } = await supabase
              .from('respostas')
              .select('*')
              .eq('aplicacao_id', aplicacao.id)
              .eq('aluno_id', r.aluno_id)

            const respostas: Record<string, string> = {}
            respostasAluno?.forEach(resp => {
              respostas[resp.questao_id] = resp.resposta_marcada
            })

            resultadosFormatados.push({
              aluno_id: r.aluno_id,
              aluno_nome: (r.alunos as any)?.nome || 'Desconhecido',
              respostas,
              acertos: r.total_acertos,
              percentual: r.percentual,
              corrigido_em: r.corrigido_em,
            })
          }
          setResultados(resultadosFormatados)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, simuladoId, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Iniciar scanner
  const startScanner = async () => {
    if (!scannerContainerRef.current) return
    setScanError(null)

    try {
      scannerRef.current = new Html5Qrcode('qr-reader')
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // ignore failures
      )
      setScanning(true)
    } catch (e: any) {
      console.error('Erro ao iniciar câmera:', e)
      setScanError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  // Parar scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      scannerRef.current = null
    }
    setScanning(false)
  }

  // Processar QR Code escaneado
  const onScanSuccess = async (decodedText: string) => {
    const data = decodificarQRCode(decodedText)
    if (!data || data.simulado_id !== simuladoId) {
      setScanError('QR Code inválido ou de outro simulado')
      return
    }

    // Evitar processar mesmo QR repetidamente
    if (lastScanned === data.aluno_id) return
    setLastScanned(data.aluno_id)

    // Abrir modal para digitar respostas
    setSelectedAluno(data.aluno_id)
    setManualRespostas({})
    setManualModalOpen(true)
    
    // Parar scanner
    await stopScanner()
  }

  // Salvar respostas
  const handleSaveRespostas = async () => {
    if (!selectedAluno || !simulado || !turma) return

    try {
      // Criar ou buscar aplicação
      let { data: aplicacao } = await supabase
        .from('aplicacoes')
        .select('*')
        .eq('simulado_id', simulado.id)
        .eq('turma_id', turma.id)
        .single()

      if (!aplicacao) {
        const { data: novaAplicacao } = await supabase
          .from('aplicacoes')
          .insert({
            simulado_id: simulado.id,
            turma_id: turma.id,
            data_aplicacao: new Date().toISOString().split('T')[0],
            status: 'em_andamento',
          })
          .select()
          .single()
        aplicacao = novaAplicacao
      }

      if (!aplicacao) throw new Error('Falha ao criar aplicação')

      // Calcular acertos
      let acertos = 0
      const respostasToInsert = questoes.map(q => {
        const resposta = manualRespostas[q.id] || null
        const correta = resposta === q.resposta_correta
        if (correta) acertos++
        return {
          aplicacao_id: aplicacao.id,
          aluno_id: selectedAluno,
          questao_id: q.id,
          resposta_marcada: resposta,
          correta,
        }
      })

      // Deletar respostas anteriores do aluno
      await supabase
        .from('respostas')
        .delete()
        .eq('aplicacao_id', aplicacao.id)
        .eq('aluno_id', selectedAluno)

      // Inserir novas respostas
      await supabase.from('respostas').insert(respostasToInsert)

      // Salvar resultado
      const percentual = (acertos / questoes.length) * 100
      await supabase
        .from('resultados')
        .upsert({
          aplicacao_id: aplicacao.id,
          aluno_id: selectedAluno,
          total_questoes: questoes.length,
          total_acertos: acertos,
          percentual,
          metodo_correcao: 'qrcode',
          corrigido_em: new Date().toISOString(),
        }, { onConflict: 'aplicacao_id,aluno_id' })

      // Atualizar lista local
      const aluno = alunos.find(a => a.id === selectedAluno)
      setResultados(prev => {
        const filtered = prev.filter(r => r.aluno_id !== selectedAluno)
        return [...filtered, {
          aluno_id: selectedAluno,
          aluno_nome: aluno?.nome || 'Desconhecido',
          respostas: manualRespostas,
          acertos,
          percentual,
          corrigido_em: new Date().toISOString(),
        }].sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome))
      })

      setManualModalOpen(false)
      setSelectedAluno('')
      setManualRespostas({})
      setLastScanned(null)
    } catch (e) {
      console.error('Erro ao salvar:', e)
    }
  }

  // Abrir correção manual
  const openManualCorrection = (alunoId: string) => {
    const existente = resultados.find(r => r.aluno_id === alunoId)
    setSelectedAluno(alunoId)
    setManualRespostas(existente?.respostas || {})
    setManualModalOpen(true)
  }

  // Deletar resultado
  const handleDeleteResultado = async (alunoId: string) => {
    if (!confirm('Remover correção deste aluno?')) return
    
    const { data: aplicacao } = await supabase
      .from('aplicacoes')
      .select('id')
      .eq('simulado_id', simuladoId)
      .eq('turma_id', turma?.id)
      .single()

    if (aplicacao) {
      await supabase.from('respostas').delete().eq('aplicacao_id', aplicacao.id).eq('aluno_id', alunoId)
      await supabase.from('resultados').delete().eq('aplicacao_id', aplicacao.id).eq('aluno_id', alunoId)
    }

    setResultados(prev => prev.filter(r => r.aluno_id !== alunoId))
  }

  const alunoSelecionadoObj = alunos.find(a => a.id === selectedAluno)
  const alunosCorrigidos = resultados.length
  const alunosPendentes = alunos.length - alunosCorrigidos
  const mediaGeral = resultados.length > 0 ? resultados.reduce((acc, r) => acc + r.percentual, 0) / resultados.length : 0

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
  }

  if (!simulado || !turma) {
    return <div className="p-6"><p>Simulado ou turma não encontrados.</p></div>
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/simulados/${simuladoId}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold">Corrigir Simulado</h1>
        <p className="text-gray-600">{simulado.titulo} • {turma.nome}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total de Alunos</p>
            <p className="text-2xl font-bold">{alunos.length}</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Corrigidos</p>
            <p className="text-2xl font-bold text-green-600">{alunosCorrigidos}</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{alunosPendentes}</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Média Geral</p>
            <p className="text-2xl font-bold text-indigo-600">{mediaGeral.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Escanear QR Code
            </h2>

            <div id="qr-reader" ref={scannerContainerRef} className="mb-4 rounded-lg overflow-hidden" style={{ minHeight: scanning ? 300 : 0 }} />

            {scanError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {scanError}
              </div>
            )}

            <div className="flex gap-3">
              {!scanning ? (
                <Button onClick={startScanner} className="flex-1">
                  <Camera className="w-5 h-5 mr-2" />
                  Iniciar Câmera
                </Button>
              ) : (
                <Button variant="outline" onClick={stopScanner} className="flex-1">
                  Parar Câmera
                </Button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">Ou digite manualmente:</p>
              <Select
                options={alunos.filter(a => !resultados.find(r => r.aluno_id === a.id)).map(a => ({ value: a.id, label: a.nome }))}
                placeholder="Selecione um aluno..."
                value=""
                onChange={(e) => {
                  if (e.target.value) openManualCorrection(e.target.value)
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Resultados ({resultados.length})
            </h2>

            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum aluno corrigido ainda</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resultados.map(r => (
                  <div key={r.aluno_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        r.percentual >= 70 ? 'bg-green-500' : r.percentual >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {Math.round(r.percentual)}%
                      </div>
                      <div>
                        <p className="font-medium">{r.aluno_nome}</p>
                        <p className="text-xs text-gray-500">{r.acertos}/{questoes.length} acertos</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openManualCorrection(r.aluno_id)}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteResultado(r.aluno_id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resultados.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Link href={`/resultados?simulado=${simuladoId}`}>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Ver Análise Completa
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Digitar Respostas */}
      <Modal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Digitar Respostas" size="lg">
        <div className="space-y-4">
          {alunoSelecionadoObj && (
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="font-semibold text-indigo-900">{alunoSelecionadoObj.nome}</p>
              {alunoSelecionadoObj.matricula && <p className="text-sm text-indigo-700">Matrícula: {alunoSelecionadoObj.matricula}</p>}
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
            {questoes.map((q, index) => (
              <div key={q.id} className="text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">Q{index + 1}</p>
                <div className="flex gap-1 justify-center">
                  {['A', 'B', 'C', 'D', ...(q.alternativa_e ? ['E'] : [])].map(letra => (
                    <button
                      key={letra}
                      onClick={() => setManualRespostas(prev => ({ ...prev, [q.id]: letra }))}
                      className={`w-7 h-7 rounded text-sm font-medium transition-colors ${
                        manualRespostas[q.id] === letra
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {letra}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setManualModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSaveRespostas}>
              <Save className="w-4 h-4 mr-2" />Salvar Respostas
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
