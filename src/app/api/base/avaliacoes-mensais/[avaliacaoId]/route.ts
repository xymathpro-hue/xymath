
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ avaliacaoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { avaliacaoId } = await context.params

    const { data, error } = await supabase
      .from('base_avaliacoes_mensais')
      .select('*')
      .eq('id', avaliacaoId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao buscar avaliação:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
