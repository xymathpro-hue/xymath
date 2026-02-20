// src/app/api/base/diagnosticos/respostas/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { diagnostico_id, respostas } = body

    if (!diagnostico_id || !respostas || !Array.isArray(respostas)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: diagnostico_id, respostas[]' },
        { status: 400 }
      )
    }

    // Buscar diagnóstico para pegar turma_id
    const { data: diagnostico, error: diagError } = await supabase
      .from('base_diagnosticos_iniciais')
      .select('turma_id')
      .eq('id', diagnostico_id)
      .single()

    if (diagError) throw diagError

    // Preparar respostas com turma_id
    const respostasComTurma = respostas.map((r: any) => ({
      diagnostico_id,
      aluno_id: r.aluno_id,
      turma_id: diagnostico.turma_id,
      acertos_L: r.acertos_L,
      acertos_F: r.acertos_F,
      acertos_R: r.acertos_R,
      acertos_A: r.acertos_A,
      acertos_J: r.acertos_J,
      total_L: r.total_L || 2,
      total_F: r.total_F || 2,
      total_R: r.total_R || 2,
      total_A: r.total_A || 2,
      total_J: r.total_J || 2
    }))

    // Inserir respostas (upsert)
    const { data, error } = await supabase
      .from('base_respostas_diagnostico')
      .upsert(respostasComTurma, {
        onConflict: 'diagnostico_id,aluno_id'
      })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Respostas salvas! Classificação atualizada automaticamente.',
      total_respostas: data.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar respostas:', error)
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
    
    const diagnostico_id = searchParams.get('diagnostico_id')
    const aluno_id = searchParams.get('aluno_id')

    let query = supabase
      .from('base_respostas_diagnostico')
      .select('*')

    if (diagnostico_id) {
      query = query.eq('diagnostico_id', diagnostico_id)
    }

    if (aluno_id) {
      query = query.eq('aluno_id', aluno_id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro ao buscar respostas:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
