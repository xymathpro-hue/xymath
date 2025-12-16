'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Shield, Users, UserPlus, UserCheck, UserX, Search, 
  BarChart3, BookOpen, FileText, GraduationCap, Eye, 
  EyeOff, Copy, CheckCircle, AlertCircle, RefreshCw,
  Mail, Calendar, Activity
} from 'lucide-react'

interface Usuario {
  id: string
  email: string
  nome: string
  escola?: string
  is_admin: boolean
  ativo: boolean
  ultimo_acesso?: string
  created_at: string
}

interface Metricas {
  usuario_id: string
  total_questoes: number
  total_simulados: number
  total_turmas: number
  total_alunos: number
  total_correcoes: number
}

interface MetricasGerais {
  totalUsuarios: number
  usuariosAtivos: number
  totalQuestoes: number
  totalSimulados: number
  totalTurmas: number
  totalAlunos: number
}

export default function AdminPage() {
  const { usuario } = useAuth()
  const supabase = createClient()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [metricas, setMetricas] = useState<Record<string, Metricas>>({})
  const [metricasGerais, setMetricasGerais] = useState<MetricasGerais>({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalQuestoes: 0,
    totalSimulados: 0,
    totalTurmas: 0,
    totalAlunos: 0
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  const [novoUsuario, setNovoUsuario] = useState({
    email: '',
    nome: '',
    escola: '',
    senha: ''
  })

  // Verificar se é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!usuario?.id) return
      const { data } = await supabase
        .from('usuarios')
        .select('is_admin')
        .eq('id', usuario.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
    checkAdmin()
  }, [usuario?.id, supabase])

  // Carregar usuários
  const fetchUsuarios = useCallback(async () => {
    if (!usuario?.id) return
    setLoading(true)

    try {
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (usuariosData) {
        setUsuarios(usuariosData)
        
        // Calcular métricas gerais
        const ativos = usuariosData.filter(u => u.ativo).length
        setMetricasGerais(prev => ({
          ...prev,
          totalUsuarios: usuariosData.length,
          usuariosAtivos: ativos
        }))
      }

      // Buscar métricas por usuário
      const { data: metricasData } = await supabase
        .from('metricas_usuario')
        .select('*')

      if (metricasData) {
        const metricasMap: Record<string, Metricas> = {}
        metricasData.forEach(m => { metricasMap[m.usuario_id] = m })
        setMetricas(metricasMap)
      }

      // Contar totais gerais
      const [questoesRes, simuladosRes, turmasRes, alunosRes] = await Promise.all([
        supabase.from('questoes').select('id', { count: 'exact', head: true }),
        supabase.from('simulados').select('id', { count: 'exact', head: true }),
        supabase.from('turmas').select('id', { count: 'exact', head: true }),
        supabase.from('alunos').select('id', { count: 'exact', head: true })
      ])

      setMetricasGerais(prev => ({
        ...prev,
        totalQuestoes: questoesRes.count || 0,
        totalSimulados: simuladosRes.count || 0,
        totalTurmas: turmasRes.count || 0,
        totalAlunos: alunosRes.count || 0
      }))

    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => {
    if (isAdmin) fetchUsuarios()
  }, [isAdmin, fetchUsuarios])

  // Gerar senha aleatória
  const gerarSenha = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
    let senha = ''
    for (let i = 0; i < 8; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNovoUsuario({ ...novoUsuario, senha })
  }

  // Criar novo usuário
  const handleCriarUsuario = async () => {
    if (!novoUsuario.email || !novoUsuario.nome || !novoUsuario.senha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos obrigatórios' })
      return
    }

    setSaving(true)
    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: novoUsuario.email,
        password: novoUsuario.senha,
        email_confirm: true
      })

      if (authError) {
        // Se não tiver permissão admin, tentar método alternativo
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: novoUsuario.email,
          password: novoUsuario.senha
        })

        if (signUpError) throw signUpError

        // Inserir na tabela usuarios
        if (signUpData.user) {
          await supabase.from('usuarios').insert({
            id: signUpData.user.id,
            email: novoUsuario.email,
            nome: novoUsuario.nome,
            escola: novoUsuario.escola || null,
            is_admin: false,
            ativo: true
          })
        }
      } else if (authData.user) {
        // Inserir na tabela usuarios
        await supabase.from('usuarios').insert({
          id: authData.user.id,
          email: novoUsuario.email,
          nome: novoUsuario.nome,
          escola: novoUsuario.escola || null,
          is_admin: false,
          ativo: true
        })
      }

      setMensagem({ tipo: 'sucesso', texto: `Usuário criado! Email: ${novoUsuario.email} | Senha: ${novoUsuario.senha}` })
      setModalOpen(false)
      setNovoUsuario({ email: '', nome: '', escola: '', senha: '' })
      fetchUsuarios()
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao criar usuário' })
    } finally {
      setSaving(false)
    }
  }

  // Ativar/Desativar usuário
  const toggleUsuarioAtivo = async (usuarioId: string, ativo: boolean) => {
    try {
      await supabase
        .from('usuarios')
        .update({ ativo: !ativo })
        .eq('id', usuarioId)
      
      fetchUsuarios()
      setMensagem({ tipo: 'sucesso', texto: `Usuário ${!ativo ? 'ativado' : 'desativado'}` })
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Copiar credenciais
  const copiarCredenciais = (email: string, senha?: string) => {
    const texto = senha 
      ? `Email: ${email}\nSenha: ${senha}`
      : `Email: ${email}`
    navigator.clipboard.writeText(texto)
    setMensagem({ tipo: 'sucesso', texto: 'Copiado!' })
    setTimeout(() => setMensagem(null), 2000)
  }

  // Atualizar métricas de um usuário
  const atualizarMetricas = async (usuarioId: string) => {
    try {
      const [questoes, simulados, turmas, alunos] = await Promise.all([
        supabase.from('questoes').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId),
        supabase.from('simulados').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId),
        supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId),
        supabase.from('alunos').select('id', { count: 'exact', head: true })
          .in('turma_id', (await supabase.from('turmas').select('id').eq('usuario_id', usuarioId)).data?.map(t => t.id) || [])
      ])

      await supabase.from('metricas_usuario').upsert({
        usuario_id: usuarioId,
        total_questoes: questoes.count || 0,
        total_simulados: simulados.count || 0,
        total_turmas: turmas.count || 0,
        total_alunos: alunos.count || 0,
        atualizado_em: new Date().toISOString()
      })

      fetchUsuarios()
      setMensagem({ tipo: 'sucesso', texto: 'Métricas atualizadas!' })
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.escola?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Se não for admin
  if (!isAdmin && !loading) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Painel Administrativo
          </h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e monitore o sistema</p>
        </div>
        <Button onClick={() => { gerarSenha(); setModalOpen(true) }}>
          <UserPlus className="w-5 h-5 mr-2" />Novo Professor
        </Button>
      </div>

      {/* Mensagens */}
      {mensagem && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensagem.texto}
          <button onClick={() => setMensagem(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.totalUsuarios}</p>
            <p className="text-sm text-gray-600">Usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.usuariosAtivos}</p>
            <p className="text-sm text-gray-600">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.totalQuestoes}</p>
            <p className="text-sm text-gray-600">Questões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.totalSimulados}</p>
            <p className="text-sm text-gray-600">Simulados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.totalTurmas}</p>
            <p className="text-sm text-gray-600">Turmas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-pink-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metricasGerais.totalAlunos}</p>
            <p className="text-sm text-gray-600">Alunos</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Usuário</th>
                    <th className="text-left p-4 font-medium text-gray-700">Escola</th>
                    <th className="text-center p-4 font-medium text-gray-700">Questões</th>
                    <th className="text-center p-4 font-medium text-gray-700">Simulados</th>
                    <th className="text-center p-4 font-medium text-gray-700">Turmas</th>
                    <th className="text-center p-4 font-medium text-gray-700">Status</th>
                    <th className="text-center p-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u, idx) => (
                    <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {u.nome}
                            {u.is_admin && <Badge variant="info">Admin</Badge>}
                          </p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{u.escola || '-'}</td>
                      <td className="p-4 text-center">{metricas[u.id]?.total_questoes || 0}</td>
                      <td className="p-4 text-center">{metricas[u.id]?.total_simulados || 0}</td>
                      <td className="p-4 text-center">{metricas[u.id]?.total_turmas || 0}</td>
                      <td className="p-4 text-center">
                        <Badge variant={u.ativo ? 'success' : 'danger'}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => atualizarMetricas(u.id)}
                            title="Atualizar métricas"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copiarCredenciais(u.email)}
                            title="Copiar email"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleUsuarioAtivo(u.id, u.ativo)}
                            title={u.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {u.ativo ? <EyeOff className="w-4 h-4 text-red-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo usuário */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Professor" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <Input
              value={novoUsuario.nome}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={novoUsuario.email}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
              placeholder="professor@escola.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
            <Input
              value={novoUsuario.escola}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, escola: e.target.value })}
              placeholder="Nome da escola"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <div className="flex gap-2">
              <Input
                value={novoUsuario.senha}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                placeholder="Senha inicial"
              />
              <Button variant="outline" onClick={gerarSenha}>Gerar</Button>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Anote as credenciais! A senha não poderá ser visualizada depois.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleCriarUsuario} 
              loading={saving}
              disabled={!novoUsuario.email || !novoUsuario.nome || !novoUsuario.senha}
            >
              <UserPlus className="w-4 h-4 mr-2" />Criar Conta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
          }
