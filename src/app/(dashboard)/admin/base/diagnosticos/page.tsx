// src/app/(dashboard)/admin/base/diagnosticos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ClipboardCheck, 
  Users, 
  ChevronRight,
  Download,
  Play,
  CheckCircle,
  Clock,
  FileText,
  Printer,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  descricao: string
  ordem: number
  tempo_estimado_min: number
  nivel: string
  ano_escolar: string
}

interface TurmaBase {
  id: string
  nome: string
  ano_serie: string
  alunosCount: number
  diagnosticosAplicados: string[]
}

// Função para extrair o número do ano da série (ex: "7º ano" -> "7")
function extrairAnoSerie(anoSerie: string): string {
  const match = anoSerie.match(/(\d+)/)
  return match ? match[1] : ''
}

// Função para obter cor do nível
function getCorNivel(nivel: string) {
  switch (nivel) {
    case 'facil':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: '🟢 Fácil' }
    case 'medio':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: '🟡 Médio' }
    case 'dificil':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: '🔴 Difícil' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: 'N/A' }
  }
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
      // Carregar diagnósticos (todos)
      const { data: diags } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .order('ano_escolar')
        .order('ordem')

      setDiagnosticos(diags || [])

      // Carregar turmas BASE
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

            // Contar alunos
            const { count } = await supabase
              .from('alunos')
              .select('*', { count: 'exact', head: true })
              .eq('turma_id', turma.id)
              .eq('ativo', true)

            // Verificar diagnósticos aplicados (pela tabela de respostas)
            const { data: respostas } = await supabase
              .from('base_respostas_diagnostico')
              .select('diagnostico_id')
              .eq('turma_id', turma.id)

            const diagIds = [...new Set(respostas?.map(r => r.diagnostico_id).filter(Boolean) || [])]

            return {
              ...turma,
              alunosCount: count || 0,
              diagnosticosAplicados: diagIds
            }
          })
        )

        setTurmas(turmasData.filter(Boolean) as TurmaBase[])
        if (turmasData.length > 0 && turmasData[0]) {
          setTurmaSelecionada(turmasData[0].id)
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
  
  // Filtrar diagnósticos pelo ano da turma selecionada
  const anoTurma = turmaAtual ? extrairAnoSerie(turmaAtual.ano_serie) : ''
  const diagnosticosFiltrados = diagnosticos.filter(d => d.ano_escolar === anoTurma)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/base"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnósticos</h1>
          <p className="text-gray-500 mt-1">Aplicar e lançar os diagnósticos do Método BASE</p>
        </div>
      </div>

      {/* Seletor de Turma */}
      {turmas.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
          >
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} - {turma.ano_serie} ({turma.alunosCount} alunos)
              </option>
            ))}
          </select>
          
          {turmaAtual && (
            <p className="mt-2 text-sm text-indigo-600">
              Mostrando diagnósticos para o <strong>{turmaAtual.ano_serie}</strong>
            </p>
          )}
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

      {/* Lista de Diagnósticos */}
      {turmaAtual && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Diagnósticos - {turmaAtual.nome}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>3 diagnósticos</span>
              <span>•</span>
              <span>Fácil → Médio → Difícil</span>
            </div>
          </div>

          {diagnosticosFiltrados.length === 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="text-orange-700 font-medium">
                    Não há diagnósticos cadastrados para o {turmaAtual.ano_serie}
                  </p>
                  <p className="text-orange-600 text-sm mt-1">
                    Verifique se os diagnósticos D1-{anoTurma}, D2-{anoTurma}, D3-{anoTurma} existem no banco de dados.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diagnosticosFiltrados.map((diag) => {
                const status = getDiagnosticoStatus(turmaAtual, diag.id)
                const isAplicado = status === 'aplicado'
                const corNivel = getCorNivel(diag.nivel)

                return (
                  <div
                    key={diag.id}
                    className={`bg-white rounded-xl border-2 p-6 transition-all ${
                      isAplicado 
                        ? 'border-green-300 bg-green-50' 
                        : `${corNivel.border} hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                          isAplicado 
                            ? 'bg-green-100 text-green-700' 
                            : `${corNivel.bg} ${corNivel.text}`
                        }`}>
                          {diag.codigo}
                        </div>
                        <div className={`text-xs font-medium ${corNivel.text}`}>
                          {corNivel.label}
                        </div>
                      </div>
                      {isAplicado ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {diag.nome.replace(` - ${turmaAtual.ano_serie}`, '').replace(' (Fácil)', '').replace(' (Médio)', '').replace(' (Difícil)', '')}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {diag.descricao}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>{diag.tempo_estimado_min} minutos</span>
                      <span>•</span>
                      <span>12 questões</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/imprimir?turma=${turmaAtual.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir</span>
                      </Link>

                      {isAplicado ? (
                        <Link
                          href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/resultados?turma=${turmaAtual.id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Ver Resultados</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/base/diagnosticos/${diag.codigo.toLowerCase()}/lancar?turma=${turmaAtual.id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
          )}
        </div>
      )}

      {/* Estrutura dos Diagnósticos */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Estrutura de cada diagnóstico</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">12 Questões por Competência</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Q1-Q2</span>
                <span><strong>L</strong> - Leitura/Interpretação</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded">Q3-Q4</span>
                <span><strong>F</strong> - Fluência/Cálculo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Q5-Q6</span>
                <span><strong>R</strong> - Raciocínio/Compreensão</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Q7-Q8</span>
                <span><strong>A</strong> - Aplicação/Problemas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Q9-Q10</span>
                <span><strong>J</strong> - Justificativa/Conexão</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-mono bg-pink-100 text-pink-700 px-2 py-0.5 rounded">Q11-Q12</span>
                <span><strong>AV</strong> - Autoavaliação</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Tipos de Erro na Correção</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-8 font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">E1</span>
                <span>Erro de Leitura (não entendeu)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">E2</span>
                <span>Erro de Cálculo (errou conta)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">E3</span>
                <span>Erro Conceitual (não sabe)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">E4</span>
                <span>Erro de Estratégia (caminho errado)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">E5</span>
                <span>Em Branco (não tentou)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legenda de Níveis */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Legenda de Níveis</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">D1 - Fácil (Pré-requisitos)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600">D2 - Médio (Consolidação)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">D3 - Difícil (Aprofundamento)</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Aplicado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
