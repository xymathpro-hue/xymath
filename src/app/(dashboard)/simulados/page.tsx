'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Plus, Search, FileText, Users, Calendar, Clock, Download, Trash2, Edit, 
  Eye, QrCode, MoreVertical, ChevronDown, ChevronUp, CheckCircle, XCircle,
  ClipboardList, Copy
} from 'lucide-react'
import { gerarProvaWord } from '@/lib/gerar-prova-word'
import { ModalFolhaRespostas } from '@/components/ModalFolhaRespostas'

interface Simulado {
  id: string
  titulo: string
  turma_id: string
  data_aplicacao: string | null
  duracao_minutos: number | null
  status: 'rascunho' | 'publicado' | 'encerrado'
  created_at: string
  turmas?: {
    nome: string
    ano_escolar: string
  }
  questoes_count?: number
  respostas_count?: number
  pontuacao_tipo: 'padrao' | 'personalizada'
  pontuacao_acerto: number
  pontuacao_erro: number
  pontuacao_branco: number
}

interface SimuladoQuestao {
  id: string
  simulado_id: string
  questao_id: string
  ordem: number
  pontuacao_personalizada?: number
  questoes: {
    id: string
    enunciado: string
    alternativa_a: string
    alternativa_b: string
    alternativa_c: string
    alternativa_d: string
    resposta_correta: string
    nivel_dificuldade: string
    habilidade_bncc: string
  }
}

interface Turma {
  id: string
  nome: string
  ano_escolar: string
}

interface RespostaAluno {
  id: string
  simulado_id: string
  aluno_id: string
  questao_id: string
  resposta: string
  correta: boolean
  created_at: string
  alunos: {
    id: string
    nome: string
  }
}

