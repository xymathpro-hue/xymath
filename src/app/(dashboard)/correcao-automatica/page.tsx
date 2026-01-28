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
  Loader2,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Save,
  ScanLine,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react'

const OPENCV_API_URL = process.env.NEXT_PUBLIC_OPENCV_API_URL || 'https://web-production-af772.up.railway.app'

interface QRData {
  simulado_id: string
  aluno_id: string
  turma_id: string
  total_questoes: number
}

interface BubbleInfo {
  option: string
  x: number
  y: number
  rect: { x: number; y: number; w: number; h: number }
  filled: boolean
}

interface BubbleLocation {
  question: number
  answer: string | null
  status: 'valid' | 'blank' | 'multiple' | 'not_found'
  bubbles: BubbleInfo[]
}

interface ProcessResult {
  success: boolean
  qr_data?: QRData
  qr_location?: { x: number; y: number; width: number; height: number }
  answers?: (string | null)[]
  bubble_locations?: BubbleLocation[]
  total_detected?: number
  total_questions?: number
  total_valid?: number
  total_blank?: number
  total_multiple?: number
  corners_found?: boolean
  error?: string
  debug?: any
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
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select')
  const [cameraActive, setCameraActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<PendingCorrection[]>([])
  const [currentResult, setCurrentResult] = useState<PendingCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<string>('Posicione a folha na câmera')
  const [cornersDetected, setCornersDetected] = useState(false)
  const [qrDetected, setQrDetected] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastDetection, setLastDetection] = useState<ProcessResult | null>(null)
  const [showBlankWarning, setShowBlankWarning] = useState(false)
  const [pendingCapture, setPendingCapture] = useState<{imageData: string, result: ProcessResult} | null>(null)

