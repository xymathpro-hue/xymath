'use client'

import { useParams, useRouter } from 'next/navigation'

export default function FolhaRespostasPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Folha de Respostas</h1>
        <button
          onClick={() => window.print()}
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Imprimir
        </button>
      </div>

      {/* FOLHA */}
      <div className="border p-6 bg-white space-y-6 print:border-0 print:p-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Simulado:</strong> {params.id}</div>
          <div><strong>Aluno:</strong> ________________________</div>
          <div><strong>Matrícula:</strong> ____________________</div>
          <div><strong>Turma:</strong> _______________________</div>
        </div>

        <hr />

        {/* QUESTÕES (exemplo 20) */}
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 text-sm">
              <span className="w-6 font-bold">{i + 1}</span>
              {['A', 'B', 'C', 'D', 'E'].map((op) => (
                <label key={op} className="flex items-center gap-1">
                  <span className="w-4 h-4 border rounded-full inline-block" />
                  {op}
                </label>
              ))}
            </div>
          ))}
        </div>

        <hr />

        {/* QR */}
        <div className="flex justify-center">
          <div className="w-32 h-32 border flex items-center justify-center text-xs">
            QR CODE
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="text-gray-600 underline"
      >
        Voltar
      </button>
    </div>
  )
}
