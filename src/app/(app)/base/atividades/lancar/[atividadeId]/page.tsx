'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
  classificacao_base: 'A' | 'B' | 'C' | null
}

interface Atividade {
  id: string
  titulo: string
  habilidade_bncc: string
  data_aplicacao: string
  tipo: string
  turma_id: string
}

interface Resposta {
  aluno_id: string
  grupo_aluno: 'A' | 'B' | 'C'
  questao_1_classe: number
  questao_2_classe: number
  questao_3_classe: number
  questao_4_classe: number
  questao_5_classe: number
  questao_6_classe: number
  questao_1_casa: number
  questao_2_casa: number
  questao_3_casa: number
  questao_4_casa: number
  questao_5_casa: number
  questao_6_casa: number
  faltou_classe: boolean
  faltou_casa: boolean
}

export default function LancarNotasAtividadePage() {
  const params = useParams()
  const atividadeId = params.atividadeId as string
  
  const [atividade, setAtividade] = useState<Atividade | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [respostas, setRespostas] = useState<Map<string, Resposta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tabAtiva, setTabAtiva] = useState<'classe' | 'casa'>('classe')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      
      // 1. Buscar atividade diretamente do Supabase
      const supabase = createClient()
      
      const { data: atividadeData, error: atividadeError } = await supabase
        .from('base_atividades')
        .select('*')
        .eq('id', atividadeId)
        .single()
      
      if (atividadeError || !atividadeData) {
        alert('Atividade não encontrada!')
        console.error('Erro ao buscar atividade:', atividadeError)
        return
      }
      
      setAtividade(atividadeData)
      
      // 2. Carregar alunos
      const responseAlunos = await fetch(`/api/alunos?turma_id=${atividadeData.turma_id}`)
      const { data: alunosData } = await responseAlunos.json()
      setAlunos(alunosData.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
      
      // 3. Buscar respostas já salvas
      const responseRespostas = await fetch(`/api/base/atividades/respostas?atividade_id=${atividadeId}`)
      const respostasSalvas = responseRespostas.ok 
        ? await responseRespostas.json() 
        : { data: [] }
      
      // 4. Inicializar respostas
      const respostasIniciais = new Map<string, Resposta>()
      
      alunosData.forEach((aluno: Aluno) => {
        const respostaSalva = respostasSalvas.data?.find((r: any) => r.aluno_id === aluno.id)
        
        if (respostaSalva) {
          respostasIniciais.set(aluno.id, {
            aluno_id: aluno.id,
            grupo_aluno: respostaSalva.grupo_aluno,
            questao_1_classe: respostaSalva.questao_1_classe,
            questao_2_classe: respostaSalva.questao_2_classe,
            questao_3_classe: respostaSalva.questao_3_classe,
            questao_4_classe: respostaSalva.questao_4_classe,
            questao_5_classe: respostaSalva.questao_5_classe,
            questao_6_classe: respostaSalva.questao_6_classe,
            questao_1_casa: respostaSalva.questao_1_casa,
            questao_2_casa: respostaSalva.questao_2_casa,
            questao_3_casa: respostaSalva.questao_3_casa,
            questao_4_casa: respostaSalva.questao_4_casa,
            questao_5_casa: respostaSalva.questao_5_casa,
            questao_6_casa: respostaSalva.questao_6_casa,
            faltou_classe: respostaSalva.faltou_classe,
            faltou_casa: respostaSalva.faltou_casa
          })
        } else {
          respostasIniciais.set(aluno.id, {
            aluno_id: aluno.id,
            grupo_aluno: aluno.classificacao_base || 'A',
            questao_1_classe: -1,
            questao_2_classe: -1,
            questao_3_classe: -1,
            questao_4_classe: -1,
            questao_5_classe: -1,
            questao_6_classe: -1,
            questao_1_casa: -1,
            questao_2_casa: -1,
            questao_3_casa: -1,
            questao_4_casa: -1,
            questao_5_casa: -1,
            questao_6_casa: -1,
            faltou_classe: false,
            faltou_casa: false
          })
        }
      })
      
      setRespostas(respostasIniciais)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      alert('Erro ao carregar dados!')
    } finally {
      setLoading(false)
    }
  }

  function marcarResposta(alunoId: string, tipo: 'classe' | 'casa', questao: number, valor: number) {
    const novasRespostas = new Map(respostas)
    const resposta = novasRespostas.get(alunoId)!
    const key = `questao_${questao}_${tipo}` as keyof Resposta
    resposta[key] = valor as never
    novasRespostas.set(alunoId, resposta)
    setRespostas(novasRespostas)
  }

  function marcarFaltou(alunoId: string, tipo: 'classe' | 'casa') {
    const novasRespostas = new Map(respostas)
    const resposta = novasRespostas.get(alunoId)!
    
    if (tipo === 'classe') {
      resposta.faltou_classe = !resposta.faltou_classe
      if (resposta.faltou_classe) {
        for (let i = 1; i <= 6; i++) {
          const key = `questao_${i}_classe` as keyof Resposta
          resposta[key] = -1 as never
        }
      }
    } else {
      resposta.faltou_casa = !resposta.faltou_casa
      if (resposta.faltou_casa) {
        for (let i = 1; i <= 6; i++) {
          const key = `questao_${i}_casa` as keyof Resposta
          resposta[key] = -1 as never
        }
      }
    }
    
    novasRespostas.set(alunoId, resposta)
    setRespostas(novasRespostas)
  }

  function calcularTotal(alunoId: string, tipo: 'classe' | 'casa'): number {
    const resposta = respostas.get(alunoId)!
    
    if (tipo === 'classe' && resposta.faltou_classe) return 0
    if (tipo === 'casa' && resposta.faltou_casa) return 0
    
    let total = 0
    for (let i = 1; i <= 6; i++) {
      const key = `questao_${i}_${tipo}` as keyof Resposta
      const valor = resposta[key] as number
      if (valor > 0) total += valor
    }
    return total
  }

  function getCorTotal(total: number): string {
    if (total >= 4.5) return 'text-green-700 font-bold'
    if (total >= 3) return 'text-yellow-700 font-bold'
    return 'text-red-700 font-bold'
  }

  function getCorGrupo(grupo: string): string {
    if (grupo === 'A') return 'bg-red-100 text-red-700'
    if (grupo === 'B') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  async function salvar() {
    try {
      setSalvando(true)
      
      const respostasArray = Array.from(respostas.values()).map(r => {
        const resposta = { ...r }
        for (let i = 1; i <= 6; i++) {
          const keyClasse = `questao_${i}_classe` as keyof Resposta
          const keyCasa = `questao_${i}_casa` as keyof Resposta
          if (resposta[keyClasse] === -1) resposta[keyClasse] = 0 as never
          if (resposta[keyCasa] === -1) resposta[keyCasa] = 0 as never
        }
        return resposta
      })
      
      const response = await fetch('/api/base/atividades/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          respostas: respostasArray
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Notas salvas com sucesso!')
      window.location.href = `/base/atividades/${atividade?.turma_id}`
    } catch (err) {
      alert('❌ Erro ao salvar notas')
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

  if (!atividade) {
    return (
      <div className="container mx-auto p-6">
        <p>Atividade não encontrada</p>
        <a href="/base/turmas" className="text-blue-600 hover:underline">Voltar para Turmas</a>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-700">{atividade.titulo}</h1>
        <p className="text-gray-600">
          {atividade.habilidade_bncc} • {new Date(atividade.data_aplicacao).toLocaleDateString('pt-BR')}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Marque: ✓ Certo (1pt) | ✗ Errado (0pt) | ½ Meio (0.5pt) | ⬜ Branco (0pt)
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTabAtiva('classe')}
          className={`px-6 py-3 rounded-lg font-medium ${
            tabAtiva === 'classe'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          📝 Classe (6 questões)
        </button>
        <button
          onClick={() => setTabAtiva('casa')}
          className={`px-6 py-3 rounded-lg font-medium ${
            tabAtiva === 'casa'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🏠 Casa (6 questões)
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-gray-600">Nº</th>
              <th className="px-3 py-3 text-left text-gray-600">Aluno</th>
              <th className="px-3 py-3 text-center text-gray-600">Grupo</th>
              {[1, 2, 3, 4, 5, 6].map(q => (
                <th key={q} className="px-2 py-3 text-center text-gray-600 min-w-[130px]">Q{q}</th>
              ))}
              <th className="px-3 py-3 text-center text-gray-600 min-w-[80px]">Total</th>
              <th className="px-3 py-3 text-center text-gray-600 min-w-[100px]">Faltou</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alunos.map((aluno) => {
              const resposta = respostas.get(aluno.id)!
              const total = calcularTotal(aluno.id, tabAtiva)
              const faltou = tabAtiva === 'classe' ? resposta.faltou_classe : resposta.faltou_casa
              
              return (
                <tr key={aluno.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700 font-medium">{aluno.numero_chamada}</td>
                  <td className="px-3 py-2 text-gray-700 text-sm">{aluno.nome_completo}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded font-bold ${getCorGrupo(resposta.grupo_aluno)}`}>
                      {resposta.grupo_aluno}
                    </span>
                  </td>
                  
                  {[1, 2, 3, 4, 5, 6].map(q => {
                    const key = `questao_${q}_${tabAtiva}` as keyof Resposta
                    const valor = resposta[key] as number
                    
                    return (
                      <td key={q} className="px-2 py-2">
                        <div className="flex gap-1 justify-center">
                          <button 
                            onClick={() => marcarResposta(aluno.id, tabAtiva, q, 1)} 
                            disabled={faltou}
                            className={`w-7 h-7 rounded text-xs ${valor === 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ✓
                          </button>
                          <button 
                            onClick={() => marcarResposta(aluno.id, tabAtiva, q, 0)} 
                            disabled={faltou}
                            className={`w-7 h-7 rounded text-xs ${Number(valor) === 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ✗
                          </button>
                          <button 
                            onClick={() => marcarResposta(aluno.id, tabAtiva, q, 0.5)} 
                            disabled={faltou}
                            className={`w-7 h-7 rounded text-xs ${valor === 0.5 ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ½
                          </button>
                          <button 
                            onClick={() => marcarResposta(aluno.id, tabAtiva, q, -1)} 
                            disabled={faltou}
                            className={`w-7 h-7 rounded text-xs ${valor === -1 ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            ⬜
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
                      onClick={() => marcarFaltou(aluno.id, tabAtiva)} 
                      className={`px-3 py-1 rounded text-sm font-medium ${faltou ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    >
                      {faltou ? 'FALTOU' : 'Presente'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <a 
          href={`/base/atividades/${atividade.turma_id}`} 
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium no-underline"
        >
          Cancelar
        </a>
        <button 
          onClick={salvar} 
          disabled={salvando}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar Notas'}
        </button>
      </div>
    </div>
  )
}
