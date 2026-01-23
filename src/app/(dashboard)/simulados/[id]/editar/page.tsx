import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

interface QuestaoSimulado {
  id: string
  origem: 'BANCO' | 'MANUAL' | 'IMPORTADA'
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e?: string
  resposta_correta: string
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
    .select('*')
    .eq('simulado_id', params.id)
    .order('ordem')

  if (questoesError) {
    notFound()
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

      {/* Ações */}
      <div className="flex gap-3">
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Adicionar do banco
        </button>

        <button className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          + Criar questão
        </button>
      </div>

      {/* Lista de questões */}
      <div className="rounded border bg-white">
        <div className="border-b p-4 font-semibold">
          Questões do simulado ({questoes?.length ?? 0})
        </div>

        {questoes && questoes.length === 0 && (
          <p className="p-4 text-gray-500">
            Nenhuma questão adicionada ainda.
          </p>
        )}

        <ul>
          {questoes?.map((q: QuestaoSimulado) => (
            <li
              key={q.id}
              className="border-b p-4 flex justify-between items-start gap-4"
            >
              <div>
                <p className="text-sm text-gray-500">
                  #{q.ordem} · Origem: {q.origem}
                </p>
                <p className="font-medium">
                  {q.enunciado.replace(/<[^>]*>/g, '').slice(0, 160)}…
                </p>
              </div>

              <div className="flex gap-2">
                <button className="text-sm text-blue-600 hover:underline">
                  Editar
                </button>
                <button className="text-sm text-red-600 hover:underline">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}

