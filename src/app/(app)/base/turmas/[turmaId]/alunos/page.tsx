'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Aluno {
  id: string
  nome_completo: string
  numero_chamada: number
  tem_laudo: boolean
  observacoes?: string
}

export default function AlunosPage() {
  const params = useParams()
  const turmaId = params.turmaId as string
  
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    numero_chamada: 1,
    tem_laudo: false,
    observacoes: ''
  })

  useEffect(() => {
    carregarAlunos()
  }, [])

  async function carregarAlunos() {
    try {
      setLoading(true)
      const response = await fetch(`/api/alunos?turma_id=${turmaId}`)
      const { data } = await response.json()
      setAlunos(data.sort((a: Aluno, b: Aluno) => a.numero_chamada - b.numero_chamada))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function adicionarAluno() {
    try {
      const response = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          ...formData
        })
      })

      if (!response.ok) throw new Error('Erro ao adicionar')

      alert('✅ Aluno adicionado!')
      setShowModal(false)
      setFormData({ nome_completo: '', numero_chamada: alunos.length + 1, tem_laudo: false, observacoes: '' })
      carregarAlunos()
    } catch (err) {
      alert('❌ Erro ao adicionar aluno')
      console.error(err)
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Alunos da Turma</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          ➕ Adicionar Aluno
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-center">Laudo</th>
              <th className="px-4 py-3 text-left">Observações</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{aluno.numero_chamada}</td>
                <td className="px-4 py-3">{aluno.nome_completo}</td>
                <td className="px-4 py-3 text-center">
                  {aluno.tem_laudo ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                      ⚠️ Sim
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                      Não
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {aluno.observacoes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Adicionar Aluno</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="João da Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Número de Chamada</label>
                <input
                  type="number"
                  value={formData.numero_chamada}
                  onChange={(e) => setFormData({ ...formData, numero_chamada: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.tem_laudo}
                    onChange={(e) => setFormData({ ...formData, tem_laudo: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium">Aluno possui laudo médico</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Ex: TDAH, Dislexia, etc."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarAluno}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
