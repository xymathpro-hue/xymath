'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FileText,
  Users,
  User,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface AlunoRelatorio {
  id: string
  nome: string
  grupo: string
  d1: { acertos: number; total: number } | null
  d2: { acertos: number; total: number } | null
  d3: { acertos: number; total: number } | null
  d4: { acertos: number; total: number } | null
  mediaGeral: number
  evolucao: 'subiu' | 'desceu' | 'estavel' | null
}

interface EstatisticasTurma {
  totalAlunos: number
  grupoA: number
  grupoB: number
  grupoC: number
  semGrupo: number
  mediaD1: number
  mediaD2: number
  mediaD3: number
  mediaD4: number
  diagnosticosAplicados: number
}

export default function RelatoriosBasePage() {
  const supabase = createClient()
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [alunos, setAlunos] = useState<AlunoRelatorio[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasTurma | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipoRelatorio, setTipoRelatorio] = useState<'turma' | 'individual'>('turma')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarRelatorio()
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
        
        if (turmasData.length > 0) {
          setTurmaSelecionada(turmasData[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function carregarRelatorio() {
    if (!turmaSelecionada) return
    
    setLoading(true)
    try {
      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('nome')

      if (!alunosData) return

      // Carregar grupos
      const bimestre = Math.ceil((new Date().getMonth() + 1) / 3)
      const anoLetivo = new Date().getFullYear()

      const { data: gruposData } = await supabase
        .from('base_alunos_grupo')
        .select('aluno_id, grupo')
        .eq('turma_id', turmaSelecionada)
        .eq('ano_letivo', anoLetivo)
        .eq('bimestre', bimestre)

      const gruposMap = new Map(gruposData?.map(g => [g.aluno_id, g.grupo]) || [])

      // Carregar diagnósticos
      const { data: diagnosticos } = await supabase
        .from('base_diagnosticos')
        .select('id, codigo')
        .in('codigo', ['D1', 'D2', 'D3', 'D4'])

      const diagMap = new Map(diagnosticos?.map(d => [d.codigo, d.id]) || [])

      // Carregar aulas
      const { data: aulasData } = await supabase
        .from('base_aulas')
        .select('id, diagnostico_id')
        .eq('turma_id', turmaSelecionada)
        .eq('tipo', 'diagnostico')

      // Carregar questões por diagnóstico
      const { data: questoesData } = await supabase
        .from('base_diagnostico_questoes')
        .select('id, diagnostico_id, numero')

      // Carregar todas as respostas
      const aulaIds = aulasData?.map(a => a.id) || []
      const { data: respostasData } = await supabase
        .from('base_respostas_diagnostico')
        .select('aula_id, aluno_id, questao_id, resposta')
        .in('aula_id', aulaIds)

      // Processar dados dos alunos
      const alunosProcessados: AlunoRelatorio[] = alunosData.map(aluno => {
        const grupo = gruposMap.get(aluno.id) || '-'
        
        function calcularResultado(codigoDiag: string) {
          const diagId = diagMap.get(codigoDiag)
          if (!diagId) return null

          const aula = aulasData?.find(a => a.diagnostico_id === diagId)
          if (!aula) return null

          const questoesDiag = questoesData?.filter(q => q.diagnostico_id === diagId) || []
          const respostasAluno = respostasData?.filter(
            r => r.aula_id === aula.id && r.aluno_id === aluno.id
          ) || []

          const acertos = respostasAluno.filter(r => r.resposta === 'acertou').length
          return { acertos, total: questoesDiag.length || 6 }
        }

        const d1 = calcularResultado('D1')
        const d2 = calcularResultado('D2')
        const d3 = calcularResultado('D3')
        const d4 = calcularResultado('D4')

        // Calcular média geral
        const resultados = [d1, d2, d3, d4].filter(r => r !== null)
        const mediaGeral = resultados.length > 0
          ? Math.round(resultados.reduce((acc, r) => acc + (r!.acertos / r!.total) * 100, 0) / resultados.length)
          : 0

        // Calcular evolução (comparar D1 com D4, ou último disponível)
        let evolucao: 'subiu' | 'desceu' | 'estavel' | null = null
        if (d1 && (d4 || d3 || d2)) {
          const ultimo = d4 || d3 || d2
          const percentD1 = (d1.acertos / d1.total) * 100
          const percentUltimo = (ultimo!.acertos / ultimo!.total) * 100
          
          if (percentUltimo > percentD1 + 10) evolucao = 'subiu'
          else if (percentUltimo < percentD1 - 10) evolucao = 'desceu'
          else evolucao = 'estavel'
        }

        return {
          ...aluno,
          grupo,
          d1,
          d2,
          d3,
          d4,
          mediaGeral,
          evolucao
        }
      })

      setAlunos(alunosProcessados)

      // Calcular estatísticas da turma
      const grupoA = alunosProcessados.filter(a => a.grupo === 'A').length
      const grupoB = alunosProcessados.filter(a => a.grupo === 'B').length
      const grupoC = alunosProcessados.filter(a => a.grupo === 'C').length
      const semGrupo = alunosProcessados.filter(a => a.grupo === '-').length

      function calcularMediaDiag(diag: 'd1' | 'd2' | 'd3' | 'd4') {
        const comResultado = alunosProcessados.filter(a => a[diag] !== null)
        if (comResultado.length === 0) return 0
        const soma = comResultado.reduce((acc, a) => {
          const r = a[diag]!
          return acc + (r.acertos / r.total) * 100
        }, 0)
        return Math.round(soma / comResultado.length)
      }

      const diagnosticosAplicados = [
        alunosProcessados.some(a => a.d1),
        alunosProcessados.some(a => a.d2),
        alunosProcessados.some(a => a.d3),
        alunosProcessados.some(a => a.d4)
      ].filter(Boolean).length

      setEstatisticas({
        totalAlunos: alunosProcessados.length,
        grupoA,
        grupoB,
        grupoC,
        semGrupo,
        mediaD1: calcularMediaDiag('d1'),
        mediaD2: calcularMediaDiag('d2'),
        mediaD3: calcularMediaDiag('d3'),
        mediaD4: calcularMediaDiag('d4'),
        diagnosticosAplicados
      })

    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  function getGrupoStyle(grupo: string) {
    switch (grupo) {
      case 'A': return 'bg-red-100 text-red-800 border-red-300'
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'C': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-600 border-gray-300'
    }
  }

  function getEvolucaoIcon(evolucao: string | null) {
    switch (evolucao) {
      case 'subiu': return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'desceu': return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'estavel': return <Minus className="w-5 h-5 text-yellow-600" />
      default: return <span className="text-gray-400">—</span>
    }
  }

  function getMediaStyle(media: number) {
    if (media >= 70) return 'text-green-700 bg-green-50'
    if (media >= 50) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

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
          <h1 className="text-2xl font-bold text-gray-900">Relatórios BASE</h1>
          <p className="text-gray-600 mt-1">Acompanhamento e evolução dos alunos</p>
        </div>
      </div>

      {/* Filtros */}
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
                Tipo de Relatório
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoRelatorio('turma')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    tipoRelatorio === 'turma'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Turma
                </button>
                <button
                  onClick={() => setTipoRelatorio('individual')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    tipoRelatorio === 'individual'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Individual
                </button>
              </div>
            </div>
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

      {/* Relatório da Turma */}
      {tipoRelatorio === 'turma' && estatisticas && (
        <>
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-sm font-medium text-gray-600">Total de Alunos</p>
              <p className="text-3xl font-bold text-gray-900">{estatisticas.totalAlunos}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-sm font-medium text-gray-600">Diagnósticos Aplicados</p>
              <p className="text-3xl font-bold text-indigo-700">{estatisticas.diagnosticosAplicados}/4</p>
            </div>
            <div className="bg-red-50 rounded-xl border-2 border-red-300 p-4 text-center">
              <p className="text-sm font-medium text-red-700">Grupo A (Apoio)</p>
              <p className="text-3xl font-bold text-red-800">{estatisticas.grupoA}</p>
              <p className="text-xs text-red-600">{Math.round((estatisticas.grupoA / estatisticas.totalAlunos) * 100)}%</p>
            </div>
            <div className="bg-green-50 rounded-xl border-2 border-green-300 p-4 text-center">
              <p className="text-sm font-medium text-green-700">Grupo C (Regular)</p>
              <p className="text-3xl font-bold text-green-800">{estatisticas.grupoC}</p>
              <p className="text-xs text-green-600">{Math.round((estatisticas.grupoC / estatisticas.totalAlunos) * 100)}%</p>
            </div>
          </div>

          {/* Médias por Diagnóstico */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Média da Turma por Diagnóstico
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'D1 - Habilidades Fundamentais', media: estatisticas.mediaD1 },
                { label: 'D2 - Raciocínio Matemático', media: estatisticas.mediaD2 },
                { label: 'D3 - Números e Operações', media: estatisticas.mediaD3 },
                { label: 'D4 - Frações e Geometria', media: estatisticas.mediaD4 },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-sm text-gray-600 mb-2">{item.label}</p>
                  <div className={`inline-block px-4 py-2 rounded-lg font-bold text-xl ${getMediaStyle(item.media)}`}>
                    {item.media > 0 ? `${item.media}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribuição dos Grupos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Distribuição dos Grupos</h3>
            <div className="flex items-center gap-2 h-8 rounded-lg overflow-hidden">
              {estatisticas.grupoA > 0 && (
                <div 
                  className="bg-red-500 h-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${(estatisticas.grupoA / estatisticas.totalAlunos) * 100}%` }}
                >
                  A: {estatisticas.grupoA}
                </div>
              )}
              {estatisticas.grupoB > 0 && (
                <div 
                  className="bg-yellow-500 h-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${(estatisticas.grupoB / estatisticas.totalAlunos) * 100}%` }}
                >
                  B: {estatisticas.grupoB}
                </div>
              )}
              {estatisticas.grupoC > 0 && (
                <div 
                  className="bg-green-500 h-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${(estatisticas.grupoC / estatisticas.totalAlunos) * 100}%` }}
                >
                  C: {estatisticas.grupoC}
                </div>
              )}
              {estatisticas.semGrupo > 0 && (
                <div 
                  className="bg-gray-400 h-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${(estatisticas.semGrupo / estatisticas.totalAlunos) * 100}%` }}
                >
                  ?: {estatisticas.semGrupo}
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> Apoio</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> Adaptação</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Regular</span>
            </div>
          </div>
        </>
      )}

      {/* Relatório Individual */}
      {tipoRelatorio === 'individual' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Desempenho Individual - {turmaAtual?.nome}</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aluno</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Grupo</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">D1</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">D2</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">D3</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">D4</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Média</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Evolução</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alunos.map((aluno) => (
                    <tr key={aluno.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {aluno.nome}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold border ${getGrupoStyle(aluno.grupo)}`}>
                          {aluno.grupo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {aluno.d1 ? (
                          <span className="font-bold text-gray-900">{aluno.d1.acertos}/{aluno.d1.total}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {aluno.d2 ? (
                          <span className="font-bold text-gray-900">{aluno.d2.acertos}/{aluno.d2.total}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {aluno.d3 ? (
                          <span className="font-bold text-gray-900">{aluno.d3.acertos}/{aluno.d3.total}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {aluno.d4 ? (
                          <span className="font-bold text-gray-900">{aluno.d4.acertos}/{aluno.d4.total}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded font-bold ${getMediaStyle(aluno.mediaGeral)}`}>
                          {aluno.mediaGeral}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {getEvolucaoIcon(aluno.evolucao)}
                      </td>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-gray-700">Evolução positiva (+10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="w-5 h-5 text-yellow-600" />
            <span className="text-gray-700">Estável</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-gray-700">Evolução negativa (-10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">—</span>
            <span className="text-gray-700">Sem dados suficientes</span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-4">
        <Link
          href="/admin/base/mapa"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Ver Mapa da Turma
        </Link>
        <Link
          href="/admin/base/diagnosticos"
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Ver Diagnósticos
        </Link>
      </div>
    </div>
  )
                  }
