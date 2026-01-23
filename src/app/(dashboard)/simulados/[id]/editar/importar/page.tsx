import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import mammoth from 'mammoth'

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

    let textoExtraido = ''

    // ======================
    // WORD (.docx)
    // ======================
    if (file.name.endsWith('.docx')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      textoExtraido = result.value
    }

    // ======================
    // PDF (texto selecionável)
    // ======================
    if (file.name.endsWith('.pdf')) {
      throw new Error(
        'Importação de PDF será habilitada na próxima etapa'
      )
    }

    // Quebra por linhas
    const linhas = textoExtraido
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    // Importação simples: 1 questão = bloco
    let ordemAtual = 0
    const { data: ultima } = await supabase
      .from('simulado_questoes')
      .select('ordem')
      .eq('simulado_id', params.id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single()

    ordemAtual = ultima?.ordem ?? 0

    for (const linha of linhas) {
      ordemAtual++

      await supabase.from('simulado_questoes').insert({
        simulado_id: params.id,
        origem: 'IMPORTADA',
        enunciado: linha,
        alternativa_a: 'A',
        alternativa_b: 'B',
        alternativa_c: 'C',
        alternativa_d: 'D',
        alternativa_e: null,
        resposta_correta: 'A',
        ordem: ordemAtual
      })
    }

    redirect(`/simulados/${params.id}/editar`)
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">
        Importar questões (Word / PDF)
      </h1>

      <p className="text-gray-600">
        O conteúdo importado poderá ser revisado antes do uso.
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

