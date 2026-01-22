'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Calendar, Clock, AlertTriangle, AlertCircle, CheckCircle,
  BookOpen, FileText, Users, ChevronLeft, ChevronRight,
  Loader2, Bell, ClipboardList, TrendingUp, Coffee
} from 'lucide-react'
import Link from 'next/link'

// ============================================================
// TIPOS
// ============================================================

interface AulaHoje {
  id: string
  horario: number
  turma_id: string
  turma_nome: string
  ano_serie: string
  turno: string
}

interface AlertaResumo {
  tipo: 'urgente' | 'atencao' | 'positivo'
  quantidade: number
  descricao: string
}

interface AtividadePendente {
  id: string
  titulo: string
  turma_nome: string
  data_entrega: string
  total_alunos: number
  entregas: number
}

interface ResumoDia {
  dia: string
  diaSemana: string
  totalAulas: number
  isHoje: boolean
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function MinhaSemanaPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  
  // Dados
  const [aulasHoje, setAulasHoje] = useState<AulaHoje[]>([])
  const [alertas, setAlertas] = useState<AlertaResumo[]>([])
  const [atividadesPendentes, setAtividadesPendentes] = useState<AtividadePendente[]>([])
  const [resumoSemana, setResumoSemana] = useState<ResumoDia[]>([])
  const [estatisticas, setEstatisticas] = useState({
    totalTurmas: 0,
    totalAlunos: 0,
    atividadesParaCorrigir: 0,
    alunosSemNota: 0
  })

  // Dias da semana
  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const diasSemanaAbrev = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Obter início da semana (segunda-feira)
  const getInicioSemana = (data: Date) => {
    const d = new Date(data)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!usuario) return

    setLoading(true)
    try {
      const hoje = new Date()
      const diaSemanaHoje = hoje.getDay() // 0 = domingo, 1 = segunda...
      const diaParaQuery = diaSemanaHoje === 0 ? 7 : diaSemanaHoje // Ajustar domingo

      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)

      const turmasMap = new Map(turmasData?.map(t => [t.id, t]) || [])

      // Carregar grade de horários do dia
      const { data: gradeData } = await supabase
        .from('grade_horarios')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('dia_semana', diaParaQuery)
        .order('horario')

      // Montar aulas de hoje
      const aulas: AulaHoje[] = []
      for (const grade of gradeData || []) {
        const turma = turmasMap.get(grade.turma_id)
        if (turma) {
          aulas.push({
            id: grade.id,
            horario: grade.horario,
            turma_id: grade.turma_id,
            turma_nome: turma.nome,
            ano_serie: turma.ano_serie,
            turno: grade.turno || 'manha'
          })
        }
      }
      setAulasHoje(aulas)

      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, turma_id')
        .in('turma_id', turmasData?.map(t => t.id) || [])

      // Carregar notas para alertas
      const { data: notasData } = await supabase
        .from('notas')
        .select('aluno_id, nota')
        .eq('ano_letivo', new Date().getFullYear())

      // Carregar configuração de média
      const { data: configData } = await supabase
        .from('configuracao_notas')
        .select('media_aprovacao')
        .eq('usuario_id', usuario.id)
        .single()

      const mediaAprovacao = configData?.media_aprovacao || 6.0

      // Calcular alertas
      const alunosComMedia = new Map<string, number[]>()
      for (const nota of notasData || []) {
        if (nota.nota !== null) {
          const notas = alunosComMedia.get(nota.aluno_id) || []
          notas.push(nota.nota)
          alunosComMedia.set(nota.aluno_id, notas)
        }
      }

      let urgentes = 0
      let atencao = 0
      let destaques = 0

      alunosComMedia.forEach((notas) => {
        const media = notas.reduce((a, b) => a + b, 0) / notas.length
        if (media < 4.0) urgentes++
        else if (media < mediaAprovacao) atencao++
        else if (media >= 9.0) destaques++
      })

      setAlertas([
        { tipo: 'urgente', quantidade: urgentes, descricao: 'alunos em situação crítica' },
        { tipo: 'atencao', quantidade: atencao, descricao: 'alunos abaixo da média' },
        { tipo: 'positivo', quantidade: destaques, descricao: 'alunos destaque' }
      ])

      // Carregar atividades pendentes
      const { data: atividadesData } = await supabase
        .from('atividades')
        .select('id, titulo, turma_id, data_entrega')
        .eq('usuario_id', usuario.id)
        .gte('data_entrega', new Date().toISOString().split('T')[0])
        .order('data_entrega')
        .limit(5)

      const { data: entregasData } = await supabase
        .from('atividade_entregas')
        .select('atividade_id, aluno_id')

      const pendentes: AtividadePendente[] = []
      for (const ativ of atividadesData || []) {
        const turma = turmasMap.get(ativ.turma_id)
        const alunosTurma = alunosData?.filter(a => a.turma_id === ativ.turma_id).length || 0
        const entregasAtiv = entregasData?.filter(e => e.atividade_id === ativ.id).length || 0

        pendentes.push({
          id: ativ.id,
          titulo: ativ.titulo,
          turma_nome: turma?.nome || '',
          data_entrega: ativ.data_entrega,
          total_alunos: alunosTurma,
          entregas: entregasAtiv
        })
      }
      setAtividadesPendentes(pendentes)

      // Montar resumo da semana
      const inicioSemana = getInicioSemana(dataAtual)
      const resumo: ResumoDia[] = []

