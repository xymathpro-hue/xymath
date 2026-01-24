'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const totalQuestoes = 20
  const alternativas = ['A', 'B', 'C', 'D', 'E']

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao simulado
      </button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Folha de Respostas</h1>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      <div className="border rounded bg-white p-6 print:p-0">
        <div className="mb-6 space-y-2">
          <p><strong>Simulado:</strong> {params.id}</p>
          <p><strong>Aluno:</strong> ________________________________</p>
          <p><strong>Matrícula:</strong> ____________________________</p>
          <p><strong>Turma:</strong> ________________________________</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: totalQuestoes }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-8 font-semibold">{i + 1}</span>

              <div className="flex gap-3">
                {alternativas.map((alt) => (
                  <div
                    key={alt}
                    className="w-6 h-6 border rounded-full flex items-center justify-center text-xs"
                  >
                    {alt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
