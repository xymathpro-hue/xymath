'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Atividade {
  id: string
  titulo: string
  habilidade_bncc: string
  data_aplicacao: string
  tipo: string
  competencias: string[]
  bimestre: number
}

export default function AtividadesPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarAtividades()
  }, [])

  async function carregarAtividades() {
    try {
      setLoading(true)
      const response = await fetch(`/api/base/atividades?turma_id=${turmaId}`)
      const { data } = await response.json()
      setAtividades(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR')
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-700">Atividades BASE</h1>
          <p className="text-sm text-gray-600">Gestão de atividades diferenciadas por grupo</p>
        </div>
        <a
          href={`/base/atividades/criar/${turmaId}`}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium no-underline"
        >
          + Nova Atividade
        </a>
      </div>

      {atividades.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <p className="text-gray-500 text-lg mb-4">Nenhuma atividade cadastrada ainda</p>
          <a
            href={`/base/atividades/criar/${turmaId}`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium no-underline inline-block"
          >
            Criar primeira atividade
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Data</th>
                <th className="px-4 py-3 text-left text-gray-600">Título</th>
                <th className="px-4 py-3 text-left text-gray-600">Habilidade</th>
                <th className="px-4 py-3 text-left text-gray-600">Competências</th>
                <th className="px-4 py-3 text-left text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left text-gray-600">Bimestre</th>
                <th className="px-4 py-3 text-center text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {atividades.map((atividade) => (
                <tr key={atividade.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {formatarData(atividade.data_aplicacao)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {atividade.titulo}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {atividade.habilidade_bncc}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {atividade.competencias?.map((comp, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm capitalize">
                    {atividade.tipo === 'classe_casa' ? 'Classe + Casa' : atividade.tipo}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {atividade.bimestre}º Bim
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/base/atividades/lancar/${atividade.id}`}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium no-underline"
                    >
                      Lançar Notas
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
