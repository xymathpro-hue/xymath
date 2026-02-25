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
  const [deletando, setDeletando] = useState<string | null>(null)
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState({
    nome_completo: '',
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

  function abrirModalAdicionar() {
    setEditando(null)
    setFormData({ nome_completo: '', tem_laudo: false, observacoes: '' })
    setShowModal(true)
  }

  function abrirModalEditar(aluno: Aluno) {
    setEditando(aluno)
    setFormData({
      nome_completo: aluno.nome_completo,
      tem_laudo: aluno.tem_laudo,
      observacoes: aluno.observacoes || ''
    })
    setShowModal(true)
  }

  async function salvarAluno() {
    if (!formData.nome_completo.trim()) {
      alert('⚠️ Digite o nome do aluno')
      return
    }

    try {
      if (editando) {
        const response = await fetch(`/api/alunos/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (!response.ok) throw new Error('Erro ao editar')
        alert('✅ Aluno atualizado!')
      } else {
        const response = await fetch('/api/alunos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turma_id: turmaId,
            ...formData
          })
        })

        if (response.status === 409) {
          alert('⚠️ Este aluno já pertence a esta turma!')
          return
        }

        if (!response.ok) throw new Error('Erro ao adicionar')
        alert('✅ Aluno adicionado!')
      }

      setShowModal(false)
      setEditando(null)
      setFormData({ nome_completo: '', tem_laudo: false, observacoes: '' })
      carregarAlunos()
    } catch (err) {
      alert(`❌ Erro ao ${editando ? 'editar' : 'adicionar'} aluno`)
      console.error(err)
    }
  }

  async function deletarAluno(alunoId: string, alunoNome: string) {
    const confirma = confirm(`⚠️ Tem certeza que deseja remover o aluno "${alunoNome}"?\n\nISTO VAI DELETAR:\n- Todos os diagnósticos do aluno\n- Todas as notas do aluno\n- Todas as atividades do aluno\n\nEsta ação NÃO pode ser desfeita!`)
    
    if (!confirma) return

    try {
      setDeletando(alunoId)
      
      const response = await fetch(`/api/alunos/${alunoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao deletar')

      alert('✅ Aluno removido e numeração reordenada!')
      carregarAlunos()
    } catch (err) {
      alert('❌ Erro ao remover aluno')
      console.error(err)
    } finally {
      setDeletando(null)
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-700">Alunos da Turma</h1>
          <a href="/base/turmas" className="text-sm text-gray-600 hover:text-gray-900" style={{textDecoration: 'none'}}>
            ← Voltar para Turmas
          </a>
        </div>
        <button onClick={abrirModalAdicionar} className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium">
          ➕ Adicionar Aluno
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Nº</th>
              <th className="px-4 py-3 text-left text-gray-600">Nome</th>
              <th className="px-4 py-3 text-center text-gray-600">Laudo</th>
              <th className="px-4 py-3 text-left text-gray-600">Observações</th>
              <th className="px-4 py-3 text-center text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{aluno.numero_chamada}</td>
                <td className="px-4 py-3 text-gray-700">{aluno.nome_completo}</td>
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
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => abrirModalEditar(aluno)} className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar aluno">
                      ✏️
                    </button>
                    <button onClick={() => deletarAluno(aluno.id, aluno.nome_completo)} disabled={deletando === aluno.id} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Remover aluno">
                      {deletando === aluno.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">
              {editando ? 'Editar Aluno' : 'Adicionar Aluno'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Nome Completo *</label>
                <input type="text" value={formData.nome_completo} onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700" placeholder="João da Silva" autoFocus />
                {!editando && (
                  <p className="text-xs text-gray-500 mt-1">
                    O número de chamada será gerado automaticamente em ordem alfabética
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.tem_laudo} onChange={(e) => setFormData({ ...formData, tem_laudo: e.target.checked })} className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-600">Aluno possui laudo médico</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Observações</label>
                <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700" rows={3} placeholder="Ex: TDAH, Dislexia, etc." />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={() => { setShowModal(false); setEditando(null); }} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700">
                Cancelar
              </button>
              <button onClick={salvarAluno} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg">
                {editando ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
