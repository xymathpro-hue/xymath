'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const simuladoId = params.id

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${simuladoId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Folha de Respostas</h1>

      <div className="rounded border bg-white p-6 space-y-6">
        <div className="border p-4 rounded text-center space-y-4">
          <p className="font-semibold">Simulado ID</p>
          <p className="text-sm text-gray-500">{simuladoId}</p>

          {/* QR PLACEHOLDER */}
          <div className="mx-auto h-40 w-40 border flex items-center justify-center text-gray-400">
            QR CODE
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border rounded p-2 text-center">
              <p className="text-sm font-semibold">Q{i + 1}</p>
              <div className="flex justify-center gap-2 mt-1">
                {['A', 'B', 'C', 'D', 'E'].map((l) => (
                  <span key={l} className="border rounded-full w-6 h-6 text-xs flex items-center justify-center">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={imprimir}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>
    </div>
  )
}
