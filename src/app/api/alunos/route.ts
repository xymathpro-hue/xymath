export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { turma_id, nome_completo, numero_chamada, tem_laudo, observacoes } = body

    if (!turma_id || !nome_completo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: turma_id, nome_completo' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('alunos')
      .insert({
        turma_id,
        nome_completo,
        numero_chamada: numero_chamada || 1,
        tem_laudo: tem_laudo || false,
        observacoes
      })
      .select()
      .single()

    if (error) throw error

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
