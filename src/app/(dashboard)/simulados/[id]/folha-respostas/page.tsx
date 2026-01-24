'use client'

import { useParams, useRouter } from 'next/navigation'

export default function FolhaRespostasPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="text-gray-600 hover:text-gray-800"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold">Folha de Respostas</h1>

      <div className="border rounded bg-white p-6 space-y-4">
        <p className="text-gray-700">
          Esta é a folha de respostas do simulado.
        </p>

        <p className="text-sm text-gray-500">
          (Layout e impressão serão feitos no próximo passo)
        </p>

        <div className="grid grid-cols-5 gap-4 mt-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border p-2 text-center">
              <p className="font-semibold">{i + 1}</p>
              <div className="flex justify-center gap-2 mt-2 text-sm">
                <span>A</span>
                <span>B</span>
                <span>C</span>
                <span>D</span>
                <span>E</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

