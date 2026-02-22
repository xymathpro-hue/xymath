// src/app/(app)/turmas/criar/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CriarTurmaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    ano_escolar: 7,
    ano_letivo: 2026
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.nome) {
      alert('⚠️ Preencha o nome da turma')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar turma')
      }

      alert('✅ Turma criada com sucesso!')
      router.push('/turmas')
    } catch (error: any) {
      alert(`❌ Erro: ${error.message}`)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Criar Nova Turma</h1>
        <p className="text-gray-600">Preencha os dados da turma</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Nome da Turma */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Turma *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: 7º Ano A, 8DM, Turma 901"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Ano Escolar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano Escolar *
          </label>
          <select
            value={formData.ano_escolar}
            onChange={(e) => setFormData({ ...formData, ano_escolar: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={6}>6º ano</option>
            <option value={7}>7º ano</option>
            <option value={8}>8º ano</option>
            <option value={9}>9º ano</option>
          </select>
        </div>

        {/* Ano Letivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano Letivo *
          </label>
          <select
            value={formData.ano_letivo}
            onChange={(e) => setFormData({ ...formData, ano_letivo: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Turma'}
          </button>
        </div>
      </form>

      {/* Dica */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Dica:</h3>
        <p className="text-sm text-gray-700">
          Após criar a turma, você poderá adicionar alunos na próxima tela.
        </p>
      </div>
    </div>
  )
}
