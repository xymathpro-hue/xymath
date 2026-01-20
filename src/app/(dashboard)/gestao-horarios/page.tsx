'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Modal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Plus, 
  X,
  Sun,
  Sunset,
  Moon,
  Check,
  AlertCircle
} from 'lucide-react'

interface ConfiguracaoHorario {
  id?: string
  usuario_id: string
  aulas_manha: number
  aulas_tarde: number
  aulas_noite: number
}

interface GradeHorario {
  id?: string
  usuario_id: string
  dia_semana: number // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
  turno: 'manha' | 'tarde' | 'noite'
  numero_aula: number
  turma_id: string | null
  escola?: string
}

interface AulaExcecao {
  id?: string
  grade_horario_id: string
  data: string
  status: 'cancelada' | 'substituida' | 'normal'
  observacao?: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

const DIAS_SEMANA = [
  { value: 1, label: 'Segunda', abrev: 'SEG' },
  { value: 2, label: 'Terça', abrev: 'TER' },
  { value: 3, label: 'Quarta', abrev: 'QUA' },
  { value: 4, label: 'Quinta', abrev: 'QUI' },
  { value: 5, label: 'Sexta', abrev: 'SEX' },
]

const TURNOS = [
  { value: 'manha', label: 'Manhã', icon: Sun, cor: 'bg-amber-50 border-amber-200' },
  { value: 'tarde', label: 'Tarde', icon: Sunset, cor: 'bg-orange-50 border-orange-200' },
  { value: 'noite', label: 'Noite', icon: Moon, cor: 'bg-indigo-50 border-indigo-200' },
]

export default function GestaoHorariosPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [configuracao, setConfiguracao] = useState<ConfiguracaoHorario | null>(null)
  const [grade, setGrade] = useState<GradeHorario[]>([])
  const [excecoes, setExcecoes] = useState<AulaExcecao[]>([])
  
  // Modais
  const [modalConfigOpen, setModalConfigOpen] = useState(false)
  const [modalAulaOpen, setModalAulaOpen] = useState(false)
  const [celulaEditando, setCelulaEditando] = useState<{
    dia: number
    turno: 'manha' | 'tarde' | 'noite'
    aula: number
  } | null>(null)

  // Semana atual
  const [semanaAtual, setSemanaAtual] = useState(() => {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana // Ajusta para começar na segunda
    const segunda = new Date(hoje)
    segunda.setDate(hoje.getDate() + diff)
    return segunda
  })

  // Config temporária para o modal
  const [configTemp, setConfigTemp] = useState({
    aulas_manha: 5,
    aulas_tarde: 5,
    aulas_noite: 4
  })

  // Turma selecionada no modal
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')

