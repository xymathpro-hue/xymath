'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Aluno {
  id: string
  nome: string
  grupo: string
  habilidades: {
    [codigo: string]: {
      status: string
      percentual: number
    }
  }
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

const habilidadesPrioritarias = [
  { codigo: 'LEITURA', nome: 'Leitura de números' },
  { codigo: 'ESCRITA', nome: 'Escrita de números' },
  { codigo: 'ADICAO', nome: 'Adição' },
  { codigo: 'SUBTRACAO', nome: 'Subtração' },
  { codigo: 'MULTIPLICACAO', nome: 'Multiplicação' },
  { codigo: 'DIVISAO', nome: 'Divisão' },
  { codigo: 'FRACAO', nome: 'Frações' },
  { codigo: 'GEOMETRIA', nome: 'Geometria' },
]

export default function MapaTurmaPage() {
  const searchParams = useSearchParams()
  const turmaIdParam = searchParams.get('turma')
  const supabase = createClient()
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>(turmaIdParam || '')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarMapa()
    }
  }, [turmaSelecionada])

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
        
        if (!turmaSelecionada && turmasData.length > 0) {
          setTurmaSelecionada(turmasData[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function carregarMapa() {
    if (!turmaSelecionada) return
    
    setLoading(true)
    try {
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      if (!alunosData) return

      const bimestre = Math.ceil((new Date().getMonth() + 1) / 3)
      const anoLetivo = new Date().getFullYear()

      const { data: gruposData } = await supabase
        .from('base_alunos_grupo')
        .select('aluno_id, grupo')
        .eq('turma_id', turmaSelecionada)
        .eq('ano_letivo', anoLetivo)
        .eq('bimestre', bimestre)

      const gruposMap = new Map(gruposData?.map(g => [g.aluno_id, g.grupo]) || [])

      const alunoIds = alunosData.map(a => a.id)
      const { data: habilidadesData } = await supabase
        .from('base_alunos_habilidades')
        .select('aluno_id, habilidade_codigo, status, percentual_acerto')
        .in('aluno_id', alunoIds)
        .eq('ano_letivo', anoLetivo)

      const alunosComDados = alunosData.map(aluno => {
        const habilidadesAluno: { [codigo: string]: { status: string, percentual: number } } = {}
        
        habilidadesData
          ?.filter(h => h.aluno_id === aluno.id)
          .forEach(h => {
            habilidadesAluno[h.habilidade_codigo] = {
              status: h.status,
              percentual: h.percentual_acerto
            }
          })

        return {
          ...aluno,
          grupo: gruposMap.get(aluno.id) || '-',
          habilidades: habilidadesAluno
        }
      })

      setAlunos(alunosComDados)
    } catch (error) {
      console.error('Erro ao carregar mapa:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusIcon(status: string | undefined) {
    if (!status) return <span className="text-gray-400">—</span>
    
    switch (status) {
      case 'desenvolvida':
        return <span className="text-green-600 text-lg">✅</span>
      case 'em_desenvolvimento':
        return <span className="text-yellow-600 text-lg">🟡</span>
      case 'nao_desenvolvida':
        return <span className="text-red-600 text-lg">❌</span>
      default:
        return <span className="text-gray-400">—</span>
    }
  }

  function getGrupoStyle(grupo: string) {
    switch (grupo) {
      case 'A':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'B':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'C':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300'
    }
  }

  const alunosFiltrados = filtroGrupo === 'todos' 
    ? alunos 
    : alunos.filter(a => a.grupo === filtroGrupo)

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

  // Estatísticas
  const totalAlunos = alunos.length
  const grupoA = alunos.filter(a => a.grupo === 'A').length
  const grupoB = alunos.filter(a => a.grupo === 'B').length
  const grupoC = alunos.filter(a => a.grupo === 'C').length
  const semGrupo = alunos.filter(a => a.grupo === '-').length

  if (loading && turmas.length === 0) {
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Mapa da Turma</h1>
          <p className="text-gray-500 mt-1">Visualize ❌🟡✅ por habilidade</p>
        </div>
      </div>

      {/* Seletor de Turma */}
      {turmas.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turma
              </label>
              <select
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.ano_serie}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Grupo
              </label>
              <select
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="todos">Todos ({totalAlunos})</option>
                <option value="A">Grupo A - Apoio ({grupoA})</option>
                <option value="B">Grupo B - Adaptação ({grupoB})</option>
                <option value="C">Grupo C - Regular ({grupoC})</option>
              </select>
            </div>

            <button
              onClick={carregarMapa}
              className="mt-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800">
            Nenhuma turma configurada para o Método BASE.{' '}
            <Link href="/admin/base/turmas" className="text-yellow-900 underline font-medium">
              Configurar turmas
            </Link>
          </p>
        </div>
      )}

      {/* Estatísticas com Legenda */}
      {turmaAtual && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-3xl font-bold text-gray-900">{totalAlunos}</p>
            <p className="text-xs text-gray-500">alunos</p>
          </div>
          <div className="bg-red-50 rounded-xl border-2 border-red-300 p-4 text-center">
            <p className="text-sm font-medium text-red-700">Grupo A</p>
            <p className="text-3xl font-bold text-red-800">{grupoA}</p>
            <p className="text-xs text-red-600">Apoio Intensivo</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border-2 border-yellow-300 p-4 text-center">
            <p className="text-sm font-medium text-yellow-700">Grupo B</p>
            <p className="text-3xl font-bold text-yellow-800">{grupoB}</p>
            <p className="text-xs text-yellow-600">Adaptação</p>
          </div>
          <div className="bg-green-50 rounded-xl border-2 border-green-300 p-4 text-center">
            <p className="text-sm font-medium text-green-700">Grupo C</p>
            <p className="text-3xl font-bold text-green-800">{grupoC}</p>
            <p className="text-xs text-green-600">Regular</p>
          </div>
          {semGrupo > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-300 p-4 text-center">
              <p className="text-sm font-medium text-gray-600">Sem Grupo</p>
              <p className="text-3xl font-bold text-gray-700">{semGrupo}</p>
              <p className="text-xs text-gray-500">Pendente D1</p>
            </div>
          )}
        </div>
      )}

      {/* Mapa de Calor */}
      {turmaAtual && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Mapa de Habilidades - {turmaAtual.nome}
            </h2>
            <span className="text-sm text-gray-600">
              {alunosFiltrados.length} alunos
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="font-medium text-gray-700">Nenhum aluno encontrado</p>
              <p className="text-sm mt-1">Configure os diagnósticos primeiro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[200px]">
                      Aluno
                    </th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 w-16">
                      Grupo
                    </th>
                    {habilidadesPrioritarias.map((hab) => (
                      <th 
                        key={hab.codigo} 
                        className="px-3 py-3 text-center text-xs font-semibold text-gray-700 min-w-[80px]"
                        title={hab.nome}
                      >
                        {hab.nome.length > 10 ? hab.nome.substring(0, 10) + '...' : hab.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alunosFiltrados.map((aluno) => (
                    <tr key={aluno.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {aluno.nome}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold border ${getGrupoStyle(aluno.grupo)}`}>
                          {aluno.grupo}
                        </span>
                      </td>
                      {habilidadesPrioritarias.map((hab) => (
                        <td key={hab.codigo} className="px-3 py-3 text-center">
                          {getStatusIcon(aluno.habilidades[hab.codigo]?.status)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Legenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">Desenvolvida</p>
              <p className="text-xs text-green-600">76-100%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
            <span className="text-xl">🟡</span>
            <div>
              <p className="text-sm font-medium text-yellow-800">Em desenvolvimento</p>
              <p className="text-xs text-yellow-600">41-75%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
            <span className="text-xl">❌</span>
            <div>
              <p className="text-sm font-medium text-red-800">Não desenvolvida</p>
              <p className="text-xs text-red-600">0-40%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-xl text-gray-400">—</span>
            <div>
              <p className="text-sm font-medium text-gray-700">Não avaliada</p>
              <p className="text-xs text-gray-500">Sem dados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
