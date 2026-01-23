'use client'

import { useState, useEffect } from 'react'
import { Modal, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'
import { Download, Users, FileText, LayoutGrid, Square } from 'lucide-react'
import { gerarFolhasRespostas, gerarFolhasRespostasGrande } from '@/lib/gerar-folha-respostas'

interface Aluno {
  id: string
  nome: string
  numero?: number
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

interface Simulado {
  id: string
  titulo: string
  turma_id: string | null
  tempo_minutos: number | null
  turmas?: {
    nome: string
    ano_serie: string
  } | null
  simulado_turmas?: {
    turma_id: string
    turmas: {
      nome: string
      ano_serie: string
    }
  }[]
}

interface ModalFolhaRespostasProps {
  isOpen: boolean
  onClose: () => void
  simulado: Simulado
}

export function ModalFolhaRespostas({ isOpen, onClose, simulado }: ModalFolhaRespostasProps) {
  const supabase = createClient()
  
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>(simulado.turma_id || '')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [layout, setLayout] = useState<'2-por-pagina' | '1-por-pagina'>('2-por-pagina')

  // Carregar turmas e questões
  useEffect(() => {
    if (!isOpen) return

    const carregar = async () => {
      setLoading(true)
      try {
        // Buscar turmas do professor
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, ano_serie')
          .order('nome')

        setTurmas(turmasData || [])

        // Contar questões do simulado
        const { count } = await supabase
          .from('simulado_questoes')
          .select('*', { count: 'exact', head: true })
          .eq('simulado_id', simulado.id)

        setTotalQuestoes(count || 0)

        // Se tem turma definida, carregar alunos
        if (simulado.turma_id) {
          setTurmaSelecionada(simulado.turma_id)
        }

        // Auto-selecionar layout baseado no número de questões
        if ((count || 0) > 25) {
          setLayout('1-por-pagina')
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [isOpen, simulado.id, simulado.turma_id, supabase])

  // Carregar alunos quando turma mudar
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([])
      return
    }

    const carregarAlunos = async () => {
      const { data } = await supabase
        .from('alunos')
        .select('id, nome, numero')
        .eq('turma_id', turmaSelecionada)
        .eq('ativo', true)
        .order('numero')
        .order('nome')

      setAlunos(data || [])
    }

    carregarAlunos()
  }, [turmaSelecionada, supabase])

  const handleGerar = async () => {
    if (alunos.length === 0 || totalQuestoes === 0) return

    setGerando(true)
    try {
      const turma = turmas.find(t => t.id === turmaSelecionada)
      
      const dados = {
        simulado: {
          id: simulado.id,
          titulo: simulado.titulo,
          duracao: simulado.tempo_minutos || 60
        },
        turma: turma ? {
          id: turma.id,
          nome: turma.nome,
          ano_escolar: turma.ano_serie
        } : {
          id: turmaSelecionada,
          nome: 'Turma',
          ano_escolar: ''
        },
        alunos: alunos.map(a => ({
          id: a.id,
          nome: a.nome,
          numero: a.numero
        })),
        totalQuestoes
      }

      // Escolher função baseado no layout
      if (layout === '2-por-pagina') {
        await gerarFolhasRespostas(dados)
      } else {
        await gerarFolhasRespostasGrande(dados)
      }

      onClose()
    } catch (error) {
      console.error('Erro ao gerar folhas:', error)
      alert('Erro ao gerar folhas de respostas. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const calcularPaginas = () => {
    if (layout === '2-por-pagina') {
      return Math.ceil(alunos.length / 2)
    }
    return alunos.length
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Folhas de Respostas"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        ) : (
          <>
            {/* Info do Simulado */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{simulado.titulo}</h3>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {totalQuestoes} questões
                </span>
              </div>
            </div>

            {/* Seleção de Turma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turma
              </label>
              <select
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Selecione uma turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - {t.ano_serie}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout da Folha
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLayout('2-por-pagina')}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    layout === '2-por-pagina' 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <LayoutGrid className="w-8 h-8 mb-1" />
                  <span className="text-sm font-medium">2 por página</span>
                  <span className="text-xs text-gray-500">Até 25 questões</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setLayout('1-por-pagina')}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    layout === '1-por-pagina' 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Square className="w-8 h-8 mb-1" />
                  <span className="text-sm font-medium">1 por página</span>
                  <span className="text-xs text-gray-500">Provas maiores</span>
                </button>
              </div>
              
              {totalQuestoes > 25 && layout === '2-por-pagina' && (
                <p className="mt-2 text-xs text-amber-600">
                  ⚠️ Com {totalQuestoes} questões, recomendamos usar 1 por página para melhor legibilidade.
                </p>
              )}
            </div>

            {/* Info dos Alunos */}
            {turmaSelecionada && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">
                    {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'} na turma
                  </span>
                </div>
                {alunos.length > 0 && (
                  <div className="text-sm text-blue-600 mt-1 space-y-1">
                    <p>✓ QR Code único para cada aluno</p>
                    <p>✓ Marcadores de canto para correção automática</p>
                    <p>✓ {calcularPaginas()} {calcularPaginas() === 1 ? 'página' : 'páginas'} no total</p>
                  </div>
                )}
              </div>
            )}

            {/* Aviso se não tiver questões */}
            {totalQuestoes === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                <p className="font-medium">Simulado sem questões</p>
                <p className="text-sm mt-1">Adicione questões ao simulado antes de gerar as folhas de respostas.</p>
              </div>
            )}

            {/* Aviso se não tiver alunos */}
            {turmaSelecionada && alunos.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                <p className="font-medium">Turma sem alunos</p>
                <p className="text-sm mt-1">Cadastre alunos na turma antes de gerar as folhas de respostas.</p>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGerar}
                disabled={gerando || !turmaSelecionada || alunos.length === 0 || totalQuestoes === 0}
              >
                {gerando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar PDF ({calcularPaginas()} {calcularPaginas() === 1 ? 'página' : 'páginas'})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
