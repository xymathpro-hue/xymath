'use client'

import { useEffect, useState } from 'react'

interface Turma {
  id: string
  nome: string
  ano: string
  ano_letivo: number
}

interface Estatisticas {
  total_turmas: number
  usando_base: number
  total_alunos: number
  avaliacoes_aplicadas: number
}

export default function TurmasBasePage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [stats, setStats] = useState<Estatisticas | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      
      const response = await fetch('/api/turmas')
      const { data } = await response.json()
      
      setTurmas(data || [])
      
      // Calcular estatísticas
      const totalAlunos = data?.reduce((acc: number, t: any) => {
        return acc + (t.alunos_count || 0)
      }, 0) || 0
      
      setStats({
        total_turmas: data?.length || 0,
        usando_base: data?.length || 0,
        total_alunos: totalAlunos,
        avaliacoes_aplicadas: 0
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function deletarTurma(id: string, nome: string) {
    if (!confirm(`Tem certeza que deseja excluir a turma "${nome}"?\n\nIsso vai apagar todos os dados, alunos, diagnósticos e atividades!`)) {
      return
    }

    try {
      const response = await fetch(`/api/turmas/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao deletar')

      alert('✅ Turma excluída com sucesso!')
      carregarDados()
    } catch (err) {
      alert('❌ Erro ao excluir turma')
      console.error(err)
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-700">Turmas - Método BASE</h1>
          <p className="text-sm text-gray-600">Gerencie suas turmas e acompanhe o progresso BASE</p>
        </div>
        <a
          href="/base/turmas/criar"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium no-underline"
        >
          + Nova Turma
        </a>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total de Turmas</p>
          <p className="text-4xl font-bold text-gray-700">{stats?.total_turmas || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Usando BASE</p>
          <p className="text-4xl font-bold text-gray-700">{stats?.usando_base || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total de Alunos</p>
          <p className="text-4xl font-bold text-gray-700">{stats?.total_alunos || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Avaliações Aplicadas</p>
          <p className="text-4xl font-bold text-gray-700">{stats?.avaliacoes_aplicadas || 0}</p>
        </div>
      </div>

      {/* Lista de Turmas */}
      {turmas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <p className="text-gray-500 text-lg mb-4">Nenhuma turma cadastrada ainda</p>
          <a
            href="/base/turmas/criar"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium no-underline inline-block"
          >
            Criar primeira turma
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.map((turma) => (
            <div key={turma.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-700">{turma.nome}</h3>
                  <p className="text-sm text-gray-600">{turma.ano} - {turma.ano_letivo}</p>
                </div>
                <button
                  onClick={() => deletarTurma(turma.id, turma.nome)}
                  className="text-red-500 hover:text-red-700"
                  title="Excluir turma"
                >
                  🗑️
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Alunos:</span>
                  <span className="font-bold text-gray-700">41</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diagnósticos:</span>
                  <span className="font-bold text-gray-700">0/3</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={`/base/turmas/${turma.id}/alunos`}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-center font-medium no-underline flex items-center justify-center gap-2"
                >
                  👥 Gerenciar Alunos
                </a>
                <a
                  href={`/base/diagnosticos/${turma.id}`}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-center font-medium no-underline flex items-center justify-center gap-2"
                >
                  📋 Diagnósticos D1/D2/D3
                </a>
                <a
                  href={`/base/dashboard/${turma.id}`}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-center font-medium no-underline flex items-center justify-center gap-2"
                >
                  📊 Dashboard
                </a>
                <a
                  href={`/base/atividades/${turma.id}`}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-center font-medium no-underline flex items-center justify-center gap-2"
                >
                  📝 Atividades
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
          💡 Como usar o Método BASE
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>1. Criar turma</strong> e adicionar alunos</p>
          <p><strong>2. Aplicar diagnósticos D1, D2 e D3</strong> (10 questões cada)</p>
          <p><strong>3. Classificação automática</strong> em grupos A (Apoio), B (Adaptação), C (Regular)</p>
          <p><strong>4. Atividades diferenciadas</strong> por grupo com acompanhamento contínuo</p>
          <p><strong>5. Reclassificação</strong> após cada 3 atividades</p>
        </div>
      </div>
    </div>
  )
}
