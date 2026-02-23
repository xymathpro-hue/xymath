import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ano_letivo = searchParams.get('ano_letivo')

    let query = supabase.from('turmas').select('*')

    if (ano_letivo) {
      query = query.eq('ano_letivo', parseInt(ano_letivo))
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro ao buscar turmas:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { nome, ano_escolar, ano_letivo } = body

    if (!nome || !ano_escolar || !ano_letivo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, ano_escolar, ano_letivo' },
        { status: 400 }
      )
    }

    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .insert({
        nome,
        ano_escolar,
        ano_letivo
      })
      .select()
      .single()

    if (turmaError) throw turmaError

    const diagnosticos = [
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D1',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      },
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D2',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      },
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D3',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      }
    ]

    await supabase
      .from('base_diagnosticos_iniciais')
      .insert(diagnosticos)

    return NextResponse.json({
      success: true,
      data: turma
    })
  } catch (error: any) {
    console.error('Erro ao criar turma:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
