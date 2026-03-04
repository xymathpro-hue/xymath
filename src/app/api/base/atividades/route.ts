
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const turma_id = searchParams.get('turma_id')

    if (!turma_id) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await supabase
      .from('base_atividades')
      .select('*')
      .eq('turma_id', turma_id)
      .order('data_aplicacao', { ascending: false })

    if (error) {
      console.error('Erro ao buscar atividades:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { turma_id, titulo, habilidade_bncc, data_aplicacao, tipo, competencias, bimestre } = body

    if (!turma_id || !titulo || !data_aplicacao || !tipo) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_atividades')
      .insert({
        turma_id,
        titulo,
        habilidade_bncc,
        data_aplicacao,
        tipo,
        competencias,
        bimestre
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar atividade:', error)
      return NextResponse.json(
        { error: 'Erro ao criar atividade', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
