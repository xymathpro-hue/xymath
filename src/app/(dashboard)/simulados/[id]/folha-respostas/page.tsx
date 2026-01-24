'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  return (
    <div className="p-6 space-y-6">
      {/* Voltar */}
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o simulado
      </button>

      <h1 className="text-2xl font-bold">Folha de Respostas</h1>

      {/* Instruções */}
      <div className="rounded border bg-white p-4 space-y-2">
        <p className="text-gray-700">
          Utilize esta folha para que os alunos marquem as respostas.
        </p>
        <p className="text-sm text-gray-500">
          Marque apenas uma alternativa por questão.
        </p>
      </div>

      {/* Folha simples */}
      <div className="rounded border bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-6 font-semibold">{i + 1}</span>
              {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                <div
                  key={letra}
                  className="w-6 h-6 border rounded-full flex items-center justify-center text-sm"
                >
                  {letra}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Imprimir */}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-white"
      >
        <Printer className="w-4 h-4" />
        Imprimir folha
      </button>
    </div>
  )
}
