'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  AlertTriangle, AlertCircle, CheckCircle, ChevronRight, 
  Bell, BellOff, Loader2
} from 'lucide-react'
import Link from 'next/link'

// ============================================================
// TIPOS
// ============================================================

type TipoAlerta = 'urgente' | 'atencao' | 'positivo'

interface AlertaResumo {
  id: string
  tipo: TipoAlerta
  titulo: string
  descricao: string
  turma_nome?: string
}

// ============================================================
// COMPONENTE
// ============================================================

export default function AlertasResumo() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState<AlertaResumo[]>([])
  const [contadores, setContadores] = useState({ urgente: 0, atencao: 0, positivo: 0 })

  const carregarAlertas = useCallback(async () => {
    if (!usuario) return

    setLoading(true)
    try {
      // Carregar configuração de média
      const { data: configData } = await supabase
        .from('configuracao_notas')
        .select('media_aprovacao')
        .eq('usuario_id', usuario.id)
        .single()

      const mediaAprovacao = configData?.media_aprovacao || 6.0

      // Carregar turmas do usuário
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('usuario_id', usuario.id)

      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, turma_id, turmas(nome)')
        .in('turma_id', turmasData?.map(t => t.id) || [])

      // Carregar notas do ano
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('ano_letivo', new Date().getFullYear())

      const alertasGerados: AlertaResumo[] = []
      let urgentes = 0, atencao = 0, positivos = 0

      // Processar cada aluno
      for (const aluno of alunosData || []) {
        const turma = aluno.turmas as any
        const notasAluno = notasData?.filter(n => n.aluno_id === aluno.id) || []
        
        const notasValidas = notasAluno.filter(n => n.nota !== null)
        const mediaGeral = notasValidas.length > 0
          ? notasValidas.reduce((acc, n) => acc + (n.nota || 0), 0) / notasValidas.length
          : null

        if (mediaGeral !== null) {
          if (mediaGeral < 4.0) {
            urgentes++
            if (alertasGerados.length < 5) {
              alertasGerados.push({
                id: `urgente-${aluno.id}`,
                tipo: 'urgente',
                titulo: 'Situação crítica',
                descricao: `${aluno.nome} - média ${mediaGeral.toFixed(1)}`,
                turma_nome: turma?.nome
              })
            }
          } else if (mediaGeral < mediaAprovacao) {
            atencao++
            if (alertasGerados.length < 5 && urgentes < 3) {
              alertasGerados.push({
                id: `atencao-${aluno.id}`,
                tipo: 'atencao',
                titulo: 'Abaixo da média',
                descricao: `${aluno.nome} - média ${mediaGeral.toFixed(1)}`,
                turma_nome: turma?.nome
              })
            }
          } else if (mediaGeral >= 9.0) {
            positivos++
            if (alertasGerados.length < 5 && urgentes === 0 && atencao < 2) {
              alertasGerados.push({
                id: `positivo-${aluno.id}`,
                tipo: 'positivo',
                titulo: 'Aluno destaque',
                descricao: `${aluno.nome} - média ${mediaGeral.toFixed(1)}`,
                turma_nome: turma?.nome
              })
            }
          }
        }
      }

      // Ordenar: urgentes primeiro
      alertasGerados.sort((a, b) => {
        const ordem = { urgente: 0, atencao: 1, positivo: 2 }
        return ordem[a.tipo] - ordem[b.tipo]
      })

      setAlertas(alertasGerados.slice(0, 5))
      setContadores({ urgente: urgentes, atencao, positivo: positivos })

    } catch (error) {
      console.error('Erro ao carregar alertas:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario, supabase])

  useEffect(() => {
    carregarAlertas()
  }, [carregarAlertas])

  // Configuração visual
  const configTipo = {
    urgente: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: AlertTriangle,
      iconColor: 'text-red-500'
    },
    atencao: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: AlertCircle,
      iconColor: 'text-orange-500'
    },
    positivo: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalAlertas = contadores.urgente + contadores.atencao

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Alertas</h3>
            {totalAlertas > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {totalAlertas}
              </span>
            )}
          </div>
          <Link href="/alertas">
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Contadores rápidos */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">{contadores.urgente} urgente(s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-600">{contadores.atencao} atenção</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">{contadores.positivo} destaque(s)</span>
          </div>
        </div>

        {/* Lista de alertas */}
        {alertas.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhum alerta no momento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map(alerta => {
              const config = configTipo[alerta.tipo]
              const Icon = config.icon

              return (
                <div 
                  key={alerta.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} ${config.border} border`}
                >
                  <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${config.text} truncate`}>
                      {alerta.descricao}
                    </p>
                    {alerta.turma_nome && (
                      <p className="text-xs text-gray-500">{alerta.turma_nome}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Link para ver mais */}
        {alertas.length > 0 && totalAlertas > 5 && (
          <div className="mt-4 text-center">
            <Link href="/alertas">
              <Button variant="outline" size="sm" className="w-full">
                Ver todos os {totalAlertas} alertas
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
