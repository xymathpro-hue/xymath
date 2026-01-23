import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { calcularPontuacao } from '@/utils/pontuacao'

interface PageProps {
  params: {
    id: string
  }
}

export default async function GabaritoSimuladoPage({ params }: PageProps) {
  const supabase = await createClient()

  /* =========================
     BUSCAR SIMULADO
  ========================== */
  const { data: simulado, error: simuladoError } = await supabase
    .from('simulados')
    .select('id, titulo, valor_total')
    .eq('id', params.id)
    .single()

  if (simuladoError || !simulado) {
    notFound()
  }

  /* =========================
     BUSCAR QUESTÕES DO SIMULADO
  ========================== */
  const { data: questoes, error: questoesError } = await supabase
    .from('simulado_questoes')
    .select('id, resposta_correta, ordem')
    .eq('simulado_id', params.id)
    .order('ordem')

  if (questoesError || !questoes || questoes.length === 0) {
    notFound()
  }

  /* =========================
     PONTUAÇÃO
  ========================== */
  const { valorTotal, valorPorQuestao } = calcularPontuacao(
    simulado.valor_total ?? 10,
    questoes.length
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">GABARITO OFICIAL</h1>
        <p className="text-gray-600">{simulado.titulo}</p>

        <p className="mt-2 text-sm text-gray-700">
          Valor total:{' '}
          <strong>{valorTotal.toFixed(1)}</strong> pontos ·
          Cada questão:{' '}
          <strong>{valorPorQuestao.toFixed(2)}</strong> pts
        </p>
      </div>

      {/* Tabela do gabarito */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {questoes.map((q) => (
                <th
                  key={q.id}
                  className="border bg-gray-100 text-center text-sm font-semibold p-2"
                >
                  {q.ordem}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {questoes.map((q) => (
                <td
                  key={q.id}
                  className="border text-center text-lg font-bold p-2"
                >
                  {q.resposta_correta}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aviso */}
      <p className="text-center text-xs text-gray-500">
        Visualização exclusiva do professor · Não divulgar aos alunos
      </p>

      {/* Ações */}
      <div className="flex justify-center gap-3">
        <a
          href={`/simulados/${params.id}/editar`}
          className="rounded border px-4 py-2"
        >
          Voltar ao simulado
        </a>
      </div>

    </div>
  )
}

