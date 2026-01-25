'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  // Simulado fake por enquanto (base estrutural)
  const totalQuestoes = 20

  return (
    <div className="p-6 space-y-6 bg-white text-black">
      {/* TOPO */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/simulados/${params.id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
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

      {/* CABEÇALHO */}
      <div className="border p-4 space-y-2">
        <h1 className="text-xl font-bold text-center">
          Folha de Respostas — Simulado {params.id}
        </h1>

        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <strong>Aluno:</strong> ____________________________________
          </div>
          <div>
            <strong>Matrícula:</strong> ________________________________
          </div>
          <div>
            <strong>Turma:</strong> ____________________________________
          </div>
          <div>
            <strong>Data:</strong> ____ / ____ / ______
          </div>
        </div>
      </div>

      {/* QUESTÕES */}
      <div className="border p-4">
        <h2 className="font-semibold mb-4">Marque apenas uma alternativa</h2>

        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: totalQuestoes }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="font-semibold w-6">{index + 1}.</span>
              {['A', 'B', 'C', 'D', 'E'].map((alt) => (
                <div
                  key={alt}
                  className="w-6 h-6 border border-black flex items-center justify-center"
                >
                  {alt}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="text-xs text-center text-gray-500 mt-8">
        XYMath • Folha de respostas padrão • Uso educacional
      </div>
    </div>
  )
}
