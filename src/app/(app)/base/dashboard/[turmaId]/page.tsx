'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
  classificacao_base?: 'A' | 'B' | 'C'
  media_ponderada?: number
}

export default function DashboardBASEPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    grupo_a: 0,
    grupo_b: 0,
    grupo_c: 0
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const response = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data } = await response.json()
      
      const alunosOrdenados = data.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada)
      setAlunos(alunosOrdenados)
      
      const stats = {
        total: alunosOrdenados.length,
        grupo_a: alunosOrdenados.filter((a: Aluno) => a.classificacao_base === 'A').length,
        grupo_b: alunosOrdenados.filter((a: Aluno) => a.classificacao_base === 'B').length,
        grupo_c: alunosOrdenados.filter((a: Aluno) => a.classificacao_base === 'C').length
      }
      setEstatisticas(stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function getCorClassificacao(classificacao?: 'A' | 'B' | 'C') {
    if (!classificacao) return 'bg-gray-100 text-gray-600'
    if (classificacao === 'A') return 'bg-red-100 text-red-700'
    if (classificacao === 'B') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
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
        <h1 className="text-3xl font-bold text-gray-700">Dashboard - Método BASE</h1>
        <a href="/base/turmas" className="text-sm text-gray-600 hover:text-gray-900" style={{textDecoration: 'none'}}>
          ← Voltar para Turmas
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total de Alunos</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{estatisticas.total}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-red-200">
          <div className="text-sm text-gray-600">Grupo A - Apoio</div>
          <div className="text-3xl font-bold text-red-700 mt-2">{estatisticas.grupo_a}</div>
          <div className="text-xs text-gray-500 mt-1">Necessita intervenção</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-gray-600">Grupo B - Adaptação</div>
          <div className="text-3xl font-bold text-yellow-700 mt-2">{estatisticas.grupo_b}</div>
          <div className="text-xs text-gray-500 mt-1">Em desenvolvimento</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-green-200">
          <div className="text-sm text-gray-600">Grupo C - Regular</div>
          <div className="text-3xl font-bold text-green-700 mt-2">{estatisticas.grupo_c}</div>
          <div className="text-xs text-gray-500 mt-1">Desempenho esperado</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-700">📊 Classificação BASE</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong className="text-red-700">Grupo A (Apoio):</strong> Média ponderada {'<'} 4,0 - Necessita intervenção pedagógica intensiva</p>
          <p><strong className="text-yellow-700">Grupo B (Adaptação):</strong> Média ponderada 4,0 - 6,9 - Em desenvolvimento, precisa de reforço</p>
          <p><strong className="text-green-700">Grupo C (Regular):</strong> Média ponderada ≥ 7,0 - Desempenho dentro do esperado</p>
          <p className="mt-4 text-xs"><strong>Fórmula:</strong> Média Ponderada = (D1×3 + D2×2 + D3×1) / 6</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Nº</th>
              <th className="px-4 py-3 text-left text-gray-600">Aluno</th>
              <th className="px-4 py-3 text-center text-gray-600">Média Ponderada</th>
              <th className="px-4 py-3 text-center text-gray-600">Classificação</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{aluno.numero_chamada}</td>
                <td className="px-4 py-3 text-gray-700">{aluno.nome_completo}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-700">
                  {aluno.media_ponderada ? aluno.media_ponderada.toFixed(1) : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {aluno.classificacao_base ? (
                    <span className={`px-4 py-2 rounded-lg font-bold ${getCorClassificacao(aluno.classificacao_base)}`}>
                      {aluno.classificacao_base}
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                      Sem diagnóstico
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <a href={`/base/diagnosticos/${turmaId}`} className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium" style={{textDecoration: 'none'}}>
          Lançar Diagnósticos
        </a>
        <a href={`/base/heat-map/${turmaId}`} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium" style={{textDecoration: 'none'}}>
          Ver Heat Map
        </a>
      </div>
    </div>
  )
}
