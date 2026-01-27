'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Simulado {
  id: string
  titulo: string
  status: 'rascunho' | 'publicado'
  valor_total: number | null
}

export default function SimuladoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicando, setPublicando] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, status, valor_total')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        alert('Simulado não encontrado')
        router.push('/simulados')
        return
      }

      setSimulado(data)
      setLoading(false)
    }

    carregar()
  }, [params.id, router, supabase])

  const publicar = async () => {
    setPublicando(true)

    const { error } = await supabase
      .from('simulados')
      .update({ status: 'publicado' })
      .eq('id', params.id)

    setPublicando(false)

    if (error
