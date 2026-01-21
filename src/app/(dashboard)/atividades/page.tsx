'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, Button, Input, Modal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { useAtividades } from '@/hooks/useAtividades'
import { 
  Plus, 
  Search, 
  BookOpen, 
  Home, 
  FileText, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  ClipboardList,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { 
  TIPOS_ATIVIDADE_CONFIG, 
  BIMESTRES_OPTIONS,
  type TipoAtividade,
  type AtividadeComEstatisticas
} from '@/types/atividades'
import Link from 'next/link'

// Ícones por tipo
const IconesTipo: Record<TipoAtividade, React.ReactNode> = {
  classe: <BookOpen className="w-5 h-5" />,
  casa: <Home className="w-5 h-5" />,
  trabalho: <FileText className="w-5 h-5" />,
  grupo: <Users className="w-5 h-5" />,
  pesquisa: <Search className="w-5 h-5" />,
  participacao: <AlertCircle className="w-5 h-5" />,
  outro: <FileText className="w-5 h-5" />
}

interface Turma {
  id: string
  nome: string
  ano_serie: string
}

export default function AtividadesPage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  const { 
    atividades, 
    loading, 
    error,
    carregarAtividades, 
    criarAtividade, 
    editarAtividade,
    excluirAtividade 
  } = useAtividades()

  // Estados
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('')
  const [bimestreSelecionado, setBimestreSelecionado] = useState<number | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<AtividadeComEstatisticas | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [loadingTurmas, setLoadingTurmas] = useState(true)

  // Form states
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formTipo, setFormTipo] = useState<TipoAtividade>('classe')
  const [formDataEntrega, setFormDataEntrega] = useState('')
  const [formValor, setFormValor] = useState('0')
  const [formBimestre, setFormBimestre] = useState<number>(1)

  // Carregar turmas
  useEffect(() => {
    if (usuario) {
      fetchTurmas()
    }
  }, [usuario])

  // Carregar atividades quando selecionar turma
  useEffect(() => {
    if (turmaSelecionada) {
      carregarAtividades(turmaSelecionada, bimestreSelecionado)
    }
  }, [turmaSelecionada, bimestreSelecionado, carregarAtividades])

  const fetchTurmas = async () => {
    setLoadingTurmas(true)
    const { data } = await supabase
      .from('turmas')
      .select('id, nome, ano_serie')
      .eq('usuario_id', usuario?.id)
      .order('ano_serie')
      .order('nome')
    
    setTurmas(data || [])
    if (data && data.length > 0) {
      setTurmaSelecionada(data[0].id)
    }
    setLoadingTurmas(false)
  }

  // Abrir modal para criar/editar
  const handleOpenModal = (atividade?: AtividadeComEstatisticas) => {
    if (atividade) {
      setEditando(atividade)
      setFormTitulo(atividade.titulo)
      setFormDescricao(atividade.descricao || '')
      setFormTipo(atividade.tipo)
      setFormDataEntrega(atividade.data_entrega || '')
      setFormValor(atividade.valor.toString())
      setFormBimestre(atividade.bimestre || 1)
    } else {
      setEditando(null)
      setFormTitulo('')
      setFormDescricao('')
      setFormTipo('classe')
      setFormDataEntrega('')
      setFormValor('0')
      setFormBimestre(1)
    }
    setModalOpen(true)
  }

  // Salvar atividade
  const handleSalvar = async () => {
    if (!formTitulo || !turmaSelecionada) return
    
    setSalvando(true)
    
    const dados = {
      turma_id: turmaSelecionada,
      titulo: formTitulo,
      descricao: formDescricao || undefined,
      tipo: formTipo,
      data_entrega: formDataEntrega || undefined,
      valor: parseFloat(formValor) || 0,
      bimestre: formBimestre
    }

    let sucesso = false
    if (editando) {
      sucesso = await editarAtividade(editando.id, dados)
    } else {
      sucesso = await criarAtividade(dados)
    }

    if (sucesso) {
      setModalOpen(false)
      carregarAtividades(turmaSelecionada, bimestreSelecionado)
    }
    
    setSalvando(false)
  }

  // Excluir atividade
  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade? As entregas também serão excluídas.')) return
    
    const sucesso = await excluirAtividade(id)
    if (sucesso) {
      carregarAtividades(turmaSelecionada, bimestreSelecionado)
    }
  }

  // Filtrar atividades
  const atividadesFiltradas = atividades.filter(a =>
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas gerais
  const totalAtividades = atividades.length
  const totalValor = atividades.reduce((sum, a) => sum + (a.valor || 0), 0)
  const mediaEntrega = atividades.length > 0
    ? Math.round(atividades.reduce((sum, a) => sum + a.percentual_entrega, 0) / atividades.length)
    : 0

  // Formatar data
  const formatarData = (data: string | null) => {
    if (!data) return '-'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  if (loadingTurmas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (turmas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atividades</h1>
          <p className="text-gray-600">Gerencie as atividades das suas turmas</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma turma cadastrada</h3>
            <p className="text-gray-600 mb-4">Crie uma turma primeiro para adicionar atividades.</p>
            <Link href="/turmas">
              <Button>Ir para Turmas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atividades</h1>
          <p className="text-gray-600">Gerencie as atividades das suas turmas</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
          >
            {turmas.map(turma => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} - {turma.ano_serie}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bimestre</label>
          <select
            value={bimestreSelecionado || ''}
            onChange={(e) => setBimestreSelecionado(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
          >
            <option value="">Todos</option>
            {BIMESTRES_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar atividade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Atividades</p>
                <p className="text-2xl font-bold text-gray-900">{totalAtividades}</p>
              </div>
              <ClipboardList className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Pontos</p>
                <p className="text-2xl font-bold text-purple-600">{totalValor.toFixed(1)}</p>
              </div>
              <FileText className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Média de Entrega</p>
                <p className="text-2xl font-bold text-green-600">{mediaEntrega}%</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Atividades */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : atividadesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma atividade encontrada' : 'Nenhuma atividade cadastrada'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Tente outros termos de busca' : 'Clique em "Nova Atividade" para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {atividadesFiltradas.map((atividade) => {
            const config = TIPOS_ATIVIDADE_CONFIG[atividade.tipo]
            
            return (
              <Card key={atividade.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Info da Atividade */}
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${config.bgColor}`}>
                        <span className={config.cor}>{IconesTipo[atividade.tipo]}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{atividade.titulo}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.cor}`}>
                            {config.label}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatarData(atividade.data_entrega)}
                          </span>
                          <span className="text-sm font-medium text-purple-600">
                            {atividade.valor} pts
                          </span>
                          <span className="text-xs text-gray-400">
                            {BIMESTRES_OPTIONS.find(b => b.value === atividade.bimestre)?.label}
                          </span>
                        </div>
                        {atividade.descricao && (
                          <p className="text-sm text-gray-500 mt-1">{atividade.descricao}</p>
                        )}
                      </div>
                    </div>

                    {/* Estatísticas e Ações */}
                    <div className="flex items-center gap-4">
                      {/* Mini stats */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600" title="Entregues">
                          <CheckCircle className="w-4 h-4" />
                          {atividade.entregues}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600" title="Atrasados">
                          <Clock className="w-4 h-4" />
                          {atividade.atrasados}
                        </span>
                        <span className="flex items-center gap-1 text-red-600" title="Não entregues">
                          <XCircle className="w-4 h-4" />
                          {atividade.nao_entregues}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400" title="Pendentes">
                          <AlertCircle className="w-4 h-4" />
                          {atividade.pendentes}
                        </span>
                      </div>

                      {/* Barra de progresso */}
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Entrega</span>
                          <span className="font-medium text-gray-700">{atividade.percentual_entrega}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${atividade.percentual_entrega}%` }}
                          />
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <Link href={`/atividades/${atividade.id}`}>
                          <Button variant="outline" size="sm">
                            <ClipboardList className="w-4 h-4 mr-1" />
                            Lançar
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(atividade)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleExcluir(atividade.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editando ? 'Editar Atividade' : 'Nova Atividade'}
      >
        <div className="space-y-4">
          <Input
            label="Título *"
            placeholder="Ex: Lista de exercícios - Equações"
            value={formTitulo}
            onChange={(e) => setFormTitulo(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value as TipoAtividade)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
            >
              {Object.entries(TIPOS_ATIVIDADE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrega</label>
              <input
                type="date"
                value={formDataEntrega}
                onChange={(e) => setFormDataEntrega(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </div>
            <Input
              label="Valor (pontos)"
              type="number"
              step="0.5"
              min="0"
              value={formValor}
              onChange={(e) => setFormValor(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bimestre</label>
            <select
              value={formBimestre}
              onChange={(e) => setFormBimestre(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
            >
              {BIMESTRES_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <textarea
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Observações sobre a atividade..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSalvar} 
              disabled={!formTitulo || salvando}
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
