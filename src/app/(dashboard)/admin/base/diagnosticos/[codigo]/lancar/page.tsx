// src/app/(dashboard)/admin/base/diagnosticos/[codigo]/lancar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  XCircle,
  MinusCircle,
  AlertCircle,
  Clock,
  Users,
  HelpCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  descricao: string
  nivel: string
  ano_escolar: string
  tempo_estimado_min: number
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Resposta {
  aluno_id: string
  questao_numero: number
  acertou: 'sim' | 'parcial' | 'nao' | 'branco'
  tipo_erro?: string
}

// Estrutura das questões por competência
const estruturaQuestoes = [
  { numero: 1, competencia: 'L', nome: 'Leitura', cor: 'bg-blue-100 text-blue-700' },
  { numero: 2, competencia: 'L', nome: 'Leitura', cor: 'bg-blue-100 text-blue-700' },
  { numero: 3, competencia: 'F', nome: 'Fluência', cor: 'bg-green-100 text-green-700' },
  { numero: 4, competencia: 'F', nome: 'Fluência', cor: 'bg-green-100 text-green-700' },
  { numero: 5, competencia: 'R', nome: 'Raciocínio', cor: 'bg-yellow-100 text-yellow-700' },
  { numero: 6, competencia: 'R', nome: 'Raciocínio', cor: 'bg-yellow-100 text-yellow-700' },
  { numero: 7, competencia: 'A', nome: 'Aplicação', cor: 'bg-orange-100 text-orange-700' },
  { numero: 8, competencia: 'A', nome: 'Aplicação', cor: 'bg-orange-100 text-orange-700' },
  { numero: 9, competencia: 'J', nome: 'Justificativa', cor: 'bg-purple-100 text-purple-700' },
  { numero: 10, competencia: 'J', nome: 'Justificativa', cor: 'bg-purple-100 text-purple-700' },
]

const tiposErro = [
  { codigo: 'E1', nome: 'Leitura', descricao: 'Não entendeu o enunciado' },
  { codigo: 'E2', nome: 'Cálculo', descricao: 'Errou a conta' },
  { codigo: 'E3', nome: 'Conceito', descricao: 'Não sabe o conceito' },
  { codigo: 'E4', nome: 'Estratégia', descricao: 'Caminho errado' },
  { codigo: 'E5', nome: 'Branco', descricao: 'Não tentou' },
]

