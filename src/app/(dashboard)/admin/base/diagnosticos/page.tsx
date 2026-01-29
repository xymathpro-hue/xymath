
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users, 
  ChevronRight,
  Play,
  CheckCircle,
  Clock,
  FileText,
  Printer
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  descricao: string
  ordem: number
  tempo_estimado_min: number
}

interface TurmaBase {
  id: string
  nome: string
  ano_serie: string
  alunosCount: number
  diagnosticosAplicados: string[]
}

export default function DiagnosticosPage() {
  const supabase = createClient()
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [turmas, setTurmas] = useState<TurmaBase[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const { data: diags } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .order('ordem')

      setDiagnosticos(diags || [])

      const { data: configTurmas } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_serie
          )
        `)
        .eq('ativo', true)

      if (configTurmas) {
        const turmasData = await Promise.all(
          configTurmas.map(async (ct: any) => {
            const turma = ct.turmas
            if (!turma) return null

            const { count } = await supabase
              .from('alunos')
              .select('*', { count: 'exact', head: true })
              .eq('turma_id', turma.id)
              .eq('ativo', true)

            const { data: aulasdiag } = await supabase
              .from('base_aulas')
              .select('diagnostico_id')
              .eq('turma_id', turma.id)
              .eq('tipo', 'diagnostico')
              .eq('status', 'realizada')

            const diagIds = aulasdiag?.map(a => a.diagnostico_id).filter(Boolean) || []

            return {
              ...turma,
              alunosCount: count || 0,
              diagnosticosAplicados: diagIds
            }
          })
        )

        const turmasValidas = turmasData.filter(Boolean) as TurmaBase[]
        setTurmas(turmasValidas)
        if (turmasValidas.length > 0) {
          setTurmaSelecionada(turmasValidas[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function getDiagnosticoStatus(turma: TurmaBase, diagId: string) {
    return turma.diagnosticosAplicados.includes(diagId) ? 'aplicado' : 'pendente'
  }

  const turmaAtual = turmas.find(t => t.id === turmaSelecionada)

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
          <h1 className="text-2xl font-bold text-gray-900">Diagnósticos</h1>
          <p className="text-gray-500 mt-1">Aplicar e lançar os 4 diagnósticos do Método BASE</p>
        </div>
      </div>

      {turmas.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} - {turma.ano_serie} ({turma.alunosCount} alunos)
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-700">
            Nenhuma turma configurada para o Método BASE.{' '}
            <Link href="/admin/base/turmas" className="text-yellow-800 underline font-medium">
              Configurar turmas
            </Link>
          </p>
        </div>
      )}

      {turmaAtual && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">
            Diagnósticos - {turmaAtual.nome}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnosticos.map((diag) => {
              const status = getDiagnosticoStatus(turmaAtual, diag.id)
              const isAplicado = status === 'aplicado'

              return (
                <div
                  key={diag.id}
                  className={`bg-white rounded-xl border-2 p-6 transition-all ${
                    isAplicado 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      isAplicado 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {diag.codigo}
                    </div>
                    {isAplicado ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Clock className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {diag.nome}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {diag.descricao}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>{diag.tempo_estimado_min} minutos</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/imprimir?turma=${turmaAtual.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir</span>
                    </Link>

                    {isAplicado ? (
                      <Link
                        href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/resultados?turma=${turmaAtual.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Ver Resultados</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/lancar?turma=${turmaAtual.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Lançar Respostas</span>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Como aplicar os diagnósticos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Semana 1 - Cronograma Sugerido</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-20 font-medium">Segunda:</span>
                <span>D1 - Habilidades Fundamentais</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-20 font-medium">Terça:</span>
                <span>D2 - Raciocínio Matemático</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-20 font-medium">Quarta:</span>
                <span>D3 - Números e Operações</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-20 font-medium">Quinta:</span>
                <span>D4 - Frações, Geometria, Medidas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-20 font-medium">Sexta:</span>
                <span>Lançamento no sistema</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Dicas Importantes</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Aplique D1 primeiro para identificar quem não lê</li>
              <li>• Para Grupo A, use a versão visual dos diagnósticos</li>
              <li>• Anote observações durante a aplicação</li>
              <li>• Lance os resultados no mesmo dia se possível</li>
              <li>• O sistema calcula automaticamente os grupos</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Legenda</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-200"></div>
            <span className="text-sm text-gray-600">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Aplicado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
