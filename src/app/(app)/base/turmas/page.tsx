'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Turma {
  id: string
  nome: string
  ano_escolar: number
  ano_letivo: number
  total_alunos?: number
  total_diagnosticos?: number
}

export default function TurmasBASEPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [estatisticas, setEstatisticas] = useState({
    total_turmas: 0,
    usando_base: 0,
    total_alunos: 0,
    avaliacoes_aplicadas: 0
  })

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      setLoading(true)
      const response = await fetch('/api/turmas?ano_letivo=2026')
      const { data } = await response.json()
      
      const turmasComDados = await Promise.all(
        data.map(async (turma: Turma) => {
          const resAlunos = await fetch(`/api/alunos?turma_id=${turma.id}`)
          const { data: alunos } = await resAlunos.json()
          
          const resDiag = await fetch(`/api/base/diagnosticos?turma_id=${turma.id}`)
          const { data: diagnosticos } = await resDiag.json()
          
          return {
            ...turma,
            total_alunos: alunos?.length || 0,
            total_diagnosticos: diagnosticos?.length || 0
          }
        })
      )
      
      setTurmas(turmasComDados)
      
      const stats = {
        total_turmas: turmasComDados.length,
        usando_base: turmasComDados.filter(t => (t.total_diagnosticos || 0) > 0).length,
        total_alunos: turmasComDados.reduce((sum, t) => sum + (t.total_alunos || 0), 0),
        avaliacoes_aplicadas: turmasComDados.reduce((sum, t) => sum + (t.total_diagnosticos || 0), 0)
      }
      setEstatisticas(stats)
      
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function deletarTurma(turmaId: string, turmaNome: string) {
    const confirma = confirm(`⚠️ Tem certeza que deseja excluir a turma "${turmaNome}"?\n\nISTO VAI DELETAR:\n- Todos os alunos\n- Todos os diagnósticos\n- Todas as avaliações\n\nEsta ação NÃO pode ser desfeita!`)
    
    if (!confirma) return

    try {
      setDeletando(turmaId)
      
      const response = await fetch(`/api/turmas/${turmaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao deletar')

      alert('✅ Turma deletada com sucesso!')
      carregarTurmas()
    } catch (err) {
      alert('❌ Erro ao deletar turma')
      console.error(err)
    } finally {
      setDeletando(null)
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Turmas - Método BASE</h1>
          <p className="text-gray-600">Gerencie suas turmas e acompanhe o progresso BASE</p>
        </div>
        <Link
          href="/turmas/criar"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          ➕ Nova Turma
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Turmas</div>
          <div className="text-3xl font-bold mt-2">{estatisticas.total_turmas}</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <div className="text-sm text-green-600">Usando BASE</div>
          <div className="text-3xl font-bold text-green-700 mt-2">{estatisticas.usando_base}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow">
          <div className="text-sm text-blue-600">Total de Alunos</div>
          <div className="text-3xl font-bold text-blue-700 mt-2">{estatisticas.total_alunos}</div>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow">
          <div className="text-sm text-purple-600">Avaliações Aplicadas</div>
          <div className="text-3xl font-bold text-purple-700 mt-2">{estatisticas.avaliacoes_aplicadas}</div>
        </div>
      </div>

      {turmas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎓</div>
          <p className="text-lg text-gray-600">Nenhuma turma cadastrada</p>
          <Link
            href="/turmas/criar"
            className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Criar Primeira Turma
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.map((turma) => (
            <div key={turma.id} className="bg-white rounded-lg shadow p-6 relative">
              <button
                onClick={() => deletarTurma(turma.id, turma.nome)}
                disabled={deletando === turma.id}
                className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                title="Excluir turma"
              >
                {deletando === turma.id ? '⏳' : '🗑️'}
              </button>

              <div className="flex items-start justify-between mb-4 pr-8">
                <div>
                  <h3 className="text-xl font-bold">{turma.nome}</h3>
                  <p className="text-sm text-gray-600">{turma.ano_escolar}º ano - {turma.ano_letivo}</p>
                </div>
                {(turma.total_diagnosticos || 0) > 0 ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                    Ativo
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-medium">
                    Inativo
                  </span>
                )}
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alunos:</span>
                  <span className="font-medium">{turma.total_alunos || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diagnósticos:</span>
                  <span className="font-medium">{turma.total_diagnosticos || 0}/3</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href={`/base/diagnosticos/${turma.id}`}
                  className="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg font-medium"
                >
                  📋 Diagnósticos D1/D2/D3
                </Link>
                <Link
                  href={`/base/dashboard/${turma.id}`}
                  className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-medium"
                >
                  📊 Dashboard
                </Link>
                <Link
                  href={`/base/avaliacoes/${turma.id}`}
                  className="block w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-lg font-medium"
                >
                  📝 Avaliações
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">💡 Como usar o Método BASE</h3>
        <ol className="space-y-2 text-sm">
          <li><strong>1.</strong> Escolha uma turma e acesse "Diagnósticos D1/D2/D3"</li>
          <li><strong>2.</strong> Crie os 3 diagnósticos (D1-Fácil, D2-Médio, D3-Difícil)</li>
          <li><strong>3.</strong> Aplique e lance as notas nas primeiras 3 semanas</li>
          <li><strong>4.</strong> Sistema classifica automaticamente em Grupos A/B/C</li>
          <li><strong>5.</strong> Acompanhe evolução no Dashboard e Heat Map</li>
        </ol>
      </div>
    </div>
  )
}
