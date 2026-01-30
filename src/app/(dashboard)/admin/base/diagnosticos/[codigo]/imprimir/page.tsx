// src/app/(dashboard)/admin/base/diagnosticos/[codigo]/imprimir/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Printer,
  AlertCircle,
  Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

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

interface Aluno {
  id: string
  nome: string
  matricula: string
}

interface Questao {
  id: string
  numero: number
  enunciado: string
  tipo: string
  competencia: string
  descritor_saeb: string
}

// Estrutura padrão das questões (caso não tenha no banco)
const questoesPadrao = [
  { numero: 1, competencia: 'L', nome: 'Leitura/Interpretação', placeholder: 'Questão de leitura e interpretação de dados matemáticos.' },
  { numero: 2, competencia: 'L', nome: 'Leitura/Interpretação', placeholder: 'Questão de leitura e interpretação de enunciados.' },
  { numero: 3, competencia: 'F', nome: 'Fluência/Cálculo', placeholder: 'Questão de cálculo e fluência numérica.' },
  { numero: 4, competencia: 'F', nome: 'Fluência/Cálculo', placeholder: 'Questão de cálculo e operações.' },
  { numero: 5, competencia: 'R', nome: 'Raciocínio/Compreensão', placeholder: 'Questão de raciocínio lógico-matemático.' },
  { numero: 6, competencia: 'R', nome: 'Raciocínio/Compreensão', placeholder: 'Questão de compreensão de conceitos.' },
  { numero: 7, competencia: 'A', nome: 'Aplicação/Problemas', placeholder: 'Problema de aplicação prática.' },
  { numero: 8, competencia: 'A', nome: 'Aplicação/Problemas', placeholder: 'Problema contextualizado.' },
  { numero: 9, competencia: 'J', nome: 'Justificativa/Conexão', placeholder: 'Questão que requer justificativa.' },
  { numero: 10, competencia: 'J', nome: 'Justificativa/Conexão', placeholder: 'Questão de conexão entre conceitos.' },
]

const competenciasCores: Record<string, { bg: string, text: string, nome: string }> = {
  'L': { bg: 'bg-blue-100', text: 'text-blue-700', nome: 'Leitura' },
  'F': { bg: 'bg-green-100', text: 'text-green-700', nome: 'Fluência' },
  'R': { bg: 'bg-yellow-100', text: 'text-yellow-700', nome: 'Raciocínio' },
  'A': { bg: 'bg-orange-100', text: 'text-orange-700', nome: 'Aplicação' },
  'J': { bg: 'bg-purple-100', text: 'text-purple-700', nome: 'Justificativa' },
}

