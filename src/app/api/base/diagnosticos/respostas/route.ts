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

    // Preparar respostas com turma_id e 10 questões
    const respostasComTurma = respostas.map((r: any) => ({
      diagnostico_id,
      aluno_id: r.aluno_id,
      turma_id: diagnostico.turma_id,
      faltou: r.faltou || false,
      questao_1: r.questao_1 || 0,
      questao_2: r.questao_2 || 0,
      questao_3: r.questao_3 || 0,
      questao_4: r.questao_4 || 0,
      questao_5: r.questao_5 || 0,
      questao_6: r.questao_6 || 0,
      questao_7: r.questao_7 || 0,
      questao_8: r.questao_8 || 0,
      questao_9: r.questao_9 || 0,
      questao_10: r.questao_10 || 0,
      // Manter compatibilidade com sistema antigo (opcional)
      acertos_L: 0,
      acertos_F: 0,
      acertos_R: 0,
      acertos_A: 0,
      acertos_J: 0,
      total_L: 2,
      total_F: 2,
      total_R: 2,
      total_A: 2,
      total_J: 2
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
