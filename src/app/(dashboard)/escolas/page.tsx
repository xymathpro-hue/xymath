'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, Button, Input, Modal, Badge, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Search, Building2, Edit, Trash2, School, Upload, X, Image } from 'lucide-react'

interface Escola {
  id: string
  nome: string
  rede: string
  municipio?: string
  estado?: string
  inep?: string
  logo_url?: string
  created_at: string
  turmas_count?: number
}

const REDES = [
  { value: 'municipal', label: 'Municipal', color: 'bg-blue-100 text-blue-800' },
  { value: 'estadual', label: 'Estadual', color: 'bg-green-100 text-green-800' },
  { value: 'federal', label: 'Federal', color: 'bg-purple-100 text-purple-800' },
  { value: 'privada', label: 'Privada', color: 'bg-orange-100 text-orange-800' },
]

const ESTADOS = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

export default function EscolasPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  
  // Modal criar/editar
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Escola | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    rede: 'municipal',
    municipio: '',
    estado: 'PI',
    inep: '',
    logo_url: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  // Modal confirmação de exclusão
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [escolaExcluir, setEscolaExcluir] = useState<Escola | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregarEscolas = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: escolasData } = await supabase
        .from('escolas')
        .select('*')
        .eq('usuario_id', user.id)
        .order('nome')
      
      if (escolasData) {
        // Contar turmas por escola
        const escolasComContagem = await Promise.all(
          escolasData.map(async (escola) => {
            const { count } = await supabase
              .from('turmas')
              .select('*', { count: 'exact', head: true })
              .eq('escola_id', escola.id)
            
            return {
              ...escola,
              turmas_count: count || 0
            }
          })
        )
        setEscolas(escolasComContagem)
      }
    } catch (error) {
      console.error('Erro ao carregar escolas:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    carregarEscolas()
  }, [carregarEscolas])

  const abrirModalCriar = () => {
    setEditando(null)
    setFormData({ 
      nome: '', 
      rede: 'municipal',
      municipio: '',
      estado: 'PI',
      inep: '',
      logo_url: ''
    })
    setLogoPreview(null)
    setModalAberto(true)
  }

  const abrirModalEditar = (escola: Escola) => {
    setEditando(escola)
    setFormData({
      nome: escola.nome,
      rede: escola.rede,
      municipio: escola.municipio || '',
      estado: escola.estado || 'PI',
      inep: escola.inep || '',
      logo_url: escola.logo_url || ''
    })
    setLogoPreview(escola.logo_url || null)
    setModalAberto(true)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem.')
      return
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB.')
      return
    }

    setUploadingLogo(true)
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Fazer upload
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      setLogoPreview(publicUrl)
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload da imagem. Tente novamente.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const removerLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }))
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const salvarEscola = async () => {
    if (!user || !formData.nome.trim()) return
    
    setSalvando(true)
    try {
      const dadosEscola = {
        nome: formData.nome.trim(),
        rede: formData.rede,
        municipio: formData.municipio.trim() || null,
        estado: formData.estado || null,
        inep: formData.inep.trim() || null,
        logo_url: formData.logo_url || null
      }

      if (editando) {
        await supabase
          .from('escolas')
          .update(dadosEscola)
          .eq('id', editando.id)
      } else {
        await supabase
          .from('escolas')
          .insert({
            ...dadosEscola,
            usuario_id: user.id
          })
      }
      
      setModalAberto(false)
      carregarEscolas()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar escola. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = (escola: Escola) => {
    setEscolaExcluir(escola)
    setModalExcluirAberto(true)
  }

  const excluirEscola = async () => {
    if (!escolaExcluir) return
    
    setExcluindo(true)
    try {
      // Desvincular turmas dessa escola
      await supabase
        .from('turmas')
        .update({ escola_id: null })
        .eq('escola_id', escolaExcluir.id)
      
      // Excluir escola
      await supabase
        .from('escolas')
        .delete()
        .eq('id', escolaExcluir.id)
      
      setModalExcluirAberto(false)
      setEscolaExcluir(null)
      carregarEscolas()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir escola. Tente novamente.')
    } finally {
      setExcluindo(false)
    }
  }

  const getRedeBadge = (rede: string) => {
    const redeInfo = REDES.find(r => r.value === rede)
    return (
      <Badge className={redeInfo?.color || 'bg-gray-100 text-gray-800'}>
        {redeInfo?.label || rede}
      </Badge>
    )
  }

  const escolasFiltradas = escolas.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.rede.toLowerCase().includes(busca.toLowerCase()) ||
    e.municipio?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escolas</h1>
          <p className="text-gray-600">Gerencie as escolas onde você leciona</p>
        </div>
        <Button onClick={abrirModalCriar}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Escola
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar escolas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Escolas */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando escolas...</p>
        </div>
      ) : escolasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {busca ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
            </h3>
            <p className="text-gray-600 mb-4">
              {busca ? 'Tente outra busca' : 'Cadastre sua primeira escola para organizar suas turmas'}
            </p>
            {!busca && (
              <Button onClick={abrirModalCriar}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Escola
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {escolasFiltradas.map((escola) => (
            <Card key={escola.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* Logo ou ícone */}
                  {escola.logo_url ? (
                    <img 
                      src={escola.logo_url} 
                      alt={escola.nome}
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <School className="w-8 h-8 text-indigo-600" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{escola.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getRedeBadge(escola.rede)}
                    </div>
                  </div>
                </div>

                {/* Informações adicionais */}
                <div className="text-sm text-gray-500 space-y-1 mb-3">
                  {escola.municipio && (
                    <p>{escola.municipio}{escola.estado ? ` - ${escola.estado}` : ''}</p>
                  )}
                  {escola.inep && (
                    <p className="font-mono text-xs">INEP: {escola.inep}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-gray-500">
                    {escola.turmas_count} {escola.turmas_count === 1 ? 'turma' : 'turmas'}
                  </span>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => abrirModalEditar(escola)}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => confirmarExclusao(escola)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? 'Editar Escola' : 'Nova Escola'}
      >
        <div className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo da Escola (opcional)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="w-20 h-20 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={removerLogo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {logoPreview ? 'Trocar' : 'Upload'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG até 2MB</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Escola *
            </label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: E.M. Professor João da Silva"
            />
          </div>

          {/* Rede */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rede de Ensino *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REDES.map((rede) => (
                <button
                  key={rede.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, rede: rede.value })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.rede === rede.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${rede.color}`}>
                    {rede.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Município e Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Município
              </label>
              <Input
                value={formData.municipio}
                onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                placeholder="Ex: Teresina"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <Select
                options={ESTADOS.map(e => ({ value: e.value, label: e.value }))}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              />
            </div>
          </div>

          {/* INEP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código INEP (opcional)
            </label>
            <Input
              value={formData.inep}
              onChange={(e) => setFormData({ ...formData, inep: e.target.value })}
              placeholder="Ex: 22001234"
              maxLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Código de 8 dígitos do INEP/MEC
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={salvarEscola} 
              disabled={salvando || !formData.nome.trim()}
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false)
          setEscolaExcluir(null)
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir a escola <strong>{escolaExcluir?.nome}</strong>?
          </p>
          {(escolaExcluir?.turmas_count || 0) > 0 && (
            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              ⚠️ Esta escola possui {escolaExcluir?.turmas_count} turma(s) vinculada(s). 
              As turmas serão mantidas, mas ficarão sem escola.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalExcluirAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={excluirEscola} 
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
