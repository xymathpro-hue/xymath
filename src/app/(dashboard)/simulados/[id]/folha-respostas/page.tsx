'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [qr, setQr] = useState<string>('')

  useEffect(() => {
    const gerar = async () => {
      const payload = JSON.stringify({
        s: params.id,
      })

      const dataUrl = await QRCode.toDataURL(payload)
      setQr(dataUrl)
    }

    gerar()
  }, [params.id])

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* CONTROLES (não imprime) */}
      <div className="flex gap-4 print:hidden">
        <button
          onClick={() => router.push(`/simulados/${params.id}`)}
          className="flex items-center gap-2 text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      {/* FOLHA */}
      <div className="mx-auto max-w-[800px] border p-6 space-y-6 text-black">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Folha de Respostas</h1>
            <p className="text-sm">Simulado ID: {params.id}</p>
          </div>

          {qr && <img src={qr} alt="QR Code" className="w-28 h-28" />}
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-2">Aluno:</div>
            <div className="border p-2">Matrícula:</div>
            <div className="border p-2">Turma:</div>
            <div className="border p-2">Data:</div>
          </div>
        </div>

        <div className="border-t pt-6 space-y-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-2"
            >
              <span className="font-medium">{i + 1}</span>

              <div className="flex gap-3">
                {['A', 'B', 'C', 'D', 'E'].map((op) => (
                  <div
                    key={op}
                    className="w-6 h-6 border border-black rounded-full"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
