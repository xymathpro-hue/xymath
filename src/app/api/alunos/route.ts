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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { turma_id, nome_completo, tem_laudo, observacoes } = body

    if (!turma_id || !nome_completo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: turma_id, nome_completo' },
        { status: 400 }
      )
    }

    // VERIFICAR SE JÁ EXISTE ALUNO COM ESSE NOME NA TURMA
    const { data: alunoExistente } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .eq('turma_id', turma_id)
      .ilike('nome_completo', nome_completo.trim())
      .single()

    if (alunoExistente) {
      return NextResponse.json(
        { error: 'Aluno já pertence a esta turma' },
        { status: 409 }
      )
    }

    const { data: alunosExistentes } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .eq('turma_id', turma_id)

    const todosAlunos = [
      ...(alunosExistentes || []),
      { nome_completo, id: null }
    ]
    
    todosAlunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))
    
    const numeroNovo = todosAlunos.findIndex(a => a.nome_completo === nome_completo) + 1

    const { data, error } = await supabase
      .from('alunos')
      .insert({
        turma_id,
        nome_completo,
        numero_chamada: numeroNovo,
        tem_laudo: tem_laudo || false,
        observacoes
      })
      .select()
      .single()

    if (error) throw error

    const alunosParaAtualizar = todosAlunos
      .slice(numeroNovo)
      .filter((a): a is { id: string; nome_completo: string } => a.id !== null)
      .map((a, idx) => ({
        id: a.id,
        numero_chamada: numeroNovo + idx + 1
      }))

    if (alunosParaAtualizar.length > 0) {
      for (const aluno of alunosParaAtualizar) {
        await supabase
          .from('alunos')
          .update({ numero_chamada: aluno.numero_chamada })
          .eq('id', aluno.id)
      }
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Erro ao criar aluno:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
