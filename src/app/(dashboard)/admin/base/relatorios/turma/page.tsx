'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft, 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  FileText,
  Map
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface EstatisticasTurma {
  total_alunos: number
  diagnosticos_aplicados: number
  grupo_a: number
  grupo_b: number
  grupo_c: number
  faltosos: number
  media_d1: number | null
  media_d2: number | null
  media_d3: number | null
  media_d4: number | null
}

export default function RelatorioTurmaPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [estatisticas, setEstatisticas] = useState<EstatisticasTurma | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar turmas do Método BASE
  useEffect(() => {
    carregarTurmas()
  }, [])

  // Carregar estatísticas quando turma for selecionada
  useEffect(() => {
    if (turmaSelecionada) {
      carregarEstatisticas()
    }
  }, [turmaSelecionada])

  const carregarTurmas = async () => {
    try {
      const { data: turmasBase, error } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_escolar
          )
        `)
        .eq('ativo', true)

      if (error) throw error

      const turmasFormatadas = turmasBase
        ?.map((t: any) => ({
          id: t.turmas.id,
          nome: t.turmas.nome,
          ano_escolar: t.turmas.ano_escolar
        })) || []

      setTurmas(turmasFormatadas)
      
      // Selecionar primeira turma automaticamente
      if (turmasFormatadas.length > 0) {
        setTurmaSelecionada(turmasFormatadas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    }
  }

  const carregarEstatisticas = async () => {
    setLoading(true)
    try {
      // Buscar alunos da turma
      const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('id')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)

      if (alunosError) throw alunosError

      const totalAlunos = alunos?.length || 0
      const alunosIds = alunos?.map(a => a.id) || []

      // Buscar diagnósticos da turma
      const turmaInfo = turmas.find(t => t.id === turmaSelecionada)
      const anoEscolar = turmaInfo?.ano_escolar || '7'

      const { data: diagnosticos, error: diagError } = await supabase
        .from('base_diagnosticos')
        .select('id, codigo')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      if (diagError) throw diagError

      // Calcular estatísticas por diagnóstico
      let diagnosticosAplicados = 0
      const medias: { [key: string]: number | null } = {
        d1: null,
        d2: null,
        d3: null,
        d4: null
      }

      for (const diag of diagnosticos || []) {
        const { data: respostas } = await supabase
          .from('base_respostas_diagnostico')
          .select('aluno_id, acertou')
          .eq('diagnostico_id', diag.id)
          .in('aluno_id', alunosIds)

        if (respostas && respostas.length > 0) {
          diagnosticosAplicados++
          
          // Calcular média de acertos
          const totalQuestoes = 12
          const alunosComResposta = new Set(respostas.map(r => r.aluno_id))
          let somaPercentuais = 0

          alunosComResposta.forEach(alunoId => {
            const respostasAluno = respostas.filter(r => r.aluno_id === alunoId)
            const acertos = respostasAluno.filter(r => r.acertou === true).length
            const percentual = (acertos / totalQuestoes) * 100
            somaPercentuais += percentual
          })

          const mediaPercentual = somaPercentuais / alunosComResposta.size

          // Atribuir à média correspondente
          const diagNumero = diag.codigo.match(/D(\d)/)?.[1]
          if (diagNumero) {
            medias[`d${diagNumero}`] = Math.round(mediaPercentual)
          }
        }
      }

      // Calcular grupos finais
      let grupoA = 0
      let grupoB = 0
      let grupoC = 0
      let faltosos = 0

      for (const alunoId of alunosIds) {
        const { data: respostasAluno } = await supabase
          .from('base_respostas_diagnostico')
          .select('diagnostico_id, acertou')
          .eq('aluno_id', alunoId)
          .in('diagnostico_id', diagnosticos?.map(d => d.id) || [])

        if (!respostasAluno || respostasAluno.length === 0) {
          faltosos++
          continue
        }

        // Calcular grupo final do aluno (média ponderada)
        const diagnosticosAluno = new Set(respostasAluno.map(r => r.diagnostico_id))
        let somaNotasPonderadas = 0
        let somaPesos = 0

        diagnosticosAluno.forEach(diagId => {
          const diag = diagnosticos?.find(d => d.id === diagId)
          const respostasDiag = respostasAluno.filter(r => r.diagnostico_id === diagId)
          const acertos = respostasDiag.filter(r => r.acertou === true).length
          const percentual = (acertos / 12) * 100

          // Pesos: D1=3, D2=2, D3=1
          const diagNumero = parseInt(diag?.codigo.match(/D(\d)/)?.[1] || '1')
          const peso = diagNumero === 1 ? 3 : diagNumero === 2 ? 2 : 1

          somaNotasPonderadas += percentual * peso
          somaPesos += peso
        })

        const mediaFinal = somaPesos > 0 ? somaNotasPonderadas / somaPesos : 0

        if (mediaFinal <= 40) grupoA++
        else if (mediaFinal <= 70) grupoB++
        else grupoC++
      }

      setEstatisticas({
        total_alunos: totalAlunos,
        diagnosticos_aplicados: diagnosticosAplicados,
        grupo_a: grupoA,
        grupo_b: grupoB,
        grupo_c: grupoC,
        faltosos: faltosos,
        media_d1: medias.d1,
        media_d2: medias.d2,
        media_d3: medias.d3,
        media_d4: medias.d4
      })

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularTendencia = (atual: number | null, anterior: number | null) => {
    if (!atual || !anterior) return { icon: Minus, cor: 'text-gray-400', texto: 'Sem dados' }
    
    const diferenca = atual - anterior
    if (diferenca >= 10) return { icon: TrendingUp, cor: 'text-green-600', texto: '+' + diferenca.toFixed(0) + '%' }
    if (diferenca <= -10) return { icon: TrendingDown, cor: 'text-red-600', texto: diferenca.toFixed(0) + '%' }
    return { icon: Minus, cor: 'text-yellow-600', texto: 'Estável' }
  }

  const turmaInfo = turmas.find(t => t.id === turmaSelecionada)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Relatório da Turma</h1>
          <p className="text-gray-600 mt-1">Visão geral do desempenho no Método BASE</p>
        </div>

        {/* Seletor de Turma */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {turmas.map(turma => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} - {turma.ano_escolar}º ano EF
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
          </div>
        ) : estatisticas ? (
          <>
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total de Alunos */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.total_alunos}</p>
                  </div>
                </div>
              </div>

              {/* Diagnósticos Aplicados */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardCheck className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Diagnósticos</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {estatisticas.diagnosticos_aplicados}/4
                    </p>
                  </div>
                </div>
              </div>

              {/* Grupo A */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold">A</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Grupo A</p>
                    <p className="text-3xl font-bold text-red-600">
                      {estatisticas.grupo_a}
                    </p>
                    <p className="text-xs text-gray-500">
                      {estatisticas.total_alunos > 0 
                        ? Math.round((estatisticas.grupo_a / estatisticas.total_alunos) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Grupo C */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">C</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Grupo C</p>
                    <p className="text-3xl font-bold text-green-600">
                      {estatisticas.grupo_c}
                    </p>
                    <p className="text-xs text-gray-500">
                      {estatisticas.total_alunos > 0 
                        ? Math.round((estatisticas.grupo_c / estatisticas.total_alunos) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Média da Turma por Diagnóstico */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                Média da Turma por Diagnóstico
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['d1', 'd2', 'd3', 'd4'].map((diag, index) => {
                  const valor = estatisticas[`media_${diag}` as keyof EstatisticasTurma] as number | null
                  const anterior = index > 0 
                    ? estatisticas[`media_d${index}` as keyof EstatisticasTurma] as number | null
                    : null
                  const tendencia = calcularTendencia(valor, anterior)
                  const IconeTendencia = tendencia.icon

                  return (
                    <div key={diag} className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        D{index + 1} - {['Habilidades Fundamentais', 'Raciocínio Matemático', 'Números e Operações', 'Frações e Geometria'][index]}
                      </p>
                      {valor !== null ? (
                        <>
                          <p className="text-4xl font-bold text-gray-900 mb-1">{valor}%</p>
                          <div className={`flex items-center justify-center gap-1 ${tendencia.cor}`}>
                            <IconeTendencia className="w-4 h-4" />
                            <span className="text-sm">{tendencia.texto}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-2xl text-gray-400">—</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Distribuição dos Grupos */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Distribuição dos Grupos</h2>
              
              <div className="space-y-4">
                {/* Barra de Distribuição */}
                <div className="flex h-12 rounded-lg overflow-hidden">
                  {estatisticas.grupo_a > 0 && (
                    <div
                      className="bg-red-500 flex items-center justify-center text-white font-semibold"
                      style={{ width: `${(estatisticas.grupo_a / estatisticas.total_alunos) * 100}%` }}
                    >
                      A: {estatisticas.grupo_a}
                    </div>
                  )}
                  {estatisticas.grupo_b > 0 && (
                    <div
                      className="bg-yellow-500 flex items-center justify-center text-white font-semibold"
                      style={{ width: `${(estatisticas.grupo_b / estatisticas.total_alunos) * 100}%` }}
                    >
                      B: {estatisticas.grupo_b}
                    </div>
                  )}
                  {estatisticas.grupo_c > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center text-white font-semibold"
                      style={{ width: `${(estatisticas.grupo_c / estatisticas.total_alunos) * 100}%` }}
                    >
                      C: {estatisticas.grupo_c}
                    </div>
                  )}
                </div>

                {/* Legendas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-600">Apoio (0-40%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-sm text-gray-600">Adaptação (41-70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600">Regular (71-100%)</span>
                  </div>
                  {estatisticas.faltosos > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm text-gray-600">Faltosos ({estatisticas.faltosos})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Legenda de Evolução */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Legenda</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Evolução positiva (+10%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-yellow-600" />
                  <span className="text-gray-600">Estável</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-gray-600">Evolução negativa (-10%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Sem dados suficientes</span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/base/mapa')}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Map className="w-5 h-5" />
                Ver Mapa da Turma
              </button>

              <button
                onClick={() => router.push('/admin/base/diagnosticos')}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <ClipboardCheck className="w-5 h-5" />
                Ver Diagnósticos
              </button>

              <button
                onClick={() => router.push('/admin/base/relatorios/aluno')}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Relatório Individual
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhuma estatística disponível para esta turma.</p>
          </div>
        )}
      </div>
    </div>
  )
}
