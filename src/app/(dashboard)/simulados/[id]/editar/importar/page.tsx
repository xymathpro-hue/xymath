import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: {
    id: string
  }
}

export default async function ImportarPage({ params }: PageProps) {
  const supabase = await createClient()

  const { data: simulado } = await supabase
    .from('simulados')
    .select('id, titulo')
    .eq('id', params.id)
    .single()

  if (!simulado) {
    notFound()
  }

  async function importar(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const file = formData.get('arquivo') as File

    if (!file) {
      throw new Error('Arquivo não enviado')
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

    // Cria uma questão placeholder para revisão
    await supabase.from('simulado_questoes').insert({
      simulado_id: params.id,
      origem: 'IMPORTADA',
      questao_banco_id: null,
      enunciado: `QUESTÃO IMPORTADA DE ARQUIVO (${file.name}) – editar conteúdo`,
      alternativa_a: 'A',
      alternativa_b: 'B',
      alternativa_c: 'C',
      alternativa_d: 'D',
      alternativa_e: null,
      resposta_correta: 'A',
      ordem: novaOrdem
    })

    redirect(`/simulados/${params.id}/editar`)
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">
        Importar simulado (Word / PDF)
      </h1>

      <p className="text-gray-600">
        Nesta versão, o arquivo será associado ao simulado e as questões
        poderão ser editadas manualmente em seguida.
      </p>

      <form action={importar} className="space-y-4">
        <input
          type="file"
          name="arquivo"
          accept=".docx,.pdf"
          required
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded bg-purple-600 px-4 py-2 text-white"
          >
            Importar
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
