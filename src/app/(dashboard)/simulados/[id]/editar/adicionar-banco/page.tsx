import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'

interface QuestaoBanco {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e?: string
  resposta_correta: string
}

interface PageProps {
  params: {
    id: string
  }
  searchParams: {
    adicionar?: string
  }
}

export default async function AdicionarBancoPage({
  params,
  searchParams
}: PageProps) {
  const supabase = await createClient()

  /* =========================
     BUSCAR QUESTÕES DO BANCO
  ========================== */
  const { data: questoes, error } = await supabase
    .from('questoes')
    .select(`
      id,
      enunciado,
      alternativa_a,
      alternativa_b,
      alternativa_c,
      alternativa_d,
      alternativa_e,
      resposta_correta
    `)
    .order('id')

  if (error || !questoes) {
    notFound()
  }

  /* =========================
     ADICIONAR QUESTÕES AO SIMULADO
  ========================== */
  if (searchParams.adicionar) {
    const idsSelecionados = searchParams.adicionar.split(',')

    // Buscar ordem atual
    const { data: ultima } = await supabase
      .from('simulado_questoes')
      .select('ordem')
      .eq('simulado_id', params.id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single()

    let ordemInicial = ultima?.ordem ?? 0

    const questoesParaInserir = questoes
      .filter(q => idsSelecionados.includes(q.id))
      .map((q, index) => ({
        simulado_id: params.id,
        origem: 'BANCO',
        questao_banco_id: q.id,
        enunciado: q.enunciado,
        alternativa_a: q.alternativa_a,
        alternativa_b: q.alternativa_b,
        alternativa_c: q.alternativa_c,
        alternativa_d: q.alternativa_d,
        alternativa_e: q.alternativa_e,
        resposta_correta: q.resposta_correta,
        ordem: ordemInicial + index + 1
      }))

    if (questoesParaInserir.length > 0) {
      await supabase
        .from('simulado_questoes')
        .insert(questoesParaInserir)
    }

    redirect(`/simulados/${params.id}/editar`)
  }

  return (
    <div className="p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold">
          Adicionar questões do banco
        </h1>
        <p className="text-gray-600">
          Selecione as questões que deseja adicionar ao simulado
        </p>
      </div>

      <form method="GET">
        <div className="space-y-3">
          {questoes.map(q => (
            <label
              key={q.id}
              className="flex items-start gap-3 border rounded p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                name="adicionar"
                value={q.id}
                className="mt-1"
              />

              <span className="text-sm">
                {q.enunciado.replace(/<[^>]*>/g, '').slice(0, 200)}…
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Adicionar ao simulado
          </button>

          <a
            href={`/simulados/${params.id}/editar`}
            className="rounded border px-4 py-2"
          >
            Cancelar
          </a>
        </div>
      </form>

    </div>
  )
}

