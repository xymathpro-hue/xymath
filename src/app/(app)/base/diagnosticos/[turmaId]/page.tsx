'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function DiagnosticosPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [loading, setLoading] = useState(true)
  const [bimestreAtivo, setBimestreAtivo] = useState(1)

  useEffect(() => {
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-700">Diagnósticos D1/D2/D3</h1>
        <a href="/base/turmas" className="text-sm text-gray-600 hover:text-gray-900 no-underline">
          ← Voltar para Turmas
        </a>
      </div>

      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((bim) => (
          <button key={bim} onClick={() => setBimestreAtivo(bim)} className={`px-4 py-2 rounded-lg font-medium ${bimestreAtivo === bim ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
            {bim}º Bimestre
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-700">💡 Como funciona o Método BASE?</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Semana 1:</strong> Aplique o Diagnóstico D1 (Básico) - 10 questões fáceis</p>
          <p><strong>Semana 2:</strong> Aplique o Diagnóstico D2 (Médio) - 10 questões médias</p>
          <p><strong>Semana 3:</strong> Aplique o Diagnóstico D3 (Difícil) - 10 questões difíceis</p>
          <p className="mt-4"><strong>Classificação automática:</strong> O sistema calcula a média ponderada (D1×3 + D2×2 + D3×1) e classifica os alunos em grupos A, B ou C para intervenção pedagógica direcionada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📗</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-700">D1 - Básico</h3>
              <p className="text-sm text-gray-600">10 questões fáceis</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Avalia conhecimentos fundamentais. Peso 3 na média final.</p>
          <a href={`/base/diagnosticos/lancar/${turmaId}?tipo=D1&bimestre=${bimestreAtivo}`} className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-center rounded-lg font-medium no-underline">
            Lançar Notas D1
          </a>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📙</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-700">D2 - Médio</h3>
              <p className="text-sm text-gray-600">10 questões médias</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Avalia aplicação de conceitos. Peso 2 na média final.</p>
          <a href={`/base/diagnosticos/lancar/${turmaId}?tipo=D2&bimestre=${bimestreAtivo}`} className="block w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-center rounded-lg font-medium no-underline">
            Lançar Notas D2
          </a>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📕</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-700">D3 - Difícil</h3>
              <p className="text-sm text-gray-600">10 questões difíceis</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Avalia raciocínio avançado. Peso 1 na média final.</p>
          <a href={`/base/diagnosticos/lancar/${turmaId}?tipo=D3&bimestre=${bimestreAtivo}`} className="block w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-center rounded-lg font-medium no-underline">
            Lançar Notas D3
          </a>
        </div>
      </div>

      <div className="flex gap-4">
        <a href={`/base/dashboard/${turmaId}`} className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium no-underline">
          Ver Classificação A/B/C
        </a>
        <a href={`/base/heat-map/${turmaId}`} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium no-underline">
          Ver Heat Map
        </a>
      </div>
    </div>
  )
}
