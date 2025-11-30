'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, Button, Input } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Search, Users, GraduationCap } from 'lucide-react'
import Link from 'next/link'

interface AlunoComTurma {
  id: string
  nome: string
  matricula?: string
  ativo: boolean
  turma_id: string
  turma_nome: string
}

export default function AlunosPage() {
  const { usuario } = useAuth()
  const [alunos, setAlunos] = useState<AlunoComTurma[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [turmas, setTurmas] = useState<{ id: string; nome: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (usuario) {
      fetchAlunos()
      fetchTurmas()
    }
  }, [usuario])

  const fetchTurmas = async () => {
    const { data } = await supabase.from('turmas').select('id, nome').eq('usuario_id', usuario?.id).order('nome')
    if (data) setTurmas(data)
  }

  const fetchAlunos = async () => {
    setLoading(true)
    const { data: turmasData } = await supabase.from('turmas').select('id, nome').eq('usuario_id', usuario?.id)
    if (!turmasData || turmasData.length === 0) { setAlunos([]); setLoading(false); return }
    const turmaIds = turmasData.map((t: any) => t.id)
const turmasMap = new Map(turmasData.map((t: any) => [t.id, t]))
    const { data: alunosData } = await supabase.from('alunos').select('*').in('turma_id', turmaIds).order('nome')
    if (alunosData) {
      setAlunos(alunosData.map(aluno => ({ ...aluno, turma_nome: turmasMap.get(aluno.turma_id)?.nome || '' })))
    }
    setLoading(false)
  }

  const filteredAlunos = alunos.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
        <p className="text-gray-600">Visualize todos os alunos de suas turmas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total de Alunos</p><p className="text-2xl font-bold">{alunos.length}</p></div><Users className="w-10 h-10 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Alunos Ativos</p><p className="text-2xl font-bold">{alunos.filter(a => a.ativo).length}</p></div><GraduationCap className="w-10 h-10 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Turmas</p><p className="text-2xl font-bold">{turmas.length}</p></div><Users className="w-10 h-10 text-purple-500" /></div></CardContent></Card>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><Input placeholder="Buscar alunos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></CardContent></Card>
      <Card><CardContent className="p-6 text-center"><Users className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">Gerenciamento de Alunos</h3><p className="text-gray-600 mb-4">Os alunos são gerenciados dentro de cada turma. Para adicionar alunos, acesse a turma desejada.</p><Link href="/turmas"><Button>Ir para Turmas</Button></Link></CardContent></Card>
      {loading ? (<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>) : filteredAlunos.length > 0 && (
        <Card><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>Turma</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filteredAlunos.map((aluno) => (<TableRow key={aluno.id}><TableCell className="font-medium">{aluno.nome}</TableCell><TableCell>{aluno.matricula || '-'}</TableCell><TableCell>{aluno.turma_nome}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs ${aluno.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{aluno.ativo ? 'Ativo' : 'Inativo'}</span></TableCell></TableRow>))}</TableBody></Table></Card>
      )}
    </div>
  )
}
