'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface HeatMapData {
  aluno_id: string
  nome_aluno: string
  comp_l: number
  comp_f: number
  comp_r: number
  comp_a: number
  comp_j: number
  grupo_atual: string
}

export default function HeatMapPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  const [bimestre, setBimestre] = useState(1)
  const [data, setData] = useState<HeatMapData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarHeatMap()
  }, [turmaId, bimestre])

  async function carregarHeatMap() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/relatorios/heat-map?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      const result = await response.json()
      setData(result.heat_map || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getColor = (valor: number) => {
    if (valor >= 70) return 'bg-green-500 text-white'
    if (valor >= 50) return 'bg-yellow-500 text-white'
    if (valor >= 30) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }

  const calcularMediaCompetencia = (comp: 'comp_l' | 'comp_f' | 'comp_r' | 'comp_a' | 'comp_j') => {
    if (data.length === 0) return 0
    const soma = data.reduce((acc, aluno) => acc + (aluno[comp] || 0), 0)
    return (soma / data.length).toFixed(1)
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
          <h1 className="text-3xl font-bold">Heat Map de Competências</h1>
          <p className="text-gray-600">Visualização do domínio por competência BASE</p>
        </div>

        {/* Seletor Bimestre */}
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

      {/* Legenda */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="font-medium">Legenda:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded" />
          <span>≥70% (Domínio)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-500 rounded" />
          <span>50-69% (Parcial)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded" />
          <span>30-49% (Dificuldade)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded" />
          <span>&lt;30% (Crítico)</span>
        </div>
      </div>

      {/* Tabela Heat Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-100">Aluno</th>
                <th className="px-4 py-3 text-center">Grupo</th>
                <th className="px-4 py-3 text-center bg-blue-50">
                  L<br/>
                  <span className="text-xs font-normal">Leitura</span>
                </th>
                <th className="px-4 py-3 text-center bg-green-50">
                  F<br/>
                  <span className="text-xs font-normal">Fluência</span>
                </th>
                <th className="px-4 py-3 text-center bg-yellow-50">
                  R<br/>
                  <span className="text-xs font-normal">Raciocínio</span>
                </th>
                <th className="px-4 py-3 text-center bg-orange-50">
                  A<br/>
                  <span className="text-xs font-normal">Aplicação</span>
                </th>
                <th className="px-4 py-3 text-center bg-purple-50">
                  J<br/>
                  <span className="text-xs font-normal">Justificativa</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((aluno) => (
                <tr key={aluno.aluno_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-white">
                    {aluno.nome_aluno}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded font-bold ${
                      aluno.grupo_atual === 'A' ? 'bg-red-100 text-red-800' :
                      aluno.grupo_atual === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {aluno.grupo_atual || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`px-3 py-2 rounded font-bold ${getColor(aluno.comp_l)}`}>
                      {aluno.comp_l.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`px-3 py-2 rounded font-bold ${getColor(aluno.comp_f)}`}>
                      {aluno.comp_f.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`px-3 py-2 rounded font-bold ${getColor(aluno.comp_r)}`}>
                      {aluno.comp_r.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`px-3 py-2 rounded font-bold ${getColor(aluno.comp_a)}`}>
                      {aluno.comp_a.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`px-3 py-2 rounded font-bold ${getColor(aluno.comp_j)}`}>
                      {aluno.comp_j.toFixed(0)}%
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Linha de Média */}
              <tr className="border-t-2 border-gray-400 bg-gray-50 font-bold">
                <td className="px-4 py-3 sticky left-0 bg-gray-50">MÉDIA DA TURMA</td>
                <td className="px-4 py-3 text-center">-</td>
                <td className="px-4 py-3 text-center">{calcularMediaCompetencia('comp_l')}%</td>
                <td className="px-4 py-3 text-center">{calcularMediaCompetencia('comp_f')}%</td>
                <td className="px-4 py-3 text-center">{calcularMediaCompetencia('comp_r')}%</td>
                <td className="px-4 py-3 text-center">{calcularMediaCompetencia('comp_a')}%</td>
                <td className="px-4 py-3 text-center">{calcularMediaCompetencia('comp_j')}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Análise */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Análise Rápida:</h3>
        <ul className="space-y-1 text-sm">
          {parseFloat(calcularMediaCompetencia('comp_l')) < 50 && (
            <li>⚠️ <strong>Leitura (L)</strong> está crítica na turma</li>
          )}
          {parseFloat(calcularMediaCompetencia('comp_f')) < 50 && (
            <li>⚠️ <strong>Fluência (F)</strong> precisa de atenção</li>
          )}
          {parseFloat(calcularMediaCompetencia('comp_r')) < 50 && (
            <li>⚠️ <strong>Raciocínio (R)</strong> é a maior dificuldade</li>
          )}
          {parseFloat(calcularMediaCompetencia('comp_a')) < 50 && (
            <li>⚠️ <strong>Aplicação (A)</strong> requer reforço</li>
          )}
          {parseFloat(calcularMediaCompetencia('comp_j')) < 50 && (
            <li>⚠️ <strong>Justificativa (J)</strong> precisa ser trabalhada</li>
          )}
        </ul>
      </div>
    </div>
  )
}
