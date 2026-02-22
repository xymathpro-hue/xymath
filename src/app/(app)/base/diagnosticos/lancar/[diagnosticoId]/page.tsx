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
  faltou: boolean
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
      
      const resDiag = await fetch(`/api/base/diagnosticos/${diagnosticoId}`)
      const diag = await resDiag.json()
      setDiagnostico(diag)
      
      const resAlunos = await fetch(`/api/alunos?turma_id=${diag.turma_id}`)
      const { data } = await resAlunos.json()
      setAlunos(data.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
      
      const respostasIniciais: Record<string, Resposta> = {}
      data.forEach((aluno: Aluno) => {
        respostasIniciais[aluno.id] = {
          aluno_id: aluno.id,
          faltou: false,
          questao_1: 0,
          questao_2: 0,
          questao_3: 0,
          questao_4: 0,
          questao_5: 0,
          questao_6: 0,
          questao_7: 0,
          questao_8: 0,
          questao_9: 0,
          questao_10: 0
        }
      })
      setRespostas(respostasIniciais)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function marcarQuestao(alunoId: string, questao: number, valor: number) {
    setRespostas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [`questao_${questao}`]: valor
      }
    }))
  }

  function toggleFaltou(alunoId: string) {
    setRespostas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        faltou: !prev[alunoId].faltou,
        // Zerar questões se marcar como faltou
        questao_1: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_1,
        questao_2: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_2,
        questao_3: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_3,
        questao_4: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_4,
        questao_5: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_5,
        questao_6: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_6,
        questao_7: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_7,
        questao_8: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_8,
        questao_9: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_9,
        questao_10: !prev[alunoId].faltou ? 0 : prev[alunoId].questao_10
      }
    }))
  }

  const calcularTotal = (alunoId: string) => {
    const r = respostas[alunoId]
    if (r.faltou) return 0
    return r.questao_1 + r.questao_2 + r.questao_3 + r.questao_4 + r.questao_5 +
           r.questao_6 + r.questao_7 + r.questao_8 + r.questao_9 + r.questao_10
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
          Marque: ✓ Certo (1 pt) | ✗ Errado (0 pt) | ½ Meio (0.5 pt) | ⬜ Branco (0 pt)
        </p>
      </div>

      {/* Tabela de Lançamento */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-100">Nº</th>
                <th className="px-4 py-3 text-left sticky left-12 bg-gray-100">Aluno</th>
                <th className="px-4 py-3 text-center">Faltou</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(q => (
                  <th key={q} className="px-2 py-3 text-center text-sm">Q{q}</th>
                ))}
                <th className="px-4 py-3 text-center bg-gray-200 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const faltou = respostas[aluno.id]?.faltou
                const total = calcularTotal(aluno.id)
                
                return (
                  <tr key={aluno.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium sticky left-0 bg-white">{aluno.numero_chamada}</td>
                    <td className="px-4 py-3 sticky left-12 bg-white">{aluno.nome_completo}</td>
                    
                    {/* Checkbox Faltou */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={faltou}
                        onChange={() => toggleFaltou(aluno.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </td>
                    
                    {/* Questões 1-10 */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(q => {
                      const valor = respostas[aluno.id]?.[`questao_${q}` as keyof Resposta] as number
                      
                      return (
                        <td key={q} className="px-1 py-2">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => marcarQuestao(aluno.id, q, 1)}
                              disabled={faltou}
                              className={`w-8 h-8 rounded text-sm font-bold ${
                                valor === 1 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              } ${faltou ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title="Certo (1 pt)"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => marcarQuestao(aluno.id, q, 0)}
                              disabled={faltou}
                              className={`w-8 h-8 rounded text-sm font-bold ${
                                valor === 0 && !faltou
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              } ${faltou ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title="Errado (0 pt)"
                            >
                              ✗
                            </button>
                            <button
                              onClick={() => marcarQuestao(aluno.id, q, 0.5)}
                              disabled={faltou}
                              className={`w-8 h-8 rounded text-sm font-bold ${
                                valor === 0.5 
                                  ? 'bg-yellow-600 text-white' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              } ${faltou ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title="Meio certo (0.5 pt)"
                            >
                              ½
                            </button>
                          </div>
                        </td>
                      )
                    })}
                    
                    {/* Total */}
                    <td className="px-4 py-3 text-center">
                      {faltou ? (
                        <span className="px-3 py-1 bg-gray-400 text-white rounded font-bold">
                          FALTOU
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded font-bold ${
                          total >= 7 ? 'bg-green-100 text-green-800' :
                          total >= 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {total.toFixed(1)}/10
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
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
          {salvando ? 'Salvando...' : 'Salvar e Classificar'}
        </button>
      </div>

      {/* Legenda */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">📋 Legenda de Correção:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="font-bold">✓</span> Certo = 1 ponto</div>
          <div><span className="font-bold">✗</span> Errado = 0 pontos</div>
          <div><span className="font-bold">½</span> Meio certo = 0.5 pontos</div>
          <div><span className="font-bold">🚫</span> Faltou = Ausente</div>
        </div>
      </div>
    </div>
  )
}
