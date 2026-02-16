 
// src/app/(app)/base/avaliacoes/[turmaId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Avaliacao {
  id: string
  titulo: string
  bimestre: number
  mes: number
  data_aplicacao: string
  total_questoes: number
  total_respostas?: number
}

export default function ListarAvaliacoesPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  
  // Form de criação
  const [bimestre, setBimestre] = useState(1)
  const [mes, setMes] = useState(1)
  const [titulo, setTitulo] = useState('')
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    carregarAvaliacoes()
  }, [turmaId])

  async function carregarAvaliacoes() {
    try {
      setLoading(true)
      const response = await fetch(`/api/base/avaliacoes-mensais?turma_id=${turmaId}`)
      const result = await response.json()
      setAvaliacoes(result.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function criarAvaliacao() {
    if (!titulo.trim()) {
      alert('❌ Digite um título para a avaliação')
      return
    }

    try {
      setCriando(true)
      
      const response = await fetch('/api/base/avaliacoes-mensais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          bimestre,
          mes,
          titulo,
          data_aplicacao: dataAplicacao,
          total_questoes: 12
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('✅ Avaliação criada!')
        setTitulo('')
        carregarAvaliacoes()
      } else {
        throw new Error(result.error || 'Erro ao criar')
      }
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`)
    } finally {
      setCriando(false)
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
        <h1 className="text-3xl font-bold">Avaliações Mensais BASE</h1>
        <p className="text-gray-600">Gerencie as avaliações mensais da turma</p>
      </div>

      {/* Formulário de Criação */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Criar Nova Avaliação</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bimestre */}
          <div>
            <label className="block text-sm font-medium mb-2">Bimestre</label>
            <select
              value={bimestre}
              onChange={(e) => setBimestre(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            >
              {[1, 2, 3, 4].map(b => (
                <option key={b} value={b}>{b}º Bimestre</option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div>
            <label className="block text-sm font-medium mb-2">Avaliação</label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value={1}>Mensal 1</option>
              <option value={2}>Mensal 2</option>
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium mb-2">Data de Aplicação</label>
            <input
              type="date"
              value={dataAplicacao}
              onChange={(e) => setDataAplicacao(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Avaliação Mensal 1"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={criarAvaliacao}
          disabled={criando}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {criando ? 'Criando...' : '➕ Criar Avaliação'}
        </button>
      </div>

      {/* Lista de Avaliações */}
      <div className="bg-white rounded-lg shadow">
        {avaliacoes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg">Nenhuma avaliação criada ainda</p>
            <p className="text-sm">Crie uma avaliação acima para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-center">Bimestre</th>
                  <th className="px-4 py-3 text-center">Mês</th>
                  <th className="px-4 py-3 text-center">Data</th>
                  <th className="px-4 py-3 text-center">Questões</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes
                  .sort((a, b) => {
                    if (a.bimestre !== b.bimestre) return b.bimestre - a.bimestre
                    return b.mes - a.mes
                  })
                  .map((aval) => (
                    <tr key={aval.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{aval.titulo}</td>
                      <td className="px-4 py-3 text-center">{aval.bimestre}º</td>
                      <td className="px-4 py-3 text-center">M{aval.mes}</td>
                      <td className="px-4 py-3 text-center">
                        {new Date(aval.data_aplicacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">{aval.total_questoes}</td>
                      <td className="px-4 py-3 text-center">
                        {aval.total_respostas ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                            ✓ Corrigida
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                            ⏳ Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/base/avaliacoes/lancar/${aval.id}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-block"
                        >
                          📝 Lançar Notas
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
