'use client'

import { useState, useEffect } from 'react'

interface Config {
  escola_nome: string
  professor_nome: string
  cidade: string
  escola_logo_url: string
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Config>({
    escola_nome: '',
    professor_nome: '',
    cidade: 'Teresina - PI',
    escola_logo_url: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarConfig()
  }, [])

  async function carregarConfig() {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracao')
      const { data } = await response.json()
      
      if (data) {
        setConfig(data)
      }
    } catch (err) {
      console.error('Erro ao carregar configuração:', err)
    } finally {
      setLoading(false)
    }
  }

  async function salvar() {
    if (!config.escola_nome.trim()) {
      alert('⚠️ Digite o nome da escola')
      return
    }

    if (!config.professor_nome.trim()) {
      alert('⚠️ Digite seu nome')
      return
    }

    try {
      setSalvando(true)
      
      const response = await fetch('/api/configuracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Configurações salvas com sucesso!')
    } catch (err) {
      alert('❌ Erro ao salvar configurações')
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

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>
          ⚙️ Configurações
        </h1>
        <p className="text-sm" style={{ color: '#000000' }}>
          Configure as informações que aparecerão nas atividades impressas
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 max-w-2xl">
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Nome da Escola *
            </label>
            <input
              type="text"
              value={config.escola_nome}
              onChange={(e) => setConfig({...config, escola_nome: e.target.value})}
              placeholder="Ex: Escola Municipal Professor João Silva"
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs mt-1" style={{ color: '#666666' }}>
              Aparecerá no cabeçalho das atividades impressas
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Seu Nome (Professor) *
            </label>
            <input
              type="text"
              value={config.professor_nome}
              onChange={(e) => setConfig({...config, professor_nome: e.target.value})}
              placeholder="Ex: Marcelo Santos"
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Cidade
            </label>
            <input
              type="text"
              value={config.cidade}
              onChange={(e) => setConfig({...config, cidade: e.target.value})}
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Logo da Escola (opcional)
            </label>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p style={{ color: '#666666' }} className="text-sm mb-2">
                📸 Upload de logo será implementado em breve
              </p>
              <p style={{ color: '#999999' }} className="text-xs">
                Por enquanto, as atividades usarão apenas o nome da escola
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> Estas configurações serão usadas em todas as atividades que você gerar. 
              Você pode alterá-las a qualquer momento.
            </p>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>

          <a
            href="/base/turmas"
            className="block text-center text-sm no-underline"
            style={{ color: '#666666' }}
          >
            ← Voltar para Turmas
          </a>
        </div>
      </div>
    </div>
  )
}
