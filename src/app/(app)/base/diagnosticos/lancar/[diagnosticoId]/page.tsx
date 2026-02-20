// src/app/(app)/base/diagnosticos/lancar/[diagnosticoId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
}

interface Resposta {
  aluno_id: string
  acertos_L: number
  acertos_F: number
  acertos_R: number
  acertos_A: number
  acertos_J: number
}

export default function LancarDiagnosticoPage() {
  const params = useParams()
  const router = useRouter()
  const diagnosticoId = params.diagnosticoId as string
  
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      
      // Buscar diagnóstico
      const resDiag = await fetch(`/api/base/diagnosticos/${diagnosticoId}`)
      const diag = await resDiag.json()
      setDiagnostico(diag)
      
      // Buscar alunos da turma
      const resAlunos = await fetch(`/api/alunos?turma_id=${diag.turma_id}`)
      const { data } = await resAlunos.json()
      setAlunos(data.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
      
      // Inicializar respostas
      const respostasIniciais: Record<string, Resposta> = {}
      data.forEach((aluno: Aluno) => {
        respostasIniciais[aluno.id] = {
          aluno_id: aluno.id,
          acertos_L: 0,
          acertos_F: 0,
          acertos_R: 0,
          acertos_A: 0,
          acertos_J: 0
        }
      })
      setRespostas(respostasIniciais)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function atualizarResposta(alunoId: string, competencia: string, valor: number) {
    setRespostas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [`acertos_${competencia}`]: Math.max(0, Math.min(2, valor))
      }
    }))
  }

  async function salvarRespostas() {
    try {
      setSalvando(true)
      
      const respostasArray = Object.values(respostas)

      const response = await fetch('/api/base/diagnosticos/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostico_id: diagnosticoId,
          respostas: respostasArray
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Respostas salvas! Classificação atualizada automaticamente.')
      router.back()
    } catch (err) {
      alert('❌ Erro ao salvar respostas')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  const calcularTotal = (alunoId: string) => {
    const r = respostas[alunoId]
    return r.acertos_L + r.acertos_F + r.acertos_R + r.acertos_A + r.acertos_J
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Lançar Respostas - {diagnostico?.tipo}</h1>
        <p className="text-gray-600">{diagnostico?.titulo}</p>
        <p className="text-sm text-gray-500 mt-1">
          Marque os acertos em cada competência (0-2 por competência)
        </p>
      </div>

      {/* Tabela de Lançamento */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Aluno</th>
                <th className="px-4 py-3 text-center bg-blue-50">
                  L<br/><span className="text-xs font-normal">Leitura</span>
                </th>
                <th className="px-4 py-3 text-center bg-green-50">
                  F<br/><span className="text-xs font-normal">Fluência</span>
                </th>
                <th className="px-4 py-3 text-center bg-yellow-50">
                  R<br/><span className="text-xs font-normal">Raciocínio</span>
                </th>
                <th className="px-4 py-3 text-center bg-orange-50">
                  A<br/><span className="text-xs font-normal">Aplicação</span>
                </th>
                <th className="px-4 py-3 text-center bg-purple-50">
                  J<br/><span className="text-xs font-normal">Justificativa</span>
                </th>
                <th className="px-4 py-3 text-center bg-gray-200 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{aluno.numero_chamada}</td>
                  <td className="px-4 py-3">{aluno.nome_completo}</td>
                  
                  {['L', 'F', 'R', 'A', 'J'].map((comp) => (
                    <td key={comp} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => atualizarResposta(
                            aluno.id, 
                            comp, 
                            respostas[aluno.id][`acertos_${comp}` as keyof Resposta] as number - 1
                          )}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-8 font-bold">
                          {respostas[aluno.id][`acertos_${comp}` as keyof Resposta]}
                        </span>
                        <button
                          onClick={() => atualizarResposta(
                            aluno.id, 
                            comp, 
                            respostas[aluno.id][`acertos_${comp}` as keyof Resposta] as number + 1
                          )}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  ))}
                  
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded font-bold ${
                      calcularTotal(aluno.id) >= 7 ? 'bg-green-100 text-green-800' :
                      calcularTotal(aluno.id) >= 4 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {calcularTotal(aluno.id)}/10
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botões */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={salvarRespostas}
          disabled={salvando}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar e Atualizar Classificação'}
        </button>
      </div>
    </div>
  )
}
