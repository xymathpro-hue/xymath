'use client'

import { useParams, useRouter } from 'next/navigation'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const questoes = Array.from({ length: 20 }) // ajuste depois conforme simulado

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* CONTROLES (não imprime) */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="rounded bg-gray-600 px-4 py-2 text-white"
        >
          Voltar
        </button>

        <button
          onClick={() => window.print()}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Imprimir
        </button>
      </div>

      {/* FOLHA */}
      <div className="space-y-8 print:space-y-12">
        <h1 className="text-xl font-bold text-center">
          Folha de Respostas — Simulado #{params.id}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {questoes.map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b pb-2"
            >
              <span className="w-6 font-bold">{i + 1}</span>

              {['A', 'B', 'C', 'D', 'E'].map((alt) => (
                <div
                  key={alt}
                  className="flex items-center gap-1"
                >
                  <div className="w-4 h-4 border border-black rounded-full" />
                  <span className="text-sm">{alt}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* QR PLACEHOLDER */}
        <div className="mt-10 text-center">
          <div className="mx-auto w-32 h-32 border border-dashed border-black flex items-center justify-center">
            QR
          </div>
          <p className="text-xs mt-2">
            Identificação do aluno / simulado
          </p>
        </div>
      </div>
    </div>
  )
}
