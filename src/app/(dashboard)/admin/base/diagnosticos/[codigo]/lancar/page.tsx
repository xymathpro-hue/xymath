
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'

interface Questao {
  id: string
  numero: number
  enunciado: string
  tipo: string
  o_que_testa: string
}

interface Aluno {
  id: string
  nome: string
  respostas: { [key: string]: string }
  presente: boolean
}

export default function LancarDiagnosticoPage() {
  const params = useParams()
  const codigo = (params.codigo as string).toUpperCase()
  const searchParams = useSearchParams()
  const router = useRouter()
  const turmaId = searchParams.get('turma')
  const { usuario } = useAuth()
  const supabase = createClient()
  
  const [diagnostico, setDiagnostico] = useState<{ id: string; nome: string } | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turma, setTurma] = useState<{ id: string; nome: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [alunoAtualIndex, setAlunoAtualIndex] = useState(0)
  const [modoVisualizacao, setModoVisualizacao] = useState<'individual' | 'grid'>('grid')

  useEffect(() => {
    if (turmaId && codigo) {
      carregarDados()
    }
  }, [turmaId, codigo])

  async function carregarDados() {
    try {
      // Carregar diagnóstico
      const { data: diagData } = await supabase
        .from('base_diagnosticos')
        .select('id, nome')
        .eq('codigo', codigo)
        .single()

      if (!diagData) {
        setMessage({ type: 'error', text: 'Diagnóstico não encontrado' })
        setLoading(false)
        return
      }
      setDiagnostico(diagData)

      // Carregar questões
      const { data: questoesData } = await supabase
        .from('base_diagnostico_questoes')
        .select('id, numero, enunciado, tipo, o_que_testa')
        .eq('diagnostico_id', diagData.id)
        .order('numero')

      setQuestoes(questoesData || [])

      // Carregar turma
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('id', turmaId)
        .single()

      setTurma(turmaData)

      // Carregar alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome')

      const respostasIniciais: { [key: string]: string } = {}
      questoesData?.forEach(q => {
        respostasIniciais[`q${q.numero}`] = ''
      })

      const alunosFormatados = (alunosData || []).map(aluno => ({
        ...aluno,
        respostas: { ...respostasIniciais },
        presente: true
      }))

      setAlunos(alunosFormatados)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function atualizarResposta(alunoId: string, questao: string, valor: string) {
    setAlunos(prev => prev.map(aluno => {
      if (aluno.id === alunoId) {
        return {
          ...aluno,
          respostas: {
            ...aluno.respostas,
            [questao]: valor
          }
        }
      }
      return aluno
    }))
  }

  function togglePresenca(alunoId: string) {
    setAlunos(prev => prev.map(aluno => {
      if (aluno.id === alunoId) {
        return { ...aluno, presente: !aluno.presente }
      }
      return aluno
    }))
  }

  function calcularGrupo(respostas: { [key: string]: string }): string {
    const valores = Object.values(respostas)
    const acertos = valores.filter(v => v === 'acertou').length
    const total = valores.filter(v => v !== '').length
    
    if (total === 0) return '-'
    
    const erros = total - acertos
    if (erros >= 3) return 'A'
    if (erros >= 1) return 'B'
    return 'C'
  }

  async function salvarLancamento() {
    setSaving(true)
    setMessage(null)

    try {
      const hoje = new Date().toISOString().split('T')[0]

      // Criar a aula
      const { data: aula, error: aulaError } = await supabase
        .from('base_aulas')
        .upsert({
          turma_id: turmaId,
          usuario_id: usuario?.id,
          data_aula: hoje,
          tipo: 'diagnostico',
          diagnostico_id: diagnostico?.id,
          status: 'realizada'
        }, {
          onConflict: 'turma_id,data_aula'
        })
        .select()
        .single()

      if (aulaError) throw aulaError

      // Salvar presenças e respostas
      for (const aluno of alunos) {
        // Salvar presença
        await supabase
          .from('base_presencas')
          .upsert({
            aula_id: aula.id,
            aluno_id: aluno.id,
            presente: aluno.presente
          }, {
            onConflict: 'aula_id,aluno_id'
          })

        // Salvar respostas (só se presente)
        if (aluno.presente && questoes.length > 0) {
          for (const questao of questoes) {
            const respostaKey = `q${questao.numero}`
            const resposta = aluno.respostas[respostaKey]
            
            if (resposta) {
              await supabase
                .from('base_respostas_diagnostico')
                .upsert({
                  aula_id: aula.id,
                  aluno_id: aluno.id,
                  questao_id: questao.id,
                  resposta: resposta
                }, {
                  onConflict: 'aula_id,aluno_id,questao_id'
                })
            }
          }

          // Calcular e salvar grupo (só para D1)
          if (codigo === 'D1') {
            const grupo = calcularGrupo(aluno.respostas)
            if (grupo !== '-') {
              const bimestre = Math.ceil((new Date().getMonth() + 1) / 3)
              await supabase
                .from('base_alunos_grupo')
                .upsert({
                  aluno_id: aluno.id,
                  turma_id: turmaId,
                  ano_letivo: new Date().getFullYear(),
                  bimestre: bimestre,
                  grupo: grupo
                }, {
                  onConflict: 'aluno_id,ano_letivo,bimestre'
                })
            }
          }
        }
      }

      setMessage({ type: 'success', text: 'Lançamento salvo com sucesso!' })
      
      setTimeout(() => {
        router.push('/admin/base/diagnosticos')
      }, 2000)

    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar lançamento' })
    } finally {
      setSaving(false)
    }
  }

  const alunoAtual = alunos[alunoAtualIndex]
  const alunosPresentes = alunos.filter(a => a.presente).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!turmaId || !turma || !diagnostico) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Turma ou diagnóstico não encontrado</p>
        <Link href="/admin/base/diagnosticos" className="text-indigo-600 hover:underline mt-2 inline-block">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/base/diagnosticos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Lançar {codigo} - {diagnostico.nome}</h1>
          <p className="text-gray-500 mt-1">{turma.nome}</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-indigo-600">Total de alunos</p>
              <p className="text-2xl font-bold text-indigo-700">{alunos.length}</p>
            </div>
            <div className="h-10 w-px bg-indigo-200"></div>
            <div>
              <p className="text-sm text-indigo-600">Presentes</p>
              <p className="text-2xl font-bold text-indigo-700">{alunosPresentes}</p>
            </div>
            <div className="h-10 w-px bg-indigo-200"></div>
            <div>
              <p className="text-sm text-indigo-600">Faltaram</p>
              <p className="text-2xl font-bold text-red-600">{alunos.length - alunosPresentes}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoVisualizacao('grid')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                modoVisualizacao === 'grid' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Grade
            </button>
            <button
              onClick={() => setModoVisualizacao('individual')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                modoVisualizacao === 'individual' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Individual
            </button>
          </div>
        </div>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Modo Grade */}
      {modoVisualizacao === 'grid' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50">
                    Aluno
                  </th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-gray-700 w-20">
                    Presente
                  </th>
                  {questoes.map((q) => (
                    <th key={q.id} className="px-3 py-3 text-center text-sm font-medium text-gray-700 w-24">
                      Q{q.numero}
                    </th>
                  ))}
                  {codigo === 'D1' && (
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-700 w-20">
                      Grupo
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunos.map((aluno) => {
                  const grupo = calcularGrupo(aluno.respostas)
                  return (
                    <tr key={aluno.id} className={!aluno.presente ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {aluno.nome}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => togglePresenca(aluno.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            aluno.presente 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {aluno.presente ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                      {questoes.map((q) => (
                        <td key={q.id} className="px-3 py-3 text-center">
                          {aluno.presente ? (
                            <select
                              value={aluno.respostas[`q${q.numero}`] || ''}
                              onChange={(e) => atualizarResposta(aluno.id, `q${q.numero}`, e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">-</option>
                              <option value="acertou">✅</option>
                              <option value="parcial">⚠️</option>
                              <option value="errou">❌</option>
                            </select>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      ))}
                      {codigo === 'D1' && (
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            grupo === 'A' ? 'bg-red-100 text-red-700' :
                            grupo === 'B' ? 'bg-yellow-100 text-yellow-700' :
                            grupo === 'C' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {grupo}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modo Individual */}
      {modoVisualizacao === 'individual' && alunoAtual && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setAlunoAtualIndex(prev => Math.max(0, prev - 1))}
              disabled={alunoAtualIndex === 0}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">{alunoAtual.nome}</h3>
              <p className="text-sm text-gray-500">
                Aluno {alunoAtualIndex + 1} de {alunos.length}
              </p>
            </div>
            
            <button
              onClick={() => setAlunoAtualIndex(prev => Math.min(alunos.length - 1, prev + 1))}
              disabled={alunoAtualIndex === alunos.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-sm text-gray-600">Presença:</span>
            <button
              onClick={() => togglePresenca(alunoAtual.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                alunoAtual.presente 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {alunoAtual.presente ? '✅ Presente' : '❌ Faltou'}
            </button>
          </div>

          {alunoAtual.presente && (
            <div className="space-y-4">
              {questoes.map((q) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">Questão {q.numero}</p>
                      <p className="text-sm text-gray-500">{q.enunciado}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                        q.tipo === 'oral' ? 'bg-blue-100 text-blue-700' :
                        q.tipo === 'escrito' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {q.tipo}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {['acertou', 'parcial', 'errou'].map((valor) => (
                        <button
                          key={valor}
                          onClick={() => atualizarResposta(alunoAtual.id, `q${q.numero}`, valor)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            alunoAtual.respostas[`q${q.numero}`] === valor
                              ? valor === 'acertou' ? 'bg-green-600 text-white' :
                                valor === 'parcial' ? 'bg-yellow-500 text-white' :
                                'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {valor === 'acertou' ? '✅' : valor === 'parcial' ? '⚠️' : '❌'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legenda dos Grupos (só para D1) */}
      {codigo === 'D1' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Legenda dos Grupos</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-2xl font-bold text-red-600">A</span>
              <div>
                <p className="font-medium text-red-700">Apoio Intensivo</p>
                <p className="text-sm text-red-600">Errou 3+ questões</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-2xl font-bold text-yellow-600">B</span>
              <div>
                <p className="font-medium text-yellow-700">Adaptação</p>
                <p className="text-sm text-yellow-600">Errou 1-2 questões</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-2xl font-bold text-green-600">C</span>
              <div>
                <p className="font-medium text-green-700">Regular</p>
                <p className="text-sm text-green-600">Acertou tudo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={salvarLancamento}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>Salvar Lançamento</span>
        </button>
      </div>
    </div>
  )
          }
