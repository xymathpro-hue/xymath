'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Save, Upload, Download, Users, CheckCircle, XCircle, AlertCircle, Send, Calculator, FileText } from 'lucide-react'

interface Simulado {
  id: string
  titulo: string
  questoes_ids: string[]
  turma_id?: string
  tempo_minutos: number
  configuracoes?: any
}

interface Questao {
  id: string
  enunciado: string
  resposta_correta: string
}

interface Aluno {
  id: string
  nome: string
  numero?: number
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface RespostaSimulado {
  id?: string
  simulado_id: string
  aluno_id: string
  turma_id: string
  respostas: Record<string, string>
  acertos: number
  total_questoes: number
  nota: number | null
  origem: string
}

interface ComponenteAvaliacao {
  id: string
  nome: string
  peso: number
}

export default function SimuladoResultadosPage() {
  const { id } = useParams()
  const router = useRouter()
  const { usuario } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<RespostaSimulado[]>([])
  const [respostasEditadas, setRespostasEditadas] = useState<Record<string, RespostaSimulado>>({})
  
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [modoLancamento, setModoLancamento] = useState<'nota' | 'respostas'>('nota')
  
  // Modal exportar para notas
  const [modalExportarOpen, setModalExportarOpen] = useState(false)
  const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([])
  const [componenteSelecionado, setComponenteSelecionado] = useState<string>('')
  const [periodoSelecionado, setPeriodoSelecionado] = useState<number>(1)
  const [exportando, setExportando] = useState(false)

  const anoLetivo = new Date().getFullYear()

  const fetchData = useCallback(async () => {
    if (!usuario?.id || !id) { setLoading(false); return }

    try {
      // Buscar simulado
      const { data: simData } = await supabase
        .from('simulados')
        .select('*')
        .eq('id', id)
        .single()

      if (!simData) {
        router.push('/simulados')
        return
      }

      setSimulado(simData)

      // Buscar questões do simulado
      if (simData.questoes_ids?.length > 0) {
        const { data: questoesData } = await supabase
          .from('questoes')
          .select('id, enunciado, resposta_correta')
          .in('id', simData.questoes_ids)

        // Ordenar conforme a ordem no simulado
        const questoesOrdenadas = simData.questoes_ids
          .map((qid: string) => questoesData?.find(q => q.id === qid))
          .filter(Boolean) as Questao[]

        setQuestoes(questoesOrdenadas)
      }

      // Buscar turmas do usuário
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
        .order('nome')

      setTurmas(turmasData || [])

      // Se simulado tem turma definida, selecionar
      if (simData.turma_id) {
        setTurmaSelecionada(simData.turma_id)
      } else if (simData.configuracoes?.turmas_selecionadas?.length > 0) {
        setTurmaSelecionada(simData.configuracoes.turmas_selecionadas[0])
      }

      // Buscar componentes de avaliação
      const { data: compData } = await supabase
        .from('componentes_avaliacao')
        .select('id, nome, peso')
        .eq('usuario_id', usuario.id)
        .eq('ativo', true)
        .order('ordem')

      setComponentes(compData || [])

    } catch (e) {
      console.error('Erro:', e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, id, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Buscar alunos e respostas quando selecionar turma
  useEffect(() => {
    if (!turmaSelecionada || !id) {
      setAlunos([])
      setRespostas([])
      return
    }

    const fetchAlunosRespostas = async () => {
      // Buscar alunos da turma
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, numero')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('numero')

      setAlunos(alunosData || [])

      // Buscar respostas existentes
      const { data: respostasData } = await supabase
        .from('respostas_simulados')
        .select('*')
        .eq('simulado_id', id)
        .eq('turma_id', turmaSelecionada)

      setRespostas(respostasData || [])
      setRespostasEditadas({})
    }

    fetchAlunosRespostas()
  }, [turmaSelecionada, id, supabase])

  const getRespostaAluno = (alunoId: string): RespostaSimulado | null => {
    if (respostasEditadas[alunoId]) {
      return respostasEditadas[alunoId]
    }
    return respostas.find(r => r.aluno_id === alunoId) || null
  }

  const getNotaAluno = (alunoId: string): number | null => {
    const resp = getRespostaAluno(alunoId)
    return resp?.nota ?? null
  }

  const getAcertosAluno = (alunoId: string): number => {
    const resp = getRespostaAluno(alunoId)
    return resp?.acertos ?? 0
  }

  const handleNotaChange = (alunoId: string, valor: string) => {
    const notaNum = valor === '' ? null : Math.min(10, Math.max(0, parseFloat(valor) || 0))
    const respostaExistente = respostas.find(r => r.aluno_id === alunoId)
    
    setRespostasEditadas(prev => ({
      ...prev,
      [alunoId]: {
        id: respostaExistente?.id,
        simulado_id: id as string,
        aluno_id: alunoId,
        turma_id: turmaSelecionada,
        respostas: respostaExistente?.respostas || {},
        acertos: respostaExistente?.acertos || 0,
        total_questoes: questoes.length,
        nota: notaNum,
        origem: 'manual'
      }
    }))
  }

  const handleRespostaChange = (alunoId: string, questaoIndex: number, resposta: string) => {
    const respostaExistente = respostas.find(r => r.aluno_id === alunoId)
    const respostasAtuais = respostasEditadas[alunoId]?.respostas || respostaExistente?.respostas || {}
    
    const novasRespostas = {
      ...respostasAtuais,
      [questaoIndex + 1]: resposta.toUpperCase()
    }

    // Calcular acertos
    let acertos = 0
    questoes.forEach((q, idx) => {
      if (novasRespostas[idx + 1] === q.resposta_correta) {
        acertos++
      }
    })

    // Calcular nota (proporcional)
    const nota = questoes.length > 0 ? (acertos / questoes.length) * 10 : 0

    setRespostasEditadas(prev => ({
      ...prev,
      [alunoId]: {
        id: respostaExistente?.id,
        simulado_id: id as string,
        aluno_id: alunoId,
        turma_id: turmaSelecionada,
        respostas: novasRespostas,
        acertos,
        total_questoes: questoes.length,
        nota: Math.round(nota * 100) / 100,
        origem: 'manual'
      }
    }))
  }

  const handleSaveRespostas = async () => {
    const respostasParaSalvar = Object.values(respostasEditadas)
    if (respostasParaSalvar.length === 0) return

    setSaving(true)
    setSaveError(null)

    try {
      for (const resp of respostasParaSalvar) {
        if (resp.id) {
          // Update
          await supabase
            .from('respostas_simulados')
            .update({
              respostas: resp.respostas,
              acertos: resp.acertos,
              total_questoes: resp.total_questoes,
              nota: resp.nota,
              origem: resp.origem
            })
            .eq('id', resp.id)
        } else {
          // Insert
          await supabase
            .from('respostas_simulados')
            .insert({
              simulado_id: resp.simulado_id,
              aluno_id: resp.aluno_id,
              turma_id: resp.turma_id,
              respostas: resp.respostas,
              acertos: resp.acertos,
              total_questoes: resp.total_questoes,
              nota: resp.nota,
              origem: resp.origem
            })
        }
      }

      // Recarregar respostas
      const { data: respostasData } = await supabase
        .from('respostas_simulados')
        .select('*')
        .eq('simulado_id', id)
        .eq('turma_id', turmaSelecionada)

      setRespostas(respostasData || [])
      setRespostasEditadas({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportarNotas = async () => {
    if (!componenteSelecionado) {
      setSaveError('Selecione um componente de avaliação')
      return
    }

    setExportando(true)
    setSaveError(null)

    try {
      // Pegar todas as respostas com nota
      const todasRespostas = alunos.map(aluno => {
        const resp = getRespostaAluno(aluno.id)
        return resp
      }).filter(r => r && r.nota !== null) as RespostaSimulado[]

      for (const resp of todasRespostas) {
        // Verificar se já existe nota para este aluno/componente/período
        const { data: notaExistente } = await supabase
          .from('notas')
          .select('id')
          .eq('aluno_id', resp.aluno_id)
          .eq('componente_id', componenteSelecionado)
          .eq('periodo', periodoSelecionado)
          .eq('ano_letivo', anoLetivo)
          .single()

        if (notaExistente) {
          // Update
          await supabase
            .from('notas')
            .update({ nota: resp.nota })
            .eq('id', notaExistente.id)
        } else {
          // Insert
          await supabase
            .from('notas')
            .insert({
              aluno_id: resp.aluno_id,
              turma_id: resp.turma_id,
              componente_id: componenteSelecionado,
              periodo: periodoSelecionado,
              ano_letivo: anoLetivo,
              nota: resp.nota
            })
        }
      }

      setModalExportarOpen(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setExportando(false)
    }
  }

  // Estatísticas
  const getEstatisticas = () => {
    const respostasComNota = alunos
      .map(a => getRespostaAluno(a.id))
      .filter(r => r && r.nota !== null) as RespostaSimulado[]

    if (respostasComNota.length === 0) {
      return { media: 0, maior: 0, menor: 0, aprovados: 0, total: alunos.length }
    }

    const notas = respostasComNota.map(r => r.nota!)
    const media = notas.reduce((a, b) => a + b, 0) / notas.length
    const maior = Math.max(...notas)
    const menor = Math.min(...notas)
    const aprovados = notas.filter(n => n >= 6).length

    return {
      media: Math.round(media * 10) / 10,
      maior,
      menor,
      aprovados,
      total: alunos.length,
      responderam: respostasComNota.length
    }
  }

  const stats = getEstatisticas()

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!simulado) {
    return (
      <div className="p-6">
        <p>Simulado não encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push('/simulados')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{simulado.titulo}</h1>
          <p className="text-gray-600">Resultados e lançamento de notas</p>
        </div>
        <Button variant="outline" onClick={() => setModalExportarOpen(true)}>
          <Send className="w-4 h-4 mr-2" />Exportar p/ Notas
        </Button>
      </div>

      {/* Mensagens */}
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-600">Salvo com sucesso!</p>
        </div>
      )}

      {/* Seletor de Turma e Modo */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="">Selecione uma turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} - {t.ano_serie}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Lançamento</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModoLancamento('nota')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    modoLancamento === 'nota'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Só Nota
                </button>
                <button
                  onClick={() => setModoLancamento('respostas')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    modoLancamento === 'respostas'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Respostas
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {turmaSelecionada && alunos.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Média</p>
              <p className="text-2xl font-bold text-gray-900">{stats.media}</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Maior Nota</p>
              <p className="text-2xl font-bold text-green-600">{stats.maior}</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Menor Nota</p>
              <p className="text-2xl font-bold text-red-600">{stats.menor}</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Aprovados (≥6)</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.aprovados}/{stats.responderam || 0}</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Responderam</p>
              <p className="text-2xl font-bold text-gray-900">{stats.responderam || 0}/{stats.total}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Notas/Respostas */}
      {!turmaSelecionada ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma turma</h3>
            <p className="text-gray-500">Escolha a turma para lançar os resultados</p>
          </CardContent>
        </Card>
      ) : alunos.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum aluno</h3>
            <p className="text-gray-500">Esta turma não possui alunos cadastrados</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Botão Salvar */}
          {Object.keys(respostasEditadas).length > 0 && (
            <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <span className="text-yellow-800">
                {Object.keys(respostasEditadas).length} aluno(s) alterado(s)
              </span>
              <Button onClick={handleSaveRespostas} loading={saving}>
                <Save className="w-4 h-4 mr-2" />Salvar
              </Button>
            </div>
          )}

          <Card variant="bordered">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nº</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Aluno</th>
                    {modoLancamento === 'respostas' && questoes.map((_, idx) => (
                      <th key={idx} className="px-2 py-3 text-center text-sm font-semibold text-gray-900 w-12">
                        Q{idx + 1}
                      </th>
                    ))}
                    {modoLancamento === 'respostas' && (
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Acertos</th>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Nota</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alunos.map(aluno => {
                    const nota = getNotaAluno(aluno.id)
                    const acertos = getAcertosAluno(aluno.id)
                    const resp = getRespostaAluno(aluno.id)
                    
                    return (
                      <tr key={aluno.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{aluno.numero || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{aluno.nome}</td>
                        
                        {modoLancamento === 'respostas' && questoes.map((q, idx) => {
                          const respostaAluno = resp?.respostas?.[idx + 1] || ''
                          const correta = q.resposta_correta
                          const isCorreta = respostaAluno === correta
                          
                          return (
                            <td key={idx} className="px-1 py-2">
                              <input
                                type="text"
                                maxLength={1}
                                value={respostaAluno}
                                onChange={(e) => handleRespostaChange(aluno.id, idx, e.target.value)}
                                className={`w-10 h-10 text-center border rounded font-medium uppercase ${
                                  respostaAluno
                                    ? isCorreta
                                      ? 'bg-green-100 border-green-400 text-green-700'
                                      : 'bg-red-100 border-red-400 text-red-700'
                                    : 'border-gray-300 text-gray-900'
                                }`}
                                placeholder="-"
                              />
                            </td>
                          )
                        })}
                        
                        {modoLancamento === 'respostas' && (
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-gray-900">
                              {acertos}/{questoes.length}
                            </span>
                          </td>
                        )}
                        
                        <td className="px-4 py-3">
                          {modoLancamento === 'nota' ? (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={nota ?? ''}
                              onChange={(e) => handleNotaChange(aluno.id, e.target.value)}
                              className="w-20 px-2 py-1 text-center border rounded text-gray-900"
                              placeholder="-"
                            />
                          ) : (
                            <span className="font-bold text-lg text-gray-900">
                              {nota !== null ? nota.toFixed(1) : '-'}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          {nota !== null ? (
                            nota >= 6 ? (
                              <Badge variant="success">Aprovado</Badge>
                            ) : nota >= 4 ? (
                              <Badge variant="warning">Recuperação</Badge>
                            ) : (
                              <Badge variant="danger">Abaixo</Badge>
                            )
                          ) : (
                            <Badge variant="default">-</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Gabarito */}
          {modoLancamento === 'respostas' && (
            <Card variant="bordered" className="mt-4">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Gabarito Oficial</h4>
                <div className="flex flex-wrap gap-2">
                  {questoes.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                      <span className="text-sm text-gray-600">Q{idx + 1}:</span>
                      <span className="font-bold text-indigo-600">{q.resposta_correta}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal Exportar para Notas */}
      <Modal
        isOpen={modalExportarOpen}
        onClose={() => setModalExportarOpen(false)}
        title="Exportar para Sistema de Notas"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            As notas do simulado serão enviadas para o componente de avaliação selecionado.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Componente de Avaliação *</label>
            <select
              value={componenteSelecionado}
              onChange={(e) => setComponenteSelecionado(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="">Selecione...</option>
              {componentes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} (Peso: {c.peso})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value={1}>1º Bimestre</option>
              <option value={2}>2º Bimestre</option>
              <option value={3}>3º Bimestre</option>
              <option value={4}>4º Bimestre</option>
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{stats.responderam || 0}</strong> notas serão exportadas para o <strong>{anoLetivo}</strong>
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalExportarOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleExportarNotas} 
              loading={exportando}
              disabled={!componenteSelecionado}
            >
              <Send className="w-4 h-4 mr-2" />Exportar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
            }
