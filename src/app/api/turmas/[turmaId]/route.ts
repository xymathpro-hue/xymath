import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ turmaId: string }> }
) {
  try {
    const supabase = await createClient()
    const { turmaId } = await context.params

    const { error } = await supabase
      .from('turmas')
      .delete()
      .eq('id', turmaId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar turma:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
