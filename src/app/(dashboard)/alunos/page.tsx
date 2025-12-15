'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, Button, Input } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Search, Users, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface AlunoComTurma {
  id: string
  nome: string
  matricula?: string
  ativo: boolean
  turma_id: string
  turma_nome: string
}

interface TurmaComAlunos {
  id: string
  nome: string
  ano_serie: string
  alunos: AlunoComTurma[]
  expanded: boolean
}

export default function AlunosPage() {
  const { usuario } = useAuth()
  const [turmasComAlunos, setTurmasComAlunos] = useState<TurmaComAlunos[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [alunosAtivos, setAlunosAtivos] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (usuario) {
      fetchDados()
    }
  }, [usuario])

  const fetchDados = async () => {
    setLoading(true)
    const { data: turmasData } = await supabase
      .from('turmas')
      .select('id, nome, ano_serie')
      .eq('usuario_id', usuario?.id)
      .order('ano_serie')
      .order('nome')

    if (!turmasData || turmasData.length === 0) {
      setTurmasComAlunos([])
      setLoading(false)
      return
    }

    const turmaIds = turmasData.map((t: any) => t.id)
    const { data: alunosData } = await supabase
      .from('alunos')
      .select('*')
      .in('turma_id', turmaIds)
      .order('nome')

    const turmasOrganizadas: TurmaComAlunos[] = turmasData.map(turma => ({
      id: turma.id,
      nome: turma.nome,
      ano_serie: turma.ano_serie,
      alunos: (alunosData || [])
        .filter(a => a.turma_id === turma.id)
        .map(a => ({ ...a, turma_nome: turma.nome })),
      expanded: true
    }))

    setTurmasComAlunos(turmasOrganizadas)
    setTotalAlunos(alunosData?.length || 0)
    setAlunosAtivos(alunosData?.filter(a => a.ativo).length || 0)
    setLoading(false)
  }

  const toggleTurma = (turmaId: string) => {
    setTurmasComAlunos(prev =>
      prev.map(t => t.id === turmaId ? { ...t, expanded: !t.expanded } : t)
    )
  }

  const filteredTurmas = turmasComAlunos.map(turma => ({
    ...turma,
    alunos: turma.alunos.filter(a =>
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.matricula && a.matricula.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(turma => searchTerm === '' || turma.alunos.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
        <p className="text-gray-600">Visualize todos os alunos organizados por turma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Alunos</p>
                <p className="text-2xl font-bold text-gray-900">{totalAlunos}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alunos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{alunosAtivos}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Turmas</p>
                <p className="text-2xl font-bold text-purple-600">{turmasComAlunos.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar alunos por nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-gray-900"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : turmasComAlunos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma turma cadastrada</h3>
            <p className="text-gray-600 mb-4">Crie uma turma e adicione alunos para começar.</p>
            <Link href="/turmas">
              <Button>Ir para Turmas</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTurmas.map((turma) => (
            <Card key={turma.id}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleTurma(turma.id)}
              >
                <div className="flex items-center gap-3">
                  {turma.expanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{turma.nome}</h3>
                    <p className="text-sm text-gray-500">{turma.ano_serie}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {turma.alunos.length} aluno{turma.alunos.length !== 1 ? 's' : ''}
                  </span>
                  <Link href={`/turmas/${turma.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm">Gerenciar</Button>
                  </Link>
                </div>
              </div>

              {turma.expanded && turma.alunos.length > 0 && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turma.alunos.map((aluno, index) => (
                        <TableRow key={aluno.id}>
                          <TableCell className="text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-medium text-gray-900">{aluno.nome}</TableCell>
                          <TableCell className="text-gray-600">{aluno.matricula || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${aluno.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {aluno.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {turma.expanded && turma.alunos.length === 0 && (
                <div className="border-t p-6 text-center text-gray-500">
                  <p>Nenhum aluno nesta turma</p>
                  <Link href={`/turmas/${turma.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">Adicionar Alunos</Button>
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
