
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const atividade_id = searchParams.get('atividade_id')

    if (!atividade_id) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await supabase
      .from('base_respostas_atividade')
      .select('*')
      .eq('atividade_id', atividade_id)

    if (error) {
      console.error('Erro ao buscar respostas:', error)
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
    const { atividade_id, respostas } = body

    if (!atividade_id || !respostas) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const respostasParaSalvar = respostas.map((r: any) => ({
      atividade_id,
      aluno_id: r.aluno_id,
      grupo_aluno: r.grupo_aluno,
      questao_1_classe: r.questao_1_classe,
      questao_2_classe: r.questao_2_classe,
      questao_3_classe: r.questao_3_classe,
      questao_4_classe: r.questao_4_classe,
      questao_5_classe: r.questao_5_classe,
      questao_1_casa: r.questao_1_casa,
      questao_2_casa: r.questao_2_casa,
      questao_3_casa: r.questao_3_casa,
      questao_4_casa: r.questao_4_casa,
      questao_5_casa: r.questao_5_casa,
      total_classe: r.questao_1_classe + r.questao_2_classe + r.questao_3_classe + r.questao_4_classe + r.questao_5_classe,
      total_casa: r.questao_1_casa + r.questao_2_casa + r.questao_3_casa + r.questao_4_casa + r.questao_5_casa,
      total_geral: (r.questao_1_classe + r.questao_2_classe + r.questao_3_classe + r.questao_4_classe + r.questao_5_classe + r.questao_1_casa + r.questao_2_casa + r.questao_3_casa + r.questao_4_casa + r.questao_5_casa),
      faltou_classe: r.faltou_classe,
      faltou_casa: r.faltou_casa
    }))

    const { error: respostasError } = await supabase
      .from('base_respostas_atividade')
      .upsert(respostasParaSalvar, {
        onConflict: 'atividade_id,aluno_id'
      })

    if (respostasError) {
      console.error('Erro ao salvar respostas:', respostasError)
      return NextResponse.json(
        { error: 'Erro ao salvar respostas', details: respostasError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Respostas salvas com sucesso!'
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
