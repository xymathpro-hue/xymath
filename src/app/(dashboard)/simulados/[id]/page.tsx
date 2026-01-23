import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import GabaritoVisual from '@/components/simulados/GabaritoVisual'
import { calcularPontuacao } from '@/utils/pontuacao'

interface Questao {
  id: string
  enunciado: string
  resposta_correta?: string
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function SimuladoPage({ params }: PageProps) {
  // 🔴 AQUI ESTÁ A CORREÇÃO PRINCIPAL
  const supabase = await createClient()

  /* =======================
     BUSCAR SIMULADO
  ======================== */
  const { data: simulado, error: simuladoError } = await supabase
    .from('simulados')
    .select('*')
    .eq('id', params.id)
    .single()

  if (simuladoError || !simulado) {
    notFound()
  }

  /* =======================
     BUSCAR QUESTÕES
  ======================== */
  const { data: questoes, error: questoesError } = await supabase
    .from('questoes')
    .select('id, enunciado, resposta_correta')
    .in('id', simulado.questoes_ids || [])

  if (questoesError || !questoes) {
    notFound()
  }

  /* =======================
     PONTUAÇÃO
  ======================== */
  const { valorTotal, valorPorQuestao } = calcularPontuacao(
    simulado.valor_total ?? 10,
    questoes.length
  )

  return (
    <div className="space-y-6 p-6">

      {/* TÍTULO */}
      <div>
        <h1 className="text-2xl font-bold">{simulado.titulo}</h1>
        {simulado.turma && (
          <p className="text-gray-600">Turma: {simulado.turma}</p>
        )}
      </div>

      {/* PONTUAÇÃO */}
      <div className="rounded-md border bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Valor total do simulado:{' '}
          <strong>{valorTotal.toFixed(1)}</strong> pontos
        </p>
        <p className="text-sm text-gray-700">
          Valor por questão:{' '}
          <strong>{valorPorQuestao.toFixed(2)}</strong> pts
        </p>
      </div>

      {/* QUESTÕES (RESUMO) */}
      <div className="rounded-md border p-4">
        <h2 className="mb-3 text-lg font-semibold">
          Questões do simulado
        </h2>

        <ul className="space-y-2 text-sm text-gray-700">
          {questoes.map((q, index) => (
            <li key={q.id}>
              <strong>{index + 1}.</strong>{' '}
              {q.enunciado.replace(/<[^>]*>/g, '').slice(0, 120)}…
            </li>
          ))}
        </ul>
      </div>

      {/* GABARITO VISUAL */}
      <GabaritoVisual
        titulo={simulado.titulo}
        turma={simulado.turma}
        questoes={questoes}
        valorTotal={valorTotal}
      />
    </div>
  )
}
