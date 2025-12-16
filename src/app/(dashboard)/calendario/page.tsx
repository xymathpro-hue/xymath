'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Clock, MapPin, Users, X } from 'lucide-react'

interface Evento {
  id: string
  titulo: string
  descricao?: string
  data_inicio: string
  data_fim?: string
  hora_inicio?: string
  hora_fim?: string
  tipo: 'prova' | 'simulado' | 'reuniao' | 'feriado' | 'aula' | 'evento' | 'outro'
  turma_id?: string
  local?: string
  cor?: string
  usuario_id: string
  created_at: string
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

const TIPOS_EVENTO = [
  { value: 'prova', label: 'Prova', cor: 'bg-red-500' },
  { value: 'simulado', label: 'Simulado', cor: 'bg-orange-500' },
  { value: 'reuniao', label: 'Reunião', cor: 'bg-blue-500' },
  { value: 'feriado', label: 'Feriado', cor: 'bg-green-500' },
  { value: 'aula', label: 'Aula Especial', cor: 'bg-purple-500' },
  { value: 'evento', label: 'Evento Escolar', cor: 'bg-pink-500' },
  { value: 'outro', label: 'Outro', cor: 'bg-gray-500' },
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function CalendarioPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEventoOpen, setModalEventoOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null)
  const [saving, setSaving] = useState(false)
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [filtroTurma, setFiltroTurma] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    hora_inicio: '',
    hora_fim: '',
    tipo: 'evento' as Evento['tipo'],
    turma_id: '',
    local: ''
  })

  // Carregar turmas
  useEffect(() => {
    const loadTurmas = async () => {
      if (!usuario?.id) return
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, ano_serie')
        .eq('usuario_id', usuario.id)
        .eq('ativa', true)
        .order('nome')
      if (data) setTurmas(data)
    }
    loadTurmas()
  }, [usuario?.id, supabase])

  // Carregar eventos do mês
  const fetchEventos = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }

    const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fimMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)

    try {
      let query = supabase
        .from('eventos_calendario')
        .select('*')
        .eq('usuario_id', usuario.id)
        .gte('data_inicio', inicioMes.toISOString().split('T')[0])
        .lte('data_inicio', fimMes.toISOString().split('T')[0])
        .order('data_inicio')

      if (filtroTurma) query = query.eq('turma_id', filtroTurma)
      if (filtroTipo) query = query.eq('tipo', filtroTipo)

      const { data, error } = await query
      if (error) throw error
      setEventos(data || [])
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, mesAtual, filtroTurma, filtroTipo])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  // Navegação do calendário
  const mesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))
  const proximoMes = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))
  const irParaHoje = () => setMesAtual(new Date())

  // Gerar dias do calendário
  const gerarDiasCalendario = () => {
    const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    const diasNoMes = ultimoDia.getDate()
    const diaSemanaInicio = primeiroDia.getDay()

    const dias: (number | null)[] = []
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null)
    }
    
    // Dias do mês
    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(i)
    }

    return dias
  }

  // Obter eventos de um dia
  const getEventosDia = (dia: number) => {
    const dataStr = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return eventos.filter(e => e.data_inicio === dataStr)
  }

  // Verificar se é hoje
  const isHoje = (dia: number) => {
    const hoje = new Date()
    return dia === hoje.getDate() && 
           mesAtual.getMonth() === hoje.getMonth() && 
           mesAtual.getFullYear() === hoje.getFullYear()
  }

  // Abrir modal de novo evento
  const handleNovoEvento = (dia?: number) => {
    setEditingEvento(null)
    const data = dia 
      ? `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0]
    
    setFormData({
      titulo: '',
      descricao: '',
      data_inicio: data,
      data_fim: '',
      hora_inicio: '',
      hora_fim: '',
      tipo: 'evento',
      turma_id: '',
      local: ''
    })
    setModalOpen(true)
  }

  // Abrir modal de edição
  const handleEditarEvento = (evento: Evento) => {
    setEditingEvento(evento)
    setFormData({
      titulo: evento.titulo,
      descricao: evento.descricao || '',
      data_inicio: evento.data_inicio,
      data_fim: evento.data_fim || '',
      hora_inicio: evento.hora_inicio || '',
      hora_fim: evento.hora_fim || '',
      tipo: evento.tipo,
      turma_id: evento.turma_id || '',
      local: evento.local || ''
    })
    setModalEventoOpen(false)
    setModalOpen(true)
  }

  // Salvar evento
  const handleSalvar = async () => {
    if (!usuario?.id || !formData.titulo || !formData.data_inicio) return

    setSaving(true)
    try {
      const eventoData = {
        usuario_id: usuario.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
        hora_inicio: formData.hora_inicio || null,
        hora_fim: formData.hora_fim || null,
        tipo: formData.tipo,
        turma_id: formData.turma_id || null,
        local: formData.local || null
      }

      if (editingEvento) {
        await supabase.from('eventos_calendario').update(eventoData).eq('id', editingEvento.id)
      } else {
        await supabase.from('eventos_calendario').insert(eventoData)
      }

      setModalOpen(false)
      fetchEventos()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSaving(false)
    }
  }

  // Excluir evento
  const handleExcluir = async (id: string) => {
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos_calendario').delete().eq('id', id)
    setModalEventoOpen(false)
    fetchEventos()
  }

  // Ver detalhes do evento
  const handleVerEvento = (evento: Evento) => {
    setEventoSelecionado(evento)
    setModalEventoOpen(true)
  }

  // Obter cor do tipo
  const getCorTipo = (tipo: string) => {
    return TIPOS_EVENTO.find(t => t.value === tipo)?.cor || 'bg-gray-500'
  }

  // Obter nome da turma
  const getNomeTurma = (turmaId?: string) => {
    if (!turmaId) return null
    return turmas.find(t => t.id === turmaId)?.nome
  }

  const dias = gerarDiasCalendario()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-600" />
            Calendário Pedagógico
          </h1>
          <p className="text-gray-600 mt-1">Organize provas, eventos e atividades</p>
        </div>
        <Button onClick={() => handleNovoEvento()}>
          <Plus className="w-5 h-5 mr-2" />Novo Evento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Turma</label>
              <select
                className="px-3 py-2 border rounded-lg text-gray-900 text-sm"
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
              >
                <option value="">Todas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                className="px-3 py-2 border rounded-lg text-gray-900 text-sm"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {TIPOS_EVENTO.slice(0, 4).map(t => (
                <div key={t.value} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded ${t.cor}`}></span>
                  <span className="text-xs text-gray-600">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegação do mês */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={mesAnterior}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
              </h2>
              <Button variant="outline" size="sm" onClick={irParaHoje}>Hoje</Button>
            </div>
            <Button variant="ghost" onClick={proximoMes}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendário */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Cabeçalho dias da semana */}
              {DIAS_SEMANA.map(dia => (
                <div key={dia} className="p-2 text-center text-sm font-medium text-gray-500">
                  {dia}
                </div>
              ))}

              {/* Dias do mês */}
              {dias.map((dia, index) => (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border rounded-lg ${
                    dia ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                  } ${isHoje(dia || 0) ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => dia && handleNovoEvento(dia)}
                >
                  {dia && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isHoje(dia) ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {dia}
                      </div>
                      <div className="space-y-1">
                        {getEventosDia(dia).slice(0, 3).map(evento => (
                          <div
                            key={evento.id}
                            className={`text-xs p-1 rounded text-white truncate ${getCorTipo(evento.tipo)}`}
                            onClick={(e) => { e.stopPropagation(); handleVerEvento(evento) }}
                            title={evento.titulo}
                          >
                            {evento.hora_inicio && <span className="mr-1">{evento.hora_inicio.slice(0, 5)}</span>}
                            {evento.titulo}
                          </div>
                        ))}
                        {getEventosDia(dia).length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{getEventosDia(dia).length - 3} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de eventos do mês */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Próximos Eventos</h3>
          {eventos.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum evento neste mês</p>
          ) : (
            <div className="space-y-2">
              {eventos.slice(0, 10).map(evento => (
                <div
                  key={evento.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleVerEvento(evento)}
                >
                  <div className={`w-3 h-10 rounded ${getCorTipo(evento.tipo)}`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{evento.titulo}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{new Date(evento.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      {evento.hora_inicio && <span>{evento.hora_inicio.slice(0, 5)}</span>}
                      {getNomeTurma(evento.turma_id) && <span>• {getNomeTurma(evento.turma_id)}</span>}
                    </div>
                  </div>
                  <Badge variant="default">{TIPOS_EVENTO.find(t => t.value === evento.tipo)?.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal criar/editar evento */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingEvento ? 'Editar Evento' : 'Novo Evento'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Prova de Matemática"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <Input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Início</label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fim</label>
              <Input
                type="time"
                value={formData.hora_fim}
                onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Evento['tipo'] })}
              >
                {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                value={formData.turma_id}
                onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
              >
                <option value="">Todas / Geral</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <Input
              value={formData.local}
              onChange={(e) => setFormData({ ...formData, local: e.target.value })}
              placeholder="Ex: Sala 101, Quadra, Auditório..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes do evento..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSalvar} loading={saving} disabled={!formData.titulo || !formData.data_inicio}>
              {editingEvento ? 'Salvar' : 'Criar Evento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal detalhes do evento */}
      <Modal isOpen={modalEventoOpen} onClose={() => setModalEventoOpen(false)} title="Detalhes do Evento" size="md">
        {eventoSelecionado && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-4 h-4 rounded mt-1 ${getCorTipo(eventoSelecionado.tipo)}`}></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{eventoSelecionado.titulo}</h3>
                <Badge>{TIPOS_EVENTO.find(t => t.value === eventoSelecionado.tipo)?.label}</Badge>
              </div>
            </div>

            <div className="space-y-2 text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{new Date(eventoSelecionado.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              
              {eventoSelecionado.hora_inicio && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{eventoSelecionado.hora_inicio.slice(0, 5)}{eventoSelecionado.hora_fim && ` - ${eventoSelecionado.hora_fim.slice(0, 5)}`}</span>
                </div>
              )}

              {eventoSelecionado.local && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{eventoSelecionado.local}</span>
                </div>
              )}

              {getNomeTurma(eventoSelecionado.turma_id) && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{getNomeTurma(eventoSelecionado.turma_id)}</span>
                </div>
              )}
            </div>

            {eventoSelecionado.descricao && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{eventoSelecionado.descricao}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => handleExcluir(eventoSelecionado.id)}>
                <Trash2 className="w-4 h-4 mr-2 text-red-500" />Excluir
              </Button>
              <Button className="flex-1" onClick={() => handleEditarEvento(eventoSelecionado)}>
                <Edit className="w-4 h-4 mr-2" />Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
      }
