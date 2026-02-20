// src/app/api/base/diagnosticos/[diagnosticoId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ diagnosticoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { diagnosticoId } = await context.params

    const { data, error } = await supabase
      .from('base_diagnosticos_iniciais')
      .select('*')
      .eq('id', diagnosticoId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao buscar diagnóstico:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
