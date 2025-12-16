'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Upload, FileText, Trash2, Edit, Save, Plus, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react'

interface QuestaoExtraida {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  alternativa_e: string
  resposta_correta: 'A' | 'B' | 'C' | 'D' | 'E' | ''
  selecionada: boolean
  editando: boolean
}

interface HabilidadeBncc {
  id: string
  codigo: string
  descricao: string
}

const ANO_SERIE_OPTIONS = [
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
]

const DIFICULDADE_OPTIONS = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
]

declare global {
  interface Window {
    pdfjsLib: any
  }
}

export default function ImportarPDFPage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [textoExtraido, setTextoExtraido] = useState<string>('')
  const [questoes, setQuestoes] = useState<QuestaoExtraida[]>([])
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<'upload' | 'revisao' | 'config' | 'concluido'>('upload')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [pdfReady, setPdfReady] = useState(false)

  const [configSalvar, setConfigSalvar] = useState({
    ano_serie: '6º ano EF',
    dificuldade: 'medio',
    habilidade_bncc_id: '',
    fonte: 'Importado de PDF'
  })

  const [habilidades, setHabilidades] = useState<HabilidadeBncc[]>([])
  const [modalTextoOpen, setModalTextoOpen] = useState(false)

  // Carregar PDF.js via CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.pdfjsLib) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        setPdfReady(true)
      }
      document.head.appendChild(script)
    } else if (window.pdfjsLib) {
      setPdfReady(true)
    }
  }, [])

  useEffect(() => {
    const loadHabilidades = async () => {
      const { data } = await supabase
        .from('habilidades_bncc')
        .select('id, codigo, descricao')
        .order('codigo')
      if (data) setHabilidades(data)
    }
    loadHabilidades()
  }, [supabase])

  const extrairTextoPDF = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) throw new Error('PDF.js não carregado')
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let textoCompleto = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      textoCompleto += pageText + '\n\n'
    }

    return textoCompleto
  }

  const identificarQuestoes = (texto: string): QuestaoExtraida[] => {
    const questoesEncontradas: QuestaoExtraida[] = []
    const padraoQuestao = /(?:^|\n)\s*(?:Quest[aã]o\s*)?(\d{1,3})[.\)]\s*([\s\S]*?)(?=(?:\n\s*(?:Quest[aã]o\s*)?\d{1,3}[.\)])|$)/gi

    let match
    while ((match = padraoQuestao.exec(texto)) !== null) {
      const numeroQuestao = match[1]
      let conteudoQuestao = match[2].trim()
      
      if (conteudoQuestao.length < 10) continue

      const alternativas: Record<string, string> = { A: '', B: '', C: '', D: '', E: '' }
      let enunciado = conteudoQuestao

      const primeiraAlt = conteudoQuestao.search(/\n?\s*\(?[Aa]\)?[.\):\s]+/)
      if (primeiraAlt > 0) {
        enunciado = conteudoQuestao.substring(0, primeiraAlt).trim()
      }

      const altRegex = /\(?([A-Ea-e])\)?[.\):\s]+([^\n]+)/g
      let altMatch
      while ((altMatch = altRegex.exec(conteudoQuestao)) !== null) {
        const letra = altMatch[1].toUpperCase()
        const textoAlt = altMatch[2].trim()
        if (alternativas.hasOwnProperty(letra)) {
          alternativas[letra] = textoAlt
        }
      }

      const numAlternativas = Object.values(alternativas).filter(a => a.length > 0).length
      if (enunciado.length > 15 && numAlternativas >= 2) {
        questoesEncontradas.push({
          id: `q_${Date.now()}_${numeroQuestao}`,
          enunciado,
          alternativa_a: alternativas.A,
          alternativa_b: alternativas.B,
          alternativa_c: alternativas.C,
          alternativa_d: alternativas.D,
          alternativa_e: alternativas.E,
          resposta_correta: '',
          selecionada: true,
          editando: false
        })
      }
    }

    return questoesEncontradas
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setErro('Por favor, selecione um arquivo PDF')
      return
    }

    if (!pdfReady) {
      setErro('Aguarde o carregamento do processador de PDF')
      return
    }

    setArquivo(file)
    setErro(null)
    setProcessando(true)

    try {
      const texto = await extrairTextoPDF(file)
      setTextoExtraido(texto)

      const questoesExtraidas = identificarQuestoes(texto)
      
      if (questoesExtraidas.length === 0) {
        setErro('Não foi possível identificar questões automaticamente. Você pode revisar o texto extraído e adicionar manualmente.')
        setQuestoes([])
      } else {
        setQuestoes(questoesExtraidas)
        setSucesso(`${questoesExtraidas.length} questão(ões) identificada(s)!`)
        setTimeout(() => setSucesso(null), 3000)
      }
      
      setEtapa('revisao')
    } catch (error) {
      console.error('Erro ao processar PDF:', error)
      setErro('Erro ao processar o PDF. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const toggleEditarQuestao = (id: string) => {
    setQuestoes(prev => prev.map(q => q.id === id ? { ...q, editando: !q.editando } : q))
  }

  const atualizarQuestao = (id: string, campo: keyof QuestaoExtraida, valor: string) => {
    setQuestoes(prev => prev.map(q => q.id === id ? { ...q, [campo]: valor } : q))
  }

  const toggleSelecao = (id: string) => {
    setQuestoes(prev => prev.map(q => q.id === id ? { ...q, selecionada: !q.selecionada } : q))
  }

  const removerQuestao = (id: string) => {
    setQuestoes(prev => prev.filter(q => q.id !== id))
  }

  const adicionarQuestaoManual = () => {
    setQuestoes(prev => [...prev, {
      id: `q_manual_${Date.now()}`,
      enunciado: '',
      alternativa_a: '',
      alternativa_b: '',
      alternativa_c: '',
      alternativa_d: '',
      alternativa_e: '',
      resposta_correta: '',
      selecionada: true,
      editando: true
    }])
  }

  const toggleTodasSelecao = (selecionar: boolean) => {
    setQuestoes(prev => prev.map(q => ({ ...q, selecionada: selecionar })))
  }

  const irParaConfig = () => {
    const selecionadas = questoes.filter(q => q.selecionada)
    if (selecionadas.length === 0) {
      setErro('Selecione pelo menos uma questão para importar')
      return
    }
    const semResposta = selecionadas.filter(q => !q.resposta_correta)
    if (semResposta.length > 0) {
      setErro(`${semResposta.length} questão(ões) sem resposta correta marcada`)
      return
    }
    setErro(null)
    setEtapa('config')
  }

  const salvarQuestoes = async () => {
    if (!usuario?.id) return
    const questoesSelecionadas = questoes.filter(q => q.selecionada)
    if (questoesSelecionadas.length === 0) return

    setSalvando(true)
    setErro(null)

    try {
      const questoesParaSalvar = questoesSelecionadas.map(q => ({
        usuario_id: usuario.id,
        enunciado: q.enunciado,
        alternativa_a: q.alternativa_a,
        alternativa_b: q.alternativa_b,
        alternativa_c: q.alternativa_c,
        alternativa_d: q.alternativa_d,
        alternativa_e: q.alternativa_e || null,
        resposta_correta: q.resposta_correta,
        ano_serie: configSalvar.ano_serie,
        dificuldade: configSalvar.dificuldade,
        habilidade_bncc_id: configSalvar.habilidade_bncc_id || null,
        is_publica: false,
        ativa: true
      }))

      const { error } = await supabase.from('questoes').insert(questoesParaSalvar)
      if (error) throw error

      setSucesso(`${questoesSelecionadas.length} questão(ões) importada(s) com sucesso!`)
      setEtapa('concluido')
    } catch (error: any) {
      setErro(`Erro ao salvar: ${error.message}`)
    } finally {
      setSalvando(false)
    }
  }

  const reiniciar = () => {
    setArquivo(null)
    setTextoExtraido('')
    setQuestoes([])
    setEtapa('upload')
    setErro(null)
    setSucesso(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const questoesSelecionadas = questoes.filter(q => q.selecionada)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-indigo-600" />
          Importar Questões de PDF
        </h1>
        <p className="text-gray-600 mt-1">Extraia questões de provas em PDF para seu banco de questões</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['upload', 'revisao', 'config', 'concluido'].map((step, idx) => (
          <div key={step} className="flex items-center">
            {idx > 0 && <div className="w-6 h-0.5 bg-gray-300 mr-2"></div>}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${etapa === step ? (step === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700') : 'bg-gray-100 text-gray-600'}`}>
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">{idx + 1}</span>
              {step === 'upload' ? 'Upload' : step === 'revisao' ? 'Revisão' : step === 'config' ? 'Configurar' : 'Concluído'}
            </div>
          </div>
        ))}
      </div>

      {erro && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />{erro}</div>}
      {sucesso && <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" />{sucesso}</div>}

      {etapa === 'upload' && (
        <Card><CardContent className="p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-400 cursor-pointer" onClick={() => pdfReady && fileInputRef.current?.click()}>
            {processando ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-900">Processando PDF...</p>
              </div>
            ) : !pdfReady ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-gray-400 animate-spin mb-4" />
                <p className="text-gray-500">Carregando processador de PDF...</p>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Clique para selecionar um PDF</p>
                <p className="text-gray-500">ou arraste e solte aqui</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Dicas:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use PDFs com texto selecionável</li>
              <li>• Questões numeradas (1, 2, 3...)</li>
              <li>• Alternativas A, B, C, D, E</li>
            </ul>
          </div>
        </CardContent></Card>
      )}

      {etapa === 'revisao' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600"><strong>{questoesSelecionadas.length}</strong>/{questoes.length} selecionadas</span>
                <Button variant="ghost" size="sm" onClick={() => toggleTodasSelecao(true)}>Todas</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleTodasSelecao(false)}>Nenhuma</Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalTextoOpen(true)}><Eye className="w-4 h-4 mr-1" />Texto</Button>
                <Button variant="outline" size="sm" onClick={adicionarQuestaoManual}><Plus className="w-4 h-4 mr-1" />Manual</Button>
                <Button variant="outline" onClick={reiniciar}>Cancelar</Button>
                <Button onClick={irParaConfig} disabled={questoesSelecionadas.length === 0}>Continuar</Button>
              </div>
            </div>
          </CardContent></Card>

          {questoes.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Nenhuma questão identificada.</p>
              <Button onClick={adicionarQuestaoManual}><Plus className="w-4 h-4 mr-2" />Adicionar manual</Button>
            </CardContent></Card>
          ) : questoes.map((q, i) => (
            <Card key={q.id} className={q.selecionada ? 'ring-2 ring-indigo-500' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <input type="checkbox" checked={q.selecionada} onChange={() => toggleSelecao(q.id)} className="mt-1 w-5 h-5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <Badge>Questão {i + 1}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleEditarQuestao(q.id)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => removerQuestao(q.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                    {q.editando ? (
                      <div className="space-y-3">
                        <textarea className="w-full px-3 py-2 border rounded-lg text-gray-900" rows={3} value={q.enunciado} onChange={(e) => atualizarQuestao(q.id, 'enunciado', e.target.value)} placeholder="Enunciado" />
                        {['A', 'B', 'C', 'D', 'E'].map(l => (
                          <div key={l} className="flex items-center gap-2">
                            <button onClick={() => atualizarQuestao(q.id, 'resposta_correta', l as any)} className={`w-8 h-8 rounded-full font-medium ${q.resposta_correta === l ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>{l}</button>
                            <Input value={q[`alternativa_${l.toLowerCase()}` as keyof QuestaoExtraida] as string} onChange={(e) => atualizarQuestao(q.id, `alternativa_${l.toLowerCase()}` as any, e.target.value)} placeholder={`Alt ${l}`} className="flex-1" />
                          </div>
                        ))}
                        <Button size="sm" onClick={() => toggleEditarQuestao(q.id)}><CheckCircle className="w-4 h-4 mr-1" />OK</Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-900 mb-3">{q.enunciado}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {['A', 'B', 'C', 'D', 'E'].map(l => {
                            const txt = q[`alternativa_${l.toLowerCase()}` as keyof QuestaoExtraida] as string
                            if (!txt) return null
                            const ok = q.resposta_correta === l
                            return <div key={l} onClick={() => atualizarQuestao(q.id, 'resposta_correta', l as any)} className={`p-2 rounded cursor-pointer ${ok ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50 hover:bg-gray-100'}`}><strong>{l})</strong> {txt}</div>
                          })}
                        </div>
                        {!q.resposta_correta && <p className="text-sm text-orange-600 mt-2">⚠️ Clique na correta</p>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {etapa === 'config' && (
        <Card><CardContent className="p-6 space-y-6">
          <h3 className="font-semibold text-gray-900">Configurar {questoesSelecionadas.length} questão(ões)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Série</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={configSalvar.ano_serie} onChange={(e) => setConfigSalvar({ ...configSalvar, ano_serie: e.target.value })}>
                {ANO_SERIE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={configSalvar.dificuldade} onChange={(e) => setConfigSalvar({ ...configSalvar, dificuldade: e.target.value })}>
                {DIFICULDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habilidade BNCC</label>
              <select className="w-full px-3 py-2 border rounded-lg text-gray-900" value={configSalvar.habilidade_bncc_id} onChange={(e) => setConfigSalvar({ ...configSalvar, habilidade_bncc_id: e.target.value })}>
                <option value="">Selecione...</option>
                {habilidades.map(h => <option key={h.id} value={h.id}>{h.codigo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
              <Input value={configSalvar.fonte} onChange={(e) => setConfigSalvar({ ...configSalvar, fonte: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEtapa('revisao')}>Voltar</Button>
            <Button onClick={salvarQuestoes} loading={salvando} className="flex-1"><Save className="w-4 h-4 mr-2" />Importar</Button>
          </div>
        </CardContent></Card>
      )}

      {etapa === 'concluido' && (
        <Card><CardContent className="p-12 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Importação Concluída!</h2>
          <p className="text-gray-600 mb-6">{questoesSelecionadas.length} questão(ões) adicionadas.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={reiniciar}>Importar outro</Button>
            <Button onClick={() => window.location.href = '/dashboard/questoes'}>Ver questões</Button>
          </div>
        </CardContent></Card>
      )}

      <Modal isOpen={modalTextoOpen} onClose={() => setModalTextoOpen(false)} title="Texto Extraído" size="xl">
        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">{textoExtraido || 'Nenhum texto'}</pre>
        <div className="flex justify-end mt-4"><Button onClick={() => setModalTextoOpen(false)}>Fechar</Button></div>
      </Modal>
    </div>
  )
    }
