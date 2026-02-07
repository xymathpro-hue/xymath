import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { turma_id, bimestre, aluno_id } = body

    // Validação
    if (!turma_id || !bimestre) {
      return NextResponse.json(
        { error: 'turma_id e bimestre são obrigatórios' },
        { status: 400 }
      )
    }

    if (aluno_id) {
      // Calcular nota de um aluno específico
      const { data, error } = await supabase.rpc(
        'calcular_nota_base_bimestre',
        {
          p_aluno_id: aluno_id,
          p_turma_id: turma_id,
          p_bimestre: bimestre
        }
      )

      if (error) throw error

      return NextResponse.json({
        success: true,
        aluno_id,
        nota_base: data
      })

    } else {
      // Calcular notas de toda a turma
      const { data, error } = await supabase.rpc(
        'calcular_notas_turma',
        {
          p_turma_id: turma_id,
          p_bimestre: bimestre
        }
      )

      if (error) throw error

      return NextResponse.json({
        success: true,
        turma_id,
        bimestre,
        total_alunos: data?.length || 0,
        notas: data
      })
    }

  } catch (error: any) {
    console.error('Erro ao calcular notas:', error)
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
    const bimestre = searchParams.get('bimestre')

    if (!turma_id || !bimestre) {
      return NextResponse.json(
        { error: 'turma_id e bimestre são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar notas já calculadas
    const { data, error } = await supabase
      .from('base_notas_bimestre')
      .select(`
        *,
        aluno:alunos(id, nome_completo, numero_chamada)
      `)
      .eq('turma_id', turma_id)
      .eq('bimestre', parseInt(bimestre))
      .order('aluno.numero_chamada', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
