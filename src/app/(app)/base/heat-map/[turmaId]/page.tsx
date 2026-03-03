'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
}

interface RespostaDiagnostico {
  aluno_id: string
  tipo_diagnostico: 'D1' | 'D2' | 'D3'
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

interface CompetenciasPorAluno {
  [alunoId: string]: {
    L: number // Leitura (Q1, Q2)
    F: number // Fluência (Q3, Q4)
    R: number // Raciocínio (Q5, Q6)
    A: number // Aplicação (Q7, Q8)
    J: number // Justificativa (Q9, Q10)
  }
}

// Mapeamento fixo de questões para competências
const MAPEAMENTO: { [key: number]: 'L' | 'F' | 'R' | 'A' | 'J' } = {
  1: 'L', 2: 'L',
  3: 'F', 4: 'F',
  5: 'R', 6: 'R',
  7: 'A', 8: 'A',
  9: 'J', 10: 'J'
}

export default function HeatMapPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [bimestreAtivo, setBimestreAtivo] = useState(1)
  const [competencias, setCompetencias] = useState<CompetenciasPorAluno>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [bimestreAtivo])

  async function carregarDados() {
    try {
      setLoading(true)
      
      // 1. Carregar alunos
      const responseAlunos = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data: alunosData } = await responseAlunos.json()
      setAlunos(alunosData.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
      
      // 2. Carregar todas as respostas do bimestre
      const responseRespostas = await fetch(
        `/api/base/diagnosticos/respostas?turma_id=${turmaId}&bimestre=${bimestreAtivo}`
      )
      
      if (!responseRespostas.ok) {
        setCompetencias({})
        return
      }
      
      const { data: respostas } = await responseRespostas.json()
      
      // 3. Calcular competências por aluno
      const competenciasPorAluno: CompetenciasPorAluno = {}
      
      alunosData.forEach((aluno: Aluno) => {
        // Buscar todas as respostas desse aluno (D1, D2, D3)
        const respostasAluno = respostas?.filter((r: RespostaDiagnostico) => r.aluno_id === aluno.id) || []
        
        // Inicializar contadores
        const acertos = { L: 0, F: 0, R: 0, A: 0, J: 0 }
        const totais = { L: 0, F: 0, R: 0, A: 0, J: 0 }
        
        // Processar cada diagnóstico (D1, D2, D3)
        respostasAluno.forEach((resp: RespostaDiagnostico) => {
          if (resp.faltou) return // Ignora se faltou
          
          // Processar cada questão
          for (let q = 1; q <= 10; q++) {
            const key = `questao_${q}` as keyof RespostaDiagnostico
            const valor = resp[key] as number
            const competencia = MAPEAMENTO[q]
            
            // Somar acertos e totais por competência
            if (valor >= 0) { // -1 = branco, não conta
              totais[competencia] += 1
              acertos[competencia] += valor
            }
          }
        })
        
        // Calcular percentuais
        competenciasPorAluno[aluno.id] = {
          L: totais.L > 0 ? Math.round((acertos.L / totais.L) * 100) : -1,
          F: totais.F > 0 ? Math.round((acertos.F / totais.F) * 100) : -1,
          R: totais.R > 0 ? Math.round((acertos.R / totais.R) * 100) : -1,
          A: totais.A > 0 ? Math.round((acertos.A / totais.A) * 100) : -1,
          J: totais.J > 0 ? Math.round((acertos.J / totais.J) * 100) : -1
        }
      })
      
      setCompetencias(competenciasPorAluno)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function getCorCompetencia(percentual: number): string {
    if (percentual < 0) return 'bg-gray-200 text-gray-500'
    if (percentual >= 70) return 'bg-green-500 text-white'
    if (percentual >= 50) return 'bg-yellow-500 text-white'
    if (percentual >= 30) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
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
        <h1 className="text-3xl font-bold text-gray-700">Heat Map de Competências</h1>
        <p className="text-sm text-gray-600">Visualização do domínio por competência BASE</p>
      </div>

      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((bim) => (
          <button
            key={bim}
            onClick={() => setBimestreAtivo(bim)}
            className={`px-4 py-2 rounded-lg font-medium ${
              bimestreAtivo === bim
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {bim}º Bim
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded"></div>
          <span className="text-gray-600">≥70% (Domínio)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">50-69% (Parcial)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded"></div>
          <span className="text-gray-600">30-49% (Dificuldade)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded"></div>
          <span className="text-gray-600">{'<'}30% (Crítico)</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 sticky left-0 bg-gray-100">Nº</th>
              <th className="px-4 py-3 text-left text-gray-600 min-w-[250px]">Aluno</th>
              <th className="px-4 py-3 text-center text-gray-600 min-w-[100px]">
                L<br/>
                <span className="text-xs font-normal">Leitura</span>
              </th>
              <th className="px-4 py-3 text-center text-gray-600 min-w-[100px]">
                F<br/>
                <span className="text-xs font-normal">Fluência</span>
              </th>
              <th className="px-4 py-3 text-center text-gray-600 min-w-[100px]">
                R<br/>
                <span className="text-xs font-normal">Raciocínio</span>
              </th>
              <th className="px-4 py-3 text-center text-gray-600 min-w-[100px]">
                A<br/>
                <span className="text-xs font-normal">Aplicação</span>
              </th>
              <th className="px-4 py-3 text-center text-gray-600 min-w-[100px]">
                J<br/>
                <span className="text-xs font-normal">Justificativa</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alunos.map((aluno) => {
              const comp = competencias[aluno.id]
              
              if (!comp) {
                return (
                  <tr key={aluno.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700">{aluno.numero_chamada}</td>
                    <td className="px-4 py-3 text-gray-700">{aluno.nome_completo}</td>
                    <td colSpan={5} className="px-4 py-3 text-center text-gray-500 text-sm">
                      Sem dados no {bimestreAtivo}º bimestre
                    </td>
                  </tr>
                )
              }
              
              return (
                <tr key={aluno.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{aluno.numero_chamada}</td>
                  <td className="px-4 py-3 text-gray-700">{aluno.nome_completo}</td>
                  
                  {(['L', 'F', 'R', 'A', 'J'] as const).map((competencia) => {
                    const valor = comp[competencia]
                    return (
                      <td key={competencia} className="px-4 py-3 text-center">
                        <div className={`px-3 py-2 rounded font-bold ${getCorCompetencia(valor)}`}>
                          {valor >= 0 ? `${valor}%` : '-'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <a
          href={`/base/turmas`}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium no-underline inline-block"
        >
          ← Voltar para Turmas
        </a>
      </div>
    </div>
  )
}
