// src/app/(dashboard)/admin/base/questoes/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  nivel: string
  ano_escolar: string
}

interface Questao {
  id: string
  diagnostico_id: string
  numero: number
  enunciado: string
  tipo: string
  o_que_testa: string
  versao_visual?: string
  habilidade_codigo?: string
  competencia?: string
  descritor_saeb?: string
  questao_ancora?: boolean
}

// Competências por número de questão
const competenciaPorQuestao: Record<number, { codigo: string, nome: string }> = {
  1: { codigo: 'L', nome: 'Leitura' },
  2: { codigo: 'L', nome: 'Leitura' },
  3: { codigo: 'F', nome: 'Fluência' },
  4: { codigo: 'F', nome: 'Fluência' },
  5: { codigo: 'R', nome: 'Raciocínio' },
  6: { codigo: 'R', nome: 'Raciocínio' },
  7: { codigo: 'A', nome: 'Aplicação' },
  8: { codigo: 'A', nome: 'Aplicação' },
  9: { codigo: 'J', nome: 'Justificativa' },
  10: { codigo: 'J', nome: 'Justificativa' },
  11: { codigo: 'AV', nome: 'Autoavaliação' },
  12: { codigo: 'AV', nome: 'Autoavaliação' },
}

const tiposQuestao = [
  'Múltipla escolha',
  'Resposta curta',
  'Resposta aberta',
  'Verdadeiro/Falso',
  'Associação',
  'Completar',
]

