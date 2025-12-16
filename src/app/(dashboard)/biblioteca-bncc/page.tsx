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
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600">{habilidade.codigo}</span>
            <Badge variant="default" className="text-xs">
