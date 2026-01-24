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
      {/* Topo */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/simulados/${params.id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao simulado
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center">
        Folha de Respostas – Simulado
      </h1>

      {/* Área de impressão */}
      <div className="grid grid-cols-2 gap-6 print:grid-cols-2">
        {[0, 1].map((bloco) => (
          <div key={bloco} className="border p-4 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-1 text-left">Questão</th>
                  {alternativas.map((alt) => (
                    <th key={alt} className="border p-1 text-center">
                      {alt}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: totalQuestoes / 2 }).map((_, i) => {
                  const numero = bloco * (totalQuestoes / 2) + i + 1
                  return (
                    <tr key={numero}>
                      <td className="border p-1 text-center font-medium">
                        {numero}
                      </td>
                      {alternativas.map((alt) => (
                        <td key={alt} className="border p-1 text-center">
                          ⬜
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Rodapé para identificação */}
      <div className="border-t pt-4 mt-6 space-y-2 text-sm">
        <p>Aluno: _______________________________________________</p>
        <p>Matrícula: ____________________   Turma: ______________</p>
      </div>
    </div>
  )
}
