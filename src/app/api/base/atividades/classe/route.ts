
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      turma_id,
      aula_id,
      titulo,
      data_aula,
      habilidade_bncc,
      competencia_base,
      questoes_grupo_A,
      questoes_grupo_B,
      questoes_grupo_C,
      total_questoes
    } = body

    // Validação
    if (!turma_id || !titulo || !data_aula) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: turma_id, titulo, data_aula' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_atividades_classe')
      .insert({
        turma_id,
        aula_id,
        titulo,
        data_aula,
        habilidade_bncc,
        competencia_base,
        questoes_grupo_A: questoes_grupo_A || [],
        questoes_grupo_B: questoes_grupo_B || [],
        questoes_grupo_C: questoes_grupo_C || [],
        total_questoes: total_questoes || 10
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Atividade de classe criada!',
      data
    })

  } catch (error: any) {
    console.error('Erro ao criar atividade:', error)
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
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano') || new Date().getFullYear().toString()

    if (!turma_id) {
      return NextResponse.json(
        { error: 'turma_id é obrigatório' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('base_atividades_classe')
      .select('*')
      .eq('turma_id', turma_id)
      .order('data_aula', { ascending: false })

    // Filtrar por mês se fornecido
    if (mes) {
      const inicio = `${ano}-${mes.padStart(2, '0')}-01`
      const fim = `${ano}-${mes.padStart(2, '0')}-31`
      query = query.gte('data_aula', inicio).lte('data_aula', fim)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('Erro ao buscar atividades:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
