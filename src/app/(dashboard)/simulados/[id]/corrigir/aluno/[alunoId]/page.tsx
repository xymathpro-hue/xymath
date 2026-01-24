'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, User, FileText } from 'lucide-react'

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Simulado {
  id: string
  titulo: string
}

export default function CorrigirAlunoPage() {
  const params = useParams<{ id: string; alunoId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Buscar aluno
        const { data: alunoData } = await supabase
          .from('alunos')
          .select('id, nome, matricula')
          .eq('id', params.alunoId)
          .single()

        if (!alunoData) throw new Error('Aluno não encontrado')

        // Buscar simulado
        const { data: simuladoData } = await supabase
          .from('simulados')
          .select('id, titulo')
          .eq('id', params.id)
          .single()

        if (!simuladoData) throw new Error('Simulado não encontrado')

        setAluno(alunoData)
        setSimulado(simuladoData)
      } catch (e) {
        setErro('Erro ao carregar dados do aluno ou simulado')
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [params.alunoId, params.id])

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  if (erro) {
    return (
      <div className="p-6 text-red-600">
        {erro}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push(`/simulados/${params.id}/corrigir`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold">Correção do Aluno</h1>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <strong>Aluno:</strong> {aluno?.nome}
        </div>

        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <strong>Simulado:</strong> {simulado?.titulo}
        </div>

        <p className="text-sm text-gray-500">
          Matrícula: {aluno?.matricula}
        </p>
      </div>

      <div className="rounded border border-dashed p-6 text-gray-500 text-center">
        📌 Próxima etap

