'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface QRPayload {
  s: string // simulado
  a: string // aluno
  t: string // turma
  m: string // matricula
}

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // =========================
  // INICIAR SCAN
  // =========================
  const iniciarLeitura = async () => {
    setErro(null)
    setSucesso(null)

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader')
    }

    try {
      setLendo(true)

      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (texto: string) => {
          try {
            const payload: QRPayload = JSON.parse(texto)

            if (payload.s !== params.id) {
              setErro('QR Code não pertence a este simulado')
              return
            }

            setSucesso(`Aluno ${payload.a} identificado com sucesso`)
            await scannerRef.current?.stop()
            setLendo(false)

            // 👉 aqui depois entra a lógica de correção automática
          } catch {
            setErro('QR Code inválido')
          }
        },
        (errorMessage) => {
          // callback obrigatório (mesmo que você ignore)
          console.warn('Erro leitura QR:', errorMessage)
        }
      )
    } catch (err) {
      setErro('Não foi possível acessar a câmera')
      setLendo(false)
    }
  }

  // =========================
  // LIMPAR AO SAIR
  // =========================
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Correção por QR Code</h1>

      <div className="rounded border p-4 bg-white space-y-4">
        <div
          id="qr-reader"
          className="w-full max-w-sm mx-auto rounded border"
        />

        {!lendo && (
          <button
            onClick={iniciarLeitura}
            className="flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-white"
          >
            <Camera size={18} />
            Iniciar leitura
          </button>
        )}
      </div>

      {sucesso && (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle size={18} />
          {sucesso}
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 text-red-700">
          <XCircle size={18} />
          {erro}
        </div>
      )}
    </div>
  )
}
