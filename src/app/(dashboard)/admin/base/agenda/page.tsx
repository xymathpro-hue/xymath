
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface AulaAgendada {
  id: string
  data: string
  hora_inicio: string
  hora_fim: string
  titulo: string
  descricao: string
  tipo: 'diagnostico' | 'aula' | 'revisao' | 'avaliacao'
  status: 'planejada' | 'realizada' | 'cancelada'
  grupo_alvo: 'A' | 'B' | 'C' | 'TODOS'
  observacoes?: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AgendaPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [aulasAgendadas, setAulasAgendadas] = useState<AulaAgendada[]>([])
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAulas()
    }
  }, [turmaSelecionada, mesAtual, anoAtual])

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
      
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setLoading(false)
    }
  }

  const carregarAulas = async () => {
    try {
      // Aulas mockadas - no futuro virão do banco de dados
      const aulasMock: AulaAgendada[] = [
        {
          id: '1',
          data: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-05`,
          hora_inicio: '08:00',
          hora_fim: '08:50',
          titulo: 'Aplicação D1-7',
          descricao: 'Diagnóstico 1 - Números e Operações',
          tipo: 'diagnostico',
          status: 'realizada',
          grupo_alvo: 'TODOS'
        },
        {
          id: '2',
          data: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-12`,
          hora_inicio: '08:00',
          hora_fim: '08:50',
          titulo: 'Aula - Ficha Amarela',
          descricao: 'Atividades de reforço para Grupo A',
          tipo: 'aula',
          status: 'realizada',
          grupo_alvo: 'A'
        },
        {
          id: '3',
          data: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-15`,
          hora_inicio: '08:00',
          hora_fim: '08:50',
          titulo: 'Aplicação D2-7',
          descricao: 'Diagnóstico 2 - Frações e Decimais',
          tipo: 'diagnostico',
          status: 'planejada',
          grupo_alvo: 'TODOS'
        },
        {
          id: '4',
          data: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-20`,
          hora_inicio: '08:00',
          hora_fim: '08:50',
          titulo: 'Revisão - Todos os grupos',
          descricao: 'Revisão geral dos conteúdos',
          tipo: 'revisao',
          status: 'planejada',
          grupo_alvo: 'TODOS'
        }
      ]

      setAulasAgendadas(aulasMock)
    } catch (error) {
      console.error('Erro ao carregar aulas:', error)
    }
  }

  const getDiasDoMes = () => {
    const primeiroDia = new Date(anoAtual, mesAtual, 1)
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0)
    const diasNoMes = ultimoDia.getDate()
    const diaSemanaInicio = primeiroDia.getDay()

    const dias = []
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null)
    }
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      dias.push(dia)
    }

    return dias
  }

  const getAulasNoDia = (dia: number) => {
    const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return aulasAgendadas.filter(aula => aula.data === dataStr)
  }

  const mesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(anoAtual - 1)
    } else {
      setMesAtual(mesAtual - 1)
    }
  }

  const proximoMes = () => {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(anoAtual + 1)
    } else {
      setMesAtual(mesAtual + 1)
    }
  }

  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'diagnostico':
        return { cor: 'bg-purple-500', texto: 'text-purple-700', bgClaro: 'bg-purple-50', label: 'Diagnóstico' }
      case 'aula':
        return { cor: 'bg-blue-500', texto: 'text-blue-700', bgClaro: 'bg-blue-50', label: 'Aula' }
      case 'revisao':
        return { cor: 'bg-yellow-500', texto: 'text-yellow-700', bgClaro: 'bg-yellow-50', label: 'Revisão' }
      case 'avaliacao':
        return { cor: 'bg-red-500', texto: 'text-red-700', bgClaro: 'bg-red-50', label: 'Avaliação' }
      default:
        return { cor: 'bg-gray-500', texto: 'text-gray-700', bgClaro: 'bg-gray-50', label: 'Outro' }
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'realizada':
        return { icon: CheckCircle2, cor: 'text-green-600', label: 'Realizada' }
      case 'planejada':
        return { icon: Clock, cor: 'text-blue-600', label: 'Planejada' }
      case 'cancelada':
        return { icon: XCircle, cor: 'text-red-600', label: 'Cancelada' }
      default:
        return { icon: Clock, cor: 'text-gray-600', label: 'Indefinido' }
    }
  }

  const estatisticas = {
    total: aulasAgendadas.length,
    realizadas: aulasAgendadas.filter(a => a.status === 'realizada').length,
    planejadas: aulasAgendadas.filter(a => a.status === 'planejada').length,
    canceladas: aulasAgendadas.filter(a => a.status === 'cancelada').length
  }

  const dias = getDiasDoMes()
  const hoje = new Date()
  const ehHoje = (dia: number | null) => {
    if (!dia) return false
    return dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()
  }

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
          
          <h1 className="text-3xl font-bold text-gray-900">Agenda de Aulas</h1>
          <p className="text-gray-600 mt-1">Planejamento e registro das aulas do Método BASE</p>
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
            <p className="mt-4 text-gray-600">Carregando agenda...</p>
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total de Aulas</p>
                    <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Realizadas</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.realizadas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Planejadas</p>
                    <p className="text-2xl font-bold text-blue-600">{estatisticas.planejadas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Canceladas</p>
                    <p className="text-2xl font-bold text-red-600">{estatisticas.canceladas}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendário */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {MESES[mesAtual]} {anoAtual}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={mesAnterior}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={proximoMes}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMostrarModal(true)}
                    className="ml-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Nova Aula
                  </button>
                </div>
              </div>

              {/* Grid do Calendário */}
              <div className="grid grid-cols-7 gap-2">
                {/* Cabeçalho dos dias da semana */}
                {DIAS_SEMANA.map(dia => (
                  <div key={dia} className="text-center font-semibold text-gray-700 py-2">
                    {dia}
                  </div>
                ))}

                {/* Dias do mês */}
                {dias.map((dia, index) => {
                  const aulas = dia ? getAulasNoDia(dia) : []
                  const destacar = dia && ehHoje(dia)

                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-2 border rounded-lg ${
                        dia 
                          ? destacar
                            ? 'bg-indigo-50 border-indigo-500 cursor-pointer hover:shadow-md'
                            : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-100'
                      } transition-all`}
                      onClick={() => dia && setDiaSelecionado(dia)}
                    >
                      {dia && (
                        <>
                          <div className={`text-sm font-semibold mb-1 ${destacar ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {dia}
                          </div>
                          <div className="space-y-1">
                            {aulas.slice(0, 2).map(aula => {
                              const tipoConfig = getTipoConfig(aula.tipo)
                              return (
                                <div
                                  key={aula.id}
                                  className={`${tipoConfig.bgClaro} rounded px-1 py-0.5 text-xs ${tipoConfig.texto} truncate`}
                                  title={aula.titulo}
                                >
                                  {aula.titulo}
                                </div>
                              )
                            })}
                            {aulas.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{aulas.length - 2} mais
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lista de Próximas Aulas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Próximas Aulas</h2>
              
              {aulasAgendadas.filter(a => a.status === 'planejada').length > 0 ? (
                <div className="space-y-4">
                  {aulasAgendadas
                    .filter(a => a.status === 'planejada')
                    .map(aula => {
                      const tipoConfig = getTipoConfig(aula.tipo)
                      const statusConfig = getStatusConfig(aula.status)
                      const StatusIcone = statusConfig.icon

                      return (
                        <div key={aula.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`${tipoConfig.cor} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                                  {tipoConfig.label}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(aula.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  {aula.hora_inicio} - {aula.hora_fim}
                                </span>
                                {aula.grupo_alvo !== 'TODOS' && (
                                  <span className="flex items-center gap-1 text-sm text-gray-600">
                                    <Users className="w-4 h-4" />
                                    Grupo {aula.grupo_alvo}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-bold text-gray-900 mb-1">{aula.titulo}</h3>
                              <p className="text-gray-600 text-sm">{aula.descricao}</p>
                            </div>

                            <div className={`flex items-center gap-2 ${statusConfig.cor}`}>
                              <StatusIcone className="w-5 h-5" />
                              <span className="text-sm font-medium">{statusConfig.label}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhuma aula planejada no momento.</p>
                  <button
                    onClick={() => setMostrarModal(true)}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Adicionar nova aula
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de Nova Aula - Placeholder */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar Nova Aula</h3>
            <p className="text-gray-600 mb-6">
              Funcionalidade em desenvolvimento. Em breve você poderá adicionar aulas diretamente pela agenda.
            </p>
            <button
              onClick={() => setMostrarModal(false)}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
