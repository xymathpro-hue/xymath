'use client'

import { useRouter, useParams } from 'next/navigation'

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Correção Automática</h1>

      <p className="text-gray-600">
        Módulo em reorganização. Leitor QR temporariamente desativado.
      </p>

      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="rounded bg-gray-800 px-4 py-2 text-white"
      >
        Voltar
      </button>
    </div>
  )
}
