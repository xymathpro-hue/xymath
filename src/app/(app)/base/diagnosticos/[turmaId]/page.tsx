'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
}

export default function DiagnosticosPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [bimestreAtivo, setBimestreAtivo] = useState(1)
  const [diagnosticoAtivo, setDiagnosticoAtivo] = useState<'D1' | 'D2' | 'D3'>('D1')

  useEffect(() => {
    carregarAlunos()
  }, [])

  async function carregarAlunos() {
    try {
      setLoading(true)
      const response = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data } = await response.json()
      setAlunos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function abrirLancamento(diagnostico: 'D1' | 'D2' | 'D3') {
    router.push(`/base/diagnosticos/lancar/${turmaId}?tipo=${diagnostico}&bimestre=${bimestreAtivo}`)
  }

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
        <h1 className="text-3xl font-bold text-gray-700">Diagnósticos Iniciais BASE</h1>
        <p className="text-gray-600">Aplicar D1, D2 e D3 nas primeiras 3 semanas para classificação inicial</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <span className="text-gray-600 font-medium">Bimestre:</span>
        {[1, 2, 3, 4].map((bim) => (
          <button
            key={bim}
            onClick={() => setBimestreAtivo(bim)}
            className={`px-4 py-2 rounded-lg font-medium ${
              bimestreAtivo === bim
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {bim}º Bim
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">📚</div>
          <div>
            <h3 className="font-semibold text-lg text-gray-700 mb-2">Como funciona</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Semana 1:</strong> Aplicar D1 (10 questões) - Nível básico</li>
              <li>• <strong>Semana 2:</strong> Aplicar D2 (10 questões) - Nível médio</li>
              <li>• <strong>Semana 3:</strong> Aplicar D3 (10 questões) - Nível difícil</li>
              <li className="pt-2">✅ Após os 3 diagnósticos, o sistema calcula a média e classifica automaticamente em Grupos A/B/C</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-700">D1 - Básico</h3>
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">10 questões de nível básico</p>
          <button
            onClick={() => abrirLancamento('D1')}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Lançar Notas D1
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-700">D2 - Médio</h3>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">10 questões de nível médio</p>
          <button
            onClick={() => abrirLancamento('D2')}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Lançar Notas D2
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-700">D3 - Difícil</h3>
            <span className="text-3xl">🎯</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">10 questões de nível difícil</p>
          <button
            onClick={() => abrirLancamento('D3')}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Lançar Notas D3
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href={`/base/diagnosticos/classificacao/${turmaId}`}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          📊 Ver Classificação A/B/C
        </Link>
        
        <Link
          href={`/base/turmas`}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          ← Voltar para Turmas
        </Link>
      </div>
    </div>
  )
}
