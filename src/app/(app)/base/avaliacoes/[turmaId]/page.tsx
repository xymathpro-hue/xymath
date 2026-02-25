'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Avaliacao {
  id: string
  titulo: string
  data_aplicacao: string
  total_questoes: number
  bimestre: number
}

export default function AvaliacoesPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarAvaliacoes()
  }, [])

  async function carregarAvaliacoes() {
    try {
      setLoading(true)
      const response = await fetch(`/api/avaliacoes?turma_id=${turmaId}`)
      const { data } = await response.json()
      setAvaliacoes(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold text-gray-700">Avaliações - Método BASE</h1>
        <a href="/base/turmas" className="text-sm text-gray-600 hover:text-gray-900" style={{textDecoration: 'none'}}>
          ← Voltar para Turmas
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-700">📝 Avaliações BASE</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Após aplicar os diagnósticos D1, D2 e D3, você pode criar avaliações personalizadas para cada grupo (A, B, C).</p>
          <p>As avaliações seguem os mesmos critérios de classificação do Método BASE.</p>
        </div>
      </div>

      {avaliacoes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-lg text-gray-600 mb-4">Nenhuma avaliação criada ainda</p>
          <p className="text-sm text-gray-500 mb-6">
            Crie avaliações personalizadas após aplicar os diagnósticos D1, D2 e D3
          </p>
          <a href={`/base/diagnosticos/${turmaId}`} className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium" style={{textDecoration: 'none'}}>
            Ir para Diagnósticos
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {avaliacoes.map((avaliacao) => (
            <div key={avaliacao.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-700">{avaliacao.titulo}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>📅 {new Date(avaliacao.data_aplicacao).toLocaleDateString('pt-BR')}</span>
                    <span>📊 {avaliacao.total_questoes} questões</span>
                    <span>📚 {avaliacao.bimestre}º Bimestre</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/base/avaliacoes/lancar/${turmaId}/${avaliacao.id}`} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium" style={{textDecoration: 'none'}}>
                    Lançar Notas
                  </a>
                  <a href={`/base/avaliacoes/resultados/${turmaId}/${avaliacao.id}`} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium" style={{textDecoration: 'none'}}>
                    Ver Resultados
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <a href={`/base/diagnosticos/${turmaId}`} className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium" style={{textDecoration: 'none'}}>
          Voltar para Diagnósticos
        </a>
        <a href={`/base/dashboard/${turmaId}`} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium" style={{textDecoration: 'none'}}>
          Ver Dashboard
        </a>
      </div>
    </div>
  )
}
