export function calcularPontuacao(
  valorTotal: number,
  totalQuestoes: number
) {
  if (totalQuestoes <= 0) {
    return {
      valorPorQuestao: 0,
      valorTotal: valorTotal
    }
  }

  return {
    valorPorQuestao: Number((valorTotal / totalQuestoes).toFixed(2)),
    valorTotal: Number(valorTotal.toFixed(1))
  }
}