  // Sons de feedback
  const playSound = useCallback((type: 'success' | 'error' | 'beep') => {
    if (!soundEnabled) return
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    if (type === 'success') {
      oscillator.frequency.value = 800
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => {
        oscillator.frequency.value = 1000
      }, 100)
      setTimeout(() => oscillator.stop(), 200)
    } else if (type === 'error') {
      oscillator.frequency.value = 300
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => oscillator.stop(), 300)
    } else {
      oscillator.frequency.value = 600
      gainNode.gain.value = 0.2
      oscillator.start()
      setTimeout(() => oscillator.stop(), 100)
    }
  }, [soundEnabled])

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    setError(null)
    setCameraError(null)
    setMode('camera')
    setScanStatus('Iniciando câmera...')

    try {
      let stream: MediaStream | null = null
      
      // Tentar câmera traseira primeiro
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        })
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        })
      }
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.muted = true
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setCameraActive(true)
              setScanStatus('Posicione a folha dentro da área')
              // Iniciar escaneamento contínuo
              startContinuousScan()
            })
            .catch(err => {
              setCameraError('Erro ao iniciar vídeo.')
            })
        }
      }
    } catch (err: any) {
      let errorMsg = 'Não foi possível acessar a câmera.'
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Permissão de câmera negada.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Nenhuma câmera encontrada.'
      }
      setCameraError(errorMsg)
    }
  }, [])

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])
  // Escaneamento contínuo
  const startContinuousScan = useCallback(() => {
    if (scanIntervalRef.current) return
    
    setScanning(true)
    
    // Escanear a cada 500ms
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || processing) return
      
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx || video.videoWidth === 0) return
      
      // Capturar frame
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7)
      
      try {
        const response = await fetch(`${OPENCV_API_URL}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData })
        })
        
        const result: ProcessResult = await response.json()
        
        setLastDetection(result)
        
        // Atualizar status visual
        setCornersDetected(result.corners_found || false)
        setQrDetected(result.qr_data !== null && result.qr_data !== undefined)
        
        // Desenhar overlay
        drawOverlay(result)
        
        if (result.success && result.qr_data) {
          // Verificar se tem questões em branco
          const blankCount = result.total_blank || 0
          const multipleCount = result.total_multiple || 0
          
          if (blankCount > 0 || multipleCount > 0) {
            // Tem questões em branco ou múltiplas - avisar
            playSound('beep')
            setScanStatus(`⚠️ ${blankCount} em branco, ${multipleCount} múltiplas`)
            
            // Pausar scan e mostrar aviso
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            setScanning(false)
            setPendingCapture({ imageData, result })
            setShowBlankWarning(true)
          } else {
            // Tudo OK - captura automática!
            playSound('success')
            setScanStatus('✅ Leitura completa!')
            
            // Pausar scan
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            setScanning(false)
            
            // Processar resultado
            await processSuccessfulScan(imageData, result)
          }
        } else {
          // Ainda não detectou tudo
          if (result.corners_found && !result.qr_data) {
            setScanStatus('📍 Marcadores OK - Ajuste o QR Code')
          } else if (!result.corners_found) {
            setScanStatus('🔍 Procurando marcadores de canto...')
          } else {
            setScanStatus(result.error || 'Posicione a folha na câmera')
          }
        }
      } catch (err) {
        // Erro de conexão - não parar o scan
        console.error('Erro no scan:', err)
      }
    }, 500)
  }, [processing, playSound])

  // Desenhar overlay na imagem
  const drawOverlay = useCallback((result: ProcessResult) => {
    if (!overlayCanvasRef.current || !videoRef.current) return
    
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    // Ajustar tamanho do canvas ao vídeo
    const rect = video.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Escala entre vídeo real e exibido
    const scaleX = rect.width / video.videoWidth
    const scaleY = rect.height / video.videoHeight
    
    // Desenhar QR Code detectado (verde)
    if (result.qr_location) {
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 3
      ctx.strokeRect(
        result.qr_location.x * scaleX,
        result.qr_location.y * scaleY,
        result.qr_location.width * scaleX,
        result.qr_location.height * scaleY
      )
      
      // Label
      ctx.fillStyle = '#00FF00'
      ctx.font = 'bold 14px Arial'
      ctx.fillText('QR OK ✓', result.qr_location.x * scaleX, result.qr_location.y * scaleY - 5)
    }
    
    // Desenhar bolinhas detectadas
    if (result.bubble_locations) {
      result.bubble_locations.forEach(location => {
        location.bubbles.forEach(bubble => {
          const x = bubble.rect.x * scaleX
          const y = bubble.rect.y * scaleY
          const w = bubble.rect.w * scaleX
          const h = bubble.rect.h * scaleY
          
          if (bubble.filled) {
            // Bolha preenchida - vermelho
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(x + w/2, y + h/2, Math.max(w, h)/2, 0, 2 * Math.PI)
            ctx.stroke()
            
            // Letra da opção
            ctx.fillStyle = '#FF0000'
            ctx.font = 'bold 12px Arial'
            ctx.fillText(bubble.option, x + w/2 - 4, y + h/2 + 4)
          }
        })
        
        // Indicar status da questão
        if (location.status === 'multiple') {
          ctx.fillStyle = '#FFA500'
          ctx.font = 'bold 10px Arial'
          ctx.fillText(`Q${location.question}: MÚLTIPLA`, 10, 20 + location.question * 12)
        } else if (location.status === 'blank') {
          ctx.fillStyle = '#FFFF00'
          ctx.font = 'bold 10px Arial'
          ctx.fillText(`Q${location.question}: BRANCO`, 10, 20 + location.question * 12)
        }
      })
    }
    
    // Indicadores de canto
    if (result.corners_found) {
      ctx.fillStyle = '#00FF00'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('◼ Cantos detectados', 10, canvas.height - 10)
    } else {
      ctx.fillStyle = '#FF0000'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('◻ Procurando cantos...', 10, canvas.height - 10)
    }
  }, [])

  // Processar scan bem-sucedido
  const processSuccessfulScan = async (imageData: string, result: ProcessResult) => {
    setProcessing(true)
    
    try {
      // Buscar dados do simulado e aluno
      const [simuladoRes, alunoRes] = await Promise.all([
        supabase
          .from('simulados')
          .select('id, titulo, total_questoes, gabarito')
          .eq('id', result.qr_data!.simulado_id)
          .single(),
        supabase
          .from('alunos')
          .select('id, nome, numero')
          .eq('id', result.qr_data!.aluno_id)
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
          if (answer && answer !== 'X' && answer === gabarito[idx]) {
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
    } catch (err) {
      setError('Erro ao buscar dados do simulado/aluno')
    } finally {
      setProcessing(false)
    }
  }

  // Confirmar leitura com questões em branco
  const confirmBlankWarning = async () => {
    setShowBlankWarning(false)
    if (pendingCapture) {
      await processSuccessfulScan(pendingCapture.imageData, pendingCapture.result)
      setPendingCapture(null)
    }
  }

  // Cancelar e continuar escaneando
  const cancelBlankWarning = () => {
    setShowBlankWarning(false)
    setPendingCapture(null)
    startContinuousScan()
  }

  // Upload de arquivo
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessing(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target?.result as string
      
      try {
        const response = await fetch(`${OPENCV_API_URL}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData })
        })

        const result: ProcessResult = await response.json()

        if (result.success && result.qr_data) {
          await processSuccessfulScan(imageData, result)
        } else {
          setError(result.error || 'Não foi possível processar a imagem')
        }
      } catch (err) {
        setError('Erro ao conectar com o servidor')
      } finally {
        setProcessing(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const confirmResult = () => {
    if (currentResult) {
      setResults(prev => [...prev, currentResult])
      setCurrentResult(null)
      setShowConfirmModal(false)
      
      // Continuar escaneando
      if (mode === 'camera') {
        setTimeout(() => {
          setScanStatus('Posicione a próxima folha')
          startContinuousScan()
        }, 1000)
      }
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

        // Verificar se já existe resultado
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
          metodo_correcao: 'camera_auto'
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
      }

      playSound('success')
      setResults([])
      alert(`${results.length} correção(ões) salva(s) com sucesso!`)
    } catch (err) {
      setError('Erro ao salvar correções')
      playSound('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Correção Automática</h1>
          <p className="text-sm text-gray-600">Escaneie as folhas de respostas</p>
        </div>
        
        {results.length > 0 && (
          <Button 
            onClick={saveAllResults} 
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar ({results.length})
          </Button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modo seleção */}
      {mode === 'select' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <ScanLine className="w-12 h-12 text-indigo-600 mb-3" />
                <span className="font-semibold text-gray-900">Escanear</span>
                <span className="text-xs text-gray-500">Leitura automática contínua</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <Upload className="w-12 h-12 text-indigo-600 mb-3" />
                <span className="font-semibold text-gray-900">Upload</span>
                <span className="text-xs text-gray-500">Enviar foto da galeria</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modo câmera */}
      {mode === 'camera' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {cameraError ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 mb-4">{cameraError}</p>
                <Button variant="outline" onClick={() => setMode('select')}>Voltar</Button>
              </div>
            ) : (
              <div className="relative">
                {/* Vídeo da câmera */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ maxHeight: '60vh' }}
                />
                
                {/* Canvas de overlay */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {/* Status bar */}
                <div className={`absolute top-0 left-0 right-0 p-2 text-center text-white text-sm font-medium ${
                  qrDetected && cornersDetected ? 'bg-green-600' : 
                  cornersDetected ? 'bg-yellow-600' : 'bg-gray-800'
                } bg-opacity-80`}>
                  {scanning && <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />}
                  {scanStatus}
                </div>
                
                {/* Indicadores */}
                <div className="absolute bottom-16 left-2 right-2 flex justify-between">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    cornersDetected ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {cornersDetected ? '✓ Cantos' : '○ Cantos'}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    qrDetected ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {qrDetected ? '✓ QR Code' : '○ QR Code'}
                  </div>
                </div>
                
                {/* Controles */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black bg-opacity-50 flex justify-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { stopCamera(); setMode('select') }}
                    className="bg-white"
                  >
                    <X className="w-4 h-4 mr-1" /> Sair
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => scanning ? null : startContinuousScan()}
                    disabled={scanning}
                    className="bg-indigo-600"
                  >
                    {scanning ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Escaneando</>
                    ) : (
                      <><RotateCcw className="w-4 h-4 mr-1" /> Reiniciar</>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="bg-white"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </div>
                
                {/* Loading overlay */}
                {processing && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                      <p>Processando...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Lista de correções */}
      {results.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Correções Pendentes ({results.length})
            </h3>
            <div className="space-y-2">
              {results.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={c.imageData} alt="" className="w-12 h-12 object-cover rounded" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.aluno?.nome || 'Aluno'}</p>
                      <p className="text-xs text-gray-500">{c.simulado?.titulo || 'Simulado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${
                      (c.percentual || 0) >= 60 ? 'text-green-600' : 
                      (c.percentual || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {c.percentual}%
                    </span>
                    <button onClick={() => removeResult(idx)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmação */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirmar Correção">
        {currentResult && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <img src={currentResult.imageData} alt="" className="w-24 h-24 object-cover rounded" />
              <div>
                <p className="font-bold text-gray-900">{currentResult.aluno?.nome || 'Aluno não encontrado'}</p>
                <p className="text-sm text-gray-600">{currentResult.simulado?.titulo}</p>
                <Badge variant={(currentResult.percentual || 0) >= 60 ? 'success' : (currentResult.percentual || 0) >= 40 ? 'warning' : 'danger'}>
                  {currentResult.percentual}% - {currentResult.acertos} acertos
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Respostas:</p>
              <div className="flex flex-wrap gap-1">
                {currentResult.result.answers?.map((ans, idx) => {
                  const gab = currentResult.simulado?.gabarito
                  const gabArr = typeof gab === 'string' ? JSON.parse(gab) : gab
                  const isCorrect = ans && ans !== 'X' && gabArr && ans === gabArr[idx]
                  const isMultiple = ans === 'X'
                  const isBlank = ans === null
                  
                  return (
                    <div key={idx} className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${
                      isMultiple ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                      isBlank ? 'bg-gray-100 text-gray-400' :
                      isCorrect ? 'bg-green-100 text-green-700 border border-green-300' :
                      'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      {isMultiple ? 'M' : ans || '-'}
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowConfirmModal(false); setCurrentResult(null); startContinuousScan() }}>
                <X className="w-4 h-4 mr-1" /> Descartar
              </Button>
              <Button className="flex-1" onClick={confirmResult}>
                <Check className="w-4 h-4 mr-1" /> Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de aviso de questões em branco */}
      <Modal isOpen={showBlankWarning} onClose={cancelBlankWarning} title="⚠️ Atenção">
        <div className="space-y-4">
          <p className="text-gray-700">
            Foram detectadas questões com problema:
          </p>
          <ul className="text-sm space-y-1">
            {(lastDetection?.total_blank || 0) > 0 && (
              <li className="text-yellow-700">• {lastDetection?.total_blank} questão(ões) em branco</li>
            )}
            {(lastDetection?.total_multiple || 0) > 0 && (
              <li className="text-orange-700">• {lastDetection?.total_multiple} questão(ões) com múltiplas marcações</li>
            )}
          </ul>
          <p className="text-sm text-gray-600">Deseja continuar com a leitura?</p>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={cancelBlankWarning}>
              <RotateCcw className="w-4 h-4 mr-1" /> Escanear Novamente
            </Button>
            <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={confirmBlankWarning}>
              <Check className="w-4 h-4 mr-1" /> Continuar Assim
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