export default function QuestoesPage() {
  const supabase = createClient()
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [diagSelecionado, setDiagSelecionado] = useState<string>('')
  const [expandido, setExpandido] = useState<Set<string>>(new Set())
  
  // Modal de edição
  const [modalAberto, setModalAberto] = useState(false)
  const [questaoEditando, setQuestaoEditando] = useState<Partial<Questao> | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (diagSelecionado) {
      carregarQuestoes(diagSelecionado)
    }
  }, [diagSelecionado])

  async function carregarDados() {
    try {
      setLoading(true)
      
      // Carregar diagnósticos
      const { data: diagsData } = await supabase
        .from('base_diagnosticos')
        .select('*')
        .order('ano_escolar')
        .order('ordem')

      setDiagnosticos(diagsData || [])
      
      if (diagsData && diagsData.length > 0) {
        setDiagSelecionado(diagsData[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function carregarQuestoes(diagnosticoId: string) {
    try {
      const { data: questoesData } = await supabase
        .from('base_diagnostico_questoes')
        .select('*')
        .eq('diagnostico_id', diagnosticoId)
        .order('numero')

      setQuestoes(questoesData || [])
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
    }
  }

  function abrirModalNova(numero: number) {
    const comp = competenciaPorQuestao[numero]
    setQuestaoEditando({
      diagnostico_id: diagSelecionado,
      numero,
      enunciado: '',
      tipo: 'Múltipla escolha',
      o_que_testa: '',
      competencia: comp?.codigo || '',
      versao_visual: '',
      habilidade_codigo: '',
      descritor_saeb: '',
      questao_ancora: false
    })
    setModalAberto(true)
    setErro(null)
  }

  function abrirModalEditar(questao: Questao) {
    setQuestaoEditando({ ...questao })
    setModalAberto(true)
    setErro(null)
  }

  async function salvarQuestao() {
    if (!questaoEditando) return
    
    // Validações
    if (!questaoEditando.enunciado?.trim()) {
      setErro('O enunciado é obrigatório')
      return
    }
    if (!questaoEditando.o_que_testa?.trim()) {
      setErro('O campo "O que testa" é obrigatório')
      return
    }

    setSaving(true)
    setErro(null)
    
    try {
      const dados = {
        diagnostico_id: questaoEditando.diagnostico_id,
        numero: questaoEditando.numero,
        enunciado: questaoEditando.enunciado,
        tipo: questaoEditando.tipo || 'Múltipla escolha',
        o_que_testa: questaoEditando.o_que_testa,
        competencia: questaoEditando.competencia,
        versao_visual: questaoEditando.versao_visual || null,
        habilidade_codigo: questaoEditando.habilidade_codigo || null,
        descritor_saeb: questaoEditando.descritor_saeb || null,
        questao_ancora: questaoEditando.questao_ancora || false
      }

      if (questaoEditando.id) {
        // Atualizar
        const { error } = await supabase
          .from('base_diagnostico_questoes')
          .update(dados)
          .eq('id', questaoEditando.id)

        if (error) throw error
        setSucesso('Questão atualizada com sucesso!')
      } else {
        // Inserir
        const { error } = await supabase
          .from('base_diagnostico_questoes')
          .insert(dados)

        if (error) throw error
        setSucesso('Questão cadastrada com sucesso!')
      }

      setModalAberto(false)
      setQuestaoEditando(null)
      carregarQuestoes(diagSelecionado)
      
      setTimeout(() => setSucesso(null), 3000)
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      setErro(error.message || 'Erro ao salvar questão')
    } finally {
      setSaving(false)
    }
  }

  async function excluirQuestao(questaoId: string) {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return

    try {
      const { error } = await supabase
        .from('base_diagnostico_questoes')
        .delete()
        .eq('id', questaoId)

      if (error) throw error
      
      setSucesso('Questão excluída com sucesso!')
      carregarQuestoes(diagSelecionado)
      setTimeout(() => setSucesso(null), 3000)
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      setErro(error.message || 'Erro ao excluir questão')
    }
  }

  function getQuestaoNumero(numero: number): Questao | undefined {
    return questoes.find(q => q.numero === numero)
  }

  function getCorCompetencia(codigo: string): string {
    switch (codigo) {
      case 'L': return 'bg-blue-100 text-blue-700'
      case 'F': return 'bg-green-100 text-green-700'
      case 'R': return 'bg-yellow-100 text-yellow-700'
      case 'A': return 'bg-orange-100 text-orange-700'
      case 'J': return 'bg-purple-100 text-purple-700'
      case 'AV': return 'bg-pink-100 text-pink-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function getNivelCor(nivel: string): string {
    switch (nivel) {
      case 'facil': return 'bg-green-100 text-green-700'
      case 'medio': return 'bg-yellow-100 text-yellow-700'
      case 'dificil': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const diagAtual = diagnosticos.find(d => d.id === diagSelecionado)
  const questoesCadastradas = questoes.length
  const questoesTotal = 12

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cadastro de Questões</h1>
            <p className="text-gray-500 mt-1">Cadastrar questões dos diagnósticos</p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700">{sucesso}</p>
        </div>
      )}

      {erro && !modalAberto && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Seletor de Diagnóstico */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecione o diagnóstico
        </label>
        <select
          value={diagSelecionado}
          onChange={(e) => setDiagSelecionado(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
        >
          {diagnosticos.map((diag) => (
            <option key={diag.id} value={diag.id}>
              {diag.codigo} - {diag.nome}
            </option>
          ))}
        </select>

        {diagAtual && (
          <div className="mt-3 flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getNivelCor(diagAtual.nivel)}`}>
              {diagAtual.nivel === 'facil' ? '🟢 Fácil' : diagAtual.nivel === 'medio' ? '🟡 Médio' : '🔴 Difícil'}
            </span>
            <span className="text-sm text-gray-500">
              {questoesCadastradas}/{questoesTotal} questões cadastradas
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${(questoesCadastradas / questoesTotal) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Questões */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Questões do {diagAtual?.codigo}</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(numero => {
            const questao = getQuestaoNumero(numero)
            const comp = competenciaPorQuestao[numero]
            
            return (
              <div 
                key={numero}
                className={`p-4 hover:bg-gray-50 ${questao ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Número e Competência */}
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold">
                      {numero}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getCorCompetencia(comp.codigo)}`}>
                      {comp.codigo}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    {questao ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {questao.tipo}
                          </span>
                          {questao.descritor_saeb && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                              {questao.descritor_saeb}
                            </span>
                          )}
                          {questao.questao_ancora && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              ⚓ Âncora
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 text-sm line-clamp-2">{questao.enunciado}</p>
                        <p className="text-gray-500 text-xs mt-1">Testa: {questao.o_que_testa}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 italic">Questão não cadastrada</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {questao ? (
                      <>
                        <button
                          onClick={() => abrirModalEditar(questao)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirQuestao(questao.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => abrirModalNova(numero)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumo por Competência */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Estrutura do Diagnóstico</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { codigo: 'L', nome: 'Leitura', questoes: '1-2' },
            { codigo: 'F', nome: 'Fluência', questoes: '3-4' },
            { codigo: 'R', nome: 'Raciocínio', questoes: '5-6' },
            { codigo: 'A', nome: 'Aplicação', questoes: '7-8' },
            { codigo: 'J', nome: 'Justificativa', questoes: '9-10' },
            { codigo: 'AV', nome: 'Autoavaliação', questoes: '11-12' },
          ].map(comp => {
            const cadastradas = questoes.filter(q => q.competencia === comp.codigo).length
            return (
              <div key={comp.codigo} className="bg-white rounded-lg p-3 text-center">
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getCorCompetencia(comp.codigo)}`}>
                  {comp.codigo}
                </span>
                <p className="text-xs text-gray-500 mt-1">{comp.nome}</p>
                <p className="text-xs text-gray-400">Q{comp.questoes}</p>
                <p className="text-sm font-bold text-gray-700 mt-1">{cadastradas}/2</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de Edição */}
      {modalAberto && questaoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {questaoEditando.id ? 'Editar' : 'Nova'} Questão {questaoEditando.numero}
              </h2>
              <button
                onClick={() => { setModalAberto(false); setQuestaoEditando(null); setErro(null) }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {erro}
                </div>
              )}

              {/* Competência (automática) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competência
                </label>
                <div className={`inline-block px-3 py-1 rounded ${getCorCompetencia(questaoEditando.competencia || '')}`}>
                  {competenciaPorQuestao[questaoEditando.numero || 1]?.nome || 'N/A'}
                </div>
              </div>

              {/* Enunciado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enunciado *
                </label>
                <textarea
                  value={questaoEditando.enunciado || ''}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, enunciado: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Digite o enunciado da questão..."
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de questão
                </label>
                <select
                  value={questaoEditando.tipo || 'Múltipla escolha'}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                >
                  {tiposQuestao.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {/* O que testa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  O que testa *
                </label>
                <input
                  type="text"
                  value={questaoEditando.o_que_testa || ''}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, o_que_testa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Ex: Interpretação de gráficos de barras"
                />
              </div>

              {/* Descritor SAEB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descritor SAEB
                </label>
                <input
                  type="text"
                  value={questaoEditando.descritor_saeb || ''}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, descritor_saeb: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Ex: D14, D28"
                />
              </div>

              {/* Habilidade BNCC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Habilidade BNCC
                </label>
                <input
                  type="text"
                  value={questaoEditando.habilidade_codigo || ''}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, habilidade_codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Ex: EF07MA01"
                />
              </div>

              {/* Versão Visual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Versão Visual (para Grupo A)
                </label>
                <textarea
                  value={questaoEditando.versao_visual || ''}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, versao_visual: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Versão simplificada para alunos com dificuldade de leitura..."
                />
              </div>

              {/* Questão Âncora */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="questao_ancora"
                  checked={questaoEditando.questao_ancora || false}
                  onChange={(e) => setQuestaoEditando({ ...questaoEditando, questao_ancora: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="questao_ancora" className="text-sm text-gray-700">
                  Questão âncora (usada para comparação entre diagnósticos)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setModalAberto(false); setQuestaoEditando(null); setErro(null) }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarQuestao}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

