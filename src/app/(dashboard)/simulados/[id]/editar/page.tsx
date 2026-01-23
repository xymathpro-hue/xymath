import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

interface QuestaoSimulado {
  id: string
  origem: 'BANCO' | 'MANUAL' | 'IMPORTADA'
  enunciado: string
  ordem: number
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarSimuladoPage({ params }: PageProps) {
  const supabase = await createClient()

  /* =========================
     BUSCAR SIMULADO
  ========================== */
  const { data: simulado, error: simuladoError } = await supabase
    .from('simulados')
    .select('id, titulo')
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
    .select('id, origem, enunciado, ordem')
    .eq('simulado_id', params.id)
    .order('ordem')

  if (questoesError || !questoes) {
    notFound()
  }

  /* =========================
     ACTIONS
  ========================== */
  async function removerQuestao(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const questaoId = String(formData.get('questao_id'))

    await supabase
      .from('simulado_questoes')
      .delete()
      .eq('id', questaoId)

    await supabase.rpc('reordenar_simulado_questoes', {
      p_simulado_id: params.id
    })

    redirect(`/simulados/${params.id}/editar`)
  }

  async function moverQuestao(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const questaoId = String(formData.get('questao_id'))
    const direcao = String(formData.get('direcao')) // up | down

    const { data: atual } = await supabase
      .from('simulado_questoes')
      .select('id, ordem')
      .eq('id', questaoId)
      .single()

    if (!atual) return

    const novaOrdem =
      direcao === 'up' ? atual.ordem - 1 : atual.ordem + 1

    const { data: outra } = await supabase
      .from('simulado_questoes')
      .select('id, ordem')
      .eq('simulado_id', params.id)
      .eq('ordem', novaOrdem)
      .single()

    if (!outra) return

    await supabase
      .from('simulado_questoes')
      .update({ ordem: atual.ordem })
      .eq('id', outra.id)

    await supabase
      .from('simulado_questoes')
      .update({ ordem: novaOrdem })
      .eq('id', atual.id)

    redirect(`/simulados/${params.id}/editar`)
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">
          Editar Simulado
        </h1>
        <p className="text-gray-600">
          {simulado.titulo}
        </p>
      </div>

      {/* Botões principais */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`/simulados/${params.id}/editar/adicionar-banco`}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          + Adicionar do banco
        </a>

        <a
          href={`/simulados/${params.id}/editar/criar-questao`}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          + Criar questão
        </a>

        <a
          href={`/simulados/${params.id}/editar/importar`}
          className="rounded bg-purple-600 px-4 py-2 text-white"
        >
          Importar Word / PDF
        </a>

        <a
          href={`/simulados/${params.id}/gabarito`}
          className="rounded bg-gray-800 px-4 py-2 text-white"
        >
          Ver gabarito
        </a>
      </div>

      {/* Lista de questões */}
      <div className="rounded border bg-white">
        <div className="border-b p-4 font-semibold">
          Questões do simulado ({questoes.length})
        </div>

        {questoes.length === 0 && (
          <p className="p-4 text-gray-500">
            Nenhuma questão adicionada ainda.
          </p>
        )}

        <ul>
          {questoes.map((q, index) => (
            <li
              key={q.id}
              className="border-b p-4 flex justify-between items-start gap-4"
            >
              <div>
                <p className="text-xs text-gray-500">
                  #{q.ordem} · Origem: {q.origem}
                </p>
                <p className="font-medium">
                  {q.enunciado.replace(/<[^>]*>/g, '').slice(0, 160)}…
                </p>
              </div>

              <div className="flex gap-2 items-center">

                {/* SUBIR */}
                <form action={moverQuestao}>
                  <input type="hidden" name="questao_id" value={q.id} />
                  <input type="hidden" name="direcao" value="up" />
                  <button
                    disabled={index === 0}
                    className="px-2 py-1 border rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                </form>

                {/* DESCER */}
                <form action={moverQuestao}>
                  <input type="hidden" name="questao_id" value={q.id} />
                  <input type="hidden" name="direcao" value="down" />
                  <button
                    disabled={index === questoes.length - 1}
                    className="px-2 py-1 border rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>

                {/* REMOVER */}
                <form action={removerQuestao}>
                  <input type="hidden" name="questao_id" value={q.id} />
                  <button className="text-sm text-red-600 hover:underline">
                    Remover
                  </button>
                </form>

              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
