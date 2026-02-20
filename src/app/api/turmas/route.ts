// src/app/api/turmas/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      escola_id,
      nome,
      ano_escolar,
      turno,
      ano_letivo
    } = body

    if (!nome || !ano_escolar) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, ano_escolar' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('turmas')
      .insert({
        escola_id,
        nome,
        ano_escolar,
        turno,
        ano_letivo: ano_letivo || 2026
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Turma criada com sucesso!',
      data
    })
  } catch (error: any) {
    console.error('Erro ao criar turma:', error)
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
