import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: {
    id: string
  }
}

export default async function CriarQuestaoManualPage({ params }: PageProps) {
  const supabase = await createClient()

  /* =========================
     BUSCAR SIMULADO
  ========================== */
  const { data: simulado, error } = await supabase
    .from('simulados')
    .select('id, titulo')
    .eq('id', params.id)
    .single()

  if (error || !simulado) {
    notFound()
  }

  async function criarQuestao(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const enunciado = String(formData.get('enunciado') || '')
    const alternativa_a = String(formData.get('alternativa_a') || '')
    const alternativa_b = String(formData.get('alternativa_b') || '')
    const alternativa_c = String(formData.get('alternativa_c') || '')
    const alternativa_d = String(formData.get('alternativa_d') || '')
    const alternativa_e = String(formData.get('alternativa_e') || '')
    const resposta_correta = String(formData.get('resposta_correta') || '')

    if (
      !enunciado ||
      !alternativa_a ||
      !alternativa_b ||
      !alternativa_c ||
      !alternativa_d ||
      !resposta_correta
    ) {
      throw new Error('Campos obrigatórios não preenchidos')
    }

    // Buscar última ordem
    const { data: ultima } = await supabase
      .from('simulado_questoes')
      .select('ordem')
      .eq('simulado_id', params.id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single()

    const novaOrdem = (ultima?.ordem ?? 0) + 1

    await supabase
      .from('simulado_questoes')
      .insert({
        simulado_id: params.id,
        origem: 'MANUAL',
        questao_banco_id: null,
        enunciado,
        alternativa_a,
        alternativa_b,
        alternativa_c,
        alternativa_d,
        alternativa_e: alternativa_e || null,
        resposta_correta,
        ordem: novaOrdem
      })

    redirect(`/simulados/${params.id}/editar`)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      <div>
        <h1 className="text-2xl font-bold">
          Criar questão manual
        </h1>
        <p className="text-gray-600">
          {simulado.titulo}
        </p>
      </div>

      <form action={criarQuestao} className="space-y-4">

        <div>
          <label className="block text-sm font-medium">
            Enunciado
          </label>
          <textarea
            name="enunciado"
            rows={4}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">

          <input
            name="alternativa_a"
            placeholder="Alternativa A"
            required
            className="rounded border p-2"
          />

          <input
            name="alternativa_b"
            placeholder="Alternativa B"
            required
            className="rounded border p-2"
          />

          <input
            name="alternativa_c"
            placeholder="Alternativa C"
            required
            className="rounded border p-2"
          />

          <input
            name="alternativa_d"
            placeholder="Alternativa D"
            required
            className="rounded border p-2"
          />

          <input
            name="alternativa_e"
            placeholder="Alternativa E (opcional)"
            className="rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Resposta correta
          </label>
          <select
            name="resposta_correta"
            required
            className="mt-1 rounded border p-2"
          >
            <option value="">Selecione</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Salvar questão
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

