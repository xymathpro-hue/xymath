
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      turma_id,
      bimestre,
      mes,
      titulo,
      data_aplicacao,
      total_questoes
    } = body

    if (!turma_id || !bimestre || !mes || !titulo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_avaliacoes_mensais')
      .insert({
        turma_id,
        bimestre,
        mes,
        titulo,
        data_aplicacao,
        total_questoes: total_questoes || 12
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Erro ao criar avaliação:', error)
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

    if (!turma_id) {
      return NextResponse.json(
        { error: 'turma_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('base_avaliacoes_mensais')
      .select('*')
      .eq('turma_id', turma_id)
      .order('bimestre', { ascending: false })
      .order('mes', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro ao buscar avaliações:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