export default function ImprimirDiagnosticoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const codigo = (params.codigo as string).toUpperCase()
  const turmaId = searchParams.get('turma')

  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipoImpressao, setTipoImpressao] = useState<'prova' | 'folha' | 'ambos'>('ambos')

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

      // Carregar questões do diagnóstico
      const { data: questoesData } = await supabase
        .from('base_diagnostico_questoes')
        .select('*')
        .eq('diagnostico_id', diag.id)
        .order('numero')

      setQuestoes(questoesData || [])

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function getNivelLabel(nivel: string) {
    switch (nivel) {
      case 'facil': return '🟢 Fácil'
      case 'medio': return '🟡 Médio'
      case 'dificil': return '🔴 Difícil'
      default: return nivel
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
          <h1 className="text-2xl font-bold text-gray-900">Imprimir Diagnóstico</h1>
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
    <>
      {/* Controles (não aparecem na impressão) */}
      <div className="print:hidden space-y-6 mb-8">
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
                Imprimir {diagnostico?.codigo}
              </h1>
              <p className="text-gray-500 mt-1">
                {turma?.nome} • {alunos.length} alunos
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimir</span>
          </button>
        </div>

        {/* Opções de impressão */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">O que imprimir?</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipoImpressao"
                value="prova"
                checked={tipoImpressao === 'prova'}
                onChange={(e) => setTipoImpressao(e.target.value as any)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-gray-700">Apenas a prova</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipoImpressao"
                value="folha"
                checked={tipoImpressao === 'folha'}
                onChange={(e) => setTipoImpressao(e.target.value as any)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-gray-700">Apenas folha de respostas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipoImpressao"
                value="ambos"
                checked={tipoImpressao === 'ambos'}
                onChange={(e) => setTipoImpressao(e.target.value as any)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-gray-700">Prova + Folha de respostas</span>
            </label>
          </div>
        </div>

        {questoes.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <p className="text-yellow-700 text-sm">
                As questões ainda não foram cadastradas no banco de dados. 
                Será exibido um modelo com espaços para você preencher manualmente.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo para impressão */}
      <div className="print:m-0">
        {/* PROVA */}
        {(tipoImpressao === 'prova' || tipoImpressao === 'ambos') && (
          <div className="bg-white print:shadow-none mb-8 print:mb-0">
            {/* Cabeçalho da Prova */}
            <div className="border-2 border-black p-4 mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-xl font-bold">MÉTODO BASE - DIAGNÓSTICO</h1>
                  <p className="text-lg font-semibold">{diagnostico?.codigo} - {diagnostico?.nome}</p>
                  <p className="text-sm text-gray-600">{diagnostico?.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{turma?.nome}</p>
                  <p className="text-sm">{turma?.ano_serie}</p>
                  <p className="text-sm">{getNivelLabel(diagnostico?.nivel || '')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-300 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome do Aluno:</label>
                  <div className="border-b border-black h-8 mt-1"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nº:</label>
                    <div className="border-b border-black h-8 mt-1"></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data:</label>
                    <div className="border-b border-black h-8 mt-1">____/____/2025</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-gray-100 p-3 mb-4 text-sm print:bg-gray-100">
              <p className="font-medium mb-1">📋 Instruções:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Tempo: {diagnostico?.tempo_estimado_min} minutos</li>
                <li>Leia cada questão com atenção antes de responder</li>
                <li>Mostre todos os cálculos que você fizer</li>
                <li>Se não souber, tente! Não deixe em branco</li>
              </ul>
            </div>

            {/* Questões */}
            <div className="space-y-6">
              {(questoes.length > 0 ? questoes : questoesPadrao).map((q: any, idx) => {
                const comp = competenciasCores[q.competencia] || competenciasCores['L']
                return (
                  <div key={idx} className="border border-gray-300 rounded-lg p-4 break-inside-avoid">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold">
                        {q.numero}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${comp.bg} ${comp.text}`}>
                        {comp.nome}
                      </span>
                      {q.descritor_saeb && (
                        <span className="text-xs text-gray-500">({q.descritor_saeb})</span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      {q.enunciado ? (
                        <p className="text-gray-800 whitespace-pre-wrap">{q.enunciado}</p>
                      ) : (
                        <p className="text-gray-400 italic">{q.placeholder}</p>
                      )}
                    </div>

                    {/* Espaço para resposta */}
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-500 mb-2">Resposta:</p>
                      <div className="min-h-[80px] border border-dashed border-gray-300 rounded bg-gray-50"></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Autoavaliação */}
            <div className="border-2 border-gray-400 rounded-lg p-4 mt-6 break-inside-avoid">
              <h3 className="font-bold text-gray-800 mb-4">📝 Autoavaliação</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-700 mb-2">Q11. Como você se sentiu fazendo este diagnóstico?</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>😊 Fácil</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>😐 Médio</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>😓 Difícil</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium text-gray-700 mb-2">Q12. Qual parte você achou mais difícil?</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>Contas</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>Problemas</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>Frações</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gray-400 rounded"></span>
                      <span>Geometria</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Quebra de página antes da folha de respostas */}
            {tipoImpressao === 'ambos' && (
              <div className="page-break-after print:break-after-page"></div>
            )}
          </div>
        )}

        {/* FOLHA DE RESPOSTAS / CORREÇÃO */}
        {(tipoImpressao === 'folha' || tipoImpressao === 'ambos') && (
          <div className="bg-white print:shadow-none">
            <div className="border-2 border-black p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">FOLHA DE CORREÇÃO - {diagnostico?.codigo}</h1>
                  <p className="text-sm">{turma?.nome} • {turma?.ano_serie}</p>
                </div>
                <div className="text-right text-sm">
                  <p>Data: ____/____/2025</p>
                  <p>Professor: _________________</p>
                </div>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="w-6 h-6 bg-green-500 text-white flex items-center justify-center rounded font-bold text-xs">✓</span>
                <span>Acertou</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-6 h-6 bg-yellow-500 text-white flex items-center justify-center rounded font-bold text-xs">½</span>
                <span>Parcial</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-6 h-6 bg-red-500 text-white flex items-center justify-center rounded font-bold text-xs">✗</span>
                <span>Errou</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-6 h-6 bg-gray-300 flex items-center justify-center rounded font-bold text-xs">-</span>
                <span>Branco</span>
              </div>
              <div className="ml-4 text-gray-500">
                Erros: E1=Leitura | E2=Cálculo | E3=Conceito | E4=Estratégia | E5=Branco
              </div>
            </div>

            {/* Tabela de correção */}
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 text-left w-8">Nº</th>
                  <th className="border border-black p-2 text-left">Nome do Aluno</th>
                  {questoesPadrao.map(q => (
                    <th key={q.numero} className="border border-black p-1 text-center w-8">
                      <div className="text-xs">{q.competencia}</div>
                      <div>Q{q.numero}</div>
                    </th>
                  ))}
                  <th className="border border-black p-2 text-center w-12">Total</th>
                  <th className="border border-black p-2 text-center w-12">Grupo</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, idx) => (
                  <tr key={aluno.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1 text-sm truncate max-w-[150px]">{aluno.nome}</td>
                    {questoesPadrao.map(q => (
                      <td key={q.numero} className="border border-black p-1 text-center">
                        <div className="w-6 h-6 border border-gray-400 mx-auto"></div>
                      </td>
                    ))}
                    <td className="border border-black p-1 text-center">
                      <div className="font-bold">/10</div>
                    </td>
                    <td className="border border-black p-1 text-center">
                      <div className="w-8 h-8 border-2 border-gray-400 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ))}
                {/* Linhas extras caso precise */}
                {Array.from({ length: Math.max(0, 5 - alunos.length) }).map((_, idx) => (
                  <tr key={`extra-${idx}`} className="bg-white">
                    <td className="border border-black p-1 text-center">{alunos.length + idx + 1}</td>
                    <td className="border border-black p-1"></td>
                    {questoesPadrao.map(q => (
                      <td key={q.numero} className="border border-black p-1 text-center">
                        <div className="w-6 h-6 border border-gray-400 mx-auto"></div>
                      </td>
                    ))}
                    <td className="border border-black p-1 text-center">/10</td>
                    <td className="border border-black p-1 text-center">
                      <div className="w-8 h-8 border-2 border-gray-400 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Resumo */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="border border-black p-3 text-center">
                <p className="text-sm text-gray-600">Total de Alunos</p>
                <p className="text-2xl font-bold">{alunos.length}</p>
              </div>
              <div className="border border-black p-3 text-center bg-red-50">
                <p className="text-sm text-gray-600">Grupo A (0-40%)</p>
                <p className="text-2xl font-bold text-red-600">____</p>
              </div>
              <div className="border border-black p-3 text-center bg-yellow-50">
                <p className="text-sm text-gray-600">Grupo B (41-70%)</p>
                <p className="text-2xl font-bold text-yellow-600">____</p>
              </div>
              <div className="border border-black p-3 text-center bg-green-50">
                <p className="text-sm text-gray-600">Grupo C (71-100%)</p>
                <p className="text-2xl font-bold text-green-600">____</p>
              </div>
            </div>

            {/* Observações */}
            <div className="mt-6 border border-black p-4">
              <p className="font-medium mb-2">Observações:</p>
              <div className="h-24 border-b border-dashed border-gray-400 mb-2"></div>
              <div className="h-24 border-b border-dashed border-gray-400"></div>
            </div>
          </div>
        )}
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:m-0 {
            margin: 0 !important;
          }
          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:break-after-page {
            break-after: page;
          }
        }
      `}</style>
    </>
  )
}