  // Carregar dados
  const fetchDados = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }

    try {
      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
        .order('nome')
      
      if (turmasData) setTurmas(turmasData)

      // Carregar configuração
      const { data: configData } = await supabase
        .from('configuracao_horarios')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single()

      if (configData) {
        setConfiguracao(configData)
        setConfigTemp({
          aulas_manha: configData.aulas_manha,
          aulas_tarde: configData.aulas_tarde,
          aulas_noite: configData.aulas_noite
        })
      } else {
        // Primeira vez - abre modal de configuração
        setModalConfigOpen(true)
      }

      // Carregar grade
      const { data: gradeData } = await supabase
        .from('grade_horarios')
        .select('*')
        .eq('usuario_id', usuario.id)

      if (gradeData) setGrade(gradeData)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  // Navegação de semana
  const semanaAnterior = () => {
    const nova = new Date(semanaAtual)
    nova.setDate(nova.getDate() - 7)
    setSemanaAtual(nova)
  }

  const proximaSemana = () => {
    const nova = new Date(semanaAtual)
    nova.setDate(nova.getDate() + 7)
    setSemanaAtual(nova)
  }

  const irParaHoje = () => {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana
    const segunda = new Date(hoje)
    segunda.setDate(hoje.getDate() + diff)
    setSemanaAtual(segunda)
  }

  // Formatar data da semana
  const formatarSemana = () => {
    const sexta = new Date(semanaAtual)
    sexta.setDate(sexta.getDate() + 4)
    
    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${semanaAtual.toLocaleDateString('pt-BR', formatOptions)} a ${sexta.toLocaleDateString('pt-BR', formatOptions)} de ${semanaAtual.getFullYear()}`
  }

  // Obter data de um dia da semana atual
  const getDataDia = (diaSemana: number) => {
    const data = new Date(semanaAtual)
    data.setDate(data.getDate() + (diaSemana - 1))
    return data
  }

  // Verificar se é hoje
  const isHoje = (diaSemana: number) => {
    const data = getDataDia(diaSemana)
    const hoje = new Date()
    return data.toDateString() === hoje.toDateString()
  }

  // Salvar configuração
  const salvarConfiguracao = async () => {
    if (!usuario?.id) return

    setSaving(true)
    try {
      const dados = {
        usuario_id: usuario.id,
        aulas_manha: configTemp.aulas_manha,
        aulas_tarde: configTemp.aulas_tarde,
        aulas_noite: configTemp.aulas_noite
      }

      if (configuracao?.id) {
        await supabase
          .from('configuracao_horarios')
          .update(dados)
          .eq('id', configuracao.id)
      } else {
        await supabase
          .from('configuracao_horarios')
          .insert(dados)
      }

      setConfiguracao({ ...dados, id: configuracao?.id })
      setModalConfigOpen(false)
      fetchDados()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
    } finally {
      setSaving(false)
    }
  }

  // Obter aula da grade
  const getAulaGrade = (dia: number, turno: 'manha' | 'tarde' | 'noite', aula: number) => {
    return grade.find(g => 
      g.dia_semana === dia && 
      g.turno === turno && 
      g.numero_aula === aula
    )
  }

  // Obter nome da turma
  const getNomeTurma = (turmaId: string | null) => {
    if (!turmaId) return null
    return turmas.find(t => t.id === turmaId)?.nome
  }

  // Abrir modal para editar célula
  const handleClickCelula = (dia: number, turno: 'manha' | 'tarde' | 'noite', aula: number) => {
    const aulaExistente = getAulaGrade(dia, turno, aula)
    setTurmaSelecionada(aulaExistente?.turma_id || '')
    setCelulaEditando({ dia, turno, aula })
    setModalAulaOpen(true)
  }

  // Salvar aula na grade
  const salvarAula = async () => {
    if (!usuario?.id || !celulaEditando) return

    setSaving(true)
    try {
      const aulaExistente = getAulaGrade(
        celulaEditando.dia,
        celulaEditando.turno,
        celulaEditando.aula
      )

      if (turmaSelecionada) {
        // Criar ou atualizar
        const dados = {
          usuario_id: usuario.id,
          dia_semana: celulaEditando.dia,
          turno: celulaEditando.turno,
          numero_aula: celulaEditando.aula,
          turma_id: turmaSelecionada
        }

        if (aulaExistente?.id) {
          await supabase
            .from('grade_horarios')
            .update({ turma_id: turmaSelecionada })
            .eq('id', aulaExistente.id)
        } else {
          await supabase
            .from('grade_horarios')
            .insert(dados)
        }
      } else if (aulaExistente?.id) {
        // Remover
        await supabase
          .from('grade_horarios')
          .delete()
          .eq('id', aulaExistente.id)
      }

      setModalAulaOpen(false)
      setCelulaEditando(null)
      fetchDados()
    } catch (error) {
      console.error('Erro ao salvar aula:', error)
    } finally {
      setSaving(false)
    }
  }

  // Remover aula
  const removerAula = async () => {
    if (!celulaEditando) return

    const aulaExistente = getAulaGrade(
      celulaEditando.dia,
      celulaEditando.turno,
      celulaEditando.aula
    )

    if (aulaExistente?.id) {
      setSaving(true)
      try {
        await supabase
          .from('grade_horarios')
          .delete()
          .eq('id', aulaExistente.id)

        setModalAulaOpen(false)
        setCelulaEditando(null)
        fetchDados()
      } catch (error) {
        console.error('Erro ao remover aula:', error)
      } finally {
        setSaving(false)
      }
    }
  }

  // Renderizar grade de um turno
  const renderizarTurno = (turno: 'manha' | 'tarde' | 'noite', qtdAulas: number) => {
    if (qtdAulas === 0) return null

    const turnoConfig = TURNOS.find(t => t.value === turno)!
    const Icon = turnoConfig.icon

    return (
      <div key={turno} className="mb-6">
        {/* Header do turno */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-t-lg ${turnoConfig.cor} border`}>
          <Icon className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-800">{turnoConfig.label}</span>
        </div>

        {/* Grade do turno */}
        <div className="border border-t-0 rounded-b-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-20 px-3 py-2 text-left text-sm font-medium text-gray-500 border-r">
                  Aula
                </th>
                {DIAS_SEMANA.map(dia => (
                  <th 
                    key={dia.value} 
                    className={`px-3 py-2 text-center text-sm font-medium border-r last:border-r-0 ${
                      isHoje(dia.value) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'
                    }`}
                  >
                    <div>{dia.abrev}</div>
                    <div className="text-xs font-normal">
                      {getDataDia(dia.value).getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: qtdAulas }, (_, i) => i + 1).map(numAula => (
                <tr key={numAula} className="border-t">
                  <td className="px-3 py-2 text-sm font-medium text-gray-600 border-r bg-gray-50">
                    {numAula}ª
                  </td>
                  {DIAS_SEMANA.map(dia => {
                    const aula = getAulaGrade(dia.value, turno, numAula)
                    const nomeTurma = getNomeTurma(aula?.turma_id || null)
                    
                    return (
                      <td 
                        key={dia.value}
                        className={`px-2 py-2 text-center border-r last:border-r-0 cursor-pointer transition-colors ${
                          isHoje(dia.value) ? 'bg-indigo-50' : 'bg-white'
                        } hover:bg-gray-100`}
                        onClick={() => handleClickCelula(dia.value, turno, numAula)}
                      >
                        {nomeTurma ? (
                          <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium truncate">
                            {nomeTurma}
                          </div>
                        ) : (
                          <div className="px-2 py-1 text-gray-300 text-sm">
                            —
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Tela de loading
  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" />
            Gestão de Horários
          </h1>
          <p className="text-gray-600 mt-1">Monte sua grade semanal de aulas</p>
        </div>
        <Button variant="outline" onClick={() => setModalConfigOpen(true)}>
          <Settings className="w-5 h-5 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Navegação da semana */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={semanaAnterior}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                📅 {formatarSemana()}
              </h2>
              <Button variant="outline" size="sm" onClick={irParaHoje}>
                Hoje
              </Button>
            </div>
            <Button variant="ghost" onClick={proximaSemana}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verificar se tem configuração */}
      {!configuracao ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configure seus horários
            </h3>
            <p className="text-gray-600 mb-4">
              Primeiro, defina quantas aulas você tem em cada turno.
            </p>
            <Button onClick={() => setModalConfigOpen(true)}>
              <Settings className="w-5 h-5 mr-2" />
              Configurar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Grade de horários */
        <Card>
          <CardContent className="p-4">
            {configuracao.aulas_manha === 0 && 
             configuracao.aulas_tarde === 0 && 
             configuracao.aulas_noite === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Você não configurou nenhuma aula. Clique em "Configurar" para definir seus horários.
              </div>
            ) : (
              <>
                {renderizarTurno('manha', configuracao.aulas_manha)}
                {renderizarTurno('tarde', configuracao.aulas_tarde)}
                {renderizarTurno('noite', configuracao.aulas_noite)}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      {configuracao && (configuracao.aulas_manha > 0 || configuracao.aulas_tarde > 0 || configuracao.aulas_noite > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-500">Legenda:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-100 rounded"></div>
                <span className="text-gray-600">Aula marcada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-50 border border-indigo-200 rounded"></div>
                <span className="text-gray-600">Hoje</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">—</span>
                <span className="text-gray-600">Horário vago</span>
              </div>
              <span className="text-gray-400 ml-auto text-xs">
                Clique em uma célula para adicionar/editar
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Configuração */}
      <Modal 
        isOpen={modalConfigOpen} 
        onClose={() => configuracao && setModalConfigOpen(false)} 
        title="Configurar Horários"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Defina quantas aulas você tem em cada turno:
          </p>

          {/* Manhã */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <Sun className="w-6 h-6 text-amber-600" />
              <span className="font-medium text-gray-800">Manhã</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_manha: Math.max(0, prev.aulas_manha - 1) 
                }))}
              >
                -
              </Button>
              <span className="w-8 text-center font-bold text-lg">{configTemp.aulas_manha}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_manha: Math.min(5, prev.aulas_manha + 1) 
                }))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Tarde */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <Sunset className="w-6 h-6 text-orange-600" />
              <span className="font-medium text-gray-800">Tarde</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_tarde: Math.max(0, prev.aulas_tarde - 1) 
                }))}
              >
                -
              </Button>
              <span className="w-8 text-center font-bold text-lg">{configTemp.aulas_tarde}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_tarde: Math.min(5, prev.aulas_tarde + 1) 
                }))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Noite */}
          <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-3">
              <Moon className="w-6 h-6 text-indigo-600" />
              <span className="font-medium text-gray-800">Noite</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_noite: Math.max(0, prev.aulas_noite - 1) 
                }))}
              >
                -
              </Button>
              <span className="w-8 text-center font-bold text-lg">{configTemp.aulas_noite}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigTemp(prev => ({ 
                  ...prev, 
                  aulas_noite: Math.min(4, prev.aulas_noite + 1) 
                }))}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            {configuracao && (
              <Button variant="outline" className="flex-1" onClick={() => setModalConfigOpen(false)}>
                Cancelar
              </Button>
            )}
            <Button 
              className="flex-1" 
              onClick={salvarConfiguracao} 
              loading={saving}
            >
              <Check className="w-5 h-5 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Aula */}
      <Modal 
        isOpen={modalAulaOpen} 
        onClose={() => { setModalAulaOpen(false); setCelulaEditando(null) }} 
        title={`${celulaEditando ? DIAS_SEMANA.find(d => d.value === celulaEditando.dia)?.label : ''} - ${celulaEditando?.aula}ª Aula (${celulaEditando?.turno === 'manha' ? 'Manhã' : celulaEditando?.turno === 'tarde' ? 'Tarde' : 'Noite'})`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a turma:
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
            >
              <option value="">— Horário vago —</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.ano_serie})
                </option>
              ))}
            </select>
          </div>

          {turmas.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              Você ainda não tem turmas cadastradas. Cadastre suas turmas primeiro.
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            {getAulaGrade(celulaEditando?.dia || 0, celulaEditando?.turno || 'manha', celulaEditando?.aula || 0) && (
              <Button 
                variant="outline" 
                className="text-red-600 hover:bg-red-50"
                onClick={removerAula}
                loading={saving}
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => { setModalAulaOpen(false); setCelulaEditando(null) }}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={salvarAula} 
              loading={saving}
              disabled={turmas.length === 0}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
