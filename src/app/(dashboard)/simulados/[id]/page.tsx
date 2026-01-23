import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

interface PageProps {
  params: {
    id: string
  }
}

export default async function SimuladoPage({ params }: PageProps) {
  const supabase = await createClient()

  /* =========================
     BUSCAR SIMULADO
  ========================== */
  const { data: simulado, error } = await supabase
    .from('simulados')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !simulado) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">
          {simulado.titulo}
        </h1>
        <p className="text-gray-600">
          Status:{' '}
          <span className="font-semibold">
            {simulado.status}
          </span>
        </p>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`/simulados/${params.id}/editar`}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Editar simulado
        </a>

        <a
          href={`/simulados/${params.id}/gabarito`}
          className="rounded bg-gray-800 px-4 py-2 text-white"
        >
          Ver gabarito
        </a>

        <a
          href={`/simulados/${params.id}/folha-respostas`}
          className="rounded bg-purple-600 px-4 py-2 text-white"
        >
          Folha de respostas
        </a>
      </div>

      {/* Informações */}
      <div className="rounded border bg-white p-4 space-y-2">
        <p>
          <strong>Tipo de pontuação:</strong>{' '}
          {simulado.tipo_pontuacao ?? 'Padrão'}
        </p>

        <p>
          <strong>Valor total:</strong>{' '}
          {simulado.valor_total ?? 10} pontos
        </p>

        <p>
          <strong>Duração:</strong>{' '}
          {simulado.tempo_minutos ?? '--'} minutos
        </p>
      </div>

    </div>
  )
}
