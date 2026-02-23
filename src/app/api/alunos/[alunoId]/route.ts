import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { alunoId: string } }
) {
  try {
    const supabase = await createClient()
    const alunoId = params.alunoId
    const body = await request.json()

    const { nome_completo, tem_laudo, observacoes } = body

    if (!nome_completo) {
      return NextResponse.json(
        { error: 'nome_completo é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('alunos')
      .update({
        nome_completo,
        tem_laudo: tem_laudo || false,
        observacoes
      })
      .eq('id', alunoId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Erro ao editar aluno:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { alunoId: string } }
) {
  try {
    const supabase = await createClient()
    const alunoId = params.alunoId

    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', alunoId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Aluno deletado com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao deletar aluno:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
