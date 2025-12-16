'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Input, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { 
  Search, 
  BookOpen, 
  Filter, 
  X,
  ChevronRight,
  ExternalLink,
  FileText,
  Gamepad2,
  Map,
  Library,
  Calculator,
  Shapes,
  Ruler,
  BarChart3,
  BookMarked,
  Sparkles,
  Compass,
  Youtube,
  FileQuestion
} from 'lucide-react'

// =============================================
// TIPOS
// =============================================
interface UnidadeTematica {
  id: string
  codigo: string
  nome: string
  descricao?: string
  ordem: number
}

interface Habilidade {
  id: string
  codigo: string
  descricao: string
  descricao_simplificada?: string
  ano_serie: string
  unidade_tematica_id: string
  objeto_conhecimento?: string
  unidade_tematica?: UnidadeTematica
}

interface RecursoBNCC {
  id: string
  habilidade_id: string
  tipo: 'wordwall' | 'geogebra' | 'mapa_mental' | 'material' | 'video' | 'xy_jogo'
  titulo: string
  descricao?: string
  url?: string
  arquivo_url?: string
  tipo_atividade?: string
}

interface HabilidadeComRecursos extends Habilidade {
  total_questoes: number
  recursos: RecursoBNCC[]
}

// =============================================
// CONSTANTES
// =============================================
const SERIES_OPTIONS = [
  { value: '', label: 'Todas as séries' },
  { value: '6º ano EF', label: '6º ano' },
  { value: '7º ano EF', label: '7º ano' },
  { value: '8º ano EF', label: '8º ano' },
  { value: '9º ano EF', label: '9º ano' },
]

const TIPO_RECURSO_OPTIONS = [
  { value: '', label: 'Todos os recursos', icon: Library },
  { value: 'wordwall', label: 'Wordwall', icon: Gamepad2 },
  { value: 'geogebra', label: 'GeoGebra', icon: Compass },
  { value: 'mapa_mental', label: 'Mapas Mentais', icon: Map },
  { value: 'video', label: 'Vídeos', icon: Youtube },
  { value: 'material', label: 'Materiais', icon: FileText },
]

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
const getUnidadeColor = (codigo: string) => {
  const colors: Record<string, string> = {
    'NUM': 'bg-blue-100 text-blue-700 border-blue-200',
    'ALG': 'bg-purple-100 text-purple-700 border-purple-200',
    'GEO': 'bg-green-100 text-green-700 border-green-200',
    'GRA': 'bg-orange-100 text-orange-700 border-orange-200',
    'PRO': 'bg-pink-100 text-pink-700 border-pink-200',
  }
  return colors[codigo] || 'bg-gray-100 text-gray-700 border-gray-200'
}

const getUnidadeBorderColor = (codigo: string) => {
  const colors: Record<string, string> = {
    'NUM': '#3b82f6',
    'ALG': '#8b5cf6',
    'GEO': '#22c55e',
    'GRA': '#f97316',
    'PRO': '#ec4899',
  }
  return colors[codigo] || '#6b7280'
}

const getUnidadeIcon = (codigo: string) => {
  const icons: Record<string, typeof Calculator> = {
    'NUM': Calculator,
    'ALG': Ruler,
    'GEO': Shapes,
    'GRA': Ruler,
    'PRO': BarChart3,
  }
  return icons[codigo] || BookOpen
}

const getSerieLabel = (serie: string) => {
  if (serie.includes('6')) return '6º ano'
  if (serie.includes('7')) return '7º ano'
  if (serie.includes('8')) return '8º ano'
  if (serie.includes('9')) return '9º ano'
  return serie
}

const getTipoIcon = (tipo: string) => {
  const icons: Record<string, typeof Gamepad2> = {
    'wordwall': Gamepad2,
    'geogebra': Compass,
    'mapa_mental': Map,
    'video': Youtube,
    'material': FileText,
    'xy_jogo': Sparkles,
  }
  return icons[tipo] || FileQuestion
}

