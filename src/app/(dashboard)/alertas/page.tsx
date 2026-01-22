'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  AlertTriangle, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  Users, Filter, RefreshCw, ChevronRight, BookOpen, FileText,
  Loader2, Bell, BellOff, Eye, Calendar
} from 'lucide-react'
import Link from 'next/link'

// ============================================================
// TIPOS
// ============================================================

type TipoAlerta = 'urgente' | 'atencao' | 'positivo' | 'info'

interface Alerta {
  id: string
  tipo: TipoAlerta
  categoria: 'nota' | 'atividade' | 'recuperacao' | 'destaque'
  titulo: string
  descricao: string
  aluno_id?: string
  aluno_nome?: string
  turma_id?: string
  turma_nome?: string
  valor?: number
  meta?: number
  data: Date
  link?: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface AlunoComNotas {
  id: string
  nome: string
  turma_id: string
  turma_nome: string
  media_geral: number
  total_atividades: number
  atividades_pendentes: number
  ultima_nota?: number
  nota_anterior?: number
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function AlertasPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [filtroTurma, setFiltroTurma] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<TipoAlerta | ''>('')
  const [mediaAprovacao, setMediaAprovacao] = useState(6.0)

  // Carregar dados e gerar alertas
  const carregarDados = useCallback(async () => {
    if (!usuario) return

    setLoading(true)
    try {
      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .order('nome')

      if (turmasData) setTurmas(turmasData)

      // Carregar configuração de média (se existir)
      const { data: configData } = await supabase
        .from('configuracao_notas')
        .select('media_aprovacao')
        .eq('usuario_id', usuario.id)
        .single()

      if (configData?.media_aprovacao) {
        setMediaAprovacao(configData.media_aprovacao)
      }

      // Carregar alunos com suas turmas
      const { data: alunosData } = await supabase
        .from('alunos')
        .select(`
          id,
          nome,
          turma_id,
          turmas (nome, ano_serie)
        `)
        .in('turma_id', turmasData?.map(t => t.id) || [])

      // Carregar notas
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('ano_letivo', new Date().getFullYear())

      // Carregar atividades
      const { data: atividadesData } = await supabase
        .from('atividades')
        .select('*')
        .eq('usuario_id', usuario.id)

      // Carregar entregas de atividades
      const { data: entregasData } = await supabase
        .from('atividade_entregas')
        .select('*')

      // Gerar alertas
      const alertasGerados: Alerta[] = []
      const agora = new Date()

      // Processar cada aluno
      for (const aluno of alunosData || []) {
        const turma = aluno.turmas as any
        const notasAluno = notasData?.filter(n => n.aluno_id === aluno.id) || []
        
        // Calcular média geral do aluno
        const notasValidas = notasAluno.filter(n => n.nota !== null && n.nota !== undefined)
        const mediaGeral = notasValidas.length > 0
          ? notasValidas.reduce((acc, n) => acc + (n.nota || 0), 0) / notasValidas.length
          : null

        if (mediaGeral !== null) {
          // URGENTE: Média muito baixa (< 4.0)
          if (mediaGeral < 4.0) {
            alertasGerados.push({
              id: `urgente-${aluno.id}`,
              tipo: 'urgente',
              categoria: 'nota',
              titulo: 'Situação crítica',
              descricao: `${aluno.nome} está com média ${mediaGeral.toFixed(1)} - precisa de atenção imediata`,
              aluno_id: aluno.id,
              aluno_nome: aluno.nome,
              turma_id: aluno.turma_id,
              turma_nome: turma?.nome || '',
              valor: mediaGeral,
              meta: mediaAprovacao,
              data: agora,
              link: `/alunos/${aluno.id}`
            })
          }
          // ATENÇÃO: Abaixo da média (4.0 - 5.9)
          else if (mediaGeral < mediaAprovacao) {
            alertasGerados.push({
              id: `atencao-${aluno.id}`,
              tipo: 'atencao',
              categoria: 'nota',
              titulo: 'Abaixo da média',
              descricao: `${aluno.nome} está com média ${mediaGeral.toFixed(1)} - precisa recuperar ${(mediaAprovacao - mediaGeral).toFixed(1)} pontos`,
              aluno_id: aluno.id,
              aluno_nome: aluno.nome,
              turma_id: aluno.turma_id,
              turma_nome: turma?.nome || '',
              valor: mediaGeral,
              meta: mediaAprovacao,
              data: agora,
              link: `/alunos/${aluno.id}`
            })
          }
          // POSITIVO: Destaque (média >= 9.0)
          else if (mediaGeral >= 9.0) {
            alertasGerados.push({
              id: `destaque-${aluno.id}`,
              tipo: 'positivo',
              categoria: 'destaque',
              titulo: 'Aluno destaque',
              descricao: `${aluno.nome} está com excelente desempenho - média ${mediaGeral.toFixed(1)}`,
              aluno_id: aluno.id,
              aluno_nome: aluno.nome,
              turma_id: aluno.turma_id,
              turma_nome: turma?.nome || '',
              valor: mediaGeral,
              data: agora,
              link: `/alunos/${aluno.id}`
            })
          }

          // Verificar recuperação (nota atual > nota anterior)
          if (notasValidas.length >= 2) {
            const notasOrdenadas = notasValidas.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const notaAtual = notasOrdenadas[0]?.nota || 0
            const notaAnterior = notasOrdenadas[1]?.nota || 0

            if (notaAtual >= mediaAprovacao && notaAnterior < mediaAprovacao) {
              alertasGerados.push({
                id: `recuperou-${aluno.id}`,
                tipo: 'positivo',
                categoria: 'recuperacao',
                titulo: 'Recuperou a média!',
                descricao: `${aluno.nome} saiu de ${notaAnterior.toFixed(1)} para ${notaAtual.toFixed(1)}`,
                aluno_id: aluno.id,
                aluno_nome: aluno.nome,
                turma_id: aluno.turma_id,
                turma_nome: turma?.nome || '',
                valor: notaAtual,
                meta: mediaAprovacao,
                data: agora,
                link: `/alunos/${aluno.id}`
              })
            }
          }
        }

        // Verificar atividades pendentes
        const atividadesTurma = atividadesData?.filter(a => a.turma_id === aluno.turma_id) || []
        const entregasAluno = entregasData?.filter(e => e.aluno_id === aluno.id) || []
        
        for (const atividade of atividadesTurma) {
          const entregou = entregasAluno.some(e => e.atividade_id === atividade.id)
          const dataLimite = new Date(atividade.data_entrega)
          const diasAtraso = Math.floor((agora.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24))

          if (!entregou && diasAtraso > 0) {
            // Só adiciona se não tiver alerta duplicado
            const alertaExistente = alertasGerados.find(
              a => a.id === `atividade-${aluno.id}-${atividade.id}`
            )
            
            if (!alertaExistente) {
              alertasGerados.push({
                id: `atividade-${aluno.id}-${atividade.id}`,
                tipo: diasAtraso > 7 ? 'urgente' : 'atencao',
                categoria: 'atividade',
                titulo: diasAtraso > 7 ? 'Atividade muito atrasada' : 'Atividade pendente',
                descricao: `${aluno.nome} não entregou "${atividade.titulo}" (${diasAtraso} dias de atraso)`,
                aluno_id: aluno.id,
                aluno_nome: aluno.nome,
                turma_id: aluno.turma_id,
                turma_nome: turma?.nome || '',
                valor: diasAtraso,
                data: dataLimite,
                link: `/atividades`
              })
            }
          }
        }
      }

      // Ordenar alertas: urgentes primeiro, depois por data
      alertasGerados.sort((a, b) => {
        const ordemTipo = { urgente: 0, atencao: 1, info: 2, positivo: 3 }
        if (ordemTipo[a.tipo] !== ordemTipo[b.tipo]) {
          return ordemTipo[a.tipo] - ordemTipo[b.tipo]
        }
        return new Date(b.data).getTime() - new Date(a.data).getTime()
      })

      setAlertas(alertasGerados)

    } catch (error) {
      console.error('Erro ao carregar alertas:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario, supabase, mediaAprovacao])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Filtrar alertas
  const alertasFiltrados = alertas.filter(alerta => {
    if (filtroTurma && alerta.turma_id !== filtroTurma) return false
    if (filtroTipo && alerta.tipo !== filtroTipo) return false
    return true
  })

  // Contadores por tipo
  const contadores = {
    urgente: alertas.filter(a => a.tipo === 'urgente').length,
    atencao: alertas.filter(a => a.tipo === 'atencao').length,
    positivo: alertas.filter(a => a.tipo === 'positivo').length,
    total: alertas.length
  }

  // Configuração de cores e ícones por tipo
  const configTipo = {
    urgente: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      badge: 'bg-red-100 text-red-700'
    },
    atencao: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: AlertCircle,
      iconColor: 'text-orange-500',
      badge: 'bg-orange-100 text-orange-700'
    },
    positivo: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      badge: 'bg-green-100 text-green-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: Bell,
      iconColor: 'text-blue-500',
      badge: 'bg-blue-100 text-blue-700'
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas Críticos</h1>
          <p className="text-gray-600">Acompanhe situações que precisam de atenção</p>
        </div>
        <Button variant="outline" onClick={carregarDados}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">{contadores.urgente}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Atenção</p>
                <p className="text-2xl font-bold text-orange-600">{contadores.atencao}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Positivos</p>
                <p className="text-2xl font-bold text-green-600">{contadores.positivo}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-blue-600">{contadores.total}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            </div>

            <select
              className="p-2 border rounded-lg text-sm"
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
            >
              <option value="">Todas as turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>

            <select
              className="p-2 border rounded-lg text-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoAlerta | '')}
            >
              <option value="">Todos os tipos</option>
              <option value="urgente">🔴 Urgentes</option>
              <option value="atencao">🟠 Atenção</option>
              <option value="positivo">🟢 Positivos</option>
            </select>

            {(filtroTurma || filtroTipo) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setFiltroTurma(''); setFiltroTipo('') }}
              >
                Limpar filtros
              </Button>
            )}

            <span className="text-sm text-gray-500 ml-auto">
              {alertasFiltrados.length} alerta(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      {alertasFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum alerta no momento
            </h3>
            <p className="text-gray-500">
              {alertas.length === 0 
                ? 'Cadastre alunos e notas para ver os alertas'
                : 'Nenhum alerta corresponde aos filtros selecionados'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertasFiltrados.map(alerta => {
            const config = configTipo[alerta.tipo]
            const Icon = config.icon

            return (
              <Card 
                key={alerta.id} 
                className={`${config.bg} ${config.border} border hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${config.bg}`}>
                      <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${config.text}`}>
                          {alerta.titulo}
                        </h3>
                        {alerta.turma_nome && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {alerta.turma_nome}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm">
                        {alerta.descricao}
                      </p>

                      {alerta.valor !== undefined && alerta.meta !== undefined && alerta.categoria === 'nota' && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${alerta.valor >= alerta.meta ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min((alerta.valor / 10) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {alerta.valor.toFixed(1)} / {alerta.meta.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {alerta.link && (
                      <Link href={alerta.link}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
