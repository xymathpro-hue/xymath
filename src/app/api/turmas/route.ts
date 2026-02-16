import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ano_letivo = searchParams.get('ano_letivo')

    let query = supabase
      .from('turmas')
      .select('*')
      .order('nome', { ascending: true })

    if (ano_letivo) {
      query = query.eq('ano_letivo', parseInt(ano_letivo))
    }

    const { data, error } = await query

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
