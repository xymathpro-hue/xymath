
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      atividade_id,
      respostas // Array de { aluno_id, acertos, total_questoes }
    } = body

    // Validação
    if (!atividade_id || !respostas || respostas.length === 0) {
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

    // Formatar respostas
    const respostasFormatadas = respostas.map((r: any) => ({
      atividade_id,
      aluno_id: r.aluno_id,
      grupo_no_momento: grupoMap.get(r.aluno_id) || 'A',
      total_questoes: r.total_questoes || 10,
      acertos: r.acertos || 0
      // percentual e nota são calculados automaticamente (GENERATED COLUMNS)
    }))

    const { data, error } = await supabase
      .from('base_respostas_atividade_classe')
      .upsert(respostasFormatadas, {
        onConflict: 'atividade_id,aluno_id'
      })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Notas lançadas com sucesso!',
      total: data.length
    })

  } catch (error: any) {
    console.error('Erro ao lançar notas:', error)
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
    
    const atividade_id = searchParams.get('atividade_id')
    const aluno_id = searchParams.get('aluno_id')

    if (!atividade_id && !aluno_id) {
      return NextResponse.json(
        { error: 'atividade_id ou aluno_id é obrigatório' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('base_respostas_atividade_classe')
      .select(`
        *,
        aluno:alunos(id, nome_completo, numero_chamada),
        atividade:base_atividades_classe(titulo, data_aula)
      `)

    if (atividade_id) {
      query = query.eq('atividade_id', atividade_id)
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