      for (let i = 0; i < 7; i++) {
        const dia = new Date(inicioSemana)
        dia.setDate(inicioSemana.getDate() + i)
        
        const diaSemana = dia.getDay()
        const diaQuery = diaSemana === 0 ? 7 : diaSemana

        // Contar aulas do dia
        const { count } = await supabase
          .from('grade_horarios')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', usuario.id)
          .eq('dia_semana', diaQuery)

        const isHoje = dia.toDateString() === hoje.toDateString()

        resumo.push({
          dia: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          diaSemana: diasSemanaAbrev[diaSemana],
          totalAulas: count || 0,
          isHoje
        })
      }
      setResumoSemana(resumo)

      // Estatísticas gerais
      const alunosSemNota = (alunosData?.length || 0) - alunosComMedia.size

      setEstatisticas({
        totalTurmas: turmasData?.length || 0,
        totalAlunos: alunosData?.length || 0,
        atividadesParaCorrigir: pendentes.reduce((acc, p) => acc + (p.total_alunos - p.entregas), 0),
        alunosSemNota
      })

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario, supabase, dataAtual])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Navegação de semana
  const semanaAnterior = () => {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() - 7)
    setDataAtual(novaData)
  }

  const proximaSemana = () => {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() + 7)
    setDataAtual(novaData)
  }

  const voltarHoje = () => {
    setDataAtual(new Date())
  }

  // Formatação
  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  const formatarDataCurta = (dataStr: string) => {
    const data = new Date(dataStr + 'T00:00:00')
    const hoje = new Date()
    const amanha = new Date(hoje)
    amanha.setDate(hoje.getDate() + 1)

    if (data.toDateString() === hoje.toDateString()) return 'Hoje'
    if (data.toDateString() === amanha.toDateString()) return 'Amanhã'
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const hoje = new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Semana</h1>
          <p className="text-gray-600 capitalize">{formatarData(hoje)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={semanaAnterior}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={voltarHoje}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={proximaSemana}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.totalTurmas}</p>
                <p className="text-sm text-gray-500">Turmas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.totalAlunos}</p>
                <p className="text-sm text-gray-500">Alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.atividadesParaCorrigir}</p>
                <p className="text-sm text-gray-500">Para corrigir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.alunosSemNota}</p>
                <p className="text-sm text-gray-500">Sem nota</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aulas de hoje */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Aulas de Hoje</h2>
                <span className="text-sm text-gray-500">
                  ({diasSemana[hoje.getDay()]})
                </span>
              </div>

              {aulasHoje.length === 0 ? (
                <div className="text-center py-8">
                  <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma aula cadastrada para hoje</p>
                  <Link href="/gestao-horarios">
                    <Button variant="outline" size="sm" className="mt-3">
                      Configurar grade horária
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {aulasHoje.map((aula) => (
                    <div 
                      key={aula.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold">{aula.horario}ª</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{aula.turma_nome}</p>
                        <p className="text-sm text-gray-500">{aula.ano_serie}</p>
                      </div>
                      <Link href={`/turmas/${aula.turma_id}`}>
                        <Button variant="ghost" size="sm">
                          Ver turma
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo da semana */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Resumo da Semana</h2>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {resumoSemana.map((dia, index) => (
                  <div 
                    key={index}
                    className={`text-center p-3 rounded-lg ${
                      dia.isHoje 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className={`text-xs font-medium ${dia.isHoje ? 'text-blue-600' : 'text-gray-500'}`}>
                      {dia.diaSemana}
                    </p>
                    <p className={`text-sm ${dia.isHoje ? 'text-blue-600' : 'text-gray-600'}`}>
                      {dia.dia}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${
                      dia.isHoje ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dia.totalAulas}
                    </p>
                    <p className="text-xs text-gray-400">aulas</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Alertas */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
                </div>
                <Link href="/alertas">
                  <Button variant="ghost" size="sm">Ver todos</Button>
                </Link>
              </div>

              <div className="space-y-3">
                {alertas.map((alerta, index) => {
                  if (alerta.quantidade === 0) return null
                  
                  const config = {
                    urgente: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
                    atencao: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: AlertCircle },
                    positivo: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle }
                  }[alerta.tipo]
                  
                  const Icon = config.icon

                  return (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} ${config.border}`}
                    >
                      <Icon className={`w-5 h-5 ${config.text}`} />
                      <div className="flex-1">
                        <span className={`font-bold ${config.text}`}>{alerta.quantidade}</span>
                        <span className={`text-sm ml-1 ${config.text}`}>{alerta.descricao}</span>
                      </div>
                    </div>
                  )
                })}

                {alertas.every(a => a.quantidade === 0) && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Tudo certo por aqui!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Atividades próximas */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Próximas Entregas</h2>
                </div>
                <Link href="/atividades">
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
              </div>

              {atividadesPendentes.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhuma atividade pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atividadesPendentes.slice(0, 4).map((ativ) => (
                    <div key={ativ.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 text-sm truncate flex-1">
                          {ativ.titulo}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          formatarDataCurta(ativ.data_entrega) === 'Hoje' 
                            ? 'bg-red-100 text-red-700'
                            : formatarDataCurta(ativ.data_entrega) === 'Amanhã'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatarDataCurta(ativ.data_entrega)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{ativ.turma_nome}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500"
                            style={{ width: `${ativ.total_alunos > 0 ? (ativ.entregas / ativ.total_alunos) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {ativ.entregas}/{ativ.total_alunos}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
