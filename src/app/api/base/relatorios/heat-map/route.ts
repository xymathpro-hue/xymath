
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const turma_id = searchParams.get('turma_id')
    const bimestre = searchParams.get('bimestre')

    if (!turma_id) {
      return NextResponse.json(
        { error: 'turma_id é obrigatório' },
        { status: 400 }
      )
    }

    // Chamar função SQL que gera heat map
    const { data: heatMapData, error } = await supabase.rpc(
      'gerar_heat_map_turma',
      {
        p_turma_id: turma_id,
        p_bimestre: bimestre ? parseInt(bimestre) : null
      }
    )

    if (error) throw error

    // Calcular estatísticas da turma
    const stats = {
      total_alunos: heatMapData?.length || 0,
      grupos: {
        A: heatMapData?.filter((a: any) => a.grupo_atual === 'A').length || 0,
        B: heatMapData?.filter((a: any) => a.grupo_atual === 'B').length || 0,
        C: heatMapData?.filter((a: any) => a.grupo_atual === 'C').length || 0
      },
      medias: {
        L: calcularMedia(heatMapData, 'comp_l'),
        F: calcularMedia(heatMapData, 'comp_f'),
        R: calcularMedia(heatMapData, 'comp_r'),
        A: calcularMedia(heatMapData, 'comp_a'),
        J: calcularMedia(heatMapData, 'comp_j')
      }
    }

    // Identificar competências críticas (< 50%)
    const competenciasCriticas = Object.entries(stats.medias)
      .filter(([_, valor]) => valor < 50)
      .map(([comp, valor]) => ({
        competencia: comp,
        media: valor,
        status: 'critica'
      }))

    // Alertas automáticos
    const alertas = []

    // Alerta: Muitos alunos no Grupo A
    if (stats.grupos.A / stats.total_alunos > 0.4) {
      alertas.push({
        tipo: 'alerta',
        mensagem: `${stats.grupos.A} alunos (${Math.round(stats.grupos.A / stats.total_alunos * 100)}%) estão no Grupo A (Apoio Intensivo)`,
        prioridade: 'alta'
      })
    }

    // Alerta: Competência crítica
    competenciasCriticas.forEach(comp => {
      alertas.push({
        tipo: 'alerta',
        mensagem: `Competência ${comp.competencia} crítica: ${comp.media.toFixed(1)}% de domínio`,
        prioridade: 'alta'
      })
    })

    // Destaque positivo: Evolução
    if (stats.grupos.C / stats.total_alunos > 0.3) {
      alertas.push({
        tipo: 'destaque',
        mensagem: `${stats.grupos.C} alunos (${Math.round(stats.grupos.C / stats.total_alunos * 100)}%) no Grupo C!`,
        prioridade: 'positiva'
      })
    }

    return NextResponse.json({
      heat_map: heatMapData,
      estatisticas: stats,
      competencias_criticas: competenciasCriticas,
      alertas
    })

  } catch (error: any) {
    console.error('Erro ao gerar heat map:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Função auxiliar
function calcularMedia(dados: any[], campo: string): number {
  if (!dados || dados.length === 0) return 0
  const soma = dados.reduce((acc, item) => acc + (item[campo] || 0), 0)
  return Math.round((soma / dados.length) * 10) / 10
}
