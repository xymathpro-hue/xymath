export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { nome, ano_escolar, ano_letivo } = body

    if (!nome || !ano_escolar || !ano_letivo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, ano_escolar, ano_letivo' },
        { status: 400 }
      )
    }

    // CRIAR TURMA
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .insert({
        nome,
        ano_escolar,
        ano_letivo
      })
      .select()
      .single()

    if (turmaError) throw turmaError

    // CRIAR OS 3 DIAGNÓSTICOS AUTOMATICAMENTE
    const diagnosticos = [
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D1',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      },
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D2',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      },
      {
        turma_id: turma.id,
        tipo_diagnostico: 'D3',
        bimestre: 1,
        total_questoes: 10,
        data_aplicacao: new Date().toISOString()
      }
    ]

    await supabase
      .from('base_diagnosticos_iniciais')
      .insert(diagnosticos)

    return NextResponse.json({
      success: true,
      data: turma
    })
  } catch (error: any) {
    console.error('Erro ao criar turma:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
