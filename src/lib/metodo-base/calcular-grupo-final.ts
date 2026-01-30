// src/lib/metodo-base/calcular-grupo-final.ts
// Cálculo do Grupo Final do Método BASE - Média Ponderada

/**
 * LÓGICA DE CLASSIFICAÇÃO FINAL DO ALUNO
 * 
 * Pesos por dificuldade:
 * - D1 (Fácil): peso 3 - Mais importante, pré-requisitos básicos
 * - D2 (Médio): peso 2 - Consolidação
 * - D3 (Difícil): peso 1 - Aprofundamento, menos essencial
 * 
 * Conversão Grupo → Pontos:
 * - A = 1 ponto (precisa de mais ajuda)
 * - B = 2 pontos (em desenvolvimento)
 * - C = 3 pontos (consolidado)
 * - F = não conta (faltou)
 * 
 * Faixas de classificação final:
 * - 1.0 - 1.5 → Grupo A
 * - 1.6 - 2.5 → Grupo B
 * - 2.6 - 3.0 → Grupo C
 */

export interface GrupoDiagnostico {
  diagnostico: 'D1' | 'D2' | 'D3'
  grupo: 'A' | 'B' | 'C' | 'F' | null
}

export interface ResultadoGrupoFinal {
  grupoFinal: 'A' | 'B' | 'C' | null
  media: number | null
  diagnosticosConsiderados: number
  diagnosticosFaltantes: string[]
  detalhes: {
    diagnostico: string
    grupo: string | null
    peso: number
    pontos: number | null
  }[]
}

// Pesos por diagnóstico
const PESOS: Record<string, number> = {
  'D1': 3, // Fácil - mais importante
  'D2': 2, // Médio
  'D3': 1, // Difícil - menos peso
}

// Conversão grupo para pontos
const GRUPO_PARA_PONTOS: Record<string, number> = {
  'A': 1,
  'B': 2,
  'C': 3,
}

/**
 * Calcula o grupo final do aluno baseado nos 3 diagnósticos
 */
export function calcularGrupoFinal(grupos: GrupoDiagnostico[]): ResultadoGrupoFinal {
  const detalhes: ResultadoGrupoFinal['detalhes'] = []
  const diagnosticosFaltantes: string[] = []
  
  let somaPonderada = 0
  let somaPesos = 0
  let diagnosticosConsiderados = 0

  // Processar cada diagnóstico
  for (const diag of ['D1', 'D2', 'D3']) {
    const resultado = grupos.find(g => g.diagnostico === diag)
    const peso = PESOS[diag]
    
    if (!resultado || resultado.grupo === null) {
      // Diagnóstico não aplicado ainda
      diagnosticosFaltantes.push(diag)
      detalhes.push({
        diagnostico: diag,
        grupo: null,
        peso,
        pontos: null
      })
    } else if (resultado.grupo === 'F') {
      // Aluno faltou - não conta no cálculo
      detalhes.push({
        diagnostico: diag,
        grupo: 'F',
        peso,
        pontos: null
      })
    } else {
      // Grupo válido (A, B ou C)
      const pontos = GRUPO_PARA_PONTOS[resultado.grupo]
      somaPonderada += pontos * peso
      somaPesos += peso
      diagnosticosConsiderados++
      
      detalhes.push({
        diagnostico: diag,
        grupo: resultado.grupo,
        peso,
        pontos
      })
    }
  }

  // Se não tem nenhum diagnóstico válido, retorna null
  if (diagnosticosConsiderados === 0) {
    return {
      grupoFinal: null,
      media: null,
      diagnosticosConsiderados: 0,
      diagnosticosFaltantes,
      detalhes
    }
  }

  // Calcular média ponderada
  const media = somaPonderada / somaPesos

  // Determinar grupo final baseado na média
  let grupoFinal: 'A' | 'B' | 'C'
  if (media <= 1.5) {
    grupoFinal = 'A'
  } else if (media <= 2.5) {
    grupoFinal = 'B'
  } else {
    grupoFinal = 'C'
  }

  return {
    grupoFinal,
    media: Math.round(media * 100) / 100, // 2 casas decimais
    diagnosticosConsiderados,
    diagnosticosFaltantes,
    detalhes
  }
}

/**
 * Calcula o grupo final a partir dos resultados do banco de dados
 */
export function calcularGrupoFinalFromDB(
  resultadosDiagnosticos: { diagnostico_codigo: string; grupo: string }[]
): ResultadoGrupoFinal {
  const grupos: GrupoDiagnostico[] = resultadosDiagnosticos.map(r => ({
    diagnostico: r.diagnostico_codigo.split('-')[0] as 'D1' | 'D2' | 'D3',
    grupo: r.grupo as 'A' | 'B' | 'C' | 'F'
  }))

  return calcularGrupoFinal(grupos)
}

/**
 * Retorna a cor do grupo para UI
 */
export function getCorGrupo(grupo: string | null): string {
  switch (grupo) {
    case 'A': return 'bg-red-500'
    case 'B': return 'bg-yellow-500'
    case 'C': return 'bg-green-500'
    case 'F': return 'bg-slate-500'
    default: return 'bg-gray-300'
  }
}

/**
 * Retorna a descrição do grupo
 */
export function getDescricaoGrupo(grupo: string | null): string {
  switch (grupo) {
    case 'A': return 'Precisa de reforço intensivo'
    case 'B': return 'Em desenvolvimento'
    case 'C': return 'Consolidado'
    case 'F': return 'Faltou'
    default: return 'Não avaliado'
  }
}

/**
 * Exemplo de uso:
 * 
 * const grupos: GrupoDiagnostico[] = [
 *   { diagnostico: 'D1', grupo: 'B' },
 *   { diagnostico: 'D2', grupo: 'A' },
 *   { diagnostico: 'D3', grupo: 'C' },
 * ]
 * 
 * const resultado = calcularGrupoFinal(grupos)
 * // resultado.grupoFinal = 'B'
 * // resultado.media = 1.83
 * // resultado.diagnosticosConsiderados = 3
 */