const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    'wordwall': 'Wordwall',
    'geogebra': 'GeoGebra',
    'mapa_mental': 'Mapa Mental',
    'video': 'Vídeo',
    'material': 'Material',
    'xy_jogo': 'XY Jogo',
  }
  return labels[tipo] || tipo
}

const getTipoColor = (tipo: string) => {
  const colors: Record<string, string> = {
    'wordwall': 'bg-purple-100 text-purple-700',
    'geogebra': 'bg-blue-100 text-blue-700',
    'mapa_mental': 'bg-green-100 text-green-700',
    'video': 'bg-red-100 text-red-700',
    'material': 'bg-orange-100 text-orange-700',
    'xy_jogo': 'bg-indigo-100 text-indigo-700',
  }
  return colors[tipo] || 'bg-gray-100 text-gray-700'
}

// =============================================
// COMPONENTE: Card da Habilidade
// =============================================
function HabilidadeCard({ habilidade, onClick }: { 
  habilidade: HabilidadeComRecursos
  onClick: () => void 
}) {
  const unidadeCodigo = habilidade.unidade_tematica?.codigo || 'NUM'
  const UnidadeIcon = getUnidadeIcon(unidadeCodigo)
  const totalRecursos = habilidade.recursos?.length || 0
  
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 hover:scale-[1.01]"
      style={{ borderLeftColor: getUnidadeBorderColor(unidadeCodigo) }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600">{habilidade.codigo}</span>
            <Badge variant="default" className="text-xs">
              {getSerieLabel(habilidade.ano_serie)}
            </Badge>
          </div>
          <div className={`p-2 rounded-lg ${getUnidadeColor(unidadeCodigo)}`}>
            <UnidadeIcon className="w-4 h-4" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {habilidade.descricao_simplificada || habilidade.descricao}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Library className="w-3.5 h-3.5" />
              <span>{totalRecursos} {totalRecursos === 1 ? 'recurso' : 'recursos'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <BookMarked className="w-3.5 h-3.5" />
              <span>{habilidade.total_questoes} questões</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

        {totalRecursos > 0 && (
          <div className="flex gap-1 mt-2">
            {Array.from(new Set(habilidade.recursos.map(r => r.tipo))).map(tipo => {
              const TipoIcon = getTipoIcon(tipo)
              return (
                <div 
                  key={tipo}
                  className={`p-1 rounded ${getTipoColor(tipo)}`}
                  title={getTipoLabel(tipo)}
                >
                  <TipoIcon className="w-3 h-3" />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================
// COMPONENTE: Modal de Detalhe da Habilidade
// =============================================
function HabilidadeModal({ 
  habilidade, 
  onClose 
}: { 
  habilidade: HabilidadeComRecursos | null
  onClose: () => void 
}) {
  if (!habilidade) return null

  const unidadeCodigo = habilidade.unidade_tematica?.codigo || 'NUM'
  const UnidadeIcon = getUnidadeIcon(unidadeCodigo)

  const recursosPorTipo = habilidade.recursos?.reduce((acc, recurso) => {
    if (!acc[recurso.tipo]) acc[recurso.tipo] = []
    acc[recurso.tipo].push(recurso)
    return acc
  }, {} as Record<string, RecursoBNCC[]>) || {}

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 ${getUnidadeColor(unidadeCodigo)} border-b`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/80 rounded-xl">
                <UnidadeIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{habilidade.codigo}</h2>
                <p className="text-sm opacity-80">
                  {getSerieLabel(habilidade.ano_serie)} • {habilidade.unidade_tematica?.nome || 'Matemática'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Descrição da Habilidade
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {habilidade.descricao}
            </p>
            {habilidade.objeto_conhecimento && (
              <p className="text-sm text-gray-500 mt-2">
                📚 <strong>Objeto de conhecimento:</strong> {habilidade.objeto_conhecimento}
              </p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Recursos Disponíveis ({habilidade.recursos?.length || 0})
            </h3>
            
            {habilidade.recursos && habilidade.recursos.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(recursosPorTipo).map(([tipo, recursos]) => {
                  const TipoIcon = getTipoIcon(tipo)
                  return (
                    <div key={tipo}>
                      <div className={`flex items-center gap-2 mb-2 px-2 py-1 rounded-lg ${getTipoColor(tipo)} w-fit`}>
                        <TipoIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{getTipoLabel(tipo)} ({recursos.length})</span>
                      </div>
                      
                      <div className="space-y-2 ml-2">
                        {recursos.map(recurso => (
                          
                            key={recurso.id}
                            href={recurso.url || recurso.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {recurso.titulo}
                              </p>
                              {recurso.descricao && (
                                <p className="text-xs text-gray-500 truncate">
                                  {recurso.descricao}
                                </p>
                              )}
                              {recurso.tipo_atividade && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Tipo: {recurso.tipo_atividade}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Library className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum recurso cadastrado ainda</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Link
              href={`/questoes?habilidade_bncc_id=${habilidade.id}`}
              className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookMarked className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-medium text-indigo-900">Ver Questões</p>
                  <p className="text-sm text-indigo-600">
                    {habilidade.total_questoes} questões disponíveis
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
export default function BibliotecaBNCCPage() {
  const { usuario } = useAuth()
  const supabase = createClient()
  
  const [habilidades, setHabilidades] = useState<HabilidadeComRecursos[]>([])
  const [unidadesTematicas, setUnidadesTematicas] = useState<UnidadeTematica[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedHabilidade, setSelectedHabilidade] = useState<HabilidadeComRecursos | null>(null)
  
  const [filters, setFilters] = useState({
    ano_serie: '',
    unidade_tematica_id: '',
    tipo_recurso: '',
  })

  useEffect(() => {
    async function loadUnidades() {
      const { data } = await supabase
        .from('unidades_tematicas')
        .select('*')
        .order('ordem')
      if (data) setUnidadesTematicas(data)
    }
    loadUnidades()
  }, [supabase])

  const fetchHabilidades = useCallback(async () => {
    if (!usuario?.id) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      let query = supabase
        .from('habilidades_bncc')
        .select(`
          *,
          unidade_tematica:unidades_tematicas(*)
        `)
        .order('codigo')

      if (filters.ano_serie) {
        query = query.eq('ano_serie', filters.ano_serie)
      }
      if (filters.unidade_tematica_id) {
        query = query.eq('unidade_tematica_id', filters.unidade_tematica_id)
      }

      const { data: habData, error: habError } = await query

      if (habError) throw habError

      const { data: recursosData } = await supabase
        .from('recursos_bncc')
        .select('*')
        .eq('ativo', true)

      const { data: questoesData } = await supabase
        .from('questoes')
        .select('habilidade_bncc_id')

      const questoesCount: Record<string, number> = {}
      if (questoesData) {
        questoesData.forEach(q => {
          if (q.habilidade_bncc_id) {
            questoesCount[q.habilidade_bncc_id] = (questoesCount[q.habilidade_bncc_id] || 0) + 1
          }
        })
      }

      let habilidadesComRecursos: HabilidadeComRecursos[] = (habData || []).map(hab => {
        const recursos = (recursosData || []).filter(r => r.habilidade_id === hab.id)
        const totalQuestoes = questoesCount[hab.id] || 0
        
        return {
          ...hab,
          recursos: recursos,
          total_questoes: totalQuestoes
        }
      })

      if (filters.tipo_recurso) {
        habilidadesComRecursos = habilidadesComRecursos.filter(hab => 
          hab.recursos.some(r => r.tipo === filters.tipo_recurso)
        ).map(hab => ({
          ...hab,
          recursos: hab.recursos.filter(r => r.tipo === filters.tipo_recurso)
        }))
      }

      setHabilidades(habilidadesComRecursos)
    } catch (error) {
      console.error('Erro ao buscar habilidades:', error)
    } finally {
      setLoading(false)
    }
  }, [usuario?.id, supabase, filters])

  useEffect(() => {
    fetchHabilidades()
  }, [fetchHabilidades])

  const habilidadesFiltradas = habilidades.filter(hab => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      hab.codigo.toLowerCase().includes(search) ||
      hab.descricao.toLowerCase().includes(search) ||
      (hab.descricao_simplificada?.toLowerCase().includes(search)) ||
      (hab.objeto_conhecimento?.toLowerCase().includes(search)) ||
      (hab.unidade_tematica?.nome?.toLowerCase().includes(search))
    )
  })

  const habilidadesAgrupadas = unidadesTematicas
    .map(unidade => ({
      unidade: unidade,
      habilidades: habilidadesFiltradas.filter(h => h.unidade_tematica_id === unidade.id)
    }))
    .filter(grupo => grupo.habilidades.length > 0)

  const clearFilters = () => {
    setFilters({ ano_serie: '', unidade_tematica_id: '', tipo_recurso: '' })
    setSearchTerm('')
  }

  const hasActiveFilters = filters.ano_serie || filters.unidade_tematica_id || filters.tipo_recurso || searchTerm

  const totalHabilidades = habilidadesFiltradas.length
  const totalRecursos = habilidadesFiltradas.reduce((acc, h) => acc + (h.recursos?.length || 0), 0)
  
  const contagemPorTipo = habilidades.reduce((acc, h) => {
    h.recursos?.forEach(r => {
      acc[r.tipo] = (acc[r.tipo] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Library className="w-7 h-7 text-indigo-600" />
            Biblioteca BNCC
          </h1>
          <p className="text-gray-600 mt-1">
            Recursos pedagógicos organizados por habilidade
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="text-center px-4 py-2 bg-indigo-50 rounded-lg">
            <p className="text-xl font-bold text-indigo-600">{totalHabilidades}</p>
            <p className="text-xs text-indigo-600">Habilidades</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{totalRecursos}</p>
            <p className="text-xs text-green-600">Recursos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TIPO_RECURSO_OPTIONS.filter(t => t.value).map(tipo => {
          const TipoIcon = tipo.icon
          const count = contagemPorTipo[tipo.value] || 0
          return (
            <Card 
              key={tipo.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${filters.tipo_recurso === tipo.value ? 'ring-2 ring-indigo-500' : ''}`}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                tipo_recurso: prev.tipo_recurso === tipo.value ? '' : tipo.value 
              }))}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTipoColor(tipo.value)}`}>
                  <TipoIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{tipo.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, descrição ou tema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              variant={filterOpen ? 'primary' : 'outline'}
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                  Ativos
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {filterOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
                <select
                  value={filters.ano_serie}
                  onChange={(e) => setFilters(prev => ({ ...prev, ano_serie: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {SERIES_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Temática</label>
                <select
                  value={filters.unidade_tematica_id}
                  onChange={(e) => setFilters(prev => ({ ...prev, unidade_tematica_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todas as unidades</option>
                  {unidadesTematicas.map(ut => (
                    <option key={ut.id} value={ut.id}>{ut.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Recurso</label>
                <select
                  value={filters.tipo_recurso}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipo_recurso: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {TIPO_RECURSO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && habilidadesAgrupadas.length > 0 && (
        <div className="space-y-8">
          {habilidadesAgrupadas.map(grupo => {
            const GrupoIcon = getUnidadeIcon(grupo.unidade.codigo)
            return (
              <div key={grupo.unidade.id}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${getUnidadeColor(grupo.unidade.codigo)}`}>
                    <GrupoIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{grupo.unidade.nome}</h2>
                  <Badge variant="default">{grupo.habilidades.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grupo.habilidades.map(hab => (
                    <HabilidadeCard
                      key={hab.id}
                      habilidade={hab}
                      onClick={() => setSelectedHabilidade(hab)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && habilidadesAgrupadas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma habilidade encontrada
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros de busca'
                : 'As habilidades BNCC ainda não foram cadastradas'}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {selectedHabilidade && (
        <HabilidadeModal
          habilidade={selectedHabilidade}
          onClose={() => setSelectedHabilidade(null)}
        />
      )}
    </div>
  )
}
