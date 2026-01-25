'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao simulado
      </button>

      <h1 className="text-2xl font-bold">Folha de Respostas</h1>

      <div className="rounded border bg-white p-6 space-y-4">
        <p className="text-gray-700">
          Esta é a folha de respostas do simulado.
        </p>

        <p className="text-sm text-gray-500">
          Próximos passos:
          <br />• Gerar layout A4
          <br />• QR Code por aluno
          <br />• 2 ou 3 folhas por página
        </p>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>
    </div>
  )
}
