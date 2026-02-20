// src/app/api/base/diagnosticos/classificacao/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const turma_id = searchParams.get('turma_id')
    const bimestre = searchParams.get('bimestre') || '1'
    const ano_letivo = searchParams.get('ano_letivo') || '2026'

    if (!turma_id) {
      return NextResponse.json(
        { error: 'turma_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_classificacao_inicial')
      .select(`
        *,
        aluno:alunos(id, nome_completo, numero_chamada)
      `)
      .eq('turma_id', turma_id)
      .eq('bimestre', parseInt(bimestre))
      .eq('ano_letivo', parseInt(ano_letivo))
      .order('media_diagnosticos', { ascending: false })

    if (error) throw error

    // Calcular estatísticas
    const total_alunos = data.length
    const grupo_A = data.filter(d => d.grupo_inicial === 'A').length
    const grupo_B = data.filter(d => d.grupo_inicial === 'B').length
    const grupo_C = data.filter(d => d.grupo_inicial === 'C').length
    const media_geral = total_alunos > 0 
      ? data.reduce((sum, d) => sum + (d.media_diagnosticos || 0), 0) / total_alunos 
      : 0

    return NextResponse.json({
      data,
      estatisticas: {
        total_alunos,
        grupo_A,
        grupo_B,
        grupo_C,
        media_geral: media_geral.toFixed(2),
        percentual_A: total_alunos > 0 ? ((grupo_A / total_alunos) * 100).toFixed(1) : '0',
        percentual_B: total_alunos > 0 ? ((grupo_B / total_alunos) * 100).toFixed(1) : '0',
        percentual_C: total_alunos > 0 ? ((grupo_C / total_alunos) * 100).toFixed(1) : '0'
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar classificação:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
