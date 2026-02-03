// src/app/(dashboard)/admin/base/relatorios/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function RelatoriosPage() {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      const { data: configTurmas } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_serie
          )
        `)
        .eq('ativo', true)

      if (configTurmas) {
        const turmasData = configTurmas
          .map((ct: any) => ct.turmas)
          .filter(Boolean)
        setTurmas(turmasData)
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    } finally {
      setLoading(false)
    }
  }

  const tiposRelatorio = [
    {
      href: '/admin/base/relatorios/aluno',
      icon: User,
      title: 'Relatório Individual',
      description: 'Desempenho detalhado de cada aluno nos diagnósticos',
      color: 'bg-blue-500'
    },
    {
      href: '/admin/base/relatorios/turma',
      icon: Users,
      title: 'Relatório da Turma',
      description: 'Visão geral da turma com distribuição por grupos',
      color: 'bg-green-500'
    },
    {
      href: '/admin/base/relatorios/evolucao',
      icon: TrendingUp,
      title: 'Evolução',
      description: 'Comparativo entre diagnósticos D1, D2 e D3',
      color: 'bg-purple-500'
    },
    {
      href: '/admin/base/relatorios/competencias',
      icon: BarChart3,
      title: 'Por Competência',
      description: 'Análise detalhada por L, F, R, A, J',
      color: 'bg-orange-500'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/base"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">Análises e relatórios do Método BASE</p>
        </div>
      </div>

      {/* Tipos de Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiposRelatorio.map((tipo) => (
          <Link
            key={tipo.href}
            href={tipo.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 ${tipo.color} rounded-lg`}>
                <tipo.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {tipo.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{tipo.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Acesso Rápido por Turma */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Acesso Rápido por Turma</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {turmas.map((turma) => (
            <Link
              key={turma.id}
              href={`/admin/base/relatorios/turma?turma=${turma.id}`}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors group"
            >
              <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{turma.nome}</p>
                <p className="text-sm text-gray-500">{turma.ano_serie}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
