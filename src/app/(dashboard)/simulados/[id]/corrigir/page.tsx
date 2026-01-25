'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle } from 'lucide-react'

interface QRPayload {
  s: string // simulado id
}

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  const iniciarLeitura = async () => {
    setErro(null)
    setSucesso(null)

    const leitor = new Html5Qrcode('qr-reader')
    scannerRef.current = leitor

    try {
      await (leitor.start as any)(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (texto: string) => {
          leitor.stop().catch(() => {})
          setLendo(false)

          try {
            const payload = JSON.parse(texto) as QRPayload

            if (!payload.s || payload.s !== params.id) {
              throw new Error()
            }

            setSucesso('QR válido. Pronto para correção.')
          } catch {
            setErro('QR inválido para este simulado')
          }
        },
        () => {}
      )

      setLendo(true)
    } catch {
      setErro('Erro ao acessar câmera')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600"
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
