export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const turma_id = searchParams.get('turma_id')
    const tipo = searchParams.get('tipo')
    const bimestre = searchParams.get('bimestre')

    if (!turma_id || !bimestre) {
      return NextResponse.json({ data: [] })
    }

    let query = supabase
      .from('diagnosticos_respostas')
      .select('*')
      .eq('turma_id', turma_id)
      .eq('bimestre', parseInt(bimestre))

    // Se tem tipo, filtra. Se não, busca todos (D1, D2, D3)
    if (tipo) {
      query = query.eq('tipo_diagnostico', tipo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar respostas:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ data: [] })
  }
}
