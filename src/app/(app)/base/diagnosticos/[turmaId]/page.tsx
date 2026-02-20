// src/app/(app)/base/diagnosticos/[turmaId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Diagnostico {
  id: string
  tipo: string
  titulo: string
  data_aplicacao: string
  total_questoes: number
  total_respostas?: number
}

export default function DiagnosticosPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string
  
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [bimestre, setBimestre] = useState(1)

  useEffect(() => {
    carregarDiagnosticos()
  }, [turmaId, bimestre])

  async function carregarDiagnosticos() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/base/diagnosticos?turma_id=${turmaId}&bimestre=${bimestre}`
      )
      const result = await response.json()
      setDiagnosticos(result.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function criarDiagnosticosPadrao() {
    try {
      setCriando(true)
      
      const tipos = [
        { tipo: 'D1', titulo: 'Diagnóstico Inicial D1 (Fácil)', dias: 0 },
        { tipo: 'D2', titulo: 'Diagnóstico Intermediário D2 (Médio)', dias: 7 },
        { tipo: 'D3', titulo: 'Diagnóstico Final D3 (Difícil)', dias: 14 }
      ]

      const hoje = new Date()
      
      for (const diag of tipos) {
        const dataAplicacao = new Date(hoje)
        dataAplicacao.setDate(hoje.getDate() + diag.dias)
        
        await fetch('/api/base/diagnosticos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turma_id: turmaId,
            tipo: diag.tipo,
            titulo: diag.titulo,
            data_aplicacao: dataAplicacao.toISOString().split('T')[0],
            total_questoes: 12,
            ano_letivo: 2026,
            bimestre: bimestre
          })
        })
      }

      alert('✅ Diagnósticos D1, D2 e D3 criados com sucesso!')
      carregarDiagnosticos()
    } catch (err) {
      alert('❌ Erro ao criar diagnósticos')
      console.error(err)
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
        <h1 className="text-3xl font-bold">Diagnósticos Iniciais BASE</h1>
        <p className="text-gray-600">
          Aplicar D1, D2 e D3 nas primeiras 3 semanas para classificação inicial
        </p>
      </div>

      {/* Seletor de Bimestre */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium">Bimestre:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((b) => (
              <button
                key={b}
                onClick={() => setBimestre(b)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  bimestre === b
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {b}º Bim
              </button>
            ))}
          </div>
        </div>

        {diagnosticos.length === 0 && (
          <button
            onClick={criarDiagnosticosPadrao}
            disabled={criando}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {criando ? 'Criando...' : '➕ Criar D1, D2 e D3'}
          </button>
        )}
      </div>

      {/* Explicação do Método */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">📚 Como funciona:</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Semana 1:</strong> Aplicar D1 (Fácil) - Pré-requisitos básicos</p>
          <p><strong>Semana 2:</strong> Aplicar D2 (Médio) - Consolidação</p>
          <p><strong>Semana 3:</strong> Aplicar D3 (Difícil) - Aprofundamento</p>
          <p className="mt-3 text-blue-700">
            ✅ Após os 3 diagnósticos, o sistema calcula a média e classifica automaticamente em Grupos A/B/C
          </p>
        </div>
      </div>

      {/* Lista de Diagnósticos */}
      <div className="bg-white rounded-lg shadow">
        {diagnosticos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg">Nenhum diagnóstico criado ainda</p>
            <p className="text-sm">Clique em "Criar D1, D2 e D3" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-center">Data de Aplicação</th>
                  <th className="px-4 py-3 text-center">Questões</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((diag) => (
                  <tr key={diag.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded font-bold text-white ${
                        diag.tipo === 'D1' ? 'bg-green-600' :
                        diag.tipo === 'D2' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}>
                        {diag.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{diag.titulo}</td>
                    <td className="px-4 py-3 text-center">
                      {new Date(diag.data_aplicacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">{diag.total_questoes}</td>
                    <td className="px-4 py-3 text-center">
                      {diag.total_respostas ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                          ✓ Corrigido
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                          ⏳ Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/base/diagnosticos/lancar/${diag.id}`}
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

      {/* Botão Ver Classificação */}
      {diagnosticos.length === 3 && (
        <div className="mt-6">
          <Link
            href={`/base/diagnosticos/classificacao/${turmaId}`}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium inline-block"
          >
            📊 Ver Classificação dos Alunos
          </Link>
        </div>
      )}
    </div>
  )
}
