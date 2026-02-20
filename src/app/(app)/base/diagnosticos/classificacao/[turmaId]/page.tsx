// src/app/(app)/base/diagnosticos/classificacao/[turmaId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Classificacao {
  aluno_id: string
  nota_d1: number
  nota_d2: number
  nota_d3: number
  media_diagnosticos: number
  grupo_inicial: string
  aluno: {
    id: string
    nome_completo: string
    numero_chamada: number
  }
}

interface Estatisticas {
  total_alunos: number
  grupo_A: number
  grupo_B: number
  grupo_C: number
  media_geral: string
  percentual_A: string
  percentual_B: string
  percentual_C: string
}

export default function ClassificacaoPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [classificacoes, setClassificacoes] = useState<Classificacao[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [bimestre, setBimestre] = useState(1)

  useEffect(() => {
    carregarClassificacao()
  }, [turmaId, bimestre])

  async function carregarClassificacao() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/diagnosticos/classificacao?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      const result = await response.json()
      setClassificacoes(result.data || [])
      setEstatisticas(result.estatisticas)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Classificação Inicial dos Alunos</h1>
          <p className="text-gray-600">Baseado nos diagnósticos D1, D2 e D3</p>
        </div>

        {/* Seletor de Bimestre */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => setBimestre(b)}
              className={`px-4 py-2 rounded-lg font-medium ${
                bimestre === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {b}º Bim
            </button>
          ))}
        </div>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total de Alunos</div>
            <div className="text-3xl font-bold mt-2">{estatisticas.total_alunos}</div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow">
            <div className="text-sm text-red-600">Grupo A (Apoio)</div>
            <div className="text-3xl font-bold text-red-700 mt-2">
              {estatisticas.grupo_A} <span className="text-lg">({estatisticas.percentual_A}%)</span>
            </div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow">
            <div className="text-sm text-yellow-600">Grupo B (Adaptação)</div>
            <div className="text-3xl font-bold text-yellow-700 mt-2">
              {estatisticas.grupo_B} <span className="text-lg">({estatisticas.percentual_B}%)</span>
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow">
            <div className="text-sm text-green-600">Grupo C (Regular)</div>
            <div className="text-3xl font-bold text-green-700 mt-2">
              {estatisticas.grupo_C} <span className="text-lg">({estatisticas.percentual_C}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">📊 Critérios de Classificação:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-bold text-red-700">Grupo A (Apoio):</span> Média &lt; 4.0
          </div>
          <div>
            <span className="font-bold text-yellow-700">Grupo B (Adaptação):</span> Média 4.0 - 6.9
          </div>
          <div>
            <span className="font-bold text-green-700">Grupo C (Regular):</span> Média ≥ 7.0
          </div>
        </div>
      </div>

      {/* Tabela de Classificação */}
      <div className="bg-white rounded-lg shadow">
        {classificacoes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg">Nenhuma classificação disponível ainda</p>
            <p className="text-sm">Aplique e corrija os diagnósticos D1, D2 e D3 primeiro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Nº</th>
                  <th className="px-4 py-3 text-left">Aluno</th>
                  <th className="px-4 py-3 text-center">D1</th>
                  <th className="px-4 py-3 text-center">D2</th>
                  <th className="px-4 py-3 text-center">D3</th>
                  <th className="px-4 py-3 text-center">Média</th>
                  <th className="px-4 py-3 text-center">Grupo</th>
                </tr>
              </thead>
              <tbody>
                {classificacoes.map((classif) => (
                  <tr key={classif.aluno_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{classif.aluno.numero_chamada}</td>
                    <td className="px-4 py-3">{classif.aluno.nome_completo}</td>
                    <td className="px-4 py-3 text-center">
                      {classif.nota_d1 ? classif.nota_d1.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {classif.nota_d2 ? classif.nota_d2.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {classif.nota_d3 ? classif.nota_d3.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xl font-bold">
                        {classif.media_diagnosticos.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-4 py-2 rounded font-bold text-white ${
                        classif.grupo_inicial === 'A' ? 'bg-red-600' :
                        classif.grupo_inicial === 'B' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}>
                        {classif.grupo_inicial}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertas */}
      {estatisticas && estatisticas.total_alunos > 0 && (
        <div className="mt-6 space-y-3">
          {parseFloat(estatisticas.percentual_A) > 40 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                ⚠️ <strong>Atenção:</strong> Mais de 40% dos alunos no Grupo A. 
                Considere estratégias de recuperação intensiva.
              </p>
            </div>
          )}
          
          {parseFloat(estatisticas.percentual_C) > 50 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ <strong>Parabéns!</strong> Mais de 50% dos alunos no Grupo C. 
                Turma com bom desempenho inicial!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
