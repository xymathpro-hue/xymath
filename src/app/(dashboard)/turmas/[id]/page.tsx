'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Modal, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Turma, Aluno } from '@/types'
import * as XLSX from 'xlsx'
import { 
  ArrowLeft, Plus, Search, Users, Edit, Trash2, Upload, Download, GraduationCap
} from 'lucide-react'

export default function TurmaDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { usuario } = useAuth()
  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState({ nome: '', matricula: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [importData, setImportData] = useState<Array<{ nome: string; matricula?: string; email?: string }>>([])
  const [importing, setImporting] = useState(false)

  const supabase = createClient()
  const turmaId = params.id as string

  const fetchData = useCallback(async () => {
    if (!usuario?.id || !turmaId) return
    try {
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas').select('*').eq('id', turmaId).eq('usuario_id', usuario.id).single()
      if (turmaError) throw turmaError
      setTurma(turmaData)

      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos').select('*').eq('turma_id', turmaId).order('nome', { ascending: true })
      if (alunosError) throw alunosError
      setAlunos(alunosData || [])
    } catch (error) {
      console.error('Erro:', error)
      router.push('/turmas')
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, turmaId, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOpenModal = (aluno?: Aluno) => {
    if (aluno) {
      setEditingAluno(aluno)
      setFormData({ nome: aluno.nome, matricula: aluno.matricula || '', email: aluno.email || '' })
    } else {
      setEditingAluno(null)
      setFormData({ nome: '', matricula: '', email: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome) return
    setSaving(true)
    try {
      if (editingAluno) {
        await supabase.from('alunos').update({
          nome: formData.nome, matricula: formData.matricula || null, email: formData.email || null,
        }).eq('id', editingAluno.id)
      } else {
        await supabase.from('alunos').insert({
          turma_id: turmaId, nome: formData.nome, matricula: formData.matricula || null, 
          email: formData.email || null, ativo: true,
        })
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (alunoId: string) => {
    if (!confirm('Excluir este aluno?')) return
    try {
      await supabase.from('alunos').delete().eq('id', alunoId)
      fetchData()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet)
      const mappedData = jsonData.map(row => ({
        nome: String(row['Nome'] || row['nome'] || row['NOME'] || row['Aluno'] || '').trim(),
        matricula: String(row['Matricula'] || row['matricula'] || row['Matrícula'] || '').trim(),
        email: String(row['Email'] || row['email'] || row['E-mail'] || '').trim()
      })).filter(item => item.nome)
      setImportData(mappedData)
      setImportModalOpen(true)
    } catch (error) {
      alert('Erro ao ler arquivo.')
    }
    event.target.value = ''
  }

  const handleImport = async () => {
    if (importData.length === 0) return
    setImporting(true)
    try {
      await supabase.from('alunos').insert(importData.map(item => ({
        turma_id: turmaId, nome: item.nome, matricula: item.matricula || null,
        email: item.email || null, ativo: true,
      })))
      setImportModalOpen(false)
      setImportData([])
      fetchData()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      { Nome: 'João Silva', Matricula: '2024001', Email: 'joao@email.com' },
      { Nome: 'Maria Santos', Matricula: '2024002', Email: '' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos')
    XLSX.writeFile(wb, 'modelo_importacao_alunos.xlsx')
  }

  const filteredAlunos = alunos.filter(a =>
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  }

  if (!turma) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/turmas" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{turma.nome}</h1>
            <p className="text-gray-600">{turma.ano_serie} • {turma.turno} • {turma.ano_letivo}</p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
              <span className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2">
                <Upload className="w-5 h-5 mr-2" />Importar
              </span>
            </label>
            <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Novo Aluno</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-2xl font-bold">{alunos.length}</p><p className="text-sm text-gray-600">Total</p></div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-2xl font-bold">{alunos.filter(a => a.ativo).length}</p><p className="text-sm text-gray-600">Ativos</p></div>
          </CardContent>
        </Card>
      </div>

      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input placeholder="Buscar alunos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filteredAlunos.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</h3>
            <p className="text-gray-500 mb-6">{searchTerm ? 'Tente outros termos' : 'Adicione manualmente ou importe de uma planilha'}</p>
            {!searchTerm && (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={downloadTemplate}><Download className="w-5 h-5 mr-2" />Modelo</Button>
                <Button onClick={() => handleOpenModal()}><Plus className="w-5 h-5 mr-2" />Adicionar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="bordered">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlunos.map((aluno, index) => (
                <TableRow key={aluno.id}>
                  <TableCell className="text-gray-500">{index + 1}</TableCell>
                  <TableCell className="font-medium">{aluno.nome}</TableCell>
                  <TableCell>{aluno.matricula || '-'}</TableCell>
                  <TableCell>{aluno.email || '-'}</TableCell>
                  <TableCell><Badge variant={aluno.ativo ? 'success' : 'default'}>{aluno.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(aluno)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(aluno.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal Aluno */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAluno ? 'Editar Aluno' : 'Novo Aluno'}>
        <div className="space-y-4">
          <Input label="Nome" placeholder="Nome completo" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
          <Input label="Matrícula (opcional)" placeholder="Número" value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} />
          <Input label="Email (opcional)" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!formData.nome}>{editingAluno ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Import */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Alunos" size="lg">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800"><strong>{importData.length}</strong> alunos encontrados. Confira antes de importar.</p>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
              <TableBody>
                {importData.map((item, i) => (
                  <TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{item.nome}</TableCell><TableCell>{item.matricula || '-'}</TableCell><TableCell>{item.email || '-'}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => { setImportModalOpen(false); setImportData([]) }}>Cancelar</Button>
            <Button className="flex-1" onClick={handleImport} loading={importing}>Importar {importData.length} Alunos</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
