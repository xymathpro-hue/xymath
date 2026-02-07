
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    const {
      avaliacao_id,
      respostas // Array de { aluno_id, acertos por competência }
    } = body

    // Validação
    if (!avaliacao_id || !respostas || respostas.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Buscar grupo atual de cada aluno
    const alunosIds = respostas.map((r: any) => r.aluno_id)
    
    const { data: grupos } = await supabase
      .from('base_alunos_grupo')
      .select('aluno_id, grupo')
      .in('aluno_id', alunosIds)

    const grupoMap = new Map(
      grupos?.map(g => [g.aluno_id, g.grupo]) || []
    )

    // Inserir respostas
    const respostasFormatadas = respostas.map((r: any) => ({
      avaliacao_id,
      aluno_id: r.aluno_id,
      total_questoes: 12,
      questoes_certas: r.acertos_L + r.acertos_F + r.acertos_R + r.acertos_A + r.acertos_J,
      acertos_L: r.acertos_L || 0,
      total_L: r.total_L || 2,
      acertos_F: r.acertos_F || 0,
      total_F: r.total_F || 2,
      acertos_R: r.acertos_R || 0,
      total_R: r.total_R || 2,
      acertos_A: r.acertos_A || 0,
      total_A: r.total_A || 2,
      acertos_J: r.acertos_J || 0,
      total_J: r.total_J || 2,
      grupo_atual: grupoMap.get(r.aluno_id) || 'A',
      grupo_anterior: grupoMap.get(r.aluno_id) || null
    }))

    const { data, error } = await supabase
      .from('base_respostas_avaliacao_mensal')
      .upsert(respostasFormatadas, {
        onConflict: 'avaliacao_id,aluno_id'
      })
      .select()

    if (error) throw error

    // Trigger automático já reclassificou os alunos!

    return NextResponse.json({
      success: true,
      message: 'Respostas salvas e alunos reclassificados!',
      data
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
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const avaliacao_id = searchParams.get('avaliacao_id')

    if (!avaliacao_id) {
      return NextResponse.json(
        { error: 'avaliacao_id obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_respostas_avaliacao_mensal')
      .select(`
        *,
        aluno:alunos(id, nome_completo, numero_chamada)
      `)
      .eq('avaliacao_id', avaliacao_id)
      .order('aluno.numero_chamada', { ascending: true })

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