export default function LancarDiagnosticoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const codigo = (params.codigo as string).toUpperCase()
  const turmaId = searchParams.get('turma')

  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Map<string, Resposta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null)

  useEffect(() => {
    if (turmaId) {
      carregarDados()
    }
  }, [codigo, turmaId])

  async function carregarDados() {
    try {
      setLoading(true)
      setError(null)

      // Carregar diagnóstico pelo código
      const { data: diag, error: diagError } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .eq('codigo', codigo)
        .single()

      if (diagError || !diag) {
        setError(`Diagnóstico ${codigo} não encontrado`)
        setLoading(false)
        return
      }
      setDiagnostico(diag)

      // Carregar turma
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('id', turmaId)
        .single()

      if (turmaData) {
        setTurma(turmaData)
      }

      // Carregar alunos da turma
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome')

      setAlunos(alunosData || [])

      // Carregar respostas existentes
      const { data: respostasExistentes } = await supabase
        .from('base_respostas_diagnostico')
        .select('*')
        .eq('diagnostico_id', diag.id)
        .eq('turma_id', turmaId)

      if (respostasExistentes && respostasExistentes.length > 0) {
        const novasRespostas = new Map<string, Resposta>()
        respostasExistentes.forEach(r => {
          const key = `${r.aluno_id}-${r.questao_numero}`
          novasRespostas.set(key, {
            aluno_id: r.aluno_id,
            questao_numero: r.questao_numero,
            acertou: r.acertou || 'branco',
            tipo_erro: r.tipo_erro
          })
        })
        setRespostas(novasRespostas)
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function getRespostaKey(alunoId: string, questao: number): string {
    return `${alunoId}-${questao}`
  }

  function getResposta(alunoId: string, questao: number): Resposta | undefined {
    return respostas.get(getRespostaKey(alunoId, questao))
  }

  function setResposta(alunoId: string, questao: number, acertou: 'sim' | 'parcial' | 'nao' | 'branco', tipoErro?: string) {
    const key = getRespostaKey(alunoId, questao)
    const novasRespostas = new Map(respostas)
    novasRespostas.set(key, {
      aluno_id: alunoId,
      questao_numero: questao,
      acertou,
      tipo_erro: acertou === 'nao' ? tipoErro : undefined
    })
    setRespostas(novasRespostas)
  }

  function toggleResposta(alunoId: string, questao: number) {
    const atual = getResposta(alunoId, questao)
    const proximoEstado: Record<string, 'sim' | 'parcial' | 'nao' | 'branco'> = {
      'undefined': 'sim',
      'sim': 'parcial',
      'parcial': 'nao',
      'nao': 'branco',
      'branco': 'sim'
    }
    const novoEstado = proximoEstado[atual?.acertou || 'undefined']
    setResposta(alunoId, questao, novoEstado)
    
    // Se errou, expandir para mostrar tipo de erro
    if (novoEstado === 'nao') {
      setAlunoExpandido(alunoId)
    }
  }

  function getCorResposta(acertou?: string) {
    switch (acertou) {
      case 'sim': return 'bg-green-500 text-white'
      case 'parcial': return 'bg-yellow-500 text-white'
      case 'nao': return 'bg-red-500 text-white'
      case 'branco': return 'bg-gray-300 text-gray-600'
      default: return 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300'
    }
  }

  function getIconeResposta(acertou?: string) {
    switch (acertou) {
      case 'sim': return '✓'
      case 'parcial': return '½'
      case 'nao': return '✗'
      case 'branco': return '-'
      default: return '?'
    }
  }

  function calcularTotalAcertos(alunoId: string): { acertos: number, parciais: number, erros: number, brancos: number } {
    let acertos = 0, parciais = 0, erros = 0, brancos = 0
    
    estruturaQuestoes.forEach(q => {
      const resp = getResposta(alunoId, q.numero)
      if (resp?.acertou === 'sim') acertos++
      else if (resp?.acertou === 'parcial') parciais++
      else if (resp?.acertou === 'nao') erros++
      else brancos++
    })
    
    return { acertos, parciais, erros, brancos }
  }

  function determinarGrupo(alunoId: string): string {
    const { acertos, parciais } = calcularTotalAcertos(alunoId)
    const pontuacao = acertos + (parciais * 0.5)
    const percentual = (pontuacao / 10) * 100
    
    if (percentual <= 40) return 'A'
    if (percentual <= 70) return 'B'
    return 'C'
  }

  async function salvarRespostas() {
    if (!diagnostico || !turmaId) return

    setSaving(true)
    try {
      // Preparar dados para salvar
      const dadosParaSalvar = Array.from(respostas.values()).map(r => ({
        diagnostico_id: diagnostico.id,
        turma_id: turmaId,
        aluno_id: r.aluno_id,
        questao_numero: r.questao_numero,
        acertou: r.acertou,
        tipo_erro: r.tipo_erro
      }))

      // Deletar respostas anteriores
      await supabase
        .from('base_respostas_diagnostico')
        .delete()
        .eq('diagnostico_id', diagnostico.id)
        .eq('turma_id', turmaId)

      // Inserir novas respostas
      if (dadosParaSalvar.length > 0) {
        const { error: insertError } = await supabase
          .from('base_respostas_diagnostico')
          .insert(dadosParaSalvar)

        if (insertError) throw insertError
      }

      // Atualizar grupos dos alunos
      for (const aluno of alunos) {
        const grupo = determinarGrupo(aluno.id)
        const bimestre = Math.ceil((new Date().getMonth() + 1) / 3)
        
        await supabase
          .from('base_alunos_grupo')
          .upsert({
            aluno_id: aluno.id,
            turma_id: turmaId,
            ano_letivo: new Date().getFullYear(),
            bimestre,
            grupo
          }, {
            onConflict: 'aluno_id,ano_letivo,bimestre'
          })
      }

      // Redirecionar para resultados
      router.push(`/admin/base/diagnosticos/${codigo.toLowerCase()}/resultados?turma=${turmaId}`)
      
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setError('Erro ao salvar respostas')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/base/diagnosticos" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Lançar Diagnóstico</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base/diagnosticos"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lançar {diagnostico?.codigo}
            </h1>
            <p className="text-gray-500 mt-1">
              {turma?.nome} • {alunos.length} alunos
            </p>
          </div>
        </div>

        <button
          onClick={salvarRespostas}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Salvar e Ver Resultados</span>
            </>
          )}
        </button>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Clique para alternar:</span>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold">✓</span>
            <span className="text-gray-600">Acertou</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-yellow-500 text-white flex items-center justify-center font-bold">½</span>
            <span className="text-gray-600">Parcial</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold">✗</span>
            <span className="text-gray-600">Errou</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-gray-300 text-gray-600 flex items-center justify-center font-bold">-</span>
            <span className="text-gray-600">Branco</span>
          </div>
        </div>
      </div>

      {/* Cabeçalho das Questões */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[200px]">
                  Aluno
                </th>
                {estruturaQuestoes.map(q => (
                  <th key={q.numero} className="py-2 px-1 text-center min-w-[44px]">
                    <div className="flex flex-col items-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${q.cor}`}>
                        {q.competencia}
                      </span>
                      <span className="text-sm font-bold text-gray-700 mt-1">
                        Q{q.numero}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-2 text-center font-medium text-gray-700 min-w-[60px]">
                  Total
                </th>
                <th className="py-3 px-2 text-center font-medium text-gray-700 min-w-[60px]">
                  Grupo
                </th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno, idx) => {
                const totais = calcularTotalAcertos(aluno.id)
                const grupo = determinarGrupo(aluno.id)
                const temErro = Array.from(respostas.values()).some(
                  r => r.aluno_id === aluno.id && r.acertou === 'nao'
                )

                return (
                  <>
                    <tr 
                      key={aluno.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="py-2 px-4 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate max-w-[180px]">
                            {aluno.nome}
                          </span>
                          {temErro && (
                            <button
                              onClick={() => setAlunoExpandido(alunoExpandido === aluno.id ? null : aluno.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Ver/editar tipos de erro"
                            >
                              <HelpCircle className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                      {estruturaQuestoes.map(q => {
                        const resp = getResposta(aluno.id, q.numero)
                        return (
                          <td key={q.numero} className="py-2 px-1 text-center">
                            <button
                              onClick={() => toggleResposta(aluno.id, q.numero)}
                              className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${getCorResposta(resp?.acertou)}`}
                            >
                              {getIconeResposta(resp?.acertou)}
                            </button>
                          </td>
                        )
                      })}
                      <td className="py-2 px-2 text-center">
                        <span className="font-bold text-gray-900">
                          {totais.acertos + totais.parciais * 0.5}/10
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold text-white ${
                          grupo === 'A' ? 'bg-red-500' :
                          grupo === 'B' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}>
                          {grupo}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Linha expandida para tipos de erro */}
                    {alunoExpandido === aluno.id && temErro && (
                      <tr className="bg-red-50">
                        <td colSpan={13} className="py-3 px-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-red-700">Tipos de erro para {aluno.nome}:</p>
                            <div className="flex flex-wrap gap-2">
                              {estruturaQuestoes.map(q => {
                                const resp = getResposta(aluno.id, q.numero)
                                if (resp?.acertou !== 'nao') return null
                                
                                return (
                                  <div key={q.numero} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-red-200">
                                    <span className="font-medium text-gray-700">Q{q.numero}:</span>
                                    <select
                                      value={resp.tipo_erro || ''}
                                      onChange={(e) => setResposta(aluno.id, q.numero, 'nao', e.target.value)}
                                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                                    >
                                      <option value="">Selecione</option>
                                      {tiposErro.map(te => (
                                        <option key={te.codigo} value={te.codigo}>
                                          {te.codigo} - {te.nome}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Resumo do Lançamento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{alunos.length}</p>
            <p className="text-sm text-gray-500">Total de alunos</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {alunos.filter(a => determinarGrupo(a.id) === 'A').length}
            </p>
            <p className="text-sm text-gray-500">Grupo A</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {alunos.filter(a => determinarGrupo(a.id) === 'B').length}
            </p>
            <p className="text-sm text-gray-500">Grupo B</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {alunos.filter(a => determinarGrupo(a.id) === 'C').length}
            </p>
            <p className="text-sm text-gray-500">Grupo C</p>
          </div>
        </div>
      </div>
    </div>
  )
}
