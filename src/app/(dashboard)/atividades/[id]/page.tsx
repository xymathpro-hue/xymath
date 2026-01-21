'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button } from '@/components/ui'
import { useAtividades } from '@/hooks/useAtividades'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Calendar,
  FileText,
  Users
} from 'lucide-react'
import { 
  TIPOS_ATIVIDADE_CONFIG, 
  STATUS_ENTREGA_CONFIG,
  BIMESTRES_OPTIONS,
  type StatusEntrega,
  type LancarEntrega
} from '@/types/atividades'
import BadgeLaudo from '@/components/alunos/BadgeLaudo'

export default function LancarEntregasPage() {
  const params = useParams()
  const router = useRouter()
  const atividadeId = params.id as string

  const {
    atividadeAtual,
    alunosComEntrega,
    loading,
    error,
    carregarEntregas,
    lancarEntregasEmLote
  } = useAtividades()

  // Estados locais para edição
  const [entregasLocal, setEntregasLocal] = useState<Record<string, {
    status: StatusEntrega
    nota: string
  }>>({})
  const [salvando, setSalvando] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  // Carregar dados
  useEffect(() => {
    if (atividadeId) {
      carregarEntregas(atividadeId)
    }
  }, [atividadeId, carregarEntregas])

  // Inicializar estados locais quando carregar alunos
  useEffect(() => {
    const inicial: Record<string, { status: StatusEntrega; nota: string }> = {}
    alunosComEntrega.forEach(aluno => {
      inicial[aluno.id] = {
        status: aluno.entrega?.status || 'pendente',
        nota: aluno.entrega?.nota?.toString() || ''
      }
    })
    setEntregasLocal(inicial)
  }, [alunosComEntrega])

  // Limpar mensagem de sucesso
  useEffect(() => {
    if (mensagemSucesso) {
      const timer = setTimeout(() => setMensagemSucesso(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [mensagemSucesso])

  // Atualizar status de um aluno
  const handleStatusChange = (alunoId: string, status: StatusEntrega) => {
    setEntregasLocal(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], status }
    }))
  }

  // Atualizar nota de um aluno
  const handleNotaChange = (alunoId: string, nota: string) => {
    setEntregasLocal(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], nota }
    }))
  }

  // Marcar todos como entregue
  const handleMarcarTodosEntregue = () => {
    const atualizado: Record<string, { status: StatusEntrega; nota: string }> = {}
    Object.keys(entregasLocal).forEach(alunoId => {
      atualizado[alunoId] = { ...entregasLocal[alunoId], status: 'entregue' }
    })
    setEntregasLocal(atualizado)
  }

  // Marcar todos como não entregue
  const handleMarcarTodosNaoEntregue = () => {
    const atualizado: Record<string, { status: StatusEntrega; nota: string }> = {}
    Object.keys(entregasLocal).forEach(alunoId => {
      atualizado[alunoId] = { ...entregasLocal[alunoId], status: 'nao_entregue' }
    })
    setEntregasLocal(atualizado)
  }

  // Aplicar nota para todos que entregaram
  const handleAplicarNotaTodos = () => {
    const nota = prompt('Digite a nota para aplicar a todos que entregaram:')
    if (nota === null) return
    
    const atualizado: Record<string, { status: StatusEntrega; nota: string }> = {}
    Object.keys(entregasLocal).forEach(alunoId => {
      const entrega = entregasLocal[alunoId]
      if (entrega.status === 'entregue' || entrega.status === 'atrasado') {
        atualizado[alunoId] = { ...entrega, nota }
      } else {
        atualizado[alunoId] = entrega
      }
    })
    setEntregasLocal(atualizado)
  }

  // Salvar todas as entregas
  const handleSalvar = async () => {
    setSalvando(true)
    
    const entregas: LancarEntrega[] = Object.entries(entregasLocal).map(([alunoId, dados]) => ({
      atividade_id: atividadeId,
      aluno_id: alunoId,
      status: dados.status,
      nota: dados.nota ? parseFloat(dados.nota) : undefined
    }))

    const sucesso = await lancarEntregasEmLote(atividadeId, entregas)
    
    if (sucesso) {
      setMensagemSucesso('Entregas salvas com sucesso!')
      carregarEntregas(atividadeId)
    }
    
    setSalvando(false)
  }

  // Formatar data
  const formatarData = (data: string | null) => {
    if (!data) return '-'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  // Calcular estatísticas
  const stats = {
    total: Object.keys(entregasLocal).length,
    entregues: Object.values(entregasLocal).filter(e => e.status === 'entregue').length,
    atrasados: Object.values(entregasLocal).filter(e => e.status === 'atrasado').length,
    naoEntregues: Object.values(entregasLocal).filter(e => e.status === 'nao_entregue').length,
    pendentes: Object.values(entregasLocal).filter(e => e.status === 'pendente').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!atividadeAtual) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Atividade não encontrada</p>
        <Link href="/atividades">
          <Button variant="outline" className="mt-4">Voltar</Button>
        </Link>
      </div>
    )
  }

  const config = TIPOS_ATIVIDADE_CONFIG[atividadeAtual.tipo]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/atividades" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Atividades
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{atividadeAtual.titulo}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`text-sm px-2 py-1 rounded ${config.bgColor} ${config.cor}`}>
                {config.label}
              </span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatarData(atividadeAtual.data_entrega)}
              </span>
              <span className="text-sm font-medium text-purple-600 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {atividadeAtual.valor} pontos
              </span>
              <span className="text-sm text-gray-400">
                {BIMESTRES_OPTIONS.find(b => b.value === atividadeAtual.bimestre)?.label}
              </span>
            </div>
          </div>
          
          <Button onClick={handleSalvar} disabled={salvando}>
            <Save className="w-5 h-5 mr-2" />
            {salvando ? 'Salvando...' : 'Salvar Entregas'}
          </Button>
        </div>
      </div>

      {/* Mensagem de sucesso */}
      {mensagemSucesso && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800 text-sm">{mensagemSucesso}</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.entregues}</p>
            <p className="text-xs text-gray-500">Entregues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{stats.atrasados}</p>
            <p className="text-xs text-gray-500">Atrasados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{stats.naoEntregues}</p>
            <p className="text-xs text-gray-500">Não Entregou</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-600">{stats.pendentes}</p>
            <p className="text-xs text-gray-500">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 mr-2">Ações rápidas:</span>
            <Button variant="outline" size="sm" onClick={handleMarcarTodosEntregue}>
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Todos Entregaram
            </Button>
            <Button variant="outline" size="sm" onClick={handleMarcarTodosNaoEntregue}>
              <XCircle className="w-4 h-4 mr-1 text-red-500" />
              Ninguém Entregou
            </Button>
            <Button variant="outline" size="sm" onClick={handleAplicarNotaTodos}>
              <FileText className="w-4 h-4 mr-1 text-purple-500" />
              Aplicar Nota a Todos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Aluno</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-32">
                  Nota (máx: {atividadeAtual.valor})
                </th>
              </tr>
            </thead>
            <tbody>
              {alunosComEntrega.map((aluno, index) => {
                const entregaLocal = entregasLocal[aluno.id] || { status: 'pendente', nota: '' }
                const statusConfig = STATUS_ENTREGA_CONFIG[entregaLocal.status]

                return (
                  <tr key={aluno.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{aluno.nome}</span>
                        <BadgeLaudo 
                          possuiLaudo={aluno.possui_laudo} 
                          tipoLaudo={aluno.tipo_laudo as any} 
                        />
                      </div>
                      <span className="text-xs text-gray-400">{aluno.matricula}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(['entregue', 'atrasado', 'nao_entregue'] as StatusEntrega[]).map(status => {
                          const cfg = STATUS_ENTREGA_CONFIG[status]
                          const isSelected = entregaLocal.status === status
                          
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(aluno.id, status)}
                              className={`
                                px-2 py-1 rounded text-xs font-medium transition-all
                                ${isSelected 
                                  ? `${cfg.bgColor} ${cfg.cor} ring-2 ring-offset-1 ring-current` 
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }
                              `}
                            >
                              {status === 'entregue' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {status === 'atrasado' && <Clock className="w-3 h-3 inline mr-1" />}
                              {status === 'nao_entregue' && <XCircle className="w-3 h-3 inline mr-1" />}
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={atividadeAtual.valor}
                        value={entregaLocal.nota}
                        onChange={(e) => handleNotaChange(aluno.id, e.target.value)}
                        disabled={entregaLocal.status === 'nao_entregue' || entregaLocal.status === 'pendente'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Botão Salvar fixo no mobile */}
      <div className="md:hidden fixed bottom-4 left-4 right-4">
        <Button className="w-full" onClick={handleSalvar} disabled={salvando}>
          <Save className="w-5 h-5 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar Entregas'}
        </Button>
      </div>
    </div>
  )
}
