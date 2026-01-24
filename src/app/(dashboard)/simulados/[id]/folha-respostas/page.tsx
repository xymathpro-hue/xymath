'use client'

import { useRouter, useParams } from 'next/navigation'
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

      <div className="rounded border bg-white p-6 space-y-6">
        <p className="text-gray-700">
          Esta é a folha de respostas do simulado.
        </p>

        {/* MODELO VISUAL */}
        <div className="border rounded p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-8 font-semibold">{i + 1}.</span>
              {['A', 'B', 'C', 'D', 'E'].map((alt) => (
                <span
                  key={alt}
                  className="w-8 h-8 flex items-center justify-center border rounded"
                >
                  {alt}
                </span>
              ))}
            </div>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir folha
        </button>
      </div>
    </div>
  )
}
