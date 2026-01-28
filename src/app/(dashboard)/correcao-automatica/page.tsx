'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, Button, Badge, Modal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Camera, 
  Upload, 
  Check, 
  X, 
  RefreshCw, 
  Loader2,
  ScanLine,
  FileImage,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Save
} from 'lucide-react'

// URL da API OpenCV (Railway)
const OPENCV_API_URL = process.env.NEXT_PUBLIC_OPENCV_API_URL || 'https://web-production-af772.up.railway.app'

interface QRData {
  simulado_id: string
  aluno_id: string
  turma_id: string
  total_questoes: number
}

interface ProcessResult {
  success: boolean
  qr_data?: QRData
  answers?: (string | null)[]
  total_detected?: number
  total_questions?: number
  error?: string
}

interface Simulado {
  id: string
  titulo: string
  total_questoes: number
  gabarito: string[]
}

interface Aluno {
  id: string
  nome: string
  numero?: number
}

interface PendingCorrection {
  imageData: string
  result: ProcessResult
  simulado?: Simulado
  aluno?: Aluno
  acertos?: number
  percentual?: number
}

export default function CorrecaoAutomaticaPage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select')
  const [cameraActive, setCameraActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<PendingCorrection[]>([])
  const [currentResult, setCurrentResult] = useState<PendingCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
        setMode('camera')
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
      console.error('Erro ao acessar câmera:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    await processImage(imageData)
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target?.result as string
      await processImage(imageData)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const processImage = async (imageData: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`${OPENCV_API_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      })

      const result: ProcessResult = await response.json()

      if (result.success && result.qr_data) {
        const [simuladoRes, alunoRes] = await Promise.all([
          supabase
            .from('simulados')
            .select('id, titulo, total_questoes, gabarito')
            .eq('id', result.qr_data.simulado_id)
            .single(),
          supabase
            .from('alunos')
            .select('id, nome, numero')
            .eq('id', result.qr_data.aluno_id)
            .single()
        ])

        const simulado = simuladoRes.data as Simulado | null
        const aluno = alunoRes.data as Aluno | null

        let acertos = 0
        let percentual = 0
        
        if (simulado?.gabarito && result.answers) {
          const gabarito = typeof simulado.gabarito === 'string' 
            ? JSON.parse(simulado.gabarito) 
            : simulado.gabarito
          
          result.answers.forEach((answer, idx) => {
            if (answer && answer === gabarito[idx]) {
              acertos++
            }
          })
          percentual = Math.round((acertos / gabarito.length) * 100)
        }

        const correction: PendingCorrection = {
          imageData,
          result,
          simulado: simulado || undefined,
          aluno: aluno || undefined,
          acertos,
          percentual
        }

        setCurrentResult(correction)
        setShowConfirmModal(true)
      } else {
        setError(result.error || 'Erro ao processar imagem')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor de processamento')
      console.error('Erro:', err)
    } finally {
      setProcessing(false)
    }
  }

  const confirmResult = () => {
    if (currentResult) {
      setResults(prev => [...prev, currentResult])
      setCurrentResult(null)
      setShowConfirmModal(false)
    }
  }

  const removeResult = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index))
  }

  const saveAllResults = async () => {
    if (results.length === 0) return

    setSaving(true)
    setError(null)

    try {
      for (const correction of results) {
        if (!correction.result.qr_data || !correction.result.answers) continue

        const { qr_data, answers } = correction.result

        const { data: existing } = await supabase
          .from('resultados')
          .select('id')
          .eq('simulado_id', qr_data.simulado_id)
          .eq('aluno_id', qr_data.aluno_id)
          .single()

        if (existing) {
          await supabase
            .from('resultados')
            .update({
              respostas: answers,
              acertos: correction.acertos,
              percentual: correction.percentual,
              corrigido: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('resultados')
            .insert({
              simulado_id: qr_data.simulado_id,
              aluno_id: qr_data.aluno_id,
              turma_id: qr_data.turma_id,
              respostas: answers,
              acertos: correction.acertos,
              percentual: correction.percentual,
              total_questoes: qr_data.total_questoes,
              corrigido: true
            })
        }

        if (correction.simulado?.gabarito) {
          const gabarito = typeof correction.simulado.gabarito === 'string'
            ? JSON.parse(correction.simulado.gabarito)
            : correction.simulado.gabarito

          const { data: simuladoData } = await supabase
            .from('simulados')
            .select('questoes_ids')
            .eq('id', qr_data.simulado_id)
            .single()

          if (simuladoData?.questoes_ids) {
            const questoesIds = simuladoData.questoes_ids

            const { data: questoesData } = await supabase
              .from('questoes')
              .select('id, habilidade_codigo, descritor_codigo, ano_serie, dificuldade')
              .in('id', questoesIds)

            const questoesMap = new Map(questoesData?.map(q => [q.id, q]) || [])

            for (let i = 0; i < answers.length; i++) {
              const questaoId = questoesIds[i]
              const questaoInfo = questoesMap.get(questaoId)
              const respostaMarcada = answers[i]
              const respostaCorreta = gabarito[i]
              const acertou = respostaMarcada === respostaCorreta

              if (questaoId && respostaMarcada) {
                await supabase
                  .from('respostas')
                  .upsert({
                    aluno_id: qr_data.aluno_id,
                    questao_id: questaoId,
                    simulado_id: qr_data.simulado_id,
                    resposta_marcada: respostaMarcada,
                    correta: acertou
                  }, {
                    onConflict: 'aluno_id,questao_id,simulado_id',
                    ignoreDuplicates: false
                  })
              }

              if (!acertou && questaoId && usuario?.id) {
                await supabase
                  .from('caderno_erros')
                  .upsert({
                    usuario_id: usuario.id,
                    aluno_id: qr_data.aluno_id,
                    turma_id: qr_data.turma_id,
                    simulado_id: qr_data.simulado_id,
                    questao_id: questaoId,
                    habilidade_codigo: questaoInfo?.habilidade_codigo || null,
                    descritor_codigo: questaoInfo?.descritor_codigo || null,
                    ano_serie: questaoInfo?.ano_serie || null,
                    dificuldade: questaoInfo?.dificuldade || null,
                    resposta_correta: respostaCorreta,
                    resposta_marcada: respostaMarcada
                  }, {
                    onConflict: 'aplicacao_id,aluno_id,questao_id',
                    ignoreDuplicates: true
                  })
              }
            }
          }
        }
      }

      setResults([])
      setError(null)
      alert(`${results.length} correção(ões) salva(s) com sucesso!`)
    } catch (err) {
      setError('Erro ao salvar resultados no banco de dados')
      console.error('Erro:', err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScanLine className="w-7 h-7 text-indigo-600" />
            Correção Automática
          </h1>
          <p className="text-gray-600 mt-1">
            Escaneie as folhas de respostas para correção instantânea
          </p>
        </div>
        
        {results.length > 0 && (
          <Button onClick={saveAllResults} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar {results.length} correção(ões)
          </Button>
        )}
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-indigo-500"
            onClick={startCamera}
          >
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Usar Câmera</h3>
              <p className="text-gray-600">
                Tire fotos das folhas de respostas usando a câmera do dispositivo
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-indigo-500"
            onClick={() => {
              setMode('upload')
              fileInputRef.current?.click()
            }}
          >
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Upload className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload de Imagem</h3>
              <p className="text-gray-600">
                Envie fotos já tiradas das folhas de respostas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'camera' && (
        <Card>
          <CardContent className="p-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full max-h-[60vh] object-contain"
              />
              
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                </div>
              </div>

              {processing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                    <p className="text-lg">Processando imagem...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-4 justify-center">
              <Button variant="outline" onClick={() => { stopCamera(); setMode('select') }}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                size="lg" 
                onClick={capturePhoto}
                disabled={!cameraActive || processing}
                className="px-8"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capturar
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {processing ? (
                <div>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600" />
                  <p className="text-lg text-gray-700">Processando imagem...</p>
                </div>
              ) : (
                <>
                  <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg text-gray-700 mb-2">
                    Clique para selecionar ou arraste uma imagem
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos suportados: JPG, PNG
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-4 mt-4 justify-center">
              <Button variant="outline" onClick={() => setMode('select')}>
                <X className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" />
                Usar Câmera
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      <canvas ref={canvasRef} className="hidden" />

      {results.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Correções Pendentes ({results.length})
            </h3>

            <div className="space-y-3">
              {results.map((correction, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={correction.imageData} 
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {correction.aluno?.nome || 'Aluno não identificado'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {correction.simulado?.titulo || 'Simulado não identificado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        (correction.percentual || 0) >= 60 ? 'text-green-600' : 
                        (correction.percentual || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {correction.percentual || 0}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {correction.acertos || 0}/{correction.result.total_questions || 0} acertos
                      </p>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeResult(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-bold text-blue-900 mb-3">📋 Como usar</h3>
          <ol className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <span>Imprima as folhas de respostas com QR Code (geradas ao criar o simulado)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <span>Os alunos preenchem as bolhas com caneta preta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <span>Tire uma foto de cada folha preenchida (boa iluminação, sem reflexos)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
              <span>O sistema lê automaticamente o QR Code e as respostas marcadas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</span>
              <span>Confira o resultado e clique em "Salvar" para registrar</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => {
          setShowConfirmModal(false)
          setCurrentResult(null)
        }}
        title="Confirmar Correção"
      >
        {currentResult && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <img 
                src={currentResult.imageData} 
                alt="Gabarito escaneado"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <div>
                <h4 className="font-bold text-gray-900">
                  {currentResult.aluno?.nome || 'Aluno não encontrado'}
                </h4>
                <p className="text-sm text-gray-600">
                  {currentResult.simulado?.titulo || 'Simulado não encontrado'}
                </p>
                <div className="mt-2">
                  <Badge variant={
                    (currentResult.percentual || 0) >= 60 ? 'success' : 
                    (currentResult.percentual || 0) >= 40 ? 'warning' : 'danger'
                  }>
                    {currentResult.percentual || 0}% - {currentResult.acertos || 0} acertos
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Respostas detectadas:</p>
              <div className="flex flex-wrap gap-2">
                {currentResult.result.answers?.map((answer, idx) => (
                  <span 
                    key={idx}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium ${
                      answer 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {answer || '-'}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {currentResult.result.total_detected || 0} de {currentResult.result.total_questions || 0} respostas detectadas
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowConfirmModal(false)
                  setCurrentResult(null)
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Descartar
              </Button>
              <Button 
                className="flex-1"
                onClick={confirmResult}
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