export default function SimuladosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  
  // Modal criar/editar
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Simulado | null>(null)
  const [formData, setFormData] = useState({
    titulo: '',
    turma_id: '',
    data_aplicacao: '',
    duracao_minutos: 60,
    pontuacao_tipo: 'padrao' as 'padrao' | 'personalizada',
    pontuacao_acerto: 1,
    pontuacao_erro: 0,
    pontuacao_branco: 0
  })
  const [salvando, setSalvando] = useState(false)
  
  // Modal QR Code
  const [modalQrAberto, setModalQrAberto] = useState(false)
  const [simuladoQr, setSimuladoQr] = useState<Simulado | null>(null)
  
  // Modal Visualizar Respostas
  const [modalRespostasAberto, setModalRespostasAberto] = useState(false)
  const [simuladoRespostas, setSimuladoRespostas] = useState<Simulado | null>(null)
  const [respostasAlunos, setRespostasAlunos] = useState<RespostaAluno[]>([])
  const [questoesSimulado, setQuestoesSimulado] = useState<SimuladoQuestao[]>([])
  const [loadingRespostas, setLoadingRespostas] = useState(false)
  
  // Expandir card
  const [expandido, setExpandido] = useState<string | null>(null)
  const [questoesExpandidas, setQuestoesExpandidas] = useState<SimuladoQuestao[]>([])
  const [loadingQuestoes, setLoadingQuestoes] = useState(false)
  
  // Menu de ações (dropdown)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Estado para download
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Modal confirmação de exclusão
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [simuladoExcluir, setSimuladoExcluir] = useState<Simulado | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Modal Folha de Respostas
  const [modalFolhaRespostasAberto, setModalFolhaRespostasAberto] = useState(false)
  const [simuladoFolhaRespostas, setSimuladoFolhaRespostas] = useState<Simulado | null>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const carregarDados = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Carregar turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano_escolar')
        .eq('professor_id', user.id)
        .order('nome')
      
      setTurmas(turmasData || [])
      
      // Carregar simulados com contagem de questões
      const { data: simuladosData } = await supabase
        .from('simulados')
        .select(`
          *,
          turmas (nome, ano_escolar)
        `)
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false })
      
      if (simuladosData) {
        // Buscar contagem de questões para cada simulado
        const simuladosComContagem = await Promise.all(
          simuladosData.map(async (s) => {
            const { count: questoesCount } = await supabase
              .from('simulado_questoes')
              .select('*', { count: 'exact', head: true })
              .eq('simulado_id', s.id)
            
            const { count: respostasCount } = await supabase
              .from('respostas_simulado')
              .select('*', { count: 'exact', head: true })
              .eq('simulado_id', s.id)
            
            // Contar alunos únicos que responderam
            const { data: alunosUnicos } = await supabase
              .from('respostas_simulado')
              .select('aluno_id')
              .eq('simulado_id', s.id)
            
            const alunosSet = new Set(alunosUnicos?.map(r => r.aluno_id) || [])
            
            return {
              ...s,
              questoes_count: questoesCount || 0,
              respostas_count: alunosSet.size
            }
          })
        )
        setSimulados(simuladosComContagem)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const abrirModalCriar = () => {
    setEditando(null)
    setFormData({
      titulo: '',
      turma_id: '',
      data_aplicacao: '',
      duracao_minutos: 60,
      pontuacao_tipo: 'padrao',
      pontuacao_acerto: 1,
      pontuacao_erro: 0,
      pontuacao_branco: 0
    })
    setModalAberto(true)
  }

  const abrirModalEditar = (simulado: Simulado) => {
    setEditando(simulado)
    setFormData({
      titulo: simulado.titulo,
      turma_id: simulado.turma_id,
      data_aplicacao: simulado.data_aplicacao || '',
      duracao_minutos: simulado.duracao_minutos || 60,
      pontuacao_tipo: simulado.pontuacao_tipo || 'padrao',
      pontuacao_acerto: simulado.pontuacao_acerto ?? 1,
      pontuacao_erro: simulado.pontuacao_erro ?? 0,
      pontuacao_branco: simulado.pontuacao_branco ?? 0
    })
    setModalAberto(true)
    setMenuAberto(null)
  }

  const abrirQrCodeModal = (simulado: Simulado) => {
    setSimuladoQr(simulado)
    setModalQrAberto(true)
    setMenuAberto(null)
  }

  const abrirFolhaRespostasModal = (simulado: Simulado) => {
    setSimuladoFolhaRespostas(simulado)
    setModalFolhaRespostasAberto(true)
    setMenuAberto(null)
  }

  const abrirRespostasModal = async (simulado: Simulado) => {
    setSimuladoRespostas(simulado)
    setModalRespostasAberto(true)
    setLoadingRespostas(true)
    setMenuAberto(null)
    
    try {
      // Carregar questões do simulado
      const { data: questoes } = await supabase
        .from('simulado_questoes')
        .select(`
          *,
          questoes (
            id, enunciado, alternativa_a, alternativa_b, 
            alternativa_c, alternativa_d, resposta_correta,
            nivel_dificuldade, habilidade_bncc
          )
        `)
        .eq('simulado_id', simulado.id)
        .order('ordem')
      
      setQuestoesSimulado(questoes || [])
      
      // Carregar respostas dos alunos
      const { data: respostas } = await supabase
        .from('respostas_simulado')
        .select(`
          *,
          alunos (id, nome)
        `)
        .eq('simulado_id', simulado.id)
        .order('created_at')
      
      setRespostasAlunos(respostas || [])
    } catch (error) {
      console.error('Erro ao carregar respostas:', error)
    } finally {
      setLoadingRespostas(false)
    }
  }

  const salvarSimulado = async () => {
    if (!user || !formData.titulo || !formData.turma_id) return
    
    setSalvando(true)
    try {
      const dados = {
        titulo: formData.titulo,
        turma_id: formData.turma_id,
        data_aplicacao: formData.data_aplicacao || null,
        duracao_minutos: formData.duracao_minutos,
        professor_id: user.id,
        pontuacao_tipo: formData.pontuacao_tipo,
        pontuacao_acerto: formData.pontuacao_acerto,
        pontuacao_erro: formData.pontuacao_erro,
        pontuacao_branco: formData.pontuacao_branco
      }
      
      if (editando) {
        await supabase
          .from('simulados')
          .update(dados)
          .eq('id', editando.id)
      } else {
        await supabase
          .from('simulados')
          .insert(dados)
      }
      
      setModalAberto(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = (simulado: Simulado) => {
    setSimuladoExcluir(simulado)
    setModalExcluirAberto(true)
    setMenuAberto(null)
  }

  const excluirSimulado = async () => {
    if (!simuladoExcluir) return
    
    setExcluindo(true)
    try {
      // Primeiro excluir respostas
      await supabase
        .from('respostas_simulado')
        .delete()
        .eq('simulado_id', simuladoExcluir.id)
      
      // Depois excluir questões do simulado
      await supabase
        .from('simulado_questoes')
        .delete()
        .eq('simulado_id', simuladoExcluir.id)
      
      // Por fim excluir o simulado
      await supabase
        .from('simulados')
        .delete()
        .eq('id', simuladoExcluir.id)
      
      setModalExcluirAberto(false)
      setSimuladoExcluir(null)
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    } finally {
      setExcluindo(false)
    }
  }

  const alterarStatus = async (simulado: Simulado, novoStatus: 'rascunho' | 'publicado' | 'encerrado') => {
    try {
      await supabase
        .from('simulados')
        .update({ status: novoStatus })
        .eq('id', simulado.id)
      
      carregarDados()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
    setMenuAberto(null)
  }

  const expandirSimulado = async (simuladoId: string) => {
    if (expandido === simuladoId) {
      setExpandido(null)
      setQuestoesExpandidas([])
      return
    }
    
    setExpandido(simuladoId)
    setLoadingQuestoes(true)
    
    try {
      const { data } = await supabase
        .from('simulado_questoes')
        .select(`
          *,
          questoes (
            id, enunciado, alternativa_a, alternativa_b, 
            alternativa_c, alternativa_d, resposta_correta,
            nivel_dificuldade, habilidade_bncc
          )
        `)
        .eq('simulado_id', simuladoId)
        .order('ordem')
      
      setQuestoesExpandidas(data || [])
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
    } finally {
      setLoadingQuestoes(false)
    }
  }

  const baixarProva = async (simulado: Simulado) => {
    setDownloadingId(simulado.id)
    setMenuAberto(null)
    
    try {
      // Buscar questões do simulado
      const { data: questoes } = await supabase
        .from('simulado_questoes')
        .select(`
          *,
          questoes (
            id, enunciado, alternativa_a, alternativa_b, 
            alternativa_c, alternativa_d, resposta_correta,
            nivel_dificuldade, habilidade_bncc
          )
        `)
        .eq('simulado_id', simulado.id)
        .order('ordem')
      
      if (!questoes || questoes.length === 0) {
        alert('Este simulado não possui questões!')
        return
      }
      
      // Gerar documento Word
      await gerarProvaWord({
        titulo: simulado.titulo,
        turma: simulado.turmas?.nome || '',
        data: simulado.data_aplicacao || '',
        duracao: simulado.duracao_minutos || 60,
        questoes: questoes.map(q => ({
          enunciado: q.questoes.enunciado,
          alternativa_a: q.questoes.alternativa_a,
          alternativa_b: q.questoes.alternativa_b,
          alternativa_c: q.questoes.alternativa_c,
          alternativa_d: q.questoes.alternativa_d,
          habilidade_bncc: q.questoes.habilidade_bncc
        }))
      })
    } catch (error) {
      console.error('Erro ao baixar prova:', error)
      alert('Erro ao gerar documento. Tente novamente.')
    } finally {
      setDownloadingId(null)
    }
  }

  const duplicarSimulado = async (simulado: Simulado) => {
    setMenuAberto(null)
    
    try {
      // Criar cópia do simulado
      const { data: novoSimulado, error: erroSimulado } = await supabase
        .from('simulados')
        .insert({
          titulo: `${simulado.titulo} (Cópia)`,
          turma_id: simulado.turma_id,
          data_aplicacao: null,
          duracao_minutos: simulado.duracao_minutos,
          status: 'rascunho',
          professor_id: user?.id,
          pontuacao_tipo: simulado.pontuacao_tipo,
          pontuacao_acerto: simulado.pontuacao_acerto,
          pontuacao_erro: simulado.pontuacao_erro,
          pontuacao_branco: simulado.pontuacao_branco
        })
        .select()
        .single()
      
      if (erroSimulado) throw erroSimulado
      
      // Copiar questões
      const { data: questoesOriginal } = await supabase
        .from('simulado_questoes')
        .select('*')
        .eq('simulado_id', simulado.id)
        .order('ordem')
      
      if (questoesOriginal && questoesOriginal.length > 0) {
        const novasQuestoes = questoesOriginal.map(q => ({
          simulado_id: novoSimulado.id,
          questao_id: q.questao_id,
          ordem: q.ordem,
          pontuacao_personalizada: q.pontuacao_personalizada
        }))
        
        await supabase
          .from('simulado_questoes')
          .insert(novasQuestoes)
      }
      
      carregarDados()
    } catch (error) {
      console.error('Erro ao duplicar:', error)
      alert('Erro ao duplicar simulado. Tente novamente.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'publicado':
        return <Badge className="bg-green-100 text-green-800">Publicado</Badge>
      case 'encerrado':
        return <Badge className="bg-gray-100 text-gray-800">Encerrado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
    }
  }

  const simuladosFiltrados = simulados.filter(s =>
    s.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    s.turmas?.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
          <p className="text-gray-600">Gerencie seus simulados e avaliações</p>
        </div>
        <Button onClick={abrirModalCriar}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Simulado
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar simulados..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Simulados */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando simulados...</p>
        </div>
      ) : simuladosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {busca ? 'Nenhum simulado encontrado' : 'Nenhum simulado criado'}
            </h3>
            <p className="text-gray-600 mb-4">
              {busca ? 'Tente outra busca' : 'Crie seu primeiro simulado para começar'}
            </p>
            {!busca && (
              <Button onClick={abrirModalCriar}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Simulado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {simuladosFiltrados.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{s.titulo}</h3>
                      {getStatusBadge(s.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {s.turmas?.nome || 'Sem turma'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {s.questoes_count} questões
                      </span>
                      {s.data_aplicacao && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(s.data_aplicacao).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {s.duracao_minutos && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {s.duracao_minutos} min
                        </span>
                      )}
                      {(s.respostas_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          {s.respostas_count} respostas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-1">
                    <Link href={`/simulados/${s.id}`}>
                      <Button variant="ghost" size="sm" title="Ver/Editar Questões">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => baixarProva(s)}
                      disabled={downloadingId === s.id}
                      title="Download Word"
                    >
                      <Download className={`w-4 h-4 text-blue-600 ${downloadingId === s.id ? 'animate-pulse' : ''}`} />
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => abrirFolhaRespostasModal(s)}
                      title="Folhas de Respostas"
                    >
                      <ClipboardList className="w-4 h-4 text-purple-600" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => abrirQrCodeModal(s)}
                      title="QR Code"
                    >
                      <QrCode className="w-4 h-4 text-green-600" />
                    </Button>

                    {/* Menu Dropdown */}
                    <div className="relative" ref={menuAberto === s.id ? menuRef : null}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setMenuAberto(menuAberto === s.id ? null : s.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      
                      {menuAberto === s.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50">
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => abrirModalEditar(s)}
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </button>
                          
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => duplicarSimulado(s)}
                          >
                            <Copy className="w-4 h-4" />
                            Duplicar
                          </button>
                          
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => abrirRespostasModal(s)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Ver Respostas
                          </button>
                          
                          <hr className="my-1" />
                          
                          {s.status === 'rascunho' && (
                            <button
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                              onClick={() => alterarStatus(s, 'publicado')}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Publicar
                            </button>
                          )}
                          
                          {s.status === 'publicado' && (
                            <button
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                              onClick={() => alterarStatus(s, 'encerrado')}
                            >
                              <XCircle className="w-4 h-4" />
                              Encerrar
                            </button>
                          )}
                          
                          {s.status === 'encerrado' && (
                            <button
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                              onClick={() => alterarStatus(s, 'rascunho')}
                            >
                              <Edit className="w-4 h-4" />
                              Reabrir como Rascunho
                            </button>
                          )}
                          
                          <hr className="my-1" />
                          
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                            onClick={() => confirmarExclusao(s)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expandir */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => expandirSimulado(s.id)}
                    >
                      {expandido === s.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Questões Expandidas */}
                {expandido === s.id && (
                  <div className="mt-4 pt-4 border-t">
                    {loadingQuestoes ? (
                      <p className="text-gray-500 text-center py-4">Carregando questões...</p>
                    ) : questoesExpandidas.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Nenhuma questão adicionada.{' '}
                        <Link href={`/simulados/${s.id}`} className="text-indigo-600 hover:underline">
                          Adicionar questões
                        </Link>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {questoesExpandidas.map((q, idx) => (
                          <div key={q.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {q.questoes.enunciado}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {q.questoes.habilidade_bncc}
                                  </span>
                                  <span className={`text-xs px-1.5 rounded ${
                                    q.questoes.nivel_dificuldade === 'facil' ? 'bg-green-100 text-green-700' :
                                    q.questoes.nivel_dificuldade === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {q.questoes.nivel_dificuldade}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Folha de Respostas */}
      {simuladoFolhaRespostas && (
        <ModalFolhaRespostas
          isOpen={modalFolhaRespostasAberto}
          onClose={() => {
            setModalFolhaRespostasAberto(false)
            setSimuladoFolhaRespostas(null)
          }}
          simulado={simuladoFolhaRespostas}
        />
      )}

      {/* Modal Criar/Editar */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? 'Editar Simulado' : 'Novo Simulado'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Simulado SAEB - 9º Ano"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Turma *
            </label>
            <select
              value={formData.turma_id}
              onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecione uma turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} - {t.ano_escolar}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Aplicação
              </label>
              <Input
                type="date"
                value={formData.data_aplicacao}
                onChange={(e) => setFormData({ ...formData, data_aplicacao: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração (minutos)
              </label>
              <Input
                type="number"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) || 60 })}
                min={10}
                max={300}
              />
            </div>
          </div>

          {/* Configuração de Pontuação */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Pontuação
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pontuacao_tipo"
                  value="padrao"
                  checked={formData.pontuacao_tipo === 'padrao'}
                  onChange={() => setFormData({ ...formData, pontuacao_tipo: 'padrao' })}
                />
                <span className="text-sm">Padrão (1 ponto por acerto)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pontuacao_tipo"
                  value="personalizada"
                  checked={formData.pontuacao_tipo === 'personalizada'}
                  onChange={() => setFormData({ ...formData, pontuacao_tipo: 'personalizada' })}
                />
                <span className="text-sm">Personalizada</span>
              </label>
            </div>

            {formData.pontuacao_tipo === 'personalizada' && (
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Acerto</label>
                  <Input
                    type="number"
                    value={formData.pontuacao_acerto}
                    onChange={(e) => setFormData({ ...formData, pontuacao_acerto: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Erro</label>
                  <Input
                    type="number"
                    value={formData.pontuacao_erro}
                    onChange={(e) => setFormData({ ...formData, pontuacao_erro: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Em Branco</label>
                  <Input
                    type="number"
                    value={formData.pontuacao_branco}
                    onChange={(e) => setFormData({ ...formData, pontuacao_branco: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarSimulado} disabled={salvando || !formData.titulo || !formData.turma_id}>
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false)
          setSimuladoExcluir(null)
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir o simulado <strong>{simuladoExcluir?.titulo}</strong>?
          </p>
          <p className="text-sm text-red-600">
            Esta ação não pode ser desfeita. Todas as questões e respostas associadas serão removidas.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalExcluirAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={excluirSimulado} 
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal QR Code */}
      <Modal
        isOpen={modalQrAberto}
        onClose={() => {
          setModalQrAberto(false)
          setSimuladoQr(null)
        }}
        title="QR Code do Simulado"
      >
        {simuladoQr && (
          <div className="text-center space-y-4">
            <p className="text-gray-600">{simuladoQr.titulo}</p>
            <div className="bg-white p-4 rounded-lg inline-block border">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}/responder/${simuladoQr.id}`
                )}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-gray-500">
              Alunos podem escanear para responder o simulado
            </p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/responder/${simuladoQr.id}`)
                alert('Link copiado!')
              }}
            >
              Copiar Link
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Respostas */}
      <Modal
        isOpen={modalRespostasAberto}
        onClose={() => {
          setModalRespostasAberto(false)
          setSimuladoRespostas(null)
          setRespostasAlunos([])
          setQuestoesSimulado([])
        }}
        title={`Respostas - ${simuladoRespostas?.titulo || ''}`}
      >
        {loadingRespostas ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando respostas...</p>
          </div>
        ) : respostasAlunos.length === 0 ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma resposta registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Agrupar respostas por aluno */}
            {Array.from(new Set(respostasAlunos.map(r => r.aluno_id))).map(alunoId => {
              const respostasAluno = respostasAlunos.filter(r => r.aluno_id === alunoId)
              const aluno = respostasAluno[0]?.alunos
              const acertos = respostasAluno.filter(r => r.correta).length
              const total = respostasAluno.length
              
              return (
                <div key={alunoId} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{aluno?.nome || 'Aluno'}</span>
                    <span className={`text-sm font-medium ${
                      acertos / total >= 0.7 ? 'text-green-600' :
                      acertos / total >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {acertos}/{total} ({Math.round(acertos / total * 100)}%)
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {questoesSimulado.map((q, idx) => {
                      const resposta = respostasAluno.find(r => r.questao_id === q.questao_id)
                      return (
                        <span
                          key={q.id}
                          className={`w-6 h-6 flex items-center justify-center text-xs rounded ${
                            resposta?.correta 
                              ? 'bg-green-100 text-green-700' 
                              : resposta 
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-200 text-gray-500'
                          }`}
                          title={`Questão ${idx + 1}: ${resposta?.resposta || 'Não respondida'}`}
                        >
                          {idx + 1}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
