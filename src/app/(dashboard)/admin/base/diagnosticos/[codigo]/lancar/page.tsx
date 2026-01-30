// src/app/(dashboard)/admin/base/diagnosticos/[codigo]/lancar/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
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
  HelpCircle,
  X
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
  acertou: 'sim' | 'parcial' | 'nao' | 'branco' | 'faltou'
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

const opcoesResposta = [
  { valor: 'sim', icone: '✓', label: 'Acertou', cor: 'bg-green-500 hover:bg-green-600 text-white' },
  { valor: 'parcial', icone: '½', label: 'Parcial', cor: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { valor: 'nao', icone: '✗', label: 'Errou', cor: 'bg-red-500 hover:bg-red-600 text-white' },
  { valor: 'branco', icone: '-', label: 'Branco', cor: 'bg-gray-400 hover:bg-gray-500 text-white' },
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
  const [alunosFaltaram, setAlunosFaltaram] = useState<Set<string>>(new Set())
  const [respostas, setRespostas] = useState<Map<string, Resposta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para popup de seleção
  const [popupAberto, setPopupAberto] = useState<{alunoId: string, questao: number} | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (turmaId) {
      carregarDados()
    }
  }, [codigo, turmaId])

  // Fechar popup ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupAberto(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        const novosFaltaram = new Set<string>()
        
        respostasExistentes.forEach(r => {
          const key = `${r.aluno_id}-${r.questao_numero}`
          novasRespostas.set(key, {
            aluno_id: r.aluno_id,
            questao_numero: r.questao_numero,
            acertou: r.acertou || 'branco',
            tipo_erro: r.tipo_erro
          })
          
          // Verificar se aluno faltou (todas as respostas são 'faltou')
          if (r.acertou === 'faltou') {
            novosFaltaram.add(r.aluno_id)
          }
        })
        setRespostas(novasRespostas)
        setAlunosFaltaram(novosFaltaram)
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

  function setRespostaValue(alunoId: string, questao: number, acertou: 'sim' | 'parcial' | 'nao' | 'branco' | 'faltou', tipoErro?: string) {
    const key = getRespostaKey(alunoId, questao)
    const novasRespostas = new Map(respostas)
    novasRespostas.set(key, {
      aluno_id: alunoId,
      questao_numero: questao,
      acertou,
      tipo_erro: acertou === 'nao' ? tipoErro : undefined
    })
    setRespostas(novasRespostas)
    setPopupAberto(null)
  }

  function marcarAlunoFaltou(alunoId: string) {
    const novosFaltaram = new Set(alunosFaltaram)
    
    if (novosFaltaram.has(alunoId)) {
      // Desmarcar falta - limpar respostas
      novosFaltaram.delete(alunoId)
      const novasRespostas = new Map(respostas)
      estruturaQuestoes.forEach(q => {
        novasRespostas.delete(getRespostaKey(alunoId, q.numero))
      })
      setRespostas(novasRespostas)
    } else {
      // Marcar como faltou - setar todas as questões como 'faltou'
      novosFaltaram.add(alunoId)
      const novasRespostas = new Map(respostas)
      estruturaQuestoes.forEach(q => {
        novasRespostas.set(getRespostaKey(alunoId, q.numero), {
          aluno_id: alunoId,
          questao_numero: q.numero,
          acertou: 'faltou'
        })
      })
      setRespostas(novasRespostas)
    }
    
    setAlunosFaltaram(novosFaltaram)
  }

  function getCorResposta(acertou?: string) {
    switch (acertou) {
      case 'sim': return 'bg-green-500 text-white'
      case 'parcial': return 'bg-yellow-500 text-white'
      case 'nao': return 'bg-red-500 text-white'
      case 'branco': return 'bg-gray-400 text-white'
      case 'faltou': return 'bg-slate-600 text-white'
      default: return 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300'
    }
  }

  function getIconeResposta(acertou?: string) {
    switch (acertou) {
      case 'sim': return '✓'
      case 'parcial': return '½'
      case 'nao': return '✗'
      case 'branco': return '-'
      case 'faltou': return 'F'
      default: return '?'
    }
  }

  function calcularTotalAcertos(alunoId: string): { acertos: number, parciais: number, erros: number, brancos: number, faltou: boolean, preenchidos: number } {
    if (alunosFaltaram.has(alunoId)) {
      return { acertos: 0, parciais: 0, erros: 0, brancos: 0, faltou: true, preenchidos: 0 }
    }
    
    let acertos = 0, parciais = 0, erros = 0, brancos = 0, preenchidos = 0
    
    estruturaQuestoes.forEach(q => {
      const resp = getResposta(alunoId, q.numero)
      if (resp?.acertou === 'sim') { acertos++; preenchidos++ }
      else if (resp?.acertou === 'parcial') { parciais++; preenchidos++ }
      else if (resp?.acertou === 'nao') { erros++; preenchidos++ }
      else if (resp?.acertou === 'branco') { brancos++; preenchidos++ }
      // Se não tem resposta, não conta como preenchido
    })
    
    return { acertos, parciais, erros, brancos, faltou: false, preenchidos }
  }

  function determinarGrupo(alunoId: string): string {
    if (alunosFaltaram.has(alunoId)) return 'F'
    
    const { acertos, parciais, preenchidos } = calcularTotalAcertos(alunoId)
    
    // Se não preencheu nenhuma questão, não avaliado
    if (preenchidos === 0) return '?'
    
    const pontuacao = acertos + (parciais * 0.5)
    const percentual = (pontuacao / 10) * 100
    
    if (percentual <= 40) return 'A'
    if (percentual <= 70) return 'B'
    return 'C'
  }

  async function salvarRespostas() {
    if (!diagnostico || !turmaId) return

    setSaving(true)
    setSaveSuccess(false)
    setError(null)
    
    try {
      // Preparar dados para salvar
      const dadosParaSalvar = Array.from(respostas.values())
        .filter(r => r.acertou) // Só salvar respostas preenchidas
        .map(r => ({
          diagnostico_id: diagnostico.id,
          turma_id: turmaId,
          aluno_id: r.aluno_id,
          questao_numero: r.questao_numero,
          acertou: r.acertou,
          tipo_erro: r.tipo_erro || null
        }))

      // Deletar respostas anteriores
      const { error: deleteError } = await supabase
        .from('base_respostas_diagnostico')
        .delete()
        .eq('diagnostico_id', diagnostico.id)
        .eq('turma_id', turmaId)

      if (deleteError) {
        console.error('Erro ao deletar:', deleteError)
        throw new Error('Erro ao limpar respostas anteriores')
      }

      // Inserir novas respostas
      if (dadosParaSalvar.length > 0) {
        const { error: insertError } = await supabase
          .from('base_respostas_diagnostico')
          .insert(dadosParaSalvar)

        if (insertError) {
          console.error('Erro ao inserir:', insertError)
          throw new Error(`Erro ao salvar: ${insertError.message}`)
        }
      }

      // Atualizar grupos dos alunos (apenas os que não faltaram)
      for (const aluno of alunos) {
        if (alunosFaltaram.has(aluno.id)) continue
        
        const grupo = determinarGrupo(aluno.id)
        if (grupo === 'F') continue
        
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

      setSaveSuccess(true)
      
      // Mostrar sucesso por 2 segundos e depois redirecionar
      setTimeout(() => {
        router.push(`/admin/base/diagnosticos/${codigo.toLowerCase()}/resultados?turma=${turmaId}`)
      }, 1500)
      
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      setError(err.message || 'Erro ao salvar respostas')
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

  if (error && !diagnostico) {
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

  const alunosPresentes = alunos.filter(a => !alunosFaltaram.has(a.id))

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
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            saveSuccess 
              ? 'bg-green-600 text-white' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Salvo! Redirecionando...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Salvar e Ver Resultados</span>
            </>
          )}
        </button>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Clique na célula para selecionar:</span>
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
            <span className="w-8 h-8 rounded-lg bg-gray-400 text-white flex items-center justify-center font-bold">-</span>
            <span className="text-gray-600">Branco</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold">F</span>
            <span className="text-gray-600">Faltou</span>
          </div>
        </div>
      </div>

      {/* Tabela de lançamento */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[180px] max-w-[180px]">
                  Aluno
                </th>
                <th className="py-3 px-1 text-center font-medium text-gray-700 w-[50px]">
                  <span title="Faltou" className="text-xs text-gray-500">Falta</span>
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
                const faltou = alunosFaltaram.has(aluno.id)

                return (
                  <tr 
                    key={aluno.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      faltou ? 'bg-slate-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-2 px-2 sticky left-0 bg-inherit min-w-[180px] max-w-[180px]">
                      <span className={`font-medium text-sm block truncate ${faltou ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {aluno.nome}
                      </span>
                    </td>
                    
                    {/* Checkbox Faltou - sempre habilitado */}
                    <td className="py-2 px-1 text-center w-[50px]">
                      <button
                        onClick={() => marcarAlunoFaltou(aluno.id)}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                          faltou 
                            ? 'bg-slate-600 border-slate-600 text-white' 
                            : 'border-gray-300 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {faltou && <span className="font-bold text-sm">F</span>}
                      </button>
                    </td>
                    
                    {estruturaQuestoes.map(q => {
                      const resp = getResposta(aluno.id, q.numero)
                      const isPopupAberto = popupAberto?.alunoId === aluno.id && popupAberto?.questao === q.numero
                      
                      return (
                        <td key={q.numero} className="py-2 px-1 text-center relative">
                          <button
                            onClick={() => !faltou && setPopupAberto({ alunoId: aluno.id, questao: q.numero })}
                            disabled={faltou}
                            className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${
                              faltou 
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                                : getCorResposta(resp?.acertou)
                            }`}
                          >
                            {faltou ? 'F' : getIconeResposta(resp?.acertou)}
                          </button>
                          
                          {/* Popup de seleção */}
                          {isPopupAberto && (
                            <div 
                              ref={popupRef}
                              className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2"
                            >
                              <div className="flex gap-1">
                                {opcoesResposta.map(op => (
                                  <button
                                    key={op.valor}
                                    onClick={() => setRespostaValue(aluno.id, q.numero, op.valor as any)}
                                    className={`w-10 h-10 rounded-lg font-bold text-lg ${op.cor} transition-all`}
                                  >
                                    {op.icone}
                                  </button>
                                ))}
                              </div>
                              {/* Seta do popup */}
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"></div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    
                    <td className="py-2 px-2 text-center">
                      <span className={`font-bold ${faltou ? 'text-gray-400' : 'text-gray-900'}`}>
                        {faltou ? '-' : `${totais.acertos + totais.parciais * 0.5}/10`}
                      </span>
                    </td>
                    
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold text-white ${
                        grupo === 'F' ? 'bg-slate-500' :
                        grupo === '?' ? 'bg-gray-300 text-gray-600' :
                        grupo === 'A' ? 'bg-red-500' :
                        grupo === 'B' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}>
                        {grupo}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Resumo do Lançamento</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{alunos.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">
              {alunos.filter(a => determinarGrupo(a.id) === '?').length}
            </p>
            <p className="text-sm text-gray-500">Não avaliados</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-slate-600">{alunosFaltaram.size}</p>
            <p className="text-sm text-gray-500">Faltaram</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {alunosPresentes.filter(a => determinarGrupo(a.id) === 'A').length}
            </p>
            <p className="text-sm text-gray-500">Grupo A</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {alunosPresentes.filter(a => determinarGrupo(a.id) === 'B').length}
            </p>
            <p className="text-sm text-gray-500">Grupo B</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {alunosPresentes.filter(a => determinarGrupo(a.id) === 'C').length}
            </p>
            <p className="text-sm text-gray-500">Grupo C</p>
          </div>
        </div>
      </div>
    </div>
  )
}
