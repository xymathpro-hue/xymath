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
