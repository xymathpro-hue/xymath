'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Atividade {
  id: string
  titulo: string
  data_aula?: string
  data_entrega?: string
  total_questoes: number
  tipo: 'classe' | 'casa'
  total_respostas?: number
}

export default function ListarAtividadesPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'classe' | 'casa'>('todas')
  const [mes, setMes] = useState<string>('')

  useEffect(() => {
    carregarAtividades()
  }, [turmaId, mes])

  async function carregarAtividades() {
    try {
      setLoading(true)
      
      // Buscar atividades de classe
      const resClasse = await fetch(
        `/api/base/atividades/classe?turma_id=${turmaId}${mes ? `&mes=${mes}` : ''}`
      )
      const classeData = await resClasse.json()
      
      // Buscar atividades de casa
      const resCasa = await fetch(
        `/api/base/atividades/casa?turma_id=${turmaId}${mes ? `&mes=${mes}` : ''}`
      )
      const casaData = await resCasa.json()
      
      // Combinar e marcar tipo
      const atividadesClasse = (classeData.data || []).map((a: any) => ({
        ...a,
        tipo: 'classe' as const
      }))
      
      const atividadesCasa = (casaData.data || []).map((a: any) => ({
        ...a,
        tipo: 'casa' as const
      }))
      
      setAtividades([...atividadesClasse, ...atividadesCasa])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const atividadesFiltradas = atividades.filter(a => {
    if (filtro === 'todas') return true
    return a.tipo === filtro
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Atividades BASE</h1>
          <p className="text-gray-600">Gerencie atividades de classe e casa</p>
        </div>
        
        <Link
          href={`/base/atividades/criar/${turmaId}`}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          ➕ Nova Atividade
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filtro === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltro('classe')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filtro === 'classe'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            📝 Classe
          </button>
          <button
            onClick={() => setFiltro('casa')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filtro === 'casa'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🏠 Casa
          </button>
        </div>

        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {new Date(2026, m - 1).toLocaleString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Atividades</div>
          <div className="text-3xl font-bold mt-2">{atividadesFiltradas.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Atividades de Classe</div>
          <div className="text-3xl font-bold mt-2">
            {atividades.filter(a => a.tipo === 'classe').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Atividades de Casa</div>
          <div className="text-3xl font-bold mt-2">
            {atividades.filter(a => a.tipo === 'casa').length}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow">
        {atividadesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">✏️</div>
            <p className="text-lg">Nenhuma atividade encontrada</p>
            <p className="text-sm">Crie uma nova atividade para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Data</th>
                  <th className="px-4 py-3 text-center">Questões</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {atividadesFiltradas
                  .sort((a, b) => {
                    const dataA = new Date(a.data_aula || a.data_entrega || '')
                    const dataB = new Date(b.data_aula || b.data_entrega || '')
                    return dataB.getTime() - dataA.getTime()
                  })
                  .map((ativ) => (
                    <tr key={ativ.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ativ.titulo}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          ativ.tipo === 'classe'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {ativ.tipo === 'classe' ? '📝 Classe' : '🏠 Casa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {new Date(ativ.data_aula || ativ.data_entrega || '').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">{ativ.total_questoes}</td>
                      <td className="px-4 py-3 text-center">
                        {ativ.total_respostas ? (
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
                        <button
                          onClick={() => router.push(`/base/atividades/lancar/${ativ.id}`)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                        >
                          📝 Ver/Editar
                        </button>
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
