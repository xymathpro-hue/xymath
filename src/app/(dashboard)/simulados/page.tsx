'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PlusCircle, FileText, Calendar, Edit, Trash2, Eye } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

interface Simulado {
  id: string
  titulo: string
  status: string
  total_questoes: number
  created_at: string
}

export default function SimuladosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState(false)
  const [simuladoToDelete, setSimuladoToDelete] = useState<Simulado | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    const { data, error } = await supabase
      .from('simulados')
      .select('id, titulo, status, total_questoes, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSimulados(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleDeleteClick = (simulado: Simulado) => {
    setSimuladoToDelete(simulado)
    setDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!simuladoToDelete) return
    
    setDeleting(true)
    
    const { error } = await supabase
      .from('simulados')
      .delete()
      .eq('id', simuladoToDelete.id)

    setDeleting(false)
    setDeleteModal(false)
    setSimuladoToDelete(null)

    if (error) {
      alert('Erro ao excluir simulado')
      return
    }

    // Recarregar lista
    carregar()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando simulados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>

        <button
          onClick={() => router.push('/simulados/novo')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Novo simulado
        </button>
      </div>

      {simulados.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nenhum simulado criado ainda.</p>
          <p className="text-sm text-gray-500">Clique em "Novo simulado" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulados.map((simulado) => (
            <div
              key={simulado.id}
              className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{simulado.titulo}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      simulado.status === 'publicado' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {simulado.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {simulado.total_questoes || 0} questões
                    </span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(simulado.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Abrir/Ver */}
                <button
                  onClick={() => router.push(`/simulados/${simulado.id}`)}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 transition-colors"
                  title="Abrir simulado"
                >
                  <Eye className="w-4 h-4" />
                  Abrir
                </button>

                {/* Botão Editar */}
                <button
                  onClick={() => router.push(`/simulados/novo?edit=${simulado.id}`)}
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                  title="Editar simulado"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>

                {/* Botão Excluir */}
                <button
                  onClick={() => handleDeleteClick(simulado)}
                  className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
                  title="Excluir simulado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Modal 
        isOpen={deleteModal} 
        onClose={() => setDeleteModal(false)} 
        title="Excluir Simulado"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja excluir o simulado <strong>"{simuladoToDelete?.titulo}"</strong>?
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            ⚠️ Esta ação não pode ser desfeita. Todos os dados deste simulado serão perdidos.
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
