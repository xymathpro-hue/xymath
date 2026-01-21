// ============================================================
// XYMATH - PÁGINA DE NOTAS
// src/app/(dashboard)/notas/page.tsx
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Settings, 
  Save, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Users,
  BookOpen
} from 'lucide-react';
import { useNotas } from '@/hooks/useNotas';
import { useTurmas } from '@/hooks/useTurmas';
import type { 
  TipoDivisao, 
  AlunoComNotas,
  LancarNota 
} from '@/types/notas';
import { 
  getNomePeriodo, 
  PERIODOS_BIMESTRE,
  PERIODOS_TRIMESTRE
} from '@/types/notas';

export default function NotasPage() {
  // Estados
  const [turmaId, setTurmaId] = useState<string>('');
  const [periodo, setPeriodo] = useState<number>(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [notasEditadas, setNotasEditadas] = useState<Record<string, Record<number, string>>>({});
  
  // Hooks
  const { 
    configuracao, 
    alunosComNotas, 
    loading, 
    error,
    carregarConfiguracao,
    salvarConfiguracao,
    carregarNotasTurma,
    lancarNota,
    lancarNotasEmLote,
    calcularMediaPeriodo,
    limparErro
  } = useNotas();
  
  const { turmas, carregarTurmas } = useTurmas();

  // Configuração local para edição
  const [configLocal, setConfigLocal] = useState({
    tipo_divisao: 'bimestral' as TipoDivisao,
    notas_por_periodo: 2,
    media_aprovacao: 6.0,
    tem_recuperacao_paralela: true,
    tem_prova_final: true
  });

  // Carregar dados iniciais
  useEffect(() => {
    carregarConfiguracao();
    carregarTurmas();
  }, [carregarConfiguracao, carregarTurmas]);

  // Atualizar config local quando carregar
  useEffect(() => {
    if (configuracao) {
      setConfigLocal({
        tipo_divisao: configuracao.tipo_divisao,
        notas_por_periodo: configuracao.notas_por_periodo,
        media_aprovacao: configuracao.media_aprovacao,
        tem_recuperacao_paralela: configuracao.tem_recuperacao_paralela,
        tem_prova_final: configuracao.tem_prova_final
      });
      // Sempre iniciar no 1º período
      setPeriodo(1);
    }
  }, [configuracao]);

  // Carregar notas quando mudar turma ou período
  useEffect(() => {
    if (turmaId && periodo) {
      carregarNotasTurma(turmaId, periodo);
      setNotasEditadas({});
    }
  }, [turmaId, periodo, carregarNotasTurma]);

  // Salvar configuração
  const handleSalvarConfig = async () => {
    setSalvando(true);
    await salvarConfiguracao(configLocal);
    setSalvando(false);
    setMostrarConfig(false);
  };

  // Atualizar nota no estado local
  const handleNotaChange = (alunoId: string, numeroNota: number, valor: string) => {
    setNotasEditadas(prev => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || {}),
        [numeroNota]: valor
      }
    }));
  };

  // Salvar nota individual
  const handleSalvarNota = async (alunoId: string, numeroNota: number) => {
    const valorStr = notasEditadas[alunoId]?.[numeroNota];
    if (valorStr === undefined) return;

    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor < 0 || valor > 10) {
      alert('Nota inválida. Digite um valor entre 0 e 10.');
      return;
    }

    const sucesso = await lancarNota({
      aluno_id: alunoId,
      turma_id: turmaId,
      periodo: periodo,
      numero_nota: numeroNota,
      nota: valor
    });

    if (sucesso) {
      // Limpar edição
      setNotasEditadas(prev => {
        const novo = { ...prev };
        if (novo[alunoId]) {
          delete novo[alunoId][numeroNota];
          if (Object.keys(novo[alunoId]).length === 0) {
            delete novo[alunoId];
          }
        }
        return novo;
      });

      // Recalcular média
      await calcularMediaPeriodo(alunoId, turmaId, periodo);
      await carregarNotasTurma(turmaId, periodo);
    }
  };

  // Salvar todas as notas editadas
  const handleSalvarTodas = async () => {
    setSalvando(true);
    
    const notasParaSalvar: LancarNota[] = [];
    
    Object.entries(notasEditadas).forEach(([alunoId, notas]) => {
      Object.entries(notas).forEach(([numNota, valorStr]) => {
        const valor = parseFloat(valorStr.replace(',', '.'));
        if (!isNaN(valor) && valor >= 0 && valor <= 10) {
          notasParaSalvar.push({
            aluno_id: alunoId,
            turma_id: turmaId,
            periodo: periodo,
            numero_nota: parseInt(numNota),
            nota: valor
          });
        }
      });
    });

    if (notasParaSalvar.length > 0) {
      const sucesso = await lancarNotasEmLote(notasParaSalvar);
      if (sucesso) {
        setNotasEditadas({});
        // Recalcular médias
        for (const nota of notasParaSalvar) {
          await calcularMediaPeriodo(nota.aluno_id, turmaId, periodo);
        }
        await carregarNotasTurma(turmaId, periodo);
      }
    }
    
    setSalvando(false);
  };

  // Obter valor da nota (editada ou original)
  const getNotaValor = (aluno: AlunoComNotas, numeroNota: number): string => {
    if (notasEditadas[aluno.id]?.[numeroNota] !== undefined) {
      return notasEditadas[aluno.id][numeroNota];
    }
    const nota = aluno.notas[numeroNota];
    return nota !== null && nota !== undefined ? nota.toFixed(1) : '';
  };

  // Verificar se nota foi editada
  const isNotaEditada = (alunoId: string, numeroNota: number): boolean => {
    return notasEditadas[alunoId]?.[numeroNota] !== undefined;
  };

  // Obter cor da situação
  const getCorSituacao = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800';
      case 'reprovado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Períodos disponíveis
  const periodos = configLocal.tipo_divisao === 'trimestral' 
    ? PERIODOS_TRIMESTRE 
    : PERIODOS_BIMESTRE;

  // Quantidade de notas por período
  const notasColunas = Array.from(
    { length: configLocal.notas_por_periodo }, 
    (_, i) => i + 1
  );

  // Verificar se há notas pendentes
  const temNotasPendentes = Object.keys(notasEditadas).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-7 w-7 text-purple-600" />
              Sistema de Notas
            </h1>
            <p className="text-gray-500 mt-1">
              Lançamento e acompanhamento de notas por período
            </p>
          </div>
          
          <button
            onClick={() => setMostrarConfig(!mostrarConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Settings className="h-5 w-5" />
            Configurações
          </button>
        </div>
      </div>

      {/* Painel de Configuração */}
      {mostrarConfig && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configurações do Sistema de Notas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de Divisão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Divisão do Ano
              </label>
              <select
                value={configLocal.tipo_divisao}
                onChange={(e) => setConfigLocal(prev => ({ 
                  ...prev, 
                  tipo_divisao: e.target.value as TipoDivisao 
                }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="bimestral">Bimestral (4 períodos)</option>
                <option value="trimestral">Trimestral (3 períodos)</option>
              </select>
            </div>

            {/* Notas por Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas por Período
              </label>
              <select
                value={configLocal.notas_por_periodo}
                onChange={(e) => setConfigLocal(prev => ({ 
                  ...prev, 
                  notas_por_periodo: parseInt(e.target.value) 
                }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value={1}>1 nota (N1)</option>
                <option value={2}>2 notas (N1, N2)</option>
                <option value={3}>3 notas (N1, N2, N3)</option>
              </select>
            </div>

            {/* Média de Aprovação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Média de Aprovação
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={configLocal.media_aprovacao}
                onChange={(e) => setConfigLocal(prev => ({ 
                  ...prev, 
                  media_aprovacao: parseFloat(e.target.value) 
                }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={configLocal.tem_recuperacao_paralela}
                onChange={(e) => setConfigLocal(prev => ({ 
                  ...prev, 
                  tem_recuperacao_paralela: e.target.checked 
                }))}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm">Recuperação Paralela</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={configLocal.tem_prova_final}
                onChange={(e) => setConfigLocal(prev => ({ 
                  ...prev, 
                  tem_prova_final: e.target.checked 
                }))}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm">Prova Final</span>
            </label>
          </div>

          {/* Botão Salvar */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSalvarConfig}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {/* Seleção de Turma e Período */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Turma */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="h-4 w-4 inline mr-1" />
              Turma
            </label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Selecione uma turma</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} - {turma.ano_letivo}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="h-4 w-4 inline mr-1" />
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {periodos.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Salvar Todas */}
          {temNotasPendentes && (
            <button
              onClick={handleSalvarTodas}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando...' : `Salvar Todas (${Object.keys(notasEditadas).length})`}
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={limparErro} className="ml-auto text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Tabela de Notas */}
      {turmaId ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando notas...
            </div>
          ) : alunosComNotas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum aluno encontrado nesta turma.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Aluno
                    </th>
                    {notasColunas.map(num => (
                      <th key={num} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
                        N{num}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
                      Média
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alunosComNotas.map((aluno, index) => (
                    <tr key={aluno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {/* Nome do Aluno */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{aluno.nome}</span>
                          {aluno.possui_laudo && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {aluno.tipo_laudo || 'Laudo'}
                            </span>
                          )}
                        </div>
                        {aluno.matricula && (
                          <span className="text-xs text-gray-500">{aluno.matricula}</span>
                        )}
                      </td>

                      {/* Colunas de Notas */}
                      {notasColunas.map(num => (
                        <td key={num} className="px-4 py-3 text-center">
                          <input
                            type="text"
                            value={getNotaValor(aluno, num)}
                            onChange={(e) => handleNotaChange(aluno.id, num, e.target.value)}
                            onBlur={() => {
                              if (isNotaEditada(aluno.id, num)) {
                                handleSalvarNota(aluno.id, num);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isNotaEditada(aluno.id, num)) {
                                handleSalvarNota(aluno.id, num);
                              }
                            }}
                            className={`w-16 text-center border rounded px-2 py-1 text-sm
                              ${isNotaEditada(aluno.id, num) 
                                ? 'border-yellow-400 bg-yellow-50' 
                                : 'border-gray-300'
                              }
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            `}
                            placeholder="--"
                          />
                        </td>
                      ))}

                      {/* Média */}
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          aluno.media_periodo !== null
                            ? aluno.media_periodo >= (configLocal.media_aprovacao || 6)
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-gray-400'
                        }`}>
                          {aluno.media_periodo !== null 
                            ? aluno.media_periodo.toFixed(1) 
                            : '--'
                          }
                        </span>
                      </td>

                      {/* Situação */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCorSituacao(aluno.situacao)}`}>
                          {aluno.situacao === 'aprovado' && 'Aprovado'}
                          {aluno.situacao === 'recuperacao' && 'Recuperação'}
                          {aluno.situacao === 'reprovado' && 'Reprovado'}
                          {aluno.situacao === 'cursando' && 'Cursando'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Estatísticas */}
          {alunosComNotas.length > 0 && (
            <div className="border-t bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="ml-1 font-semibold">{alunosComNotas.length} alunos</span>
                </div>
                <div>
                  <span className="text-gray-500">Aprovados:</span>
                  <span className="ml-1 font-semibold text-green-600">
                    {alunosComNotas.filter(a => a.situacao === 'aprovado').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Recuperação:</span>
                  <span className="ml-1 font-semibold text-yellow-600">
                    {alunosComNotas.filter(a => a.situacao === 'recuperacao').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Média da turma:</span>
                  <span className="ml-1 font-semibold">
                    {(() => {
                      const comMedia = alunosComNotas.filter(a => a.media_periodo !== null);
                      if (comMedia.length === 0) return '--';
                      const soma = comMedia.reduce((acc, a) => acc + (a.media_periodo || 0), 0);
                      return (soma / comMedia.length).toFixed(1);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma turma para lançar notas</p>
        </div>
      )}
    </div>
  );
}
