'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Select, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Turma, Questao } from '@/types'
import { ANO_SERIE_OPTIONS, UNIDADES_TEMATICAS, DIFICULDADE_OPTIONS } from '@/lib/constants'
import { ArrowLeft, Plus, Check, X, Search, Filter, Save, GripVertical } from 'lucide-react'

export default function NovoSimuladoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { usuario } = useAuth()
  const supabase = createClient()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Se está editando, começa no step 2 (questões), senão step 1 (info)
  const [step, setStep] = useState(editId ? 2 : 1)

  // Form data
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    turma_id: '',
    tempo_minutos: 60,
    pontuacao_questao: 1.0,
    embaralhar_questoes: true,
    embaralhar_alternativas: false,
    instrucoes: '',
    cabecalho_escola: '',
    cabecalho_endereco: '',
  })

  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ ano_serie: '', unidade_tematica: '', dificuldade: '' })

  // Carregar dados
  const fetchData = useCallback(async () => {
    if (!usuario?.id) return
    try {
      const [turmasRes, questoesRes] = await Promise.all([
        supabase.from('turmas').select('*').eq('usuario_id', usuario.id).eq('ativa', true),
        supabase.from('questoes').select('*').eq('usuario_id', usuario.id).eq('ativa', true).order('created_at', { ascending: false }),
      ])
      setTurmas(turmasRes.data || [])
      setQuestoesDisponiveis(questoesRes.data || [])

      // Se editando, carregar simulado existente
      if (editId) {
        const { data: simulado } = await supabase
          .from('simulados')
          .select('*')
          .eq('id', editId)
          .eq('usuario_id', usuario.id)
          .single()
        
        if (simulado) {
          setFormData({
            titulo: simulado.titulo,
            descricao: simulado.descricao || '',
            turma_id: simulado.turma_id || '',
            tempo_minutos: simulado.tempo_minutos || 60,
            pontuacao_questao: simulado.configuracoes?.pontuacao_questao || 1.0,
            embaralhar_questoes: simulado.configuracoes?.embaralhar_questoes ?? true,
            embaralhar_alternativas: simulado.configuracoes?.embaralhar_alternativas ?? false,
            instrucoes: simulado.configuracoes?.instrucoes || '',
            cabecalho_escola: simulado.configuracoes?.cabecalho_escola || '',
            cabecalho_endereco: simulado.configuracoes?.cabecalho_endereco || '',
          })
          setQuestoesSelecionadas(simulado.questoes_ids || [])
          
          // Se veio do modal de criação (simulado recém-criado sem questões), vai direto pro step 2
          if (!simulado.questoes_ids || simulado.questoes_ids.length === 0) {
            setStep(2)
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, editId])

  useEffect(() => { fetchData() }, [fetchData])

  // Filtrar questões
  const questoesFiltradas = questoesDisponiveis.filter(q => {
    if (searchTerm && !q.enunciado.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filters.ano_serie && q.ano_serie !== filters.ano_serie) return false
    if (filters.dificuldade && q.dificuldade !== filters.dificuldade) return false
    if (filters.unidade_tematica && (q as any).unidade_tematica !== filters.unidade_tematica) return false
    return true
  })

  // Toggle questão
  const toggleQuestao = (id: string) => {
    setQuestoesSelecionadas(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  // Mover questão
  const moverQuestao = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...questoesSelecionadas]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newOrder.length) return
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
    setQuestoesSelecionadas(newOrder)
  }

  // Salvar simulado
  const handleSave = async (status: 'rascunho' | 'publicado' = 'rascunho') => {
    if (!usuario?.id || !formData.titulo || questoesSelecionadas.length === 0) return
    setSaving(true)
    try {
      const simuladoData = {
        usuario_id: usuario.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        turma_id: formData.turma_id || null,
        tempo_minutos: formData.tempo_minutos,
        questoes_ids: questoesSelecionadas,
        configuracoes: {
          embaralhar_questoes: formData.embaralhar_questoes,
          embaralhar_alternativas: formData.embaralhar_alternativas,
          pontuacao_questao: formData.pontuacao_questao,
          instrucoes: formData.instrucoes,
          cabecalho_escola: formData.cabecalho_escola,
          cabecalho_endereco: formData.cabecalho_endereco,
          mostrar_gabarito_apos: true,
          permitir_revisao: true,
        },
        status,
      }

      if (editId) {
        await supabase.from('simulados').update(simuladoData).eq('id', editId)
        router.push(`/simulados/${editId}`)
      } else {
        const { data } = await supabase.from('simulados').insert(simuladoData).select().single()
        if (data) router.push(`/simulados/${data.id}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Calcular estatísticas
  const questoesSelecionadasObj = questoesSelecionadas.map(id => questoesDisponiveis.find(q => q.id === id)).filter(Boolean) as Questao[]
  const totalPontos = questoesSelecionadas.length * formData.pontuacao_questao
  const turmaSelected = turmas.find(t => t.id === formData.turma_id)

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/simulados" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold">{editId ? 'Editar Simulado' : 'Novo Simulado'}</h1>
        {editId && formData.titulo && (
          <p className="text-gray-600 mt-1">{formData.titulo}</p>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: 'Informações' },
          { num: 2, label: 'Questões' },
          { num: 3, label: 'Revisão' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => setStep(s.num)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                step === s.num ? 'bg-indigo-600 text-white' : step > s.num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </button>
            <span className={`ml-2 font-medium ${step === s.num ? 'text-indigo-600' : 'text-gray-500'}`}>{s.label}</span>
            {i < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Informações */}
      {step === 1 && (
        <Card variant="bordered">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Input
                label="Título do Simulado *"
                placeholder="Ex: Avaliação Diagnóstica - 1º Bimestre"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
              <Select
                label="Turma (opcional)"
                options={turmas.map(t => ({ value: t.id, label: `${t.nome} - ${t.ano_serie}` }))}
                placeholder="Selecione uma turma..."
                value={formData.turma_id}
                onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Objetivo</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Descreva o objetivo deste simulado..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Input
                label="Tempo (minutos)"
                type="number"
                value={formData.tempo_minutos}
                onChange={(e) => setFormData({ ...formData, tempo_minutos: parseInt(e.target.value) || 60 })}
              />
              <Input
                label="Pontos por questão"
                type="number"
                step="0.1"
                value={formData.pontuacao_questao}
                onChange={(e) => setFormData({ ...formData, pontuacao_questao: parseFloat(e.target.value) || 1 })}
              />
              <div className="flex flex-col justify-end">
                <p className="text-sm text-gray-600">Total estimado:</p>
                <p className="text-xl font-bold text-indigo-600">{totalPontos.toFixed(1)} pontos</p>
                <p className="text-xs text-gray-500">({questoesSelecionadas.length} questões)</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Cabeçalho do Documento (editável no Word)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Nome da Escola"
                  placeholder="Ex: Escola Municipal João da Silva"
                  value={formData.cabecalho_escola}
                  onChange={(e) => setFormData({ ...formData, cabecalho_escola: e.target.value })}
                />
                <Input
                  label="Endereço"
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  value={formData.cabecalho_endereco}
                  onChange={(e) => setFormData({ ...formData, cabecalho_endereco: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Configurações</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.embaralhar_questoes}
                    onChange={(e) => setFormData({ ...formData, embaralhar_questoes: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                  />
                  <span>Embaralhar ordem das questões para cada aluno</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.embaralhar_alternativas}
                    onChange={(e) => setFormData({ ...formData, embaralhar_alternativas: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                  />
                  <span>Embaralhar ordem das alternativas</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!formData.titulo}>
                Próximo: Selecionar Questões
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questões */}
      {step === 2 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Lista de questões disponíveis */}
          <Card variant="bordered">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Banco de Questões ({questoesFiltradas.length})</h3>
              
              {/* Filtros */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    options={ANO_SERIE_OPTIONS}
                    placeholder="Ano"
                    value={filters.ano_serie}
                    onChange={(e) => setFilters({ ...filters, ano_serie: e.target.value })}
                  />
                  <Select
                    options={UNIDADES_TEMATICAS}
                    placeholder="Unidade"
                    value={filters.unidade_tematica}
                    onChange={(e) => setFilters({ ...filters, unidade_tematica: e.target.value })}
                  />
                  <Select
                    options={DIFICULDADE_OPTIONS}
                    placeholder="Dificuldade"
                    value={filters.dificuldade}
                    onChange={(e) => setFilters({ ...filters, dificuldade: e.target.value })}
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {questoesFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma questão encontrada</p>
                    <p className="text-sm mt-1">Ajuste os filtros ou cadastre questões no banco</p>
                  </div>
                ) : (
                  questoesFiltradas.map(q => {
                    const isSelected = questoesSelecionadas.includes(q.id)
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestao(q.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-1 mb-1 flex-wrap">
                              <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                              <Badge className="text-xs">{q.dificuldade}</Badge>
                              {(q as any).habilidade_codigo && <Badge variant="default" className="text-xs">{(q as any).habilidade_codigo}</Badge>}
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{q.enunciado}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Questões selecionadas */}
          <Card variant="bordered">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Questões Selecionadas ({questoesSelecionadas.length})</h3>
                <span className="text-sm text-indigo-600 font-medium">{totalPontos.toFixed(1)} pts</span>
              </div>

              {questoesSelecionadas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nenhuma questão selecionada</p>
                  <p className="text-sm">Clique nas questões ao lado para adicionar</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {questoesSelecionadas.map((id, index) => {
                    const q = questoesDisponiveis.find(x => x.id === id)
                    if (!q) return null
                    return (
                      <div key={id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg group">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moverQuestao(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            onClick={() => moverQuestao(index, 'down')}
                            disabled={index === questoesSelecionadas.length - 1}
                            className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>
                        <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="info" className="text-xs">{q.ano_serie}</Badge>
                            <Badge className="text-xs">{q.dificuldade}</Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleQuestao(id)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
          <Button onClick={() => setStep(3)} disabled={questoesSelecionadas.length === 0}>
            Próximo: Revisão
          </Button>
        </div>
      )}

      {/* Step 3: Revisão */}
      {step === 3 && (
        <Card variant="bordered">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-6">Revisão do Simulado</h3>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Título</p>
                  <p className="font-medium text-lg">{formData.titulo}</p>
                </div>
                {formData.descricao && (
                  <div>
                    <p className="text-sm text-gray-500">Descrição</p>
                    <p className="text-gray-700">{formData.descricao}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Turma</p>
                  <p className="font-medium">{turmaSelected ? `${turmaSelected.nome} - ${turmaSelected.ano_serie}` : 'Não definida'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tempo</p>
                    <p className="font-medium">{formData.tempo_minutos} minutos</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pontuação</p>
                    <p className="font-medium">{formData.pontuacao_questao} pts/questão</p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-6">
                <h4 className="font-semibold text-indigo-900 mb-4">Resumo</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Total de questões:</span>
                    <span className="font-semibold text-indigo-900">{questoesSelecionadas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Pontuação total:</span>
                    <span className="font-semibold text-indigo-900">{totalPontos.toFixed(1)} pontos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Fáceis:</span>
                    <span className="font-semibold">{questoesSelecionadasObj.filter(q => q.dificuldade === 'facil').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Médias:</span>
                    <span className="font-semibold">{questoesSelecionadasObj.filter(q => q.dificuldade === 'medio').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Difíceis:</span>
                    <span className="font-semibold">{questoesSelecionadasObj.filter(q => q.dificuldade === 'dificil').length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h4 className="font-semibold mb-4">Questões ({questoesSelecionadas.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questoesSelecionadasObj.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">{i + 1}</span>
                    <p className="flex-1 text-sm text-gray-700 line-clamp-1">{q.enunciado}</p>
                    <Badge className="text-xs">{q.dificuldade}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleSave('rascunho')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />Salvar Rascunho
                </Button>
                <Button onClick={() => handleSave('publicado')} loading={saving}>
                  Publicar Simulado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
