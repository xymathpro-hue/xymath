'use client'

import { useState, useEffect } from 'react'
import { Modal, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'
import { Download, Users, FileText } from 'lucide-react'
import { gerarFolhasRespostas } from '@/lib/gerar-folha-respostas'

interface Aluno {
  id: string
  nome: string
  numero?: number
}

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface Simulado {
  id: string
  titulo: string
  turma_id: string
  duracao_minutos: number | null
  turmas?: {
    nome: string
    ano_escolar: string
  }
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

  // Carregar turmas e questões
  useEffect(() => {
    if (!isOpen) return

    const carregar = async () => {
      setLoading(true)
      try {
        // Buscar turmas do professor
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, ano_escolar')
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
      
      await gerarFolhasRespostas({
        simulado: {
          id: simulado.id,
          titulo: simulado.titulo,
          duracao: simulado.duracao_minutos || 60
        },
        turma: turma ? {
          id: turma.id,
          nome: turma.nome,
          ano_escolar: turma.ano_escolar
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
      })

      onClose()
    } catch (error) {
      console.error('Erro ao gerar folhas:', error)
      alert('Erro ao gerar folhas de respostas. Tente novamente.')
    } finally {
      setGerando(false)
    }
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
                    {t.nome} - {t.ano_escolar}
                  </option>
                ))}
              </select>
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
                  <p className="text-sm text-blue-600 mt-1">
                    Será gerada uma folha de respostas para cada aluno com QR Code único.
                  </p>
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
                    Gerar PDF ({alunos.length} folhas)
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
