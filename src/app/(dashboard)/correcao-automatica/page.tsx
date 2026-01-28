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
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Iniciar câmera com melhor compatibilidade mobile
  const startCamera = useCallback(async () => {
    setError(null)
    setCameraError(null)
    setMode('camera')

    try {
      // Primeiro tenta câmera traseira
      let stream: MediaStream | null = null
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
      } catch (e) {
        // Se falhar, tenta qualquer câmera
        console.log('Câmera traseira não disponível, tentando qualquer câmera...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
      }
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('muted', 'true')
        videoRef.current.muted = true
        
        // Aguardar o vídeo estar pronto
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setCameraActive(true)
                setCameraError(null)
              })
              .catch(err => {
                console.error('Erro ao dar play:', err)
                setCameraError('Erro ao iniciar vídeo. Use o botão de upload.')
              })
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err)
      
      let errorMsg = 'Não foi possível acessar a câmera.'
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Permissão de câmera negada. Verifique as configurações do navegador.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Nenhuma câmera encontrada no dispositivo.'
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Câmera em uso por outro aplicativo.'
      }
      
      setCameraError(errorMsg)
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

  // Parar câmera ao sair da página
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

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
        // Buscar dados do simulado e aluno
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
        setError(result.error || 'Não foi possível ler o QR Code ou as respostas. Tente novamente com melhor iluminação.')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor de processamento. Verifique sua conexão.')
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

        // Verificar se já existe resultado para este aluno/simulado
        const { data: existing } = await supabase
          .from('resultados')
          .select('id')
          .eq('simulado_id', qr_data.simulado_id)
          .eq('aluno_id', qr_data.aluno_id)
          .single()

        const resultadoData = {
          simulado_id: qr_data.simulado_id,
          aluno_id: qr_data.aluno_id,
          turma_id: qr_data.turma_id,
          respostas: answers,
          acertos: correction.acertos || 0,
          total_questoes: qr_data.total_questoes,
          percentual: correction.percentual || 0,
          corrigido_em: new Date().toISOString(),
          metodo_correcao: 'qrcode'
        }

        if (existing) {
          await supabase
            .from('resultados')
            .update(resultadoData)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('resultados')
            .insert(resultadoData)
        }

        // Registrar no caderno de erros
        if (correction.simulado?.gabarito && answers) {
          const gabarito = typeof correction.simulado.gabarito === 'string'
            ? JSON.parse(correction.simulado.gabarito)
            : correction.simulado.gabarito

          for (let i = 0; i < answers.length; i++) {
            if (answers[i] && answers[i] !== gabarito[i]) {
              // Buscar questão do simulado
              const { data: simuladoData } = await supabase
                .from('simulados')
                .select('questoes_ids')
                .eq('id', qr_data.simulado_id)
                .single()

              if (simuladoData?.questoes_ids?.[i]) {
                await supabase.from('caderno_erros').upsert({
                  aluno_id: qr_data.aluno_id,
                  questao_id: simuladoData.questoes_ids[i],
                  resposta_errada: answers[i],
                  resposta_correta: gabarito[i],
                  simulado_id: qr_data.simulado_id,
                  data_erro: new Date().toISOString()
                }, {
                  onConflict: 'aluno_id,questao_id,simulado_id'
                })
              }
            }
          }
        }
      }

      setResults([])
      alert(`${results.length} correção(ões) salva(s) com sucesso!`)
    } catch (err) {
      setError('Erro ao salvar correções. Tente novamente.')
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Correção Automática</h1>
        <p className="text-gray-600">Escaneie as folhas de respostas para corrigir automaticamente</p>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-sm text-red-600 underline mt-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Botões de salvar quando há resultados */}
      {results.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={saveAllResults} 
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar {results.length} Correção(ões)
          </Button>
        </div>
      )}

      {/* Modo de seleção */}
      {mode === 'select' && (
        <Card>
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <Camera className="w-16 h-16 text-indigo-600 mb-4" />
                <span className="text-lg font-semibold text-gray-900">Usar Câmera</span>
                <span className="text-sm text-gray-500 mt-1">Tire fotos das folhas de respostas</span>
              </button>

              <button
                onClick={() => {
                  setMode('upload')
                  fileInputRef.current?.click()
                }}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <Upload className="w-16 h-16 text-indigo-600 mb-4" />
                <span className="text-lg font-semibold text-gray-900">Upload de Imagem</span>
                <span className="text-sm text-gray-500 mt-1">Selecione fotos já tiradas</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Modo câmera */}
      {mode === 'camera' && (
        <Card>
          <CardContent className="p-4">
            {cameraError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{cameraError}</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setMode('select')}>
                    Voltar
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Usar Upload
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                  
                  {/* Overlay de guia */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white/50 rounded-lg"></div>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                      Posicione a folha dentro da área
                    </div>
                  </div>

                  {/* Indicador de processamento */}
                  {processing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-3" />
                        <p className="text-white">Processando...</p>
                      </div>
                    </div>
                  )}

                  {/* Indicador de câmera carregando */}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-3" />
                        <p className="text-white">Iniciando câmera...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      stopCamera()
                      setMode('select')
                    }}
                  >
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modo upload */}
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

      {/* Input de arquivo (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Canvas para captura (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Lista de correções pendentes */}
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
                        {correction.acertos || 0}/{correction.simulado?.total_questoes || 0} acertos
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

      {/* Instruções */}
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

      {/* Modal de confirmação */}
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
                {currentResult.result.answers?.map((answer, idx) => {
                  const gabarito = currentResult.simulado?.gabarito
                  const gabaritoArray = typeof gabarito === 'string' ? JSON.parse(gabarito) : gabarito
                  const isCorrect = answer && gabaritoArray && answer === gabaritoArray[idx]
                  
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">{idx + 1}</span>
                      <span 
                        className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium ${
                          answer 
                            ? isCorrect
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {answer || '-'}
                      </span>
                    </div>
                  )
                })}
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
