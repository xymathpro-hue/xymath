'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { Button, Card, CardContent, Badge } from '@/components/ui'

interface PageProps {
  params: {
    id: string
  }
}

interface Simulado {
  id: string
  titulo: string
  status: 'rascunho' | 'publicado' | 'encerrado'
  valor_total?: number
  questoes_ids?: string[]
  created_at: string
}

export default function PainelSimuladoPage({ params }: PageProps) {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [simulado, setSimulado] = useState<Simulado | null>(null)

  // =========================
  // CARREGAR SIMULADO
  // =========================
  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        alert('Simulado não encontrado')
        router.push('/simulados')
        return
      }

      setSimulado(data)
      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  // =========================
  // PUBLICAR
  // =========================
  const publicar = async () => {
    if (!simulado) return

    const { error } = await supabase
      .from('simulados')
      .update({ status: 'publicado' })
      .eq('id', simulado.id)

    if (error) {
      alert('Erro ao publicar')
      return
    }

    setSimulado({ ...simulado, status: 'publicado' })
  }

  if (loading) {
    return <div className="p-6">Carregando simulado...</div>
  }

  if (!simulado) {
    return null
  }

  const totalQuestoes = simulado.questoes_ids?.length || 0
  const valorTotal = simulado.valor_total ?? 10
  const valorPorQuestao = totalQuestoes > 0
    ? (valorTotal / totalQuestoes).toFixed(2)
    : '0.00'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{simulado.titulo}</h1>
        <div className="mt-2">
          {simulado.status === 'rascunho' && (
            <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
          )}
          {simulado.status === 'publicado' && (
            <Badge className="bg-green-100 text-green-800">Publicado</Badge>
          )}
          {simulado.status === 'encerrado' && (
            <Badge className="bg-gray-100 text-gray-800">Encerrado</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p><strong>Total de questões:</strong> {totalQuestoes}</p>
          <p><strong>Valor total:</strong> {valorTotal} pontos</p>
          <p><strong>Valor por questão:</strong> {valorPorQuestao} pts</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href={`/simulados/${simulado.id}/editar`}>
          <Button variant="outline">Editar questões</Button>
        </Link>

        <Link href={`/simulados/${simulado.id}/gabarito`}>
          <Button variant="outline">Ver gabarito</Button>
        </Link>

        <Link href={`/simulados/${simulado.id}/resultados`}>
          <Button variant="outline">Resultados</Button>
        </Link>

        <Link href={`/simulados/${simulado.id}/folha-respostas`}>
          <Button variant="outline">Folha de respostas</Button>
        </Link>

        {simulado.status === 'rascunho' && (
          <Button onClick={publicar} className="bg-green-600 hover:bg-green-700">
            Publicar simulado
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => router.push('/simulados')}
        >
          Voltar
        </Button>
      </div>
    </div>
  )
}
