import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ alunoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { alunoId } = await context.params
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
  context: { params: Promise<{ alunoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { alunoId } = await context.params

    // PEGAR TURMA_ID ANTES DE DELETAR
    const { data: alunoData } = await supabase
      .from('alunos')
      .select('turma_id')
      .eq('id', alunoId)
      .single()

    if (!alunoData) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    const turma_id = alunoData.turma_id

    // DELETAR ALUNO
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', alunoId)

    if (error) throw error

    // REORDENAR TODOS OS ALUNOS DA TURMA
    const { data: todosAlunos } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .eq('turma_id', turma_id)

    if (todosAlunos && todosAlunos.length > 0) {
      // ORDENAR ALFABETICAMENTE
      todosAlunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))

      // ATUALIZAR NÚMEROS
      for (let i = 0; i < todosAlunos.length; i++) {
        await supabase
          .from('alunos')
          .update({ numero_chamada: i + 1 })
          .eq('id', todosAlunos[i].id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Aluno deletado e numeração reordenada'
    })
  } catch (error: any) {
    console.error('Erro ao deletar aluno:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
