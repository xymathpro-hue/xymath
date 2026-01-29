
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users, 
  Check, 
  Save,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'

interface Turma {
  id: string
  nome: string
  ano_serie: string
  turno: string
  ativa: boolean
  alunosCount?: number
  selecionada?: boolean
}

export default function TurmasBasePage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      const { data: todasTurmas, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('ativa', true)
        .order('nome')

      if (error) throw error

      const { data: turmasBase } = await supabase
        .from('base_turmas_config')
        .select('turma_id')
        .eq('ativo', true)

      const turmasBaseIds = new Set(turmasBase?.map(t => t.turma_id) || [])

      const turmasComDados = await Promise.all(
        (todasTurmas || []).map(async (turma) => {
          const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('turma_id', turma.id)
            .eq('ativo', true)

          return {
            ...turma,
            alunosCount: count || 0,
            selecionada: turmasBaseIds.has(turma.id)
          }
        })
      )

      setTurmas(turmasComDados)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar turmas' })
    } finally {
      setLoading(false)
    }
  }

  function toggleTurma(turmaId: string) {
    setTurmas(prev => prev.map(t => 
      t.id === turmaId ? { ...t, selecionada: !t.selecionada } : t
    ))
  }

  async function salvarConfiguracao() {
    setSaving(true)
    setMessage(null)

    try {
      const anoLetivo = new Date().getFullYear()
      const turmasSelecionadas = turmas.filter(t => t.selecionada)
      const turmasNaoSelecionadas = turmas.filter(t => !t.selecionada)

      for (const turma of turmasSelecionadas) {
        const { error } = await supabase
          .from('base_turmas_config')
          .upsert({
            turma_id: turma.id,
            usuario_id: usuario?.id,
            ano_letivo: anoLetivo,
            ativo: true
          }, {
            onConflict: 'turma_id,ano_letivo'
          })

        if (error) throw error
      }

      for (const turma of turmasNaoSelecionadas) {
        await supabase
          .from('base_turmas_config')
          .update({ ativo: false })
          .eq('turma_id', turma.id)
          .eq('ano_letivo', anoLetivo)
      }

      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' })
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' })
    } finally {
      setSaving(false)
    }
  }

  const turmasSelecionadas = turmas.filter(t => t.selecionada).length
  const totalAlunos = turmas.filter(t => t.selecionada).reduce((acc, t) => acc + (t.alunosCount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/base"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Turmas BASE</h1>
          <p className="text-gray-500 mt-1">Selecione as turmas que participarão do Método BASE</p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-indigo-600">Turmas selecionadas</p>
              <p className="text-2xl font-bold text-indigo-700">{turmasSelecionadas}</p>
            </div>
            <div className="h-10 w-px bg-indigo-200"></div>
            <div>
              <p className="text-sm text-indigo-600">Total de alunos</p>
              <p className="text-2xl font-bold text-indigo-700">{totalAlunos}</p>
            </div>
          </div>
          <button
            onClick={salvarConfiguracao}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Salvar Configuração</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Suas Turmas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Clique para selecionar/deselecionar. As turmas selecionadas terão acesso ao Método BASE.
          </p>
        </div>

        {turmas.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma turma cadastrada</p>
            <Link
              href="/turmas"
              className="inline-block mt-4 text-indigo-600 hover:underline"
            >
              Cadastrar turmas
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {turmas.map((turma) => (
              <div
                key={turma.id}
                onClick={() => toggleTurma(turma.id)}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  turma.selecionada 
                    ? 'bg-indigo-50 hover:bg-indigo-100' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    turma.selecionada ? 'bg-indigo-600' : 'bg-gray-100'
                  }`}>
                    {turma.selecionada ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${turma.selecionada ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {turma.nome}
                    </p>
                    <p className="text-sm text-gray-500">
                      {turma.ano_serie} • {turma.turno} • {turma.alunosCount} alunos
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  turma.selecionada 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {turma.selecionada ? 'Selecionada' : 'Não selecionada'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Informações Importantes</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• As turmas selecionadas terão acesso aos diagnósticos D1, D2, D3, D4</li>
          <li>• Os alunos serão classificados em Grupos A, B e C após o diagnóstico</li>
          <li>• Você poderá aplicar fichas diferenciadas (Verde, Azul, Amarela) por grupo</li>
          <li>• O sistema gerará relatórios e alertas automáticos para cada turma</li>
          <li>• Você pode adicionar ou remover turmas a qualquer momento</li>
        </ul>
      </div>
    </div>
  )
}
