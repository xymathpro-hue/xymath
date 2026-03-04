'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CriarAtividadePage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [titulo, setTitulo] = useState('')
  const [habilidade, setHabilidade] = useState('')
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState('classe_casa')
  const [bimestre, setBimestre] = useState(1)
  const [competencias, setCompetencias] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

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

    try {
      setSalvando(true)
      
      const response = await fetch('/api/base/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          titulo,
          habilidade_bncc: habilidade,
          data_aplicacao: data,
          tipo,
          competencias,
          bimestre
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      alert('✅ Atividade criada com sucesso!')
      router.push(`/base/atividades/${turmaId}`)
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
        <h1 className="text-3xl font-bold text-black">Nova Atividade BASE</h1>
        <p className="text-sm text-black">Cadastrar atividade diferenciada por grupo</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Título da Atividade *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Frações - Parte/Inteiro"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Habilidade BNCC
            </label>
            <input
              type="text"
              value={habilidade}
              onChange={(e) => setHabilidade(e.target.value)}
              placeholder="Ex: EF07MA13"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Data de Aplicação *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Bimestre
              </label>
              <select
                value={bimestre}
                onChange={(e) => setBimestre(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value={1}>1º Bimestre</option>
                <option value={2}>2º Bimestre</option>
                <option value={3}>3º Bimestre</option>
                <option value={4}>4º Bimestre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Tipo de Atividade
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="classe_casa">Classe + Casa</option>
              <option value="classe">Só Classe</option>
              <option value="casa">Só Casa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">
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
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>
            <p className="text-xs text-black mt-2 font-medium">
              L=Leitura, F=Fluência, R=Raciocínio, A=Aplicação, J=Justificativa, AV=Autoavaliação
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href={`/base/atividades/${turmaId}`}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-bold no-underline"
          >
            Cancelar
          </a>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Criar Atividade'}
          </button>
        </div>
      </div>
    </div>
  )
}
