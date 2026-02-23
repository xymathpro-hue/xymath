'use client'

import { useEffect, useState } from 'react'

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
        usando_base: turmasComDados.length,
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
        <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-700">Turmas - Método BASE</h1>
          <p className="text-gray-600">Gerencie suas turmas e acompanhe o progresso BASE</p>
        </div>
        <form action="/turmas/criar" method="get">
          <button type="submit" className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer">
            ➕ Nova Turma
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total de Turmas</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{estatisticas.total_turmas}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Usando BASE</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{estatisticas.usando_base}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total de Alunos</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{estatisticas.total_alunos}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Avaliações Aplicadas</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{estatisticas.avaliacoes_aplicadas}</div>
        </div>
      </div>

      {turmas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <div className="text-6xl mb-4">🎓</div>
          <p className="text-lg text-gray-600">Nenhuma turma cadastrada</p>
          <form action="/turmas/criar" method="get">
            <button type="submit" className="inline-block mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer">
              Criar Primeira Turma
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.map((turma) => (
            <div key={turma.id} className="bg-white rounded-lg shadow p-6 relative border border-gray-200">
              <button onClick={() => deletarTurma(turma.id, turma.nome)} disabled={deletando === turma.id} className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 cursor-pointer" title="Excluir turma">
                {deletando === turma.id ? '⏳' : '🗑️'}
              </button>

              <div className="mb-4 pr-8">
                <h3 className="text-xl font-bold text-gray-700">{turma.nome}</h3>
                <p className="text-sm text-gray-600">{turma.ano_escolar}º ano - {turma.ano_letivo}</p>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alunos:</span>
                  <span className="font-medium text-gray-700">{turma.total_alunos || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diagnósticos:</span>
                  <span className="font-medium text-gray-700">{turma.total_diagnosticos || 0}/3</span>
                </div>
              </div>

              <div className="space-y-2">
                <form action={`/base/turmas/${turma.id}/alunos`} method="get">
                  <button type="submit" className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-center rounded-lg font-medium cursor-pointer">
                    👥 Gerenciar Alunos
                  </button>
                </form>
                
                <form action={`/base/diagnosticos/${turma.id}`} method="get">
                  <button type="submit" className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-center rounded-lg font-medium cursor-pointer">
                    📋 Diagnósticos D1/D2/D3
                  </button>
                </form>
                
                <form action={`/base/dashboard/${turma.id}`} method="get">
                  <button type="submit" className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-center rounded-lg font-medium cursor-pointer">
                    📊 Dashboard
                  </button>
                </form>
                
                <form action={`/base/avaliacoes/${turma.id}`} method="get">
                  <button type="submit" className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-center rounded-lg font-medium cursor-pointer">
                    📝 Avaliações
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white border border-gray-300 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-700">💡 Como usar o Método BASE</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li><strong>1.</strong> Escolha uma turma e clique em "Gerenciar Alunos"</li>
          <li><strong>2.</strong> Adicione os alunos da turma (marque se tem laudo)</li>
          <li><strong>3.</strong> Acesse "Diagnósticos D1/D2/D3" e crie os 3 diagnósticos</li>
          <li><strong>4.</strong> Aplique nas primeiras 3 semanas e lance as notas</li>
          <li><strong>5.</strong> Sistema classifica automaticamente em Grupos A/B/C</li>
          <li><strong>6.</strong> Acompanhe evolução no Dashboard e Heat Map</li>
        </ol>
      </div>
    </div>
  )
}
