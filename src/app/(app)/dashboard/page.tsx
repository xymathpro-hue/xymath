'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Estatisticas {
  total_turmas: number
  usando_base: number
  total_alunos: number
  avaliacoes_aplicadas: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Estatisticas>({
    total_turmas: 0,
    usando_base: 0,
    total_alunos: 0,
    avaliacoes_aplicadas: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarEstatisticas()
  }, [])

  async function carregarEstatisticas() {
    try {
      setLoading(true)
      const response = await fetch('/api/turmas?ano_letivo=2026')
      const { data } = await response.json()
      
      const turmasComDados = await Promise.all(
        data.map(async (turma: any) => {
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
      
      setStats({
        total_turmas: turmasComDados.length,
        usando_base: turmasComDados.filter(t => (t.total_diagnosticos || 0) > 0).length,
        total_alunos: turmasComDados.reduce((sum, t) => sum + (t.total_alunos || 0), 0),
        avaliacoes_aplicadas: turmasComDados.reduce((sum, t) => sum + (t.total_diagnosticos || 0), 0)
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Olá, Marcelo! 👋</h1>
        <p className="text-gray-600">Bem-vindo ao Método BASE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Turmas</div>
              <div className="text-3xl font-bold mt-2">{stats.total_turmas}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Alunos</div>
              <div className="text-3xl font-bold mt-2">{stats.total_alunos}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Usando BASE</div>
              <div className="text-3xl font-bold mt-2">{stats.usando_base}</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Diagnósticos</div>
              <div className="text-3xl font-bold mt-2">{stats.avaliacoes_aplicadas}</div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/base/turmas"
          className="bg-gradient-to-r from-purple-600 to-purple-700 p-8 rounded-lg shadow-lg text-white hover:from-purple-700 hover:to-purple-800 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Método BASE</h3>
              <p className="text-purple-100">Gerenciar turmas e diagnósticos</p>
            </div>
          </div>
        </Link>

        <Link
          href="/turmas/criar"
          className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 rounded-lg shadow-lg text-white hover:from-blue-700 hover:to-blue-800 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-3xl">➕</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Criar Turma</h3>
              <p className="text-blue-100">Adicionar nova turma ao sistema</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">💡 Como usar o Método BASE</h3>
        <ol className="space-y-2 text-sm">
          <li><strong>1.</strong> Crie uma turma e adicione alunos</li>
          <li><strong>2.</strong> Acesse "Método BASE" e escolha a turma</li>
          <li><strong>3.</strong> Crie os diagnósticos D1, D2 e D3</li>
          <li><strong>4.</strong> Aplique nas primeiras 3 semanas e lance as notas</li>
          <li><strong>5.</strong> Sistema classifica automaticamente em Grupos A/B/C</li>
          <li><strong>6.</strong> Acompanhe evolução no Dashboard e Heat Map</li>
        </ol>
      </div>
    </div>
  )
}
