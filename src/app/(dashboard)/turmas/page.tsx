'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Select, Modal, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Turma } from '@/types'
import { 
  Plus, 
  Search, 
  Users, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Upload
} from 'lucide-react'

const turnoOptions = [
  { value: 'matutino', label: 'Matutino' },
  { value: 'vespertino', label: 'Vespertino' },
  { value: 'noturno', label: 'Noturno' },
]

const anoSerieOptions = [
  { value: '1º ano EF', label: '1º ano EF' },
  { value: '2º ano EF', label: '2º ano EF' },
  { value: '3º ano EF', label: '3º ano EF' },
  { value: '4º ano EF', label: '4º ano EF' },
  { value: '5º ano EF', label: '5º ano EF' },
  { value: '6º ano EF', label: '6º ano EF' },
  { value: '7º ano EF', label: '7º ano EF' },
  { value: '8º ano EF', label: '8º ano EF' },
  { value: '9º ano EF', label: '9º ano EF' },
  { value: '1º ano EM', label: '1º ano EM' },
  { value: '2º ano EM', label: '2º ano EM' },
  { value: '3º ano EM', label: '3º ano EM' },
]

export default function TurmasPage() {
  const { usuario } = useAuth()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null)
  const [formData, setFormData] = useState<{
    nome: string;
    ano_serie: string;
    turno: 'matutino' | 'vespertino' | 'noturno';
    ano_letivo: number;
  }>({
    nome: '',
    ano_serie: '',
    turno: 'matutino',
    ano_letivo: new Date().getFullYear(),
  })
  const [saving, setSaving] = useState(false)
  const [alunosCounts, setAlunosCounts] = useState<Record<string, number>>({})

  const supabase = createClient()

  const fetchTurmas = useCallback(async () => {
    if (!usuario?.id) return

    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTurmas(data || [])

      // Buscar contagem de alunos por turma
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        for (const turma of data) {
          const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('turma_id', turma.id)
          counts[turma.id] = count || 0
        }
        setAlunosCounts(counts)
      }
    } catch (error) {
      console.error('Erro ao buscar turmas:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase])

  useEffect(() => {
    fetchTurmas()
  }, [fetchTurmas])

  const handleOpenModal = (turma?: Turma) => {
    if (turma) {
      setEditingTurma(turma)
      setFormData({
        nome: turma.nome,
        ano_serie: turma.ano_serie,
        turno: turma.turno,
        ano_letivo: turma.ano_letivo,
      })
    } else {
      setEditingTurma(null)
      setFormData({
        nome: '',
        ano_serie: '',
        turno: 'matutino',
        ano_letivo: new Date().getFullYear(),
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!usuario?.id || !formData.nome || !formData.ano_serie) return

    setSaving(true)
    try {
      if (editingTurma) {
        const { error } = await supabase
          .from('turmas')
          .update({
            nome: formData.nome,
            ano_serie: formData.ano_serie,
            turno: formData.turno,
            ano_letivo: formData.ano_letivo,
          })
          .eq('id', editingTurma.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert({
            usuario_id: usuario.id,
            nome: formData.nome,
            ano_serie: formData.ano_serie,
            turno: formData.turno,
            ano_letivo: formData.ano_letivo,
            ativa: true,
          })

        if (error) throw error
      }

      setModalOpen(false)
      fetchTurmas()
    } catch (error) {
      console.error('Erro ao salvar turma:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (turmaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', turmaId)

      if (error) throw error
      fetchTurmas()
    } catch (error) {
      console.error('Erro ao excluir turma:', error)
    }
  }

  const filteredTurmas = turmas.filter(turma =>
    turma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.ano_serie.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas turmas e alunos</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Turma
        </Button>
      </div>

      {/* Search */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar turmas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Turmas List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredTurmas.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Tente buscar com outros termos' 
                : 'Comece criando sua primeira turma'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-5 h-5 mr-2" />
                Criar Turma
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="bordered">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ano/Série</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTurmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell className="font-medium">{turma.nome}</TableCell>
                  <TableCell>{turma.ano_serie}</TableCell>
                  <TableCell className="capitalize">{turma.turno}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      {alunosCounts[turma.id] || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={turma.ativa ? 'success' : 'default'}>
                      {turma.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/turmas/${turma.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleOpenModal(turma)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(turma.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTurma ? 'Editar Turma' : 'Nova Turma'}
      >
        <div className="space-y-4">
          <Input
            label="Nome da Turma"
            placeholder="Ex: 9º Ano A"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          
          <Select
            label="Ano/Série"
            options={anoSerieOptions}
            placeholder="Selecione o ano/série"
            value={formData.ano_serie}
            onChange={(e) => setFormData({ ...formData, ano_serie: e.target.value })}
          />

          <Select
            label="Turno"
            options={turnoOptions}
            value={formData.turno}
            onChange={(e) => setFormData({ ...formData, turno: e.target.value as 'matutino' | 'vespertino' | 'noturno' })}
          />

          <Input
            label="Ano Letivo"
            type="number"
            value={formData.ano_letivo}
            onChange={(e) => setFormData({ ...formData, ano_letivo: parseInt(e.target.value) })}
          />

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              loading={saving}
              disabled={!formData.nome || !formData.ano_serie}
            >
              {editingTurma ? 'Salvar' : 'Criar Turma'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
