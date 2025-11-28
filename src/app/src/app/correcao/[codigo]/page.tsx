'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, Button, Input, Badge } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'
import { CheckCircle, XCircle, MinusCircle, Save, RotateCcw } from 'lucide-react'

interface Gabarito {
  id: string
  codigo: string
  tipo: string
  respostas: Record<string, string>
  total_questoes: number
  valor_questao: number
}

interface Resultado {
  acertos: number
  erros: number
  emBranco: number
  nota: number
  percentual: number
  detalhes: Array<{
    questao: number
    resposta: string
    gabarito: string
    correta: boolean
  }>
}

export default function CorrecaoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const codigo = params?.codigo as string || searchParams?.get('c')
  
  const [gabarito, setGabarito] = useState<Gabarito | null>(null)
  const [alunoNome, setAlunoNome] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchGabarito = async () => {
      if (!codigo) {
        setError('Código do gabarito não informado')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('gabaritos')
          .select('*')
          .eq('codigo', codigo.toUpperCase())
          .eq('ativo', true)
          .single()

        if (error || !data) {
          setError('Gabarito não encontrado ou inativo')
          return
        }

        setGabarito(data)
        
        const respostasIniciais: Record<string, string> = {}
        for (let i = 1; i <= data.total_questoes; i++) {
          respostasIniciais[i.toString()] = ''
        }
        setRespostas(respostasIniciais)
      } catch (err) {
        setError('Erro ao carregar gabarito')
      } finally {
        setLoading(false)
      }
    }

    fetchGabarito()
  }, [codigo, supabase])

  const handleResposta = (questao: number, alternativa: string) => {
    setRespostas(prev => ({
      ...prev,
      [questao.toString()]: prev[questao.toString()] === alternativa ? '' : alternativa
    }))
    setResultado(null)
  }

  const calcularResultado = () => {
    if (!gabarito) return

    const detalhes: Resultado['detalhes'] = []
    let acertos = 0
    let erros = 0
    let emBranco = 0

    for (let i = 1; i <= gabarito.total_questoes; i++) {
      const resposta = respostas[i.toString()] || ''
      const gabaritoCerto = gabarito.respostas[i.toString()]
      const correta = resposta === gabaritoCerto

      if (!resposta) {
        emBranco++
      } else if (correta) {
        acertos++
      } else {
        erros++
      }

      detalhes.push({
        questao: i,
        resposta,
        gabarito: gabaritoCerto,
        correta: correta && !!resposta
      })
    }

    const nota = (acertos * gabarito.valor_questao)
    const percentual = (acertos / gabarito.total_questoes) * 100

    setResultado({
      acertos,
      erros,
      emBranco,
      nota: Math.round(nota * 100) / 100,
      percentual: Math.round(percentual * 10) / 10,
      detalhes
    })
  }

  const salvarCorrecao = async () => {
    if (!gabarito || !resultado) return

    setSaving(true)
    try {
      const { error } = await supabase.from('correcoes').insert({
        gabarito_id: gabarito.id,
        aluno_nome: alunoNome || 'Não informado',
        respostas,
        acertos: resultado.acertos,
        erros: resultado.erros,
        em_branco: resultado.emBranco,
        nota: resultado.nota,
        percentual: resultado.percentual,
      })

      if (error) throw error
      alert('Correção salva com sucesso!')
    } catch (err) {
      alert('Erro ao salvar correção')
    } finally {
      setSaving(false)
    }
  }

  const limparRespostas = () => {
    if (!gabarito) return
    const respostasLimpas: Record<string, string> = {}
    for (let i = 1; i <= gabarito.total_questoes; i++) {
      respostasLimpas[i.toString()] = ''
    }
    setRespostas(respostasLimpas)
    setResultado(null)
    setAlunoNome('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Correção Rápida</h1>
                <p className="text-sm text-gray-500">Código: {codigo}</p>
              </div>
              <Badge variant="info">{gabarito?.total_questoes} questões</Badge>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Aluno
              </label>
              <Input
                placeholder="Digite o nome do aluno..."
                value={alunoNome}
                onChange={(e) => setAlunoNome(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Marque as Respostas</h2>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {gabarito && Array.from({ length: gabarito.total_questoes }, (_, i) => i + 1).map((num) => (
                <div key={num} className="text-center">
                  <span className="text-xs font-medium text-gray-500 block mb-1">{num}</span>
                  <div className="flex flex-col gap-1">
                    {['A', 'B', 'C', 'D'].map((alt) => (
                      <button
                        key={alt}
                        onClick={() => handleResposta(num, alt)}
                        className={`w-full py-1 text-xs font-medium rounded transition-colors ${
                          respostas[num.toString()] === alt
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={limparRespostas}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar
              </Button>
              <Button
                onClick={calcularResultado}
                className="flex-1"
              >
                Corrigir
              </Button>
            </div>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Resultado</h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{resultado.acertos}</p>
                  <p className="text-sm text-green-700">Acertos</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{resultado.erros}</p>
                  <p className="text-sm text-red-700">Erros</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <MinusCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-600">{resultado.emBranco}</p>
                  <p className="text-sm text-gray-500">Em Branco</p>
                </div>
              </div>

              <div className="text-center p-6 bg-indigo-50 rounded-lg mb-6">
                <p className="text-sm text-indigo-600 mb-1">Nota Final</p>
                <p className="text-4xl font-bold text-indigo-700">{resultado.nota}</p>
                <p className="text-sm text-indigo-600 mt-1">{resultado.percentual}% de aproveitamento</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  Detalhes por Questão
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 p-2">
                  {resultado.detalhes.map((d) => (
                    <div
                      key={d.questao}
                      className={`p-2 text-center rounded ${
                        !d.resposta
                          ? 'bg-gray-100'
                          : d.correta
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}
                    >
                      <span className="text-xs font-medium block">{d.questao}</span>
                      <span className={`text-sm font-bold ${
                        !d.resposta
                          ? 'text-gray-400'
                          : d.correta
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {d.resposta || '-'}
                      </span>
                      {!d.correta && d.resposta && (
                        <span className="text-xs text-green-600 block">({d.gabarito})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={salvarCorrecao}
                loading={saving}
                className="w-full mt-6"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Correção
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
