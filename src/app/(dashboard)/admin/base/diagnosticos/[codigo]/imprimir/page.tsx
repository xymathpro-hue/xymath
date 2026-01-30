
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Printer,
  Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface Questao {
  id: string
  numero: number
  enunciado: string
  tipo: string
  o_que_testa: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Diagnostico {
  id: string
  codigo: string
  nome: string
  descricao: string
  tempo_estimado: number
}

export default function ImprimirDiagnosticoPage() {
  const params = useParams()
  const codigo = (params.codigo as string).toUpperCase()
  const searchParams = useSearchParams()
  const turmaId = searchParams.get('turma')
  const supabase = createClient()
  
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarGabarito, setMostrarGabarito] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [codigo, turmaId])

  async function carregarDados() {
    try {
      // Carregar diagnóstico
      const { data: diagData } = await supabase
        .from('base_diagnosticos')
        .select('id, codigo, nome, descricao, tempo_estimado')
        .eq('codigo', codigo)
        .single()

      if (diagData) {
        setDiagnostico(diagData)

        // Carregar questões
        const { data: questoesData } = await supabase
          .from('base_diagnostico_questoes')
          .select('id, numero, enunciado, tipo, o_que_testa')
          .eq('diagnostico_id', diagData.id)
          .order('numero')

        setQuestoes(questoesData || [])
      }

      // Carregar turma se informada
      if (turmaId) {
        const { data: turmaData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
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

        setAlunos(alunosData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function getTipoLabel(tipo: string) {
    switch (tipo) {
      case 'oral': return '🗣️ Oral'
      case 'escrito': return '✏️ Escrito'
      case 'visual': return '👁️ Visual'
      default: return tipo
    }
  }

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!diagnostico) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Diagnóstico não encontrado</p>
        <Link href="/admin/base/diagnosticos" className="text-indigo-600 hover:underline mt-2 inline-block">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Barra de ações - não aparece na impressão */}
      <div className="print:hidden space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/base/diagnosticos"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Imprimir {codigo}</h1>
            <p className="text-gray-600 mt-1">{diagnostico.nome}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Printer className="w-5 h-5" />
            Imprimir
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarGabarito}
              onChange={(e) => setMostrarGabarito(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Mostrar gabarito do professor</span>
          </label>

          {turma && (
            <span className="text-sm text-gray-600">
              Turma: <strong>{turma.nome}</strong> ({alunos.length} alunos)
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo para impressão */}
      <div className="bg-white print:shadow-none shadow-sm rounded-xl print:rounded-none border print:border-0 border-gray-200 p-8 print:p-0">
        
        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MÉTODO BASE</h1>
              <h2 className="text-xl font-semibold text-gray-800 mt-1">
                Diagnóstico {codigo} - {diagnostico.nome}
              </h2>
              <p className="text-gray-600 mt-1">{diagnostico.descricao}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p><strong>Tempo:</strong> {diagnostico.tempo_estimado} minutos</p>
              <p><strong>Data:</strong> {dataAtual}</p>
              {turma && <p><strong>Turma:</strong> {turma.nome}</p>}
            </div>
          </div>

          {/* Dados do aluno */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="border border-gray-400 rounded p-3">
              <p className="text-sm text-gray-500 mb-1">Nome do Aluno:</p>
              <div className="h-8 border-b border-gray-400"></div>
            </div>
            <div className="border border-gray-400 rounded p-3">
              <p className="text-sm text-gray-500 mb-1">Nº:</p>
              <div className="h-8 border-b border-gray-400"></div>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-gray-50 print:bg-gray-100 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Instruções</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Leia cada questão com atenção antes de responder</li>
            <li>• Use lápis ou caneta azul/preta</li>
            <li>• Não deixe questões em branco</li>
            <li>• Tempo estimado: {diagnostico.tempo_estimado} minutos</li>
          </ul>
        </div>

        {/* Questões */}
        <div className="space-y-6">
          {questoes.map((questao, index) => (
            <div key={questao.id} className="border border-gray-300 rounded-lg p-4 print:break-inside-avoid">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-indigo-600 print:bg-indigo-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {questao.numero}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {getTipoLabel(questao.tipo)}
                  </span>
                </div>
                {mostrarGabarito && (
                  <span className="text-xs text-gray-500 italic">
                    Avalia: {questao.o_que_testa}
                  </span>
                )}
              </div>

              <p className="text-gray-900 font-medium mb-4">{questao.enunciado}</p>

              {/* Espaço para resposta */}
              {questao.tipo === 'escrito' && (
                <div className="border-t border-gray-300 pt-3">
                  <p className="text-sm text-gray-500 mb-2">Resposta:</p>
                  <div className="min-h-[60px] border border-gray-300 rounded bg-gray-50 print:bg-white"></div>
                </div>
              )}

              {questao.tipo === 'oral' && (
                <div className="border-t border-gray-300 pt-3">
                  <p className="text-sm text-gray-500 italic">
                    ⚠️ Questão oral - Professor anota a resposta do aluno
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <label className="flex items-center gap-2 p-2 border rounded">
                      <span className="w-4 h-4 border border-gray-400 rounded"></span>
                      ✅ Acertou
                    </label>
                    <label className="flex items-center gap-2 p-2 border rounded">
                      <span className="w-4 h-4 border border-gray-400 rounded"></span>
                      ⚠️ Parcial
                    </label>
                    <label className="flex items-center gap-2 p-2 border rounded">
                      <span className="w-4 h-4 border border-gray-400 rounded"></span>
                      ❌ Errou
                    </label>
                  </div>
                </div>
              )}

              {questao.tipo === 'visual' && (
                <div className="border-t border-gray-300 pt-3">
                  <p className="text-sm text-gray-500 mb-2">Resposta (desenhe ou marque):</p>
                  <div className="min-h-[80px] border border-gray-300 rounded bg-gray-50 print:bg-white"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé com espaço para observações */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Observações do Professor:</p>
              <div className="min-h-[60px] border border-gray-300 rounded p-2 bg-gray-50 print:bg-white"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Resultado:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-gray-500">Acertos</p>
                  <p className="text-xl font-bold text-green-600">__/{questoes.length}</p>
                </div>
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-gray-500">Parciais</p>
                  <p className="text-xl font-bold text-yellow-600">__/{questoes.length}</p>
                </div>
                <div className="border border-gray-300 rounded p-2 text-center">
                  <p className="text-gray-500">Erros</p>
                  <p className="text-xl font-bold text-red-600">__/{questoes.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grupo calculado */}
          {codigo === 'D1' && (
            <div className="mt-4 p-4 bg-gray-100 print:bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Classificação do Aluno (D1):</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-red-500 rounded"></span>
                  <span className="text-sm"><strong>Grupo A</strong> - Apoio (errou 3+)</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-yellow-500 rounded"></span>
                  <span className="text-sm"><strong>Grupo B</strong> - Adaptação (errou 1-2)</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-green-500 rounded"></span>
                  <span className="text-sm"><strong>Grupo C</strong> - Regular (acertou tudo)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé final */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>Método BASE - Base Analítica Sistematizada Educacional | xyMath</p>
        </div>
      </div>

      {/* Folha de presença (opcional - para imprimir separado) */}
      {turma && alunos.length > 0 && (
        <div className="mt-8 print:mt-0 print:break-before-page bg-white print:shadow-none shadow-sm rounded-xl print:rounded-none border print:border-0 border-gray-200 p-8 print:p-0">
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Folha de Presença e Resultados</h1>
            <p className="text-gray-600">Diagnóstico {codigo} - {diagnostico.nome} | Turma: {turma.nome} | Data: {dataAtual}</p>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Nº</th>
                <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Nome do Aluno</th>
                <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold w-16">Pres.</th>
                {questoes.map(q => (
                  <th key={q.id} className="border border-gray-400 px-2 py-2 text-center text-sm font-semibold w-12">
                    Q{q.numero}
                  </th>
                ))}
                <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold w-16">Total</th>
                {codigo === 'D1' && (
                  <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold w-16">Grupo</th>
                )}
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno, index) => (
                <tr key={aluno.id}>
                  <td className="border border-gray-400 px-3 py-2 text-sm">{index + 1}</td>
                  <td className="border border-gray-400 px-3 py-2 text-sm">{aluno.nome}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">
                    <span className="w-4 h-4 border border-gray-400 inline-block"></span>
                  </td>
                  {questoes.map(q => (
                    <td key={q.id} className="border border-gray-400 px-2 py-2 text-center text-sm">
                      
                    </td>
                  ))}
                  <td className="border border-gray-400 px-3 py-2 text-center text-sm font-medium">
                    /{questoes.length}
                  </td>
                  {codigo === 'D1' && (
                    <td className="border border-gray-400 px-3 py-2 text-center">
                      
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-xs text-gray-500">
            <p><strong>Legenda:</strong> ✓ = Acertou | P = Parcial | X = Errou | F = Faltou</p>
            {codigo === 'D1' && (
              <p><strong>Grupos:</strong> A = Apoio (3+ erros) | B = Adaptação (1-2 erros) | C = Regular (0 erros)</p>
            )}
          </div>
        </div>
      )}

      {/* CSS para impressão */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}
