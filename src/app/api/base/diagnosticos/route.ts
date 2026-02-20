// src/app/api/base/diagnosticos/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      turma_id,
      tipo,
      titulo,
      data_aplicacao,
      total_questoes,
      ano_letivo,
      bimestre
    } = body

    if (!turma_id || !tipo || !titulo || !data_aplicacao) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: turma_id, tipo, titulo, data_aplicacao' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_diagnosticos_iniciais')
      .insert({
        turma_id,
        tipo,
        titulo,
        data_aplicacao,
        total_questoes: total_questoes || 12,
        ano_letivo: ano_letivo || 2026,
        bimestre: bimestre || 1
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Diagnóstico ${tipo} criado com sucesso!`,
      data
    })
  } catch (error: any) {
    console.error('Erro ao criar diagnóstico:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

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
      .from('base_diagnosticos_iniciais')
      .select('*')
      .eq('turma_id', turma_id)
      .eq('bimestre', parseInt(bimestre))
      .eq('ano_letivo', parseInt(ano_letivo))
      .order('tipo', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro ao buscar diagnósticos:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
