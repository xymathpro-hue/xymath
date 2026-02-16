'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface NotaAluno {
  aluno_id: string
  nome_aluno: string
  nota_base: number
  grupo_final: string
}

export default function CalcularNotasPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  const [bimestre, setBimestre] = useState(1)
  const [notas, setNotas] = useState<NotaAluno[]>([])
  const [loading, setLoading] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [calculado, setCalculado] = useState(false)

  async function calcularNotas() {
    try {
      setCalculando(true)
      
      const response = await fetch('/api/base/notas/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          bimestre: bimestre
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setNotas(result.notas || [])
        setCalculado(true)
        alert(`✅ Notas calculadas! ${result.total_alunos} alunos processados.`)
      } else {
        throw new Error('Erro ao calcular')
      }
    } catch (err) {
      alert('❌ Erro ao calcular notas')
      console.error(err)
    } finally {
      setCalculando(false)
    }
  }

  async function carregarNotasExistentes() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/notas/calcular?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      const result = await response.json()
      
      if (result.data && result.data.length > 0) {
        // Transformar dados para o formato esperado
        const notasFormatadas = result.data.map((item: any) => ({
          aluno_id: item.aluno.id,
          nome_aluno: item.aluno.nome_completo,
          nota_base: item.nota_base_final,
          grupo_final: item.grupo_final
        }))
        setNotas(notasFormatadas)
        setCalculado(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarNotasExistentes()
  }, [turmaId, bimestre])

  const calcularEstatisticas = () => {
    if (notas.length === 0) return { aprovados: 0, reprovados: 0, media: 0 }
    
    const aprovados = notas.filter(n => n.nota_base >= 6).length
    const reprovados = notas.length - aprovados
    const soma = notas.reduce((acc, n) => acc + n.nota_base, 0)
    const media = soma / notas.length
    
    return { aprovados, reprovados, media }
  }

  const stats = calcularEstatisticas()

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Calcular Notas BASE</h1>
        <p className="text-gray-600">
          Calcula a nota final do bimestre (50% avaliações + 25% classe + 25% casa) × evolução
        </p>
      </div>

      {/* Seletor de Bimestre */}
      <div className="mb-6 flex items-center gap-4">
        <span className="font-medium">Bimestre:</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => {
                setBimestre(b)
                setCalculado(false)
                setNotas([])
              }}
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

        <button
          onClick={calcularNotas}
          disabled={calculando}
          className="ml-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {calculando ? 'Calculando...' : '🧮 Calcular Notas'}
        </button>
      </div>

      {/* Estatísticas */}
      {calculado && notas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Média da Turma</div>
            <div className="text-3xl font-bold mt-2">{stats.media.toFixed(1)}</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow">
            <div className="text-sm text-green-600">Aprovados (≥6.0)</div>
            <div className="text-3xl font-bold text-green-700 mt-2">
              {stats.aprovados} <span className="text-lg">({Math.round(stats.aprovados / notas.length * 100)}%)</span>
            </div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow">
            <div className="text-sm text-red-600">Abaixo da Média (&lt;6.0)</div>
            <div className="text-3xl font-bold text-red-700 mt-2">
              {stats.reprovados} <span className="text-lg">({Math.round(stats.reprovados / notas.length * 100)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Notas */}
      {calculado && notas.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Aluno</th>
                  <th className="px-4 py-3 text-center">Grupo</th>
                  <th className="px-4 py-3 text-center">Nota BASE</th>
                  <th className="px-4 py-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody>
                {notas
                  .sort((a, b) => b.nota_base - a.nota_base)
                  .map((nota) => (
                    <tr key={nota.aluno_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{nota.nome_aluno}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded font-bold ${
                          nota.grupo_final === 'A' ? 'bg-red-100 text-red-800' :
                          nota.grupo_final === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {nota.grupo_final || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-2xl font-bold ${
                          nota.nota_base >= 6 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {nota.nota_base.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {nota.nota_base >= 6 ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-medium">
                            ✓ Aprovado
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded font-medium">
                            ✗ Recuperação
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🧮</div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma nota calculada ainda</h3>
          <p className="text-gray-600 mb-4">
            Clique no botão "Calcular Notas" para processar as notas do {bimestre}º bimestre
          </p>
        </div>
      )}
    </div>
  )
}
