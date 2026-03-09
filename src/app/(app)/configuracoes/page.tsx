
'use client'

import { useState, useEffect } from 'react'

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState({
    escola_nome: '',
    professor_nome: '',
    cidade: 'Teresina - PI',
    escola_logo_url: ''
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarConfig()
  }, [])

  async function carregarConfig() {
    const response = await fetch('/api/configuracao')
    const { data } = await response.json()
    if (data) setConfig(data)
  }

  async function salvar() {
    try {
      setSalvando(true)
      await fetch('/api/configuracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      alert('✅ Configurações salvas!')
    } catch (err) {
      alert('❌ Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block font-bold mb-2">Nome da Escola</label>
            <input
              type="text"
              value={config.escola_nome}
              onChange={(e) => setConfig({...config, escola_nome: e.target.value})}
              placeholder="Ex: E.M. Professor João Silva"
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">Seu Nome</label>
            <input
              type="text"
              value={config.professor_nome}
              onChange={(e) => setConfig({...config, professor_nome: e.target.value})}
              placeholder="Ex: Marcelo Santos"
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">Cidade</label>
            <input
              type="text"
              value={config.cidade}
              onChange={(e) => setConfig({...config, cidade: e.target.value})}
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">Logo da Escola (opcional)</label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-4 py-2 border rounded"
            />
            <p className="text-sm text-gray-500 mt-1">
              Será usado no cabeçalho das atividades impressas
            </p>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
          >
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
