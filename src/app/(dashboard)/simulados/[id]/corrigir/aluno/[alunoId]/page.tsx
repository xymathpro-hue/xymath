'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle } from 'lucide-react'

interface QRPayload {
  s: string // simulado
  a: string // aluno
  t?: string // turma
  m?: string // matrícula
}

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  // 👉 função separada (NÃO async no callback)
  const processarQRCode = (decodedText: string) => {
    try {
      const payload = JSON.parse(decodedText) as QRPayload

      if (!payload.s || !payload.a) {
        throw new Error('QR inválido')
      }

      setSucesso(
        `QR lido com sucesso${payload.m ? ` - Matrícula ${payload.m}` : ''}`
      )

      // 🔜 próximo passo
      // router.push(`/simulados/${params.id}/corrigir/aluno/${payload.a}`)
    } catch {
      setErro('QR Code inválido ou mal formatado')
    }
  }

  const iniciarLeitura = async () => {
    setErro(null)
    setSucesso(null)

    const leitor = new Html5Qrcode('qr-reader')
    scannerRef.current = leitor

    try {
      await leitor.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },

        // ✅ callback sucesso (SINCRONO)
        (decodedText: string, _decodedResult: unknown) => {
          leitor.stop().catch(() => {})
          setLendo(false)
          processarQRCode(decodedText)
        },

        // ✅ callback erro (SINCRONO)
        (_errorMessage: string, _error: unknown) => {
          // ignorar leituras falhas
        }
      )

      setLendo(true)
    } catch {
      setErro('Não foi possível acessar a câmera')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Correção Automática</h1>

      <div className="rounded border p-4 bg-white space-y-4">
        <button
          onClick={iniciarLeitura}
          disabled={lendo}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {lendo ? 'Lendo QR...' : 'Ler QR Code'}
        </button>

        <div id="qr-reader" className="w-full max-w-sm" />

        {erro && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {sucesso}
          </div>
        )}
      </div>
    </div>
  )
}
