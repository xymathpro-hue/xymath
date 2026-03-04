'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Turma {
  id: string
  nome: string
  ano: string
}

export default function CriarAtividadePage() {
  const router = useRouter()
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([])
  const [titulo, setTitulo] = useState('')
  const [habilidade, setHabilidade] = useState('')
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState('classe_casa')
  const [bimestre, setBimestre] = useState(1)
  const [competencias, setCompetencias] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      const response = await fetch('/api/turmas')
      const { data } = await response.json()
      setTurmas(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  function toggleTurma(turmaId: string) {
    if (turmasSelecionadas.includes(turmaId)) {
      setTurmasSelecionadas(turmasSelecionadas.filter(id => id !== turmaId))
    } else {
      setTurmasSelecionadas([...turmasSelecionadas, turmaId])
    }
  }

  function toggleCompetencia(comp: string) {
    if (competencias.includes(comp)) {
      setCompetencias(competencias.filter(c => c !== comp))
    } else {
      setCompetencias([...competencias, comp])
    }
  }

  async function salvar() {
    if (!titulo || !data) {
      alert('Preencha título e data!')
      return
    }

    if (turmasSelecionadas.length === 0) {
      alert('Selecione pelo menos uma turma!')
      return
    }

    try {
      setSalvando(true)
      
      // Criar atividade para cada turma selecionada
      const promises = turmasSelecionadas.map(turma_id => 
        fetch('/api/base/atividades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turma_id,
            titulo,
            habilidade_bncc: habilidade,
            data_aplicacao: data,
            tipo,
            competencias,
            bimestre
          })
        })
      )

      await Promise.all(promises)

      alert(`✅ Atividade criada para ${turmasSelecionadas.length} turma(s)!`)
      router.push('/base/turmas')
    } catch (err) {
      alert('❌ Erro ao criar atividade')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Nova Atividade BASE</h1>
        <p className="text-sm" style={{ color: '#000000' }}>Cadastrar atividade diferenciada por grupo</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 max-w-2xl">
        <div className="space-y-4">
          
          {/* SELEÇÃO DE TURMAS */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Turmas * (selecione uma ou mais)
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              {turmas.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma turma cadastrada</p>
              ) : (
                turmas.map((turma) => (
                  <label key={turma.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={turmasSelecionadas.includes(turma.id)}
                      onChange={() => toggleTurma(turma.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span style={{ color: '#000000' }} className="font-medium">{turma.nome}</span>
                    <span style={{ color: '#666666' }} className="text-sm">({turma.ano})</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: '#000000' }}>
              {turmasSelecionadas.length} turma(s) selecionada(s)
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Título da Atividade *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Frações - Parte/Inteiro"
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Habilidade BNCC
            </label>
            <input
              type="text"
              value={habilidade}
              onChange={(e) => setHabilidade(e.target.value)}
              placeholder="Ex: EF07MA13"
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
                Data de Aplicação *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                style={{ color: '#000000' }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
                Bimestre
              </label>
              <select
                value={bimestre}
                onChange={(e) => setBimestre(parseInt(e.target.value))}
                style={{ color: '#000000' }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1º Bimestre</option>
                <option value={2}>2º Bimestre</option>
                <option value={3}>3º Bimestre</option>
                <option value={4}>4º Bimestre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Tipo de Atividade
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{ color: '#000000' }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="classe_casa">Classe + Casa</option>
              <option value="classe">Só Classe</option>
              <option value="casa">Só Casa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#000000' }}>
              Competências BASE
            </label>
            <div className="flex flex-wrap gap-2">
              {['L', 'F', 'R', 'A', 'J', 'AV'].map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => toggleCompetencia(comp)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    competencias.includes(comp)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  style={competencias.includes(comp) ? {} : { color: '#000000' }}
                >
                  {comp}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2 font-medium" style={{ color: '#000000' }}>
              L=Leitura, F=Fluência, R=Raciocínio, A=Aplicação, J=Justificativa, AV=Autoavaliação
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/base/turmas"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold no-underline"
            style={{ color: '#000000' }}
          >
            Cancelar
          </a>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : `Criar para ${turmasSelecionadas.length} turma(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
