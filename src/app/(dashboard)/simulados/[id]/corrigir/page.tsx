'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import QrScanner from '@/components/QrScanner'

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [resultado, setResultado] = useState<string | null>(null)

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Correção Automática</h1>

      <div className="rounded border p-4 bg-white space-y-4">
        <QrScanner onSuccess={(texto) => setResultado(texto)} />

        {resultado && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            QR lido com sucesso
          </div>
        )}
      </div>
    </div>
  )
}
