interface CalcularPontuacaoParams {
  valorTotal: number
  totalQuestoes: number
  acertos?: number
}

export function calcularPontuacao({
  valorTotal,
  totalQuestoes,
  acertos
}: CalcularPontuacaoParams) {
  if (totalQuestoes === 0) {
    return {
      valorPorQuestao: 0,
      notaFinal: 0
    }
  }

  const valorPorQuestao = valorTotal / totalQuestoes

  const notaFinal =
    typeof acertos === 'number'
      ? Number((acertos * valorPorQuestao).toFixed(2))
      : 0

  return {
    valorPorQuestao: Number(valorPorQuestao.toFixed(2)),
    notaFinal
  }
}

