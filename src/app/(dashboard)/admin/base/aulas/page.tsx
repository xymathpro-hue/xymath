'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  ArrowLeft,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ExternalLink,
  BookOpen,
  Plus
} from 'lucide-react'

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface DistribuicaoGrupos {
  grupo_a: number
  grupo_b: number
  grupo_c: number
  total: number
}

interface Aula {
  id: string
  ano_escolar: string
  numero: number
  titulo: string
  descricao: string
  grupo_alvo: 'A' | 'B' | 'C' | 'TODOS'
  status: 'nao_iniciada' | 'em_andamento' | 'concluida'
  duracao_minutos: number
  objetivos: string[]
  materiais: string[]
  conteudo_url?: string
  pdf_url?: string
  video_url?: string
}

const ANOS_DISPONIVEIS = [
  { value: '6', label: '6º ano EF' },
  { value: '7', label: '7º ano EF' },
  { value: '8', label: '8º ano EF' },
  { value: '9', label: '9º ano EF' },
  { value: 'EM1', label: '1ª série EM' },
  { value: 'EM2', label: '2ª série EM' },
  { value: 'EM3', label: '3ª série EM' }
]

const FICHAS_INFO = {
  amarela: {
    nome: 'Ficha Amarela',
    grupo: 'A',
    descricao: 'Atividades de Reforço e Apoio',
    cor: 'bg-yellow-500',
    textoCor: 'text-yellow-700',
    bgCor: 'bg-yellow-50',
    borderCor: 'border-yellow-200'
  },
  azul: {
    nome: 'Ficha Azul',
    grupo: 'B',
    descricao: 'Atividades de Consolidação',
    cor: 'bg-blue-500',
    textoCor: 'text-blue-700',
    bgCor: 'bg-blue-50',
    borderCor: 'border-blue-200'
  },
  verde: {
    nome: 'Ficha Verde',
    grupo: 'C',
    descricao: 'Atividades de Desafio',
    cor: 'bg-green-500',
    textoCor: 'text-green-700',
    bgCor: 'bg-green-50',
    borderCor: 'border-green-200'
  }
}

