'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface DashboardData {
  estatisticas: {
    total_alunos: number
    distribuicao_grupos: { A: number; B: number; C: number }
    media_turma: number
    avaliacoes_aplicadas: number
    evolucoes: { subiram: number; desceram: number; saldo: number }
  }
  alertas: Array<{
    tipo: 'positivo' | 'negativo'
    titulo: string
    mensagem: string
  }>
  proximas_acoes: Array<{ acao: string; descricao: string }>
}

export default function DashboardBASE() {
  const params = useParams()
  const turmaId = params.turmaId as string
  const [bimestre, setBimestre] = useState(1)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDashboard()
  }, [turmaId, bimestre])

  async function carregarDashboard() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/dashboard?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      const result = await response.json()
      setData(result)
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

  if (!data) return <div>Erro ao carregar</div>

  const { estatisticas, alertas, proximas_acoes } = data

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Método BASE</h1>
          <p className="text-gray-600">Acompanhamento de evolução</p>
        </div>

        {/* Seletor Bimestre */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => setBimestre(b)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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

      {/* Cards Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Alunos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Alunos</div>
          <div className="text-3xl font-bold mt-2">{estatisticas.total_alunos}</div>
        </div>

        {/* Média */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Média BASE</div>
          <div className="text-3xl font-bold mt-2">
            {estatisticas.media_turma.toFixed(1)}
          </div>
        </div>

        {/* Avaliações */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avaliações</div>
          <div className="text-3xl font-bold mt-2">
            {estatisticas.avaliacoes_aplicadas}/2
          </div>
        </div>

        {/* Evolução */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Evolução</div>
          <div className="text-3xl font-bold mt-2">
            {estatisticas.evolucoes.saldo > 0 ? '+' : ''}
            {estatisticas.evolucoes.saldo}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {estatisticas.evolucoes.subiram} ↑ · {estatisticas.evolucoes.desceram} ↓
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Distribuição de Grupos</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Grupo A */}
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <div className="text-5xl font-bold text-red-600">
              {estatisticas.distribuicao_grupos.A}
            </div>
            <div className="text-sm font-medium mt-2">Grupo A</div>
            <div className="text-xs text-gray-600">Apoio Intensivo</div>
            <div className="text-xs mt-1">
              {Math.round((estatisticas.distribuicao_grupos.A / estatisticas.total_alunos) * 100)}%
            </div>
          </div>

          {/* Grupo B */}
          <div className="text-center p-6 bg-yellow-50 rounded-lg">
            <div className="text-5xl font-bold text-yellow-600">
              {estatisticas.distribuicao_grupos.B}
            </div>
            <div className="text-sm font-medium mt-2">Grupo B</div>
            <div className="text-xs text-gray-600">Adaptação</div>
            <div className="text-xs mt-1">
              {Math.round((estatisticas.distribuicao_grupos.B / estatisticas.total_alunos) * 100)}%
            </div>
          </div>

          {/* Grupo C */}
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-5xl font-bold text-green-600">
              {estatisticas.distribuicao_grupos.C}
            </div>
            <div className="text-sm font-medium mt-2">Grupo C</div>
            <div className="text-xs text-gray-600">Regular</div>
            <div className="text-xs mt-1">
              {Math.round((estatisticas.distribuicao_grupos.C / estatisticas.total_alunos) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Alertas e Destaques</h2>
          {alertas.map((alerta, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${
                alerta.tipo === 'positivo'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="font-semibold">{alerta.titulo}</div>
              <div className="text-sm mt-1">{alerta.mensagem}</div>
            </div>
          ))}
        </div>
      )}

      {/* Próximas Ações */}
      {proximas_acoes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Próximas Ações</h2>
          <ul className="space-y-3">
            {proximas_acoes.map((acao, i) => (
              <li key={i} className="flex gap-3">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium">{acao.acao}</div>
                  <div className="text-sm text-gray-600">{acao.descricao}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
