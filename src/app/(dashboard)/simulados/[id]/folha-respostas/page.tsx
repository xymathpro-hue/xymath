'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, QrCode } from 'lucide-react'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Folha de Respostas</h1>

      <div className="rounded border bg-white p-6 space-y-4">
        <p className="text-gray-700">
          Aqui será gerada a folha de respostas oficial do simulado.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => alert('Geração de PDF será o próximo passo')}
            className="flex items-center gap-2 rounded bg-gray-700 px-4 py-2 text-white"
          >
            <Printer className="w-4 h-4" />
            Imprimir folha
          </button>

          <button
            onClick={() => alert('QR Code será incorporado na folha')}
            className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
          >
            <QrCode className="w-4 h-4" />
            Visualizar QR
          </button>
        </div>
      </div>
    </div>
  )
}