export default function AulasPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('7')
  const [distribuicao, setDistribuicao] = useState<DistribuicaoGrupos | null>(null)
  const [loading, setLoading] = useState(true)
  const [fichaAtiva, setFichaAtiva] = useState<'amarela' | 'azul' | 'verde'>('amarela')

  const [aulasDisponiveis] = useState<Aula[]>([
    // 6º ANO
    {
      id: '6-1',
      ano_escolar: '6',
      numero: 1,
      titulo: 'Números Naturais e Operações',
      descricao: 'Revisão dos números naturais e as quatro operações fundamentais',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Identificar e operar com números naturais',
        'Resolver problemas com as quatro operações'
      ],
      materiais: ['Livro didático', 'Caderno', 'Calculadora']
    },
    // 7º ANO
    {
      id: '7-1',
      ano_escolar: '7',
      numero: 1,
      titulo: 'Números Inteiros - Introdução',
      descricao: 'Conceito de números inteiros, reta numérica e operações básicas',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Compreender o conceito de números inteiros',
        'Localizar números inteiros na reta numérica',
        'Realizar operações com números inteiros'
      ],
      materiais: ['Livro didático', 'Material concreto', 'Reta numérica']
    },
    {
      id: '7-2',
      ano_escolar: '7',
      numero: 2,
      titulo: 'Frações e Números Decimais',
      descricao: 'Conceitos, representações e operações com frações e decimais',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Identificar frações equivalentes',
        'Converter frações em decimais',
        'Operar com frações e decimais'
      ],
      materiais: ['Fichas de frações', 'Calculadora', 'Jogos']
    },
    // 8º ANO
    {
      id: '8-1',
      ano_escolar: '8',
      numero: 1,
      titulo: 'Potenciação e Radiciação',
      descricao: 'Propriedades das potências e raízes, aplicações práticas',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Aplicar propriedades de potências',
        'Calcular raízes quadradas e cúbicas',
        'Resolver problemas envolvendo potências'
      ],
      materiais: ['Calculadora científica', 'Tabelas de potências']
    },
    // 9º ANO
    {
      id: '9-1',
      ano_escolar: '9',
      numero: 1,
      titulo: 'Equações do 2º Grau',
      descricao: 'Resolução de equações quadráticas por diferentes métodos',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Identificar equações do 2º grau',
        'Resolver usando fórmula de Bhaskara',
        'Aplicar em problemas contextualizados'
      ],
      materiais: ['Livro didático', 'Calculadora', 'GeoGebra']
    },
    {
      id: '9-2',
      ano_escolar: '9',
      numero: 2,
      titulo: 'Funções Afim e Quadrática',
      descricao: 'Conceito, gráficos e aplicações de funções',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Compreender o conceito de função',
        'Construir e interpretar gráficos',
        'Identificar características das funções'
      ],
      materiais: ['Papel milimetrado', 'GeoGebra', 'Régua']
    },
    // ENSINO MÉDIO - 1ª SÉRIE
    {
      id: 'em1-1',
      ano_escolar: 'EM1',
      numero: 1,
      titulo: 'Conjuntos Numéricos',
      descricao: 'Revisão e aprofundamento dos conjuntos numéricos',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Dominar operações em todos os conjuntos',
        'Compreender propriedades dos números reais'
      ],
      materiais: ['Livro didático', 'Calculadora científica']
    },
    // ENSINO MÉDIO - 2ª SÉRIE
    {
      id: 'em2-1',
      ano_escolar: 'EM2',
      numero: 1,
      titulo: 'Progressões Aritméticas e Geométricas',
      descricao: 'Sequências, termos gerais e somas',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Identificar e classificar progressões',
        'Calcular termos e somas'
      ],
      materiais: ['Livro didático', 'Calculadora']
    },
    // ENSINO MÉDIO - 3ª SÉRIE
    {
      id: 'em3-1',
      ano_escolar: 'EM3',
      numero: 1,
      titulo: 'Matemática Financeira',
      descricao: 'Juros simples, compostos e aplicações práticas',
      grupo_alvo: 'TODOS',
      status: 'nao_iniciada',
      duracao_minutos: 50,
      objetivos: [
        'Calcular juros simples e compostos',
        'Resolver problemas de investimentos',
        'Aplicar matemática financeira no cotidiano'
      ],
      materiais: ['Calculadora financeira', 'Planilhas', 'Exemplos práticos']
    }
  ])

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarDistribuicao()
    }
  }, [turmaSelecionada])

  const carregarTurmas = async () => {
    try {
      const { data: turmasBase, error } = await supabase
        .from('base_turmas_config')
        .select(`
          turma_id,
          turmas (
            id,
            nome,
            ano_escolar
          )
        `)
        .eq('ativo', true)

      if (error) throw error

      const turmasFormatadas = turmasBase
        ?.map((t: any) => ({
          id: t.turmas.id,
          nome: t.turmas.nome,
          ano_escolar: t.turmas.ano_escolar
        })) || []

      setTurmas(turmasFormatadas)
      
      if (turmasFormatadas.length > 0) {
        const primeiraTurma = turmasFormatadas[0]
        setTurmaSelecionada(primeiraTurma.id)
        setAnoSelecionado(primeiraTurma.ano_escolar)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setLoading(false)
    }
  }

  const carregarDistribuicao = async () => {
    try {
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)

      const alunosIds = alunos?.map(a => a.id) || []
      const turmaInfo = turmas.find(t => t.id === turmaSelecionada)
      const anoEscolar = turmaInfo?.ano_escolar || '7'

      const { data: diagnosticos } = await supabase
        .from('base_diagnosticos')
        .select('id')
        .eq('ano_escolar', anoEscolar)
        .order('ordem')

      let grupoA = 0
      let grupoB = 0
      let grupoC = 0

      for (const alunoId of alunosIds) {
        const { data: respostasAluno } = await supabase
          .from('base_respostas_diagnostico')
          .select('diagnostico_id, acertou')
          .eq('aluno_id', alunoId)
          .in('diagnostico_id', diagnosticos?.map(d => d.id) || [])

        if (!respostasAluno || respostasAluno.length === 0) continue

        const diagnosticosAluno = new Set(respostasAluno.map(r => r.diagnostico_id))
        let somaNotasPonderadas = 0
        let somaPesos = 0

        diagnosticosAluno.forEach(diagId => {
          const diag = diagnosticos?.find(d => d.id === diagId)
          const respostasDiag = respostasAluno.filter(r => r.diagnostico_id === diagId)
          const acertos = respostasDiag.filter(r => r.acertou === true).length
          const percentual = (acertos / 12) * 100

          const diagIndex = diagnosticos?.findIndex(d => d.id === diagId) || 0
          const peso = diagIndex === 0 ? 3 : diagIndex === 1 ? 2 : 1

          somaNotasPonderadas += percentual * peso
          somaPesos += peso
        })

        const mediaFinal = somaPesos > 0 ? somaNotasPonderadas / somaPesos : 0

        if (mediaFinal <= 40) grupoA++
        else if (mediaFinal <= 70) grupoB++
        else grupoC++
      }

      setDistribuicao({
        grupo_a: grupoA,
        grupo_b: grupoB,
        grupo_c: grupoC,
        total: alunosIds.length
      })
    } catch (error) {
      console.error('Erro ao carregar distribuição:', error)
    }
  }

  const handleTurmaChange = (turmaId: string) => {
    setTurmaSelecionada(turmaId)
    const turma = turmas.find(t => t.id === turmaId)
    if (turma) {
      setAnoSelecionado(turma.ano_escolar)
    }
  }

  const aulasDoAno = aulasDisponiveis.filter(a => a.ano_escolar === anoSelecionado)
  const fichaInfo = FICHAS_INFO[fichaAtiva]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Aulas & Fichas</h1>
          <p className="text-gray-600 mt-1">Materiais pedagógicos diferenciados por grupo de desempenho</p>
        </div>

        {/* Seletores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Seletor de Turma */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a turma
            </label>
            <select
              value={turmaSelecionada}
              onChange={(e) => handleTurmaChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} - {turma.ano_escolar}º ano EF
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Ano Escolar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ver aulas de outro ano
            </label>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {ANOS_DISPONIVEIS.map(ano => (
                <option key={ano.value} value={ano.value}>
                  {ano.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando informações...</p>
          </div>
        ) : (
          <>
            {/* Distribuição dos Grupos */}
            {distribuicao && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Distribuição da Turma
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total de Alunos</p>
                    <p className="text-3xl font-bold text-gray-900">{distribuicao.total}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-600 mb-1">Grupo A - Apoio</p>
                    <p className="text-3xl font-bold text-yellow-700">{distribuicao.grupo_a}</p>
                    <p className="text-xs text-gray-500">
                      {distribuicao.total > 0 ? Math.round((distribuicao.grupo_a / distribuicao.total) * 100) : 0}%
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Grupo B - Adaptação</p>
                    <p className="text-3xl font-bold text-blue-700">{distribuicao.grupo_b}</p>
                    <p className="text-xs text-gray-500">
                      {distribuicao.total > 0 ? Math.round((distribuicao.grupo_b / distribuicao.total) * 100) : 0}%
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Grupo C - Regular</p>
                    <p className="text-3xl font-bold text-green-700">{distribuicao.grupo_c}</p>
                    <p className="text-xs text-gray-500">
                      {distribuicao.total > 0 ? Math.round((distribuicao.grupo_c / distribuicao.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs de Fichas */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {Object.entries(FICHAS_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setFichaAtiva(key as 'amarela' | 'azul' | 'verde')}
                      className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                        fichaAtiva === key
                          ? `${info.textoCor} border-b-2 ${info.cor.replace('bg-', 'border-')}`
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span>{info.nome}</span>
                      </div>
                      <p className="text-xs mt-1">{info.descricao}</p>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Conteúdo da Ficha */}
              <div className={`p-6 ${fichaInfo.bgCor}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{fichaInfo.nome}</h3>
                    <p className="text-gray-600 mt-1">
                      Material específico para o Grupo {fichaInfo.grupo}
                      {distribuicao && ` (${
                        fichaInfo.grupo === 'A' ? distribuicao.grupo_a :
                        fichaInfo.grupo === 'B' ? distribuicao.grupo_b :
                        distribuicao.grupo_c
                      } alunos)`}
                    </p>
                  </div>
                  
                  <button className={`flex items-center gap-2 ${fichaInfo.cor} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}>
                    <Download className="w-5 h-5" />
                    Baixar Fichas
                  </button>
                </div>

                {/* Aviso de Conteúdo Pendente */}
                <div className={`border ${fichaInfo.borderCor} rounded-lg p-6 mb-6`}>
                  <div className="flex gap-3">
                    <AlertCircle className={`w-6 h-6 ${fichaInfo.textoCor} flex-shrink-0`} />
                    <div>
                      <h4 className={`font-semibold ${fichaInfo.textoCor} mb-2`}>
                        Conteúdo em Preparação
                      </h4>
                      <p className="text-sm text-gray-600">
                        O planejamento pedagógico com as atividades e materiais para este grupo 
                        será adicionado esta semana. Estrutura pronta para receber:
                      </p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                        <li>Atividades práticas e contextualizadas</li>
                        <li>Exercícios diferenciados por nível</li>
                        <li>Material de apoio (PDFs, vídeos, links)</li>
                        <li>Sugestões de jogos e dinâmicas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Aulas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    Aulas Planejadas - {ANOS_DISPONIVEIS.find(a => a.value === anoSelecionado)?.label}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {aulasDoAno.length} {aulasDoAno.length === 1 ? 'aula disponível' : 'aulas disponíveis'}
                  </p>
                </div>
                
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-5 h-5" />
                  Adicionar Aula
                </button>
              </div>

              {aulasDoAno.length > 0 ? (
                <div className="space-y-4">
                  {aulasDoAno.map((aula) => (
                    <div 
                      key={aula.id} 
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                              Aula {aula.numero}
                            </span>
                            
                            {aula.status === 'concluida' && (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                Concluída
                              </span>
                            )}
                            {aula.status === 'em_andamento' && (
                              <span className="flex items-center gap-1 text-yellow-600 text-sm">
                                <Clock className="w-4 h-4" />
                                Em andamento
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{aula.titulo}</h3>
                          <p className="text-gray-600 mb-4">{aula.descricao}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Grupo Alvo:</p>
                              <p className="text-gray-600">{aula.grupo_alvo === 'TODOS' ? 'Todos os grupos' : `Grupo ${aula.grupo_alvo}`}</p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Duração:</p>
                              <p className="text-gray-600">{aula.duracao_minutos} minutos</p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Materiais:</p>
                              <p className="text-gray-600">{aula.materiais.join(', ')}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <p className="font-medium text-gray-700 mb-2">Objetivos de Aprendizagem:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {aula.objetivos.map((obj, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-indigo-600 mt-1">•</span>
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {aula.pdf_url && (
                            <button className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                          )}
                          {aula.video_url && (
                            <button className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                              <ExternalLink className="w-4 h-4" />
                              Vídeo
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!aula.conteudo_url && !aula.pdf_url && !aula.video_url && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            ⏳ Conteúdo será adicionado esta semana com o planejamento pedagógico
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma aula disponível para este ano escolar ainda.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    O planejamento pedagógico será adicionado esta semana.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
