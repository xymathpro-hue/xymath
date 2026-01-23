'use client'

interface QuestaoGabarito {
  id: string
  resposta_correta?: string
}

interface GabaritoVisualProps {
  titulo: string
  turma?: string
  questoes: QuestaoGabarito[]
  valorTotal: number
}

export default function GabaritoVisual({
  titulo,
  turma,
  questoes,
  valorTotal
}: GabaritoVisualProps) {
  const valorPorQuestao =
    questoes.length > 0 ? valorTotal / questoes.length : 0

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border rounded-lg p-6">
      
      {/* Cabeçalho */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">GABARITO OFICIAL</h2>
        <p className="text-gray-600">{titulo}</p>
        {turma && <p className="text-gray-500">Turma: {turma}</p>}
        <p className="mt-2 text-sm text-gray-700">
          Valor total: <strong>{valorTotal.toFixed(1)}</strong> pontos ·
          Cada questão: <strong>{valorPorQuestao.toFixed(2)}</strong> pts
        </p>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {questoes.map((_, idx) => (
                <th
                  key={idx}
                  className="border bg-gray-100 text-center text-sm font-semibold p-2"
                >
                  {idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {questoes.map((q, idx) => (
                <td
                  key={q.id}
                  className="border text-center text-lg font-bold p-2"
                >
                  {q.resposta_correta?.toUpperCase() || '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aviso */}
      <p className="mt-4 text-center text-xs text-gray-500">
        Documento exclusivo do professor · Não divulgar aos alunos
      </p>
    </div>
  )
}

