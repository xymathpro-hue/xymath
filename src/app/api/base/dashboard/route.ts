import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

    const bimestreNum = parseInt(bimestre)

    // 1. ESTATÍSTICAS GERAIS
    const { count: totalAlunos } = await supabase
      .from('alunos')
      .select('*', { count: 'exact', head: true })
      .eq('turma_id', turma_id)

    // 2. DISTRIBUIÇÃO DE GRUPOS
    const { data: grupos } = await supabase
      .from('base_alunos_grupo')
      .select('grupo')
      .eq('turma_id', turma_id)
      .eq('bimestre', bimestreNum)

    const distribuicaoGrupos = {
      A: grupos?.filter(g => g.grupo === 'A').length || 0,
      B: grupos?.filter(g => g.grupo === 'B').length || 0,
      C: grupos?.filter(g => g.grupo === 'C').length || 0
    }

    // 3. MÉDIA DA TURMA
    const { data: notas } = await supabase
      .from('base_notas_bimestre')
      .select('nota_base_final')
      .eq('turma_id', turma_id)
      .eq('bimestre', bimestreNum)

    const mediaTurma = notas && notas.length > 0
      ? (notas.reduce((sum, n) => sum + (n.nota_base_final || 0), 0) / notas.length).toFixed(1)
      : '0.0'

    // 4. AVALIAÇÕES APLICADAS
    const { count: totalAvaliacoes } = await supabase
      .from('base_avaliacoes_mensais')
      .select('*', { count: 'exact', head: true })
      .eq('turma_id', turma_id)
      .eq('bimestre', bimestreNum)

    // 5. EVOLUÇÃO GERAL
    const { data: historicoGrupos } = await supabase
      .from('base_historico_grupos')
      .select('grupo_anterior, grupo_novo')
      .eq('turma_id', turma_id)

    const evolucoes = {
      subiram: historicoGrupos?.filter(h => 
        (h.grupo_anterior === 'A' && h.grupo_novo === 'B') ||
        (h.grupo_anterior === 'A' && h.grupo_novo === 'C') ||
        (h.grupo_anterior === 'B' && h.grupo_novo === 'C')
      ).length || 0,
      desceram: historicoGrupos?.filter(h => 
        (h.grupo_anterior === 'C' && h.grupo_novo === 'B') ||
        (h.grupo_anterior === 'C' && h.grupo_novo === 'A') ||
        (h.grupo_anterior === 'B' && h.grupo_novo === 'A')
      ).length || 0
    }

    // 6. ALERTAS AUTOMÁTICOS
    const alertas = []

    if (distribuicaoGrupos.A > (totalAlunos || 0) * 0.4) {
      alertas.push({
        tipo: 'negativo',
        titulo: 'Muitos alunos no Grupo A',
        mensagem: `${distribuicaoGrupos.A} alunos (${Math.round(distribuicaoGrupos.A / (totalAlunos || 1) * 100)}%) precisam de apoio intensivo`,
        prioridade: 'alta'
      })
    }

    if (parseFloat(mediaTurma) < 6.0) {
      alertas.push({
        tipo: 'negativo',
        titulo: 'Média da turma baixa',
        mensagem: `Média BASE: ${mediaTurma} (abaixo de 6.0)`,
        prioridade: 'alta'
      })
    }

    if (evolucoes.subiram > 5) {
      alertas.push({
        tipo: 'positivo',
        titulo: 'Evolução excelente!',
        mensagem: `${evolucoes.subiram} alunos subiram de grupo!`,
        prioridade: 'positiva'
      })
    }

    if (distribuicaoGrupos.C > (totalAlunos || 0) * 0.3) {
      alertas.push({
        tipo: 'positivo',
        titulo: 'Ótimo desempenho!',
        mensagem: `${distribuicaoGrupos.C} alunos (${Math.round(distribuicaoGrupos.C / (totalAlunos || 1) * 100)}%) no Grupo C!`,
        prioridade: 'positiva'
      })
    }

    // 7. PRÓXIMAS AÇÕES
    const proximasAcoes = []

    if (distribuicaoGrupos.A > 0) {
      proximasAcoes.push({
        acao: 'Aplicar Fichas de Recuperação',
        descricao: `${distribuicaoGrupos.A} alunos do Grupo A precisam de material específico`
      })
    }

    if (totalAvaliacoes === 0) {
      proximasAcoes.push({
        acao: 'Aplicar Avaliação Mensal 1',
        descricao: 'Ainda não há avaliações aplicadas neste bimestre'
      })
    } else if (totalAvaliacoes === 1) {
      proximasAcoes.push({
        acao: 'Aplicar Avaliação Mensal 2',
        descricao: 'Segunda avaliação para medir evolução'
      })
    }

    return NextResponse.json({
      estatisticas: {
        total_alunos: totalAlunos || 0,
        distribuicao_grupos: distribuicaoGrupos,
        media_turma: parseFloat(mediaTurma),
        avaliacoes_aplicadas: totalAvaliacoes || 0,
        evolucoes: {
          subiram: evolucoes.subiram,
          desceram: evolucoes.desceram,
          saldo: evolucoes.subiram - evolucoes.desceram
        }
      },
      alertas,
      proximas_acoes: proximasAcoes
    })

  } catch (error: any) {
    console.error('Erro ao carregar dashboard:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
