// src/app/api/alunos/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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
      .from('alunos')
      .select('*')
      .eq('turma_id', turma_id)
      .order('numero_chamada', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro ao buscar alunos:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
