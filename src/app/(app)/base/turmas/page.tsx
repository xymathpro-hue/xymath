// src/app/(app)/base/turmas/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Turma {
  id: string
  nome: string
  ano_escolar: number
  ano_letivo: number
  total_alunos?: number
  base_ativo?: boolean
  ultimo_diagnostico?: string
  total_avaliacoes?: number
}

export default function GestaoTurmasBASEPage() {
  const router = useRouter()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      setLoading(true)
      const response = await fetch('/api/turmas?ano_letivo=2026')
      const result = await response.json()
      
      // Buscar informações adicionais para cada turma
      const turmasComInfo = await Promise.all(
        (result.data || []).map(async (turma: Turma) => {
          // Contar alunos
          const resAlunos = await fetch(`/api/alunos?turma_id=${turma.id}`)
          const alunos = await resAlunos.json()
          
          // Contar avaliações BASE
          const resAval = await fetch(`/api/base/avaliacoes-mensais?turma_id=${turma.id}`)
          const aval = await resAval.json()
          
          return {
            ...turma,
            total_alunos: alunos.data?.length || 0,
            total_avaliacoes: aval.data?.length || 0,
            base_ativo: (aval.data?.length || 0) > 0
          }
        })
      )
      
      setTurmas(turmasComInfo)
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Turmas - Método BASE</h1>
        <p className="text-gray-600">Gerencie suas turmas e acompanhe o progresso BASE</p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Turmas</div>
          <div className="text-3xl font-bold mt-2">{turmas.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Usando BASE</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {turmas.filter(t => t.base_ativo).length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Alunos</div>
          <div className="text-3xl font-bold mt-2">
            {turmas.reduce((sum, t) => sum + (t.total_alunos || 0), 0)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avaliações Aplicadas</div>
          <div className="text-3xl font-bold mt-2">
            {turmas.reduce((sum, t) => sum + (t.total_avaliacoes || 0), 0)}
          </div>
        </div>
      </div>

      {/* Lista de Turmas */}
      <div className="bg-white rounded-lg shadow">
        {turmas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">🎓</div>
            <p className="text-lg">Nenhuma turma cadastrada</p>
            <p className="text-sm">Crie turmas na seção "Turmas" do sistema</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Turma</th>
                  <th className="px-4 py-3 text-center">Ano</th>
                  <th className="px-4 py-3 text-center">Alunos</th>
                  <th className="px-4 py-3 text-center">Status BASE</th>
                  <th className="px-4 py-3 text-center">Avaliações</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {turmas
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((turma) => (
                    <tr key={turma.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{turma.nome}</td>
                      <td className="px-4 py-3 text-center">{turma.ano_escolar}º ano</td>
                      <td className="px-4 py-3 text-center">{turma.total_alunos}</td>
                      <td className="px-4 py-3 text-center">
                        {turma.base_ativo ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            ✓ Ativo
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                            ○ Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold">{turma.total_avaliacoes}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/base/dashboard/${turma.id}`}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                          >
                            📊 Dashboard
                          </Link>
                          <Link
                            href={`/base/avaliacoes/${turma.id}`}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium"
                          >
                            📝 Avaliações
                          </Link>
                          <Link
                            href={`/base/heat-map/${turma.id}`}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium"
                          >
                            🔥 Heat Map
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card de Ajuda */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-2">💡 Como usar o Método BASE</h3>
        <ol className="space-y-2 text-sm">
          <li><strong>1.</strong> Escolha uma turma e acesse o Dashboard</li>
          <li><strong>2.</strong> Crie avaliações mensais (2 por bimestre)</li>
          <li><strong>3.</strong> Lance as respostas dos alunos</li>
          <li><strong>4.</strong> Sistema classifica automaticamente em grupos A/B/C</li>
          <li><strong>5.</strong> Use o Heat Map para identificar lacunas</li>
          <li><strong>6.</strong> Crie atividades diferenciadas por grupo</li>
          <li><strong>7.</strong> Ao fim do bimestre, calcule as notas BASE</li>
        </ol>
      </div>
    </div>
  )
}
