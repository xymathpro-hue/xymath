'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Users, Award, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface DashboardData {
  estatisticas: {
    total_alunos: number
    distribuicao_grupos: {
      A: number
      B: number
      C: number
    }
    media_turma: number
    avaliacoes_aplicadas: number
    evolucoes: {
      subiram: number
      desceram: number
      saldo: number
    }
  }
  alertas: Array<{
    tipo: 'positivo' | 'negativo'
    titulo: string
    mensagem: string
    prioridade: string
  }>
  proximas_acoes: Array<{
    acao: string
    descricao: string
  }>
}

export default function DashboardBASE() {
  const params = useParams()
  const turmaId = params.turmaId as string
  const [bimestre, setBimestre] = useState(1)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    carregarDashboard()
  }, [turmaId, bimestre])

  async function carregarDashboard() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/dashboard?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      
      if (!response.ok) throw new Error('Erro ao carregar dashboard')
      
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  const { estatisticas, alertas, proximas_acoes } = data

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Método BASE</h1>
          <p className="text-muted-foreground">
            Acompanhamento de evolução e desempenho
          </p>
        </div>

        {/* Seletor de Bimestre */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => setBimestre(b)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                bimestre === b
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {b}º Bim
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alunos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.total_alunos}</div>
          </CardContent>
        </Card>

        {/* Média da Turma */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média BASE</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.media_turma.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.media_turma >= 7 ? 'Ótima!' : 
               estatisticas.media_turma >= 6 ? 'Boa' : 'Atenção'}
            </p>
          </CardContent>
        </Card>

        {/* Avaliações Aplicadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.avaliacoes_aplicadas}/2
            </div>
            <p className="text-xs text-muted-foreground">Mensais aplicadas</p>
          </CardContent>
        </Card>

        {/* Evolução */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evolução</CardTitle>
            {estatisticas.evolucoes.saldo >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.evolucoes.saldo > 0 ? '+' : ''}
              {estatisticas.evolucoes.saldo}
            </div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.evolucoes.subiram} ↑ · {estatisticas.evolucoes.desceram} ↓
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Grupos */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Grupo A */}
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                {estatisticas.distribuicao_grupos.A}
              </div>
              <div className="text-sm font-medium mt-2">Grupo A</div>
              <div className="text-xs text-muted-foreground">Apoio Intensivo</div>
              <div className="text-xs mt-1">
                {Math.round((estatisticas.distribuicao_grupos.A / estatisticas.total_alunos) * 100)}%
              </div>
            </div>

            {/* Grupo B */}
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                {estatisticas.distribuicao_grupos.B}
              </div>
              <div className="text-sm font-medium mt-2">Grupo B</div>
              <div className="text-xs text-muted-foreground">Adaptação</div>
              <div className="text-xs mt-1">
                {Math.round((estatisticas.distribuicao_grupos.B / estatisticas.total_alunos) * 100)}%
              </div>
            </div>

            {/* Grupo C */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                {estatisticas.distribuicao_grupos.C}
              </div>
              <div className="text-sm font-medium mt-2">Grupo C</div>
              <div className="text-xs text-muted-foreground">Regular</div>
              <div className="text-xs mt-1">
                {Math.round((estatisticas.distribuicao_grupos.C / estatisticas.total_alunos) * 100)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Alertas e Destaques</h2>
          {alertas.map((alerta, index) => (
            <Alert
              key={index}
              variant={alerta.tipo === 'positivo' ? 'default' : 'destructive'}
            >
              {alerta.tipo === 'positivo' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>{alerta.titulo}</AlertTitle>
              <AlertDescription>{alerta.mensagem}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Próximas Ações */}
      {proximas_acoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Próximas Ações Sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {proximas_acoes.map((acao, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <div className="font-medium">{acao.acao}</div>
                    <div className="text-sm text-muted-foreground">
                      {acao.descricao}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
