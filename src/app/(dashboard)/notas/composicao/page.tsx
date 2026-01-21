// ============================================================
// XYMATH - PÁGINA DE COMPOSIÇÃO DE NOTAS
// src/app/(dashboard)/notas/composicao/page.tsx
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Save, 
  Copy,
  GripVertical,
  FileText,
  Calculator,
  Edit3,
  Users,
  BookOpen,
  ArrowLeft,
  Printer,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useComposicaoNotas } from '@/hooks/useComposicaoNotas';
import { useTurmas } from '@/hooks/useTurmas';
import type { 
  TipoCalculo, 
  TipoComponente,
  NovoComponente,
  LancarNotaComponente
} from '@/types/composicao-notas';
import { TIPOS_COMPONENTE, TIPOS_CALCULO } from '@/types/composicao-notas';

export default function ComposicaoNotasPage() {
  // Estados de seleção
  const [turmaId, setTurmaId] = useState<string>('');
  const [periodo, setPeriodo] = useState<number>(1);
  const [numeroNota, setNumeroNota] = useState<number>(1);
  
  // Estados de UI
  const [mostrarConfig, setMostrarConfig] = useState(true);
  const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
  const [periodosCopiar, setPeriodosCopiar] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [notasEditadas, setNotasEditadas] = useState<Record<string, Record<string, string>>>({});
  
  // Estados de novo componente
  const [novoComponente, setNovoComponente] = useState<NovoComponente>({
    nome: '',
    tipo: 'manual',
    peso: 1.0
  });

  // Hooks
  const {
    composicao,
    componentes,
    alunosNotas,
    simulados,
    loading,
    error,
    carregarComposicao,
    criarComposicao,
    atualizarTipoCalculo,
    copiarComposicao,
    adicionarComponente,
    atualizarComponente,
    removerComponente,
    carregarNotasAlunos,
    lancarNota,
    lancarNotasEmLote,
    recalcularTodasMedias,
    carregarSimulados,
    limparErro
  } = useComposicaoNotas();

  const { turmas, carregarTurmas } = useTurmas();

  // Carregar turmas ao iniciar
  useEffect(() => {
    carregarTurmas();
  }, [carregarTurmas]);

  // Carregar composição quando mudar seleção
  useEffect(() => {
    if (turmaId && periodo && numeroNota) {
      carregarComposicao(turmaId, periodo, numeroNota);
      carregarSimulados(turmaId);
    }
  }, [turmaId, periodo, numeroNota, carregarComposicao, carregarSimulados]);

  // Carregar notas quando tiver composição
  useEffect(() => {
    if (turmaId && composicao?.id) {
      carregarNotasAlunos(turmaId, composicao.id);
      setNotasEditadas({});
    }
  }, [turmaId, composicao?.id, carregarNotasAlunos]);

  // Criar composição se não existir
  const handleCriarComposicao = async () => {
    if (!turmaId) return;
    
    setSalvando(true);
    const id = await criarComposicao({
      turma_id: turmaId,
      periodo,
      numero_nota: numeroNota,
      nome: `N${numeroNota}`,
      tipo_calculo: 'ponderada'
    });
    
    if (id) {
      await carregarComposicao(turmaId, periodo, numeroNota);
    }
    setSalvando(false);
  };

  // Adicionar componente
  const handleAdicionarComponente = async () => {
    if (!composicao?.id || !novoComponente.nome.trim()) return;
    
    setSalvando(true);
    const sucesso = await adicionarComponente(composicao.id, novoComponente);
    if (sucesso) {
      setNovoComponente({ nome: '', tipo: 'manual', peso: 1.0 });
    }
    setSalvando(false);
  };

  // Remover componente
  const handleRemoverComponente = async (componenteId: string) => {
    if (!confirm('Remover este componente? As notas lançadas serão perdidas.')) return;
    
    setSalvando(true);
    await removerComponente(componenteId);
    if (turmaId && composicao?.id) {
      await carregarNotasAlunos(turmaId, composicao.id);
    }
    setSalvando(false);
  };

  // Atualizar peso do componente
  const handleAtualizarPeso = async (componenteId: string, peso: number) => {
    await atualizarComponente(componenteId, { peso });
    if (turmaId && composicao?.id) {
      await recalcularTodasMedias(turmaId, composicao.id);
    }
  };

  // Copiar composição para outros períodos
  const handleCopiarComposicao = async () => {
    if (!composicao?.id || periodosCopiar.length === 0) return;
    
    setSalvando(true);
    await copiarComposicao(composicao.id, periodosCopiar);
    setMostrarModalCopiar(false);
    setPeriodosCopiar([]);
    setSalvando(false);
  };

  // Atualizar nota no estado local
  const handleNotaChange = (alunoId: string, componenteId: string, valor: string) => {
    setNotasEditadas(prev => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || {}),
        [componenteId]: valor
      }
    }));
  };

  // Salvar nota individual
  const handleSalvarNota = async (alunoId: string, componenteId: string) => {
    const valorStr = notasEditadas[alunoId]?.[componenteId];
    if (valorStr === undefined) return;

    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor < 0 || valor > 10) {
      alert('Nota inválida. Digite um valor entre 0 e 10.');
      return;
    }

    const sucesso = await lancarNota({
      aluno_id: alunoId,
      componente_id: componenteId,
      valor
    });

    if (sucesso) {
      // Limpar edição
      setNotasEditadas(prev => {
        const novo = { ...prev };
        if (novo[alunoId]) {
          delete novo[alunoId][componenteId];
          if (Object.keys(novo[alunoId]).length === 0) {
            delete novo[alunoId];
          }
        }
        return novo;
      });

      // Recalcular médias
      if (turmaId && composicao?.id) {
        await recalcularTodasMedias(turmaId, composicao.id);
      }
    }
  };

  // Salvar todas as notas
  const handleSalvarTodas = async () => {
    setSalvando(true);
    
    const notasParaSalvar: LancarNotaComponente[] = [];
    
    Object.entries(notasEditadas).forEach(([alunoId, notas]) => {
      Object.entries(notas).forEach(([componenteId, valorStr]) => {
        const valor = parseFloat(valorStr.replace(',', '.'));
        if (!isNaN(valor) && valor >= 0 && valor <= 10) {
          notasParaSalvar.push({
            aluno_id: alunoId,
            componente_id: componenteId,
            valor
          });
        }
      });
    });

    if (notasParaSalvar.length > 0) {
      const sucesso = await lancarNotasEmLote(notasParaSalvar);
      if (sucesso) {
        setNotasEditadas({});
        if (turmaId && composicao?.id) {
          await recalcularTodasMedias(turmaId, composicao.id);
        }
      }
    }
    
    setSalvando(false);
  };

  // Obter valor da nota
  const getNotaValor = (alunoId: string, componenteId: string): string => {
    if (notasEditadas[alunoId]?.[componenteId] !== undefined) {
      return notasEditadas[alunoId][componenteId];
    }
    const aluno = alunosNotas.find(a => a.id === alunoId);
    const nota = aluno?.notas_componentes[componenteId];
    return nota !== null && nota !== undefined ? nota.toFixed(1) : '';
  };

  // Verificar se nota foi editada
  const isNotaEditada = (alunoId: string, componenteId: string): boolean => {
    return notasEditadas[alunoId]?.[componenteId] !== undefined;
  };

  // Calcular soma dos pesos
  const somaPesos = componentes.reduce((acc, c) => acc + c.peso, 0);

  // Verificar se há notas pendentes
  const temNotasPendentes = Object.keys(notasEditadas).length > 0;

  // Obter cor da situação
  const getCorSituacao = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800';
      case 'reprovado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Imprimir
  const handleImprimir = () => {
    window.print();
  };

  // Períodos disponíveis
  const periodos = [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/notas" 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings2 className="h-7 w-7 text-purple-600" />
              Composição de Notas
            </h1>
            <p className="text-gray-500 mt-1">
              Configure como cada nota será calculada
            </p>
          </div>
        </div>
      </div>

      {/* Seleção de Turma, Período e Nota */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 print:hidden">
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
          <div className="w-40">
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
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Número da Nota */}
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota
            </label>
            <select
              value={numeroNota}
              onChange={(e) => setNumeroNota(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value={1}>N1</option>
              <option value={2}>N2</option>
              <option value={3}>N3</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            {composicao && (
              <>
                <button
                  onClick={() => setMostrarModalCopiar(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="Copiar para outros bimestres"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={handleImprimir}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="Imprimir"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </>
            )}
            {temNotasPendentes && (
              <button
                onClick={handleSalvarTodas}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar ({Object.keys(notasEditadas).length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 print:hidden">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={limparErro} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Conteúdo Principal */}
      {turmaId ? (
        loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
            Carregando...
          </div>
        ) : !composicao ? (
          /* Criar nova composição */
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <Settings2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">
              Nenhuma composição definida para N{numeroNota} do {periodo}º Bimestre
            </p>
            <button
              onClick={handleCriarComposicao}
              disabled={salvando}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {salvando ? 'Criando...' : 'Criar Composição'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuração da Composição */}
            <div className="bg-white rounded-xl shadow-sm border p-6 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-purple-600" />
                  Configuração da {composicao.nome}
                </h2>
                <button
                  onClick={() => setMostrarConfig(!mostrarConfig)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  {mostrarConfig ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {mostrarConfig && (
                <>
                  {/* Tipo de Cálculo */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Cálculo
                    </label>
                    <div className="flex gap-4">
                      {(['simples', 'ponderada'] as TipoCalculo[]).map(tipo => (
                        <label
                          key={tipo}
                          className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition ${
                            composicao.tipo_calculo === tipo
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="tipo_calculo"
                            value={tipo}
                            checked={composicao.tipo_calculo === tipo}
                            onChange={() => atualizarTipoCalculo(composicao.id, tipo)}
                            className="sr-only"
                          />
                          <div className="font-medium">{TIPOS_CALCULO[tipo].label}</div>
                          <div className="text-sm text-gray-500">{TIPOS_CALCULO[tipo].descricao}</div>
                          <div className="text-xs text-gray-400 mt-1 font-mono">
                            {TIPOS_CALCULO[tipo].formula}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Lista de Componentes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Componentes da Nota
                    </label>
                    
                    {componentes.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        Nenhum componente adicionado. Adicione abaixo.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {componentes.map((comp, index) => (
                          <div
                            key={comp.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                            <div className="flex-1">
                              <span className="font-medium">{comp.nome}</span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                comp.tipo === 'manual' ? 'bg-blue-100 text-blue-700' :
                                comp.tipo === 'simulado' ? 'bg-purple-100 text-purple-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {TIPOS_COMPONENTE[comp.tipo].label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Peso:</span>
                              <input
                                type="number"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={comp.peso}
                                onChange={(e) => handleAtualizarPeso(comp.id, parseFloat(e.target.value))}
                                className="w-16 border rounded px-2 py-1 text-sm text-center"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoverComponente(comp.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Soma dos pesos */}
                    {componentes.length > 0 && (
                      <div className="mt-2 text-sm text-right">
                        Soma dos pesos: <span className={`font-semibold ${
                          Math.abs(somaPesos - 10) < 0.01 ? 'text-green-600' : 'text-yellow-600'
                        }`}>{somaPesos.toFixed(1)}</span>
                        {Math.abs(somaPesos - 10) >= 0.01 && (
                          <span className="text-yellow-600 ml-1">(recomendado: 10.0)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Adicionar Componente */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adicionar Componente
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        placeholder="Nome (ex: Prova de Rede 1)"
                        value={novoComponente.nome}
                        onChange={(e) => setNovoComponente(prev => ({ ...prev, nome: e.target.value }))}
                        className="flex-1 min-w-[200px] border rounded-lg px-3 py-2"
                      />
                      <select
                        value={novoComponente.tipo}
                        onChange={(e) => setNovoComponente(prev => ({ 
                          ...prev, 
                          tipo: e.target.value as TipoComponente 
                        }))}
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="manual">Avaliação Manual</option>
                        <option value="simulado">Simulado xyMath</option>
                        <option value="atividades">Média Atividades</option>
                      </select>
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={novoComponente.peso}
                        onChange={(e) => setNovoComponente(prev => ({ 
                          ...prev, 
                          peso: parseFloat(e.target.value) || 1 
                        }))}
                        className="w-20 border rounded-lg px-3 py-2 text-center"
                        placeholder="Peso"
                      />
                      <button
                        onClick={handleAdicionarComponente}
                        disabled={!novoComponente.nome.trim() || salvando}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tabela de Notas */}
            {componentes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Cabeçalho para impressão */}
                <div className="hidden print:block p-4 border-b">
                  <h1 className="text-xl font-bold text-center">
                    {turmas.find(t => t.id === turmaId)?.nome} - {periodo}º Bimestre - {composicao.nome}
                  </h1>
                  <p className="text-center text-sm text-gray-500">
                    Tipo: {TIPOS_CALCULO[composicao.tipo_calculo].label}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Aluno
                        </th>
                        {componentes.map(comp => (
                          <th key={comp.id} className="px-3 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]">
                            <div>{comp.nome}</div>
                            <div className="text-xs font-normal text-gray-500">
                              ({comp.peso.toFixed(1)})
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
                          Média
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-28 print:hidden">
                          Situação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {alunosNotas.map((aluno, index) => (
                        <tr key={aluno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {/* Nome */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{aluno.nome}</span>
                              {aluno.possui_laudo && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full print:hidden">
                                  {aluno.tipo_laudo || 'Laudo'}
                                </span>
                              )}
                            </div>
                            {aluno.matricula && (
                              <span className="text-xs text-gray-500">{aluno.matricula}</span>
                            )}
                          </td>

                          {/* Notas dos componentes */}
                          {componentes.map(comp => (
                            <td key={comp.id} className="px-3 py-3 text-center">
                              {comp.tipo === 'manual' ? (
                                <input
                                  type="text"
                                  value={getNotaValor(aluno.id, comp.id)}
                                  onChange={(e) => handleNotaChange(aluno.id, comp.id, e.target.value)}
                                  onBlur={() => {
                                    if (isNotaEditada(aluno.id, comp.id)) {
                                      handleSalvarNota(aluno.id, comp.id);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isNotaEditada(aluno.id, comp.id)) {
                                      handleSalvarNota(aluno.id, comp.id);
                                    }
                                  }}
                                  className={`w-16 text-center border rounded px-2 py-1 text-sm print:border-none print:bg-transparent
                                    ${isNotaEditada(aluno.id, comp.id)
                                      ? 'border-yellow-400 bg-yellow-50'
                                      : 'border-gray-300'
                                    }
                                    focus:outline-none focus:ring-2 focus:ring-purple-500
                                  `}
                                  placeholder="--"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">Auto</span>
                              )}
                            </td>
                          ))}

                          {/* Média */}
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              aluno.media_calculada !== null
                                ? aluno.media_calculada >= 6
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                : 'text-gray-400'
                            }`}>
                              {aluno.media_calculada !== null
                                ? aluno.media_calculada.toFixed(1)
                                : '--'
                              }
                            </span>
                          </td>

                          {/* Situação */}
                          <td className="px-4 py-3 text-center print:hidden">
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

                {/* Estatísticas */}
                {alunosNotas.length > 0 && (
                  <div className="border-t bg-gray-50 px-4 py-3 print:bg-white">
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-semibold">{alunosNotas.length} alunos</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Aprovados:</span>
                        <span className="ml-1 font-semibold text-green-600">
                          {alunosNotas.filter(a => a.situacao === 'aprovado').length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Recuperação:</span>
                        <span className="ml-1 font-semibold text-yellow-600">
                          {alunosNotas.filter(a => a.situacao === 'recuperacao').length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Média da turma:</span>
                        <span className="ml-1 font-semibold">
                          {(() => {
                            const comMedia = alunosNotas.filter(a => a.media_calculada !== null);
                            if (comMedia.length === 0) return '--';
                            const soma = comMedia.reduce((acc, a) => acc + (a.media_calculada || 0), 0);
                            return (soma / comMedia.length).toFixed(1);
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma turma para configurar a composição de notas</p>
        </div>
      )}

      {/* Modal Copiar Composição */}
      {mostrarModalCopiar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Copiar Composição</h3>
            <p className="text-sm text-gray-500 mb-4">
              Selecione os bimestres para onde deseja copiar esta composição:
            </p>
            
            <div className="space-y-2 mb-6">
              {periodos.filter(p => p.value !== periodo).map(p => (
                <label key={p.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={periodosCopiar.includes(p.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPeriodosCopiar(prev => [...prev, p.value]);
                      } else {
                        setPeriodosCopiar(prev => prev.filter(x => x !== p.value));
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setMostrarModalCopiar(false);
                  setPeriodosCopiar([]);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopiarComposicao}
                disabled={periodosCopiar.length === 0 || salvando}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {salvando ? 'Copiando...' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .min-h-screen, .min-h-screen * {
            visibility: visible;
          }
          .min-h-screen {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
