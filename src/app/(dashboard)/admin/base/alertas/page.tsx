'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft,
  AlertTriangle,
  TrendingDown,
  Users,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface Alerta {
  id: string
  tipo: 'critico' | 'atencao' | 'informacao'
  categoria: 'desempenho' | 'frequencia' | 'pre_requisitos' | 'evolucao'
  titulo: string
  descricao: string
  alunos_afetados: number
  prioridade: 'alta' | 'media' | 'baixa'
  sugestao: string
  resolvido: boolean
}

const NOMES_COMPETENCIAS: { [key: string]: string } = {
  L: 'Leitura/Interpretação',
  F: 'Fluência/Cálculo',
  R: 'Raciocínio/Compreensão',
  A: 'Aplicação/Problemas',
  J: 'Justificativa/Conexão'
}

export default function AlertasPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'critico' | 'atencao' | 'informacao'>('todos')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      gerarAlertas()
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
      
      if (turmasFormatadas.length > 0) {
        setTurmaSelecionada(turmasFormatadas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setLoading(false)
    }
  }

  const gerarAlertas = async () => {
    setLoading(true)
    try {
      const alertasGerados: Alerta[] = []

      const { data: alunos } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)

      const alunosIds = alunos?.map(a => a.id) || []
      const turmaInfo = turmas.find(t => t.id === turmaSelecionada)
      const anoEscolar = turmaInfo?.ano_escolar || '7'

      const { data: diagnosticos } = await supabase
        .from('base_diagnosticos')
        .select('id, codigo')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      // ALERTA 1: Alunos com desempenho crítico
      let alunosCriticos = 0

      for (const alunoId of alunosIds) {
        const { data: respostas } = await supabase
          .from('base_respostas_diagnostico')
          .select('acertou')
          .eq('aluno_id', alunoId)
          .in('diagnostico_id', diagnosticos?.map(d => d.id) || [])

        if (respostas && respostas.length > 0) {
          const acertos = respostas.filter(r => r.acertou === true).length
          const percentual = (acertos / respostas.length) * 100

          if (percentual < 25) {
            alunosCriticos++
          }
        }
      }

      if (alunosCriticos > 0) {
        alertasGerados.push({
          id: 'critico-1',
          tipo: 'critico',
          categoria: 'desempenho',
          titulo: `${alunosCriticos} ${alunosCriticos === 1 ? 'aluno' : 'alunos'} com desempenho crítico`,
          descricao: `${alunosCriticos === 1 ? 'Este aluno está' : 'Estes alunos estão'} com aproveitamento abaixo de 25% nos diagnósticos aplicados. Intervenção urgente necessária.`,
          alunos_afetados: alunosCriticos,
          prioridade: 'alta',
          sugestao: 'Agende atendimento individual, aplique atividades da Ficha Amarela de reforço, e considere encaminhamento para apoio pedagógico.',
          resolvido: false
        })
      }

      // ALERTA 2: Muitos alunos no Grupo A
      let grupoA = 0
      for (const alunoId of alunosIds) {
        const { data: respostas } = await supabase
          .from('base_respostas_diagnostico')
          .select('diagnostico_id, acertou')
          .eq('aluno_id', alunoId)
          .in('diagnostico_id', diagnosticos?.map(d => d.id) || [])

        if (respostas && respostas.length > 0) {
          const diagnosticosAluno = new Set(respostas.map(r => r.diagnostico_id))
          let somaNotasPonderadas = 0
          let somaPesos = 0

          diagnosticosAluno.forEach(diagId => {
            const respostasDiag = respostas.filter(r => r.diagnostico_id === diagId)
            const acertos = respostasDiag.filter(r => r.acertou === true).length
            const percentual = (acertos / 12) * 100

            const diagIndex = diagnosticos?.findIndex(d => d.id === diagId) || 0
            const peso = diagIndex === 0 ? 3 : diagIndex === 1 ? 2 : 1

            somaNotasPonderadas += percentual * peso
            somaPesos += peso
          })

          const mediaFinal = somaPesos > 0 ? somaNotasPonderadas / somaPesos : 0
          if (mediaFinal <= 40) grupoA++
        }
      }

      const percentualGrupoA = alunosIds.length > 0 ? (grupoA / alunosIds.length) * 100 : 0

      if (percentualGrupoA > 40) {
        alertasGerados.push({
          id: 'atencao-1',
          tipo: 'atencao',
          categoria: 'desempenho',
          titulo: 'Alto percentual de alunos no Grupo A',
          descricao: `${Math.round(percentualGrupoA)}% da turma está no Grupo A (Apoio), indicando que muitos alunos precisam de reforço nos pré-requisitos básicos.`,
          alunos_afetados: grupoA,
          prioridade: 'alta',
          sugestao: 'Revise o ritmo das aulas, dedique mais tempo aos conceitos fundamentais, e organize grupos de estudo colaborativo.',
          resolvido: false
        })
      }

      // ALERTA 3: Queda de desempenho
      if (diagnosticos && diagnosticos.length >= 2) {
        const ultimoDiag = diagnosticos[diagnosticos.length - 1]
        const penultimoDiag = diagnosticos[diagnosticos.length - 2]

        const { data: respostasUltimo } = await supabase
          .from('base_respostas_diagnostico')
          .select('aluno_id, acertou')
          .eq('diagnostico_id', ultimoDiag.id)
          .in('aluno_id', alunosIds)

        const { data: respostasPenultimo } = await supabase
          .from('base_respostas_diagnostico')
          .select('aluno_id, acertou')
          .eq('diagnostico_id', penultimoDiag.id)
          .in('aluno_id', alunosIds)

        if (respostasUltimo && respostasPenultimo && respostasUltimo.length > 0 && respostasPenultimo.length > 0) {
          const mediaUltimo = (respostasUltimo.filter(r => r.acertou).length / respostasUltimo.length) * 100
          const mediaPenultimo = (respostasPenultimo.filter(r => r.acertou).length / respostasPenultimo.length) * 100

          if (mediaUltimo < mediaPenultimo - 10) {
            alertasGerados.push({
              id: 'atencao-2',
              tipo: 'atencao',
              categoria: 'evolucao',
              titulo: 'Queda de desempenho detectada',
              descricao: `A turma teve queda de ${Math.round(mediaPenultimo - mediaUltimo)}% entre ${penultimoDiag.codigo} e ${ultimoDiag.codigo}.`,
              alunos_afetados: alunosIds.length,
              prioridade: 'media',
              sugestao: 'Revise os conteúdos abordados recentemente, verifique se houve mudanças na metodologia, e considere aplicar atividades de revisão.',
              resolvido: false
            })
          }
        }
      }

      // ALERTA 4: Competências com baixo desempenho
      const competencias = ['L', 'F', 'R', 'A', 'J']
      const questoesPorCompetencia: { [key: string]: number[] } = {
        L: [1, 2],
        F: [3, 4],
        R: [5, 6],
        A: [7, 8],
        J: [9, 10]
      }

      for (const comp of competencias) {
        const questoes = questoesPorCompetencia[comp]
        let totalRespostas = 0
        let totalAcertos = 0

        for (const diag of diagnosticos || []) {
          const { data: respostas } = await supabase
            .from('base_respostas_diagnostico')
            .select('acertou')
            .eq('diagnostico_id', diag.id)
            .in('aluno_id', alunosIds)
            .in('questao_numero', questoes)

          if (respostas) {
            totalRespostas += respostas.length
            totalAcertos += respostas.filter(r => r.acertou).length
          }
        }

        if (totalRespostas > 0) {
          const percentual = (totalAcertos / totalRespostas) * 100
          
          if (percentual < 40) {
            const nomeCompetencia = NOMES_COMPETENCIAS[comp] || 'esta competência'

            alertasGerados.push({
              id: `info-comp-${comp}`,
              tipo: 'informacao',
              categoria: 'pre_requisitos',
              titulo: `Competência ${comp} precisa de atenção`,
              descricao: `A turma está com ${Math.round(percentual)}% de aproveitamento em ${nomeCompetencia}.`,
              alunos_afetados: alunosIds.length,
              prioridade: 'media',
              sugestao: `Dedique aulas específicas para trabalhar ${nomeCompetencia.toLowerCase()} com atividades práticas e contextualizadas.`,
              resolvido: false
            })
          }
        }
      }

      // ALERTA 5: Diagnósticos não aplicados
      if (diagnosticos && diagnosticos.length < 3) {
        alertasGerados.push({
          id: 'info-1',
          tipo: 'informacao',
          categoria: 'frequencia',
          titulo: 'Poucos diagnósticos aplicados',
          descricao: `Apenas ${diagnosticos.length} diagnóstico(s) foi(ram) aplicado(s) até o momento. Para melhor acompanhamento, recomenda-se aplicar os 4 diagnósticos.`,
          alunos_afetados: 0,
          prioridade: 'baixa',
          sugestao: 'Programe a aplicação dos próximos diagnósticos conforme o calendário do Método BASE.',
          resolvido: false
        })
      }

      setAlertas(alertasGerados)
    } catch (error) {
      console.error('Erro ao gerar alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  const alertasFiltrados = filtroTipo === 'todos' 
    ? alertas 
    : alertas.filter(a => a.tipo === filtroTipo)

  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return {
          icon: XCircle,
          cor: 'bg-red-500',
          textoCor: 'text-red-700',
          bgCor: 'bg-red-50',
          borderCor: 'border-red-200',
          label: 'Crítico'
        }
      case 'atencao':
        return {
          icon: AlertTriangle,
          cor: 'bg-yellow-500',
          textoCor: 'text-yellow-700',
          bgCor: 'bg-yellow-50',
          borderCor: 'border-yellow-200',
          label: 'Atenção'
        }
      default:
        return {
          icon: AlertCircle,
          cor: 'bg-blue-500',
          textoCor: 'text-blue-700',
          bgCor: 'bg-blue-50',
          borderCor: 'border-blue-200',
          label: 'Informação'
        }
    }
  }

  const getCategoriaIcone = (categoria: string) => {
    switch (categoria) {
      case 'desempenho': return Target
      case 'frequencia': return Clock
      case 'pre_requisitos': return AlertCircle
      case 'evolucao': return TrendingDown
      default: return AlertCircle
    }
  }

  const contadores = {
    critico: alertas.filter(a => a.tipo === 'critico').length,
    atencao: alertas.filter(a => a.tipo === 'atencao').length,
    informacao: alertas.filter(a => a.tipo === 'informacao').length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Alertas Pedagógicos</h1>
          <p className="text-gray-600 mt-1">Situações que requerem atenção e intervenção</p>
        </div>

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
            <p className="mt-4 text-gray-600">Analisando dados e gerando alertas...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  filtroTipo === 'todos'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Users className="w-8 h-8 text-indigo-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900">{alertas.length}</p>
                <p className="text-sm text-gray-600">Total de Alertas</p>
              </button>

              <button
                onClick={() => setFiltroTipo('critico')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  filtroTipo === 'critico'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <XCircle className="w-8 h-8 text-red-600 mb-2" />
                <p className="text-3xl font-bold text-red-600">{contadores.critico}</p>
                <p className="text-sm text-gray-600">Críticos</p>
              </button>

              <button
                onClick={() => setFiltroTipo('atencao')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  filtroTipo === 'atencao'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <AlertTriangle className="w-8 h-8 text-yellow-600 mb-2" />
                <p className="text-3xl font-bold text-yellow-600">{contadores.atencao}</p>
                <p className="text-sm text-gray-600">Atenção</p>
              </button>

              <button
                onClick={() => setFiltroTipo('informacao')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  filtroTipo === 'informacao'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <AlertCircle className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-3xl font-bold text-blue-600">{contadores.informacao}</p>
                <p className="text-sm text-gray-600">Informação</p>
              </button>
            </div>

            {alertasFiltrados.length > 0 ? (
              <div className="space-y-4">
                {alertasFiltrados.map((alerta) => {
                  const tipoConfig = getTipoConfig(alerta.tipo)
                  const IconeTipo = tipoConfig.icon
                  const IconeCategoria = getCategoriaIcone(alerta.categoria)

                  return (
                    <div
                      key={alerta.id}
                      className={`${tipoConfig.bgCor} border ${tipoConfig.borderCor} rounded-lg p-6`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${tipoConfig.cor} p-3 rounded-lg flex-shrink-0`}>
                          <IconeTipo className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tipoConfig.cor} text-white`}>
                              {tipoConfig.label}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <IconeCategoria className="w-4 h-4" />
                              {alerta.categoria.replace('_', ' ')}
                            </span>
                            {alerta.alunos_afetados > 0 && (
                              <span className="flex items-center gap-1 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                {alerta.alunos_afetados} {alerta.alunos_afetados === 1 ? 'aluno' : 'alunos'}
                              </span>
                            )}
                          </div>

                          <h3 className={`text-lg font-bold ${tipoConfig.textoCor} mb-2`}>
                            {alerta.titulo}
                          </h3>
                          <p className="text-gray-700 mb-4">{alerta.descricao}</p>

                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">💡 Sugestão:</p>
                            <p className="text-sm text-gray-600">{alerta.sugestao}</p>
                          </div>
                        </div>

                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Marcar como Resolvido
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tudo em ordem!</h3>
                <p className="text-gray-600">
                  {filtroTipo === 'todos' 
                    ? 'Não há alertas pendentes para esta turma.'
                    : `Não há alertas do tipo "${getTipoConfig(filtroTipo).label}" para esta turma.`
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
