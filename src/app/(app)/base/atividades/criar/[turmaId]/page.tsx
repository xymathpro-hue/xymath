'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
}

export default function CriarAtividadePage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [tipo, setTipo] = useState<'classe' | 'casa'>('classe')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [totalQuestoes, setTotalQuestoes] = useState(10)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [notas, setNotas] = useState<Record<string, number>>({})
  const [etapa, setEtapa] = useState<'criar' | 'lancar'>('criar')
  const [atividadeId, setAtividadeId] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarAlunos()
  }, [])

  async function carregarAlunos() {
    try {
      const response = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data } = await response.json()
      setAlunos(data.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
      
      // Inicializar notas zeradas
      const notasIniciais: Record<string, number> = {}
      data.forEach((aluno: Aluno) => {
        notasIniciais[aluno.id] = 0
      })
      setNotas(notasIniciais)
    } catch (err) {
      console.error(err)
    }
  }

  async function criarAtividade() {
    if (!titulo.trim()) {
      alert('❌ Digite um título para a atividade')
      return
    }

    try {
      setSalvando(true)
      
      const endpoint = tipo === 'classe' 
        ? '/api/base/atividades/classe'
        : '/api/base/atividades/casa'

      const payload = {
        turma_id: turmaId,
        titulo,
        [tipo === 'classe' ? 'data_aula' : 'data_entrega']: data,
        total_questoes: totalQuestoes
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      if (result.success) {
        setAtividadeId(result.data.id)
        setEtapa('lancar')
        alert('✅ Atividade criada! Agora lance as notas.')
      } else {
        throw new Error('Erro ao criar')
      }
    } catch (err) {
      alert('❌ Erro ao criar atividade')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarNotas() {
    try {
      setSalvando(true)
      
      const respostasArray = Object.entries(notas).map(([aluno_id, acertos]) => ({
        aluno_id,
        total_questoes: totalQuestoes,
        acertos: Math.max(0, Math.min(totalQuestoes, acertos))
      }))

      const endpoint = tipo === 'classe'
        ? '/api/base/atividades/classe/respostas'
        : '/api/base/atividades/casa/respostas'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          respostas: respostasArray
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Notas salvas com sucesso!')
      router.back()
    } catch (err) {
      alert('❌ Erro ao salvar notas')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  const atualizarNota = (alunoId: string, valor: number) => {
    setNotas(prev => ({
      ...prev,
      [alunoId]: Math.max(0, Math.min(totalQuestoes, valor))
    }))
  }

  if (etapa === 'criar') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Criar Atividade</h1>
          <p className="text-gray-600">Preencha os dados da atividade</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Atividade</label>
            <div className="flex gap-4">
              <button
                onClick={() => setTipo('classe')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium ${
                  tipo === 'classe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                📝 Atividade de Classe
              </button>
              <button
                onClick={() => setTipo('casa')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium ${
                  tipo === 'casa'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                🏠 Atividade de Casa
              </button>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Atividade sobre Frações"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {tipo === 'classe' ? 'Data da Aula' : 'Data de Entrega'}
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Total de Questões */}
          <div>
            <label className="block text-sm font-medium mb-2">Total de Questões</label>
            <input
              type="number"
              value={totalQuestoes}
              onChange={(e) => setTotalQuestoes(parseInt(e.target.value) || 10)}
              min="1"
              max="50"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={criarAtividade}
              disabled={salvando}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {salvando ? 'Criando...' : 'Criar e Lançar Notas'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Etapa de lançamento de notas
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Lançar Notas - {titulo}</h1>
        <p className="text-gray-600">Digite a quantidade de acertos de cada aluno</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Aluno</th>
                <th className="px-4 py-3 text-center">Acertos</th>
                <th className="px-4 py-3 text-center">Nota</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const nota = (notas[aluno.id] / totalQuestoes) * 10
                return (
                  <tr key={aluno.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{aluno.numero_chamada}</td>
                    <td className="px-4 py-3">{aluno.nome_completo}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => atualizarNota(aluno.id, notas[aluno.id] - 1)}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={notas[aluno.id]}
                          onChange={(e) => atualizarNota(aluno.id, parseInt(e.target.value) || 0)}
                          min="0"
                          max={totalQuestoes}
                          className="w-16 px-2 py-1 text-center border rounded"
                        />
                        <span className="text-gray-600">/ {totalQuestoes}</span>
                        <button
                          onClick={() => atualizarNota(aluno.id, notas[aluno.id] + 1)}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xl font-bold ${
                        nota >= 6 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {nota.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => setEtapa('criar')}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          Voltar
        </button>
        <button
          onClick={salvarNotas}
          disabled={salvando}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar Notas'}
        </button>
      </div>
    </div>
  )
}
