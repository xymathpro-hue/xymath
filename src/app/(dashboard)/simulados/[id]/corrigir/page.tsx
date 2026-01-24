'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle } from 'lucide-react'

interface QRPayload {
  s: string // simulado_id
  a: string // aluno_id
  t: string // turma_id
  m: string // matricula
}

export default function CorrigirSimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  const iniciarLeitura = async () => {
    setErro(null)
    setSucesso(null)

    const leitor = new Html5Qrcode('qr-reader')
    scannerRef.current = leitor

    try {
      await leitor.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (texto) => {
          try {
            await leitor.stop()
            setLendo(false)

            const payload = JSON.parse(texto) as QRPayload

            if (!payload.s || !payload.a || !payload.t) {
              throw new Error('QR inválido')
            }

            // 1️⃣ Validar simulado
            const { data: simulado } = await supabase
              .from('simulados')
              .select('id')
              .eq('id', payload.s)
              .single()

            if (!simulado) throw new Error('Simulado não encontrado')

            // 2️⃣ Validar aluno
            const { data: aluno } = await supabase
              .from('alunos')
              .select('id')
              .eq('id', payload.a)
              .single()

            if (!aluno) throw new Error('Aluno não encontrado')

            // 3️⃣ Validar turma
            const { data: turma } = await supabase
              .from('turmas')
              .select('id')
              .eq('id', payload.t)
              .single()

            if (!turma) throw new Error('Turma não encontrada')

            // 4️⃣ Criar ou recuperar correção
            const { data: correcaoExistente } = await supabase
              .from('correcoes_simulado')
              .select('id')
              .eq('simulado_id', payload.s)
              .eq('aluno_id', payload.a)
              .single()

            if (!correcaoExistente) {
              await supabase.from('correcoes_simulado').insert({
                simulado_id: payload.s,
                aluno_id: payload.a,
                turma_id: payload.t,
                status: 'iniciado'
              })
            }

            setSucesso(`Aluno identificado — matrícula ${payload.m}`)

            // 5️⃣ Redirecionar
            setTimeout(() => {
              router.push(
                `/simulados/${payload.s}/corrigir/aluno/${payload.a}`
              )
            }, 800)

          } catch (e) {
            console.error(e)
            setErro('QR inválido, dados incorretos ou não encontrados')
          }
        }
      )

      setLendo(true)
    } catch (e) {
      setErro('Não foi possível acessar a câmera')
    }
  }

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
        <button
          onClick={iniciarLeitura}
          disabled={lendo}
          className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {lendo ? 'Lendo QR...' : 'Ler QR Code'}
        </button>

        <div id="qr-reader" className="w-full max-w-sm" />

        {erro && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {sucesso}
          </div>
        )}
      </div>
    </div>
  )
}
