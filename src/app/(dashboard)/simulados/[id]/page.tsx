'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, FileText, QrCode, Printer } from 'lucide-react'

export default function SimuladoDetalhePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  return (
    <div className="p-6 space-y-6">
      {/* VOLTAR */}
      <button
        onClick={() => router.push('/simulados')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* TÍTULO */}
      <h1 className="text-2xl font-bold">Simulado {params.id}</h1>

      {/* AÇÕES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* EDIÇÃO / VISUALIZAÇÃO */}
        <button
          onClick={() => alert('Edição do simulado — próximo passo')}
          className="flex items-center justify-center gap-2 rounded bg-gray-700 px-4 py-3 text-white"
        >
          <FileText className="w-4 h-4" />
          Editar / Visualizar
        </button>

        {/* FOLHA DE RESPOSTAS */}
        <button
          onClick={() => router.push(`/simulados/${params.id}/folha-respostas`)}
          className="flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-3 text-white"
        >
          <Printer className="w-4 h-4" />
          Folha de Respostas
        </button>

        {/* CORREÇÃO AUTOMÁTICA */}
        <button
          onClick={() => router.push(`/simulados/${params.id}/corrigir`)}
          className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-3 text-white"
        >
          <QrCode className="w-4 h-4" />
          Correção Automática
        </button>
      </div>
    </div>
  )
}
