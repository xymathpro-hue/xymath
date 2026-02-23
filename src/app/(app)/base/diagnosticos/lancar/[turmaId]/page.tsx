'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
}

interface Resposta {
  aluno_id: string
  questao_1: number
  questao_2: number
  questao_3: number
  questao_4: number
  questao_5: number
  questao_6: number
  questao_7: number
  questao_8: number
  questao_9: number
  questao_10: number
  faltou: boolean
}

export default function LancarDiagnosticoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const turmaId = params.turmaId as string
  const tipo = searchParams.get('tipo') as 'D1' | 'D2' | 'D3'
  const bimestre = parseInt(searchParams.get('bimestre') || '1')
  
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Map<string, Resposta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarAlunos()
  }, [])

  async function carregarAlunos() {
    try {
      setLoading(true)
      const response = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data } = await response.json()
      
      setAlunos(data)
      
      const respostasIniciais = new Map<string, Resposta>()
      data.forEach((aluno: Aluno) => {
        respostasIniciais.set(aluno.id, {
          aluno_id: aluno.id,
          questao_1: 0,
          questao_2: 0,
          questao_3: 0,
          questao_4: 0,
          questao_5: 0,
          questao_6: 0,
          questao_7: 0,
          questao_8: 0,
          questao_9: 0,
          questao_10: 0,
          faltou: false
        })
      })
      
      setRespostas(respostasIniciais)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function marcarResposta(alunoId: string, questao: number, valor: number) {
    const novasRespostas = new Map(respostas)
    const resposta = novasRespostas.get(alunoId)!
    const key = `questao_${questao}` as keyof Resposta
    resposta[key] = valor as never
    novasRespostas.set(alunoId, resposta)
    setRespostas(novasRespostas)
  }

  function marcarFaltou(alunoId: string) {
    const novasRespostas = new Map(respostas)
    const resposta = novasRespostas.get(alunoId)!
    resposta.faltou = !resposta.faltou
    
    if (resposta.faltou) {
      for (let i = 1; i <= 10; i++) {
        const key = `questao_${i}` as keyof Resposta
        resposta[key] = 0 as never
      }
    }
    
    novasRespostas.set(alunoId, resposta)
    setRespostas(novasRespostas)
  }

  function calcularTotal(alunoId: string): number {
    const resposta = respostas.get(alunoId)!
    if (resposta.faltou) return 0
    
    return (
      resposta.questao_1 + resposta.questao_2 + resposta.questao_3 +
      resposta.questao_4 + resposta.questao_5 + resposta.questao_6 +
      resposta.questao_7 + resposta.questao_8 + resposta.questao_9 +
      resposta.questao_10
    )
  }

  function getCorTotal(total: number): string {
    if (total >= 7) return 'text-green-700 font-bold'
    if (total >= 4) return 'text-yellow-700 font-bold'
    return 'text-red-700 font-bold'
  }

  async function salvar() {
    try {
      setSalvando(true)
      
      const respostasArray = Array.from(respostas.values())
      
      const response = await fetch('/api/base/diagnosticos/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          tipo_diagnostico: tipo,
          bimestre,
          respostas: respostasArray
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Respostas salvas e classificação atualizada!')
      router.push(`/base/diagnosticos/${turmaId}`)
    } catch (err) {
      alert('❌ Erro ao salvar respostas')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-700">Lançar Respostas - {tipo}</h1>
        <p className="text-gray-600">
          Marque: ✓ Certo (1 pt) | ✗ Errado (0 pt) | ½ Meio (0.5 pt) | ⬜ Branco (0 pt)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-gray-600 sticky left-0 bg-gray-100">Nº</th>
              <th className="px-3 py-3 text-left text-gray-600 sticky left-12 bg-gray-100">Aluno</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(q => (
                <th key={q} className="px-2 py-3 text-center text-gray-600 min-w-[100px]">Q{q}</th>
              ))}
              <th className="px-3 py-3 text-center text-gray-600 min-w-[80px]">Total</th>
              <th className="px-3 py-3 text-center text-gray-600 min-w-[100px]">Faltou</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alunos.map((aluno) => {
              const resposta = respostas.get(aluno.id)!
              const total = calcularTotal(aluno.id)
              
              return (
                <tr key={aluno.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700 font-medium sticky left-0 bg-white">
                    {aluno.numero_chamada}
                  </td>
                  <td className="px-3 py-2 text-gray-700 text-sm sticky left-12 bg-white">
                    {aluno.nome_completo}
                  </td>
                  
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(q => {
                    const key = `questao_${q}` as keyof Resposta
                    const valor = resposta[key] as number
                    
                    return (
                      <td key={q} className="px-2 py-2">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => marcarResposta(aluno.id, q, 1)}
                            disabled={resposta.faltou}
                            className={`w-8 h-8 rounded ${
                              valor === 1
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => marcarResposta(aluno.id, q, 0)}
                            disabled={resposta.faltou}
                            className={`w-8 h-8 rounded ${
                              valor === 0 && !resposta.faltou
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ✗
                          </button>
                          <button
                            onClick={() => marcarResposta(aluno.id, q, 0.5)}
                            disabled={resposta.faltou}
                            className={`w-8 h-8 rounded ${
                              valor === 0.5
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ½
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  
                  <td className={`px-3 py-2 text-center ${getCorTotal(total)}`}>
                    {total.toFixed(1)}
                  </td>
                  
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => marcarFaltou(aluno.id)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        resposta.faltou
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {resposta.faltou ? 'FALTOU' : 'Presente'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar e Classificar'}
        </button>
      </div>
    </div>
  )
}
