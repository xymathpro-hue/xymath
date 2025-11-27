'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Users, 
  GraduationCap, 
  FileText, 
  BarChart3,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react'

interface DashboardStats {
  turmas: number
  alunos: number
  simulados: number
  resultados: number
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    turmas: 0,
    alunos: 0,
    simulados: 0,
    resultados: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      if (!usuario?.id) return

      try {
        // Buscar turmas
        const { count: turmasCount } = await supabase
          .from('turmas')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', usuario.id)

        // Buscar alunos (através das turmas)
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('usuario_id', usuario.id)

        let alunosCount = 0
        if (turmas && turmas.length > 0) {
          const turmaIds = turmas.map(t => t.id)
          const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .in('turma_id', turmaIds)
          alunosCount = count || 0
        }

        // Buscar simulados
        const { count: simuladosCount } = await supabase
          .from('simulados')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', usuario.id)

        // Buscar resultados
        const { count: resultadosCount } = await supabase
          .from('resultados')
          .select('*', { count: 'exact', head: true })

        setStats({
          turmas: turmasCount || 0,
          alunos: alunosCount,
          simulados: simuladosCount || 0,
          resultados: resultadosCount || 0
        })
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [usuario?.id])

  const statCards = [
    { 
      label: 'Turmas', 
      value: stats.turmas, 
      icon: Users, 
      color: 'bg-blue-500',
      href: '/turmas' 
    },
    { 
      label: 'Alunos', 
      value: stats.alunos, 
      icon: GraduationCap, 
      color: 'bg-green-500',
      href: '/alunos' 
    },
    { 
      label: 'Simulados', 
      value: stats.simulados, 
      icon: FileText, 
      color: 'bg-purple-500',
      href: '/simulados' 
    },
    { 
      label: 'Resultados', 
      value: stats.resultados, 
      icon: BarChart3, 
      color: 'bg-orange-500',
      href: '/resultados' 
    },
  ]

  const quickActions = [
    { label: 'Criar Turma', href: '/turmas/nova', icon: Users },
    { label: 'Adicionar Questão', href: '/questoes/nova', icon: Plus },
    { label: 'Criar Simulado', href: '/simulados/novo', icon: FileText },
    { label: 'Ver Resultados', href: '/resultados', icon: BarChart3 },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Olá, {usuario?.nome?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo ao xyMath. Aqui está um resumo da sua plataforma.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                      {loading ? '-' : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card variant="bordered" className="hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-medium text-gray-900">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Simulados Recentes */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Simulados Recentes</h3>
              <Link href="/simulados" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {stats.simulados === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Nenhum simulado criado ainda</p>
                <Link href="/simulados/novo">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Simulado
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Placeholder para simulados recentes */}
                <p className="text-gray-500 text-center py-4">
                  Carregando simulados...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desempenho Geral */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Desempenho Geral</h3>
              <Link href="/resultados" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                Ver análises <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {stats.resultados === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  As análises aparecerão aqui após aplicar simulados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Placeholder para gráfico de desempenho */}
                <p className="text-gray-500 text-center py-4">
                  Carregando análises...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Getting Started (se for novo usuário) */}
      {stats.turmas === 0 && stats.simulados === 0 && !loading && (
        <Card variant="bordered" className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 Primeiros Passos</h3>
            <p className="text-gray-600 mb-4">
              Comece configurando sua plataforma seguindo estes passos:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Crie suas turmas</p>
                  <p className="text-sm text-gray-600">Organize seus alunos por classe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Monte seu banco de questões</p>
                  <p className="text-sm text-gray-600">Cadastre questões com habilidades BNCC</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Crie simulados</p>
                  <p className="text-sm text-gray-600">Gere provas com correção automática</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
