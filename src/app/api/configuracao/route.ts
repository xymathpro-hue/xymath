import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    const { data, error } = await supabase
      .from('configuracao_professor')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configuração:', error)
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ data: null })
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
    const { escola_nome, professor_nome, cidade, escola_logo_url } = body

    // Upsert (insert ou update)
    const { data, error } = await supabase
      .from('configuracao_professor')
      .upsert({
        user_id: user.id,
        escola_nome,
        professor_nome,
        cidade,
        escola_logo_url
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar configuração:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar configuração', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Configuração salva com sucesso!'
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
