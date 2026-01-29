'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ClipboardCheck, 
  Users, 
  BarChart3, 
  FileText, 
  Calendar,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Target,
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface EstatisticasBase {
  turmasAtivas: number
  totalAlunos: number
  diagnosticosAplicados: number
  aulasRealizadas: number
}

export default function MetodoBasePage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const [turmasBase, setTurmasBase] = useState<Turma[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasBase>({
    turmasAtivas: 0,
    totalAlunos: 0,
    diagnosticosAplicados: 0,
    aulasRealizadas: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
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
        const turmas = configTurmas
          .map((ct: any) => ct.turmas)
          .filter(Boolean)
        setTurmasBase(turmas)
        
        let totalAlunos = 0
        for (const turma of turmas) {
          const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('turma_id', turma.id)
            .eq('ativo', true)
          totalAlunos += count || 0
        }

        const { count: aulasCount } = await supabase
          .from('base_aulas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'realizada')

        const { count: diagCount } = await supabase
          .from('base_aulas')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'diagnostico')
          .eq('status', 'realizada')

        setEstatisticas({
          turmasAtivas: turmas.length,
          totalAlunos,
          diagnosticosAplicados: diagCount || 0,
          aulasRealizadas: aulasCount || 0
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    {
      href: '/admin/base/turmas',
      icon: Users,
      title: 'Turmas BASE',
      description: 'Selecionar turmas que participam do Método BASE',
      color: 'bg-blue-500'
    },
    {
      href: '/admin/base/diagnosticos',
      icon: ClipboardCheck,
      title: 'Diagnósticos',
      description: 'Aplicar e lançar D1, D2, D3, D4',
      color: 'bg-green-500'
    },
    {
      href: '/admin/base/mapa',
      icon: Target,
      title: 'Mapa da Turma',
      description: 'Visualizar ❌🟡✅ por habilidade',
      color: 'bg-purple-500'
    },
    {
      href: '/admin/base/aulas',
      icon: BookOpen,
      title: 'Aulas & Fichas',
      description: 'Microaulas, fichas Verde/Azul/Amarela',
      color: 'bg-orange-500'
    },
    {
      href: '/admin/base/lancamento',
      icon: FileText,
      title: 'Lançamento',
      description: 'Lançar respostas, presença, ocorrências',
      color: 'bg-indigo-500'
    },
    {
      href: '/admin/base/agenda',
      icon: Calendar,
      title: 'Agenda',
      description: 'Aulas realizadas e não realizadas',
      color: 'bg-teal-500'
    },
    {
      href: '/admin/base/relatorios',
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Individual, turma, evolução, gestão',
      color: 'bg-pink-500'
    },
    {
      href: '/admin/base/alertas',
      icon: AlertTriangle,
      title: 'Alertas',
      description: 'Pré-requisitos, alunos críticos, sugestões',
      color: 'bg-yellow-500'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Método BASE</h1>
          <p className="text-gray-500 mt-1">Base Analítica Sistematizada Educacional</p>
        </div>
        <Link
          href="/admin/base/configuracoes"
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Turmas Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.turmasAtivas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Alunos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalAlunos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Diagnósticos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.diagnosticosAplicados}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aulas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.aulasRealizadas}</p>
            </div>
          </div>
        </div>
      </div>

      {estatisticas.turmasAtivas === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Configuração Inicial</h3>
              <p className="text-yellow-700 mt-1">
                Nenhuma turma está configurada para o Método BASE. Comece selecionando as turmas que participarão.
              </p>
              <Link
                href="/admin/base/turmas"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Configurar Turmas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all group"
          >
            <div className={`inline-flex p-3 rounded-lg ${item.color} mb-4`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            <div className="flex items-center gap-1 mt-3 text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Acessar</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {turmasBase.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Turmas no Método BASE</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {turmasBase.map((turma) => (
              <Link
                key={turma.id}
                href={`/admin/base/mapa?turma=${turma.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{turma.nome}</p>
                    <p className="text-sm text-gray-500">{turma.ano_serie}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">📋 Fluxo de Trabalho Recomendado</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <p className="text-sm font-medium mt-2">Configurar Turmas</p>
            <p className="text-xs text-gray-500">Selecionar turmas BASE</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <p className="text-sm font-medium mt-2">Aplicar Diagnósticos</p>
            <p className="text-xs text-gray-500">D1, D2, D3, D4</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <p className="text-sm font-medium mt-2">Analisar Mapa</p>
            <p className="text-xs text-gray-500">Ver ❌🟡✅</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
            <p className="text-sm font-medium mt-2">Aplicar Fichas</p>
            <p className="text-xs text-gray-500">Verde/Azul/Amarela</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">5</div>
            <p className="text-sm font-medium mt-2">Acompanhar</p>
            <p className="text-xs text-gray-500">Relatórios e Alertas</p>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 py-4">
        <p>Método BASE - Base Analítica Sistematizada Educacional</p>
        <p>Acesso exclusivo do administrador</p>
      </div>
    </div>
  )
}
