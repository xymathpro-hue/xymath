'use client'

import { useEffect, useRef, useState } from 'react'
import { iniciarQR } from '@/services/qr-reader'
import { Camera, XCircle } from 'lucide-react'

interface Props {
  onSuccess: (text: string) => void
}

export default function QrScanner({ onSuccess }: Props) {
  const leitorRef = useRef<any>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    return () => {
      leitorRef.current?.stop?.().catch(() => {})
    }
  }, [])

  const iniciar = async () => {
    setErro(null)

    try {
      leitorRef.current = await iniciarQR('qr-reader', (texto) => {
        leitorRef.current?.stop?.().catch(() => {})
        setAtivo(false)
        onSuccess(texto)
      })

      setAtivo(true)
    } catch {
      setErro('Erro ao acessar câmera')
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={iniciar}
        disabled={ativo}
        className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        <Camera className="w-4 h-4" />
        {ativo ? 'Lendo QR...' : 'Ler QR Code'}
      </button>

      <div id="qr-reader" className="w-full max-w-sm" />

      {erro && (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          {erro}
        </div>
      )}
    </div>
  )
}

