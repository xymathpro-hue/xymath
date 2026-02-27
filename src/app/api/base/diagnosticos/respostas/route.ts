import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { turma_id, tipo_diagnostico, bimestre, respostas } = body

    // Validação
    if (!turma_id || !tipo_diagnostico || !bimestre || !respostas) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    console.log('Salvando respostas:', {
      turma_id,
      tipo_diagnostico,
      bimestre,
      total_respostas: respostas.length
    })

    // 1. Salvar/Atualizar respostas no banco
    const respostasParaSalvar = respostas.map((r: any) => ({
      turma_id,
      aluno_id: r.aluno_id,
      tipo_diagnostico,
      bimestre,
      questao_1: r.questao_1,
      questao_2: r.questao_2,
      questao_3: r.questao_3,
      questao_4: r.questao_4,
      questao_5: r.questao_5,
      questao_6: r.questao_6,
      questao_7: r.questao_7,
      questao_8: r.questao_8,
      questao_9: r.questao_9,
      questao_10: r.questao_10,
      faltou: r.faltou,
      total: r.faltou ? 0 : (
        r.questao_1 + r.questao_2 + r.questao_3 + r.questao_4 + r.questao_5 +
        r.questao_6 + r.questao_7 + r.questao_8 + r.questao_9 + r.questao_10
      )
    }))

    // Usar upsert para inserir ou atualizar
    const { error: respostasError } = await supabase
      .from('diagnosticos_respostas')
      .upsert(respostasParaSalvar, {
        onConflict: 'turma_id,aluno_id,tipo_diagnostico,bimestre'
      })

    if (respostasError) {
      console.error('Erro ao salvar respostas:', respostasError)
      return NextResponse.json(
        { error: 'Erro ao salvar respostas', details: respostasError.message },
        { status: 500 }
      )
    }

    // 2. Buscar todos os diagnósticos do aluno para calcular média ponderada
    const alunosIds = respostas.map((r: any) => r.aluno_id)
    
    const { data: todasRespostas, error: buscaError } = await supabase
      .from('diagnosticos_respostas')
      .select('aluno_id, tipo_diagnostico, total, faltou')
      .eq('turma_id', turma_id)
      .eq('bimestre', bimestre)
      .in('aluno_id', alunosIds)

    if (buscaError) {
      console.error('Erro ao buscar respostas:', buscaError)
      return NextResponse.json(
        { error: 'Erro ao calcular classificação' },
        { status: 500 }
      )
    }

    // 3. Calcular média ponderada e classificação para cada aluno
    const alunosParaAtualizar = alunosIds.map((alunoId: string) => {
      const respostasAluno = todasRespostas?.filter(r => r.aluno_id === alunoId) || []
      
      const d1 = respostasAluno.find(r => r.tipo_diagnostico === 'D1')
      const d2 = respostasAluno.find(r => r.tipo_diagnostico === 'D2')
      const d3 = respostasAluno.find(r => r.tipo_diagnostico === 'D3')

      // Se não tem todos os diagnósticos, não classifica ainda
      if (!d1 || !d2 || !d3) {
        return null
      }

      // Média ponderada: (D1×3 + D2×2 + D3×1) / 6
      const notaD1 = d1.faltou ? 0 : d1.total
      const notaD2 = d2.faltou ? 0 : d2.total
      const notaD3 = d3.faltou ? 0 : d3.total

      const mediaPonderada = (notaD1 * 3 + notaD2 * 2 + notaD3 * 1) / 6

      // Classificação BASE
      let classificacao: 'A' | 'B' | 'C'
      if (mediaPonderada < 4.0) {
        classificacao = 'A' // Apoio
      } else if (mediaPonderada < 7.0) {
        classificacao = 'B' // Adaptação
      } else {
        classificacao = 'C' // Regular
      }

      return {
        id: alunoId,
        media_ponderada: parseFloat(mediaPonderada.toFixed(2)),
        classificacao_base: classificacao
      }
    }).filter(Boolean)

    // 4. Atualizar classificação dos alunos
    if (alunosParaAtualizar.length > 0) {
      const { error: updateError } = await supabase
        .from('alunos')
        .upsert(alunosParaAtualizar, {
          onConflict: 'id'
        })

      if (updateError) {
        console.error('Erro ao atualizar classificação:', updateError)
        // Não retorna erro pois as respostas foram salvas
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Respostas salvas e classificação atualizada!',
      alunos_classificados: alunosParaAtualizar.length
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
