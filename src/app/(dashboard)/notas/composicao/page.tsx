// ============================================================
// XYMATH - PÁGINA DE COMPOSIÇÃO DE NOTAS (VERSÃO FLEXÍVEL)
// src/app/(dashboard)/notas/composicao/page.tsx
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Save, 
  Copy,
  GripVertical,
  FileText,
  Users,
  BookOpen,
  ArrowLeft,
  Printer,
  AlertTriangle,
  CheckCircle,
  Gamepad2,
  PenLine,
  GraduationCap,
  Info,
  Edit3,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

// ============================================================
// TIPOS
// ============================================================

type TipoPeriodo = 'bimestre' | 'trimestre';
type TipoCalculo = 'simples' | 'ponderada';
type TipoComponente = 'manual' | 'simulado' | 'atividade' | 'prova_rede';

interface ConfiguracaoTurma {
  id?: string;
  turma_id: string;
  tipo_periodo: TipoPeriodo;
  quantidade_periodos: number;
  notas_por_periodo: number[];
  media_aprovacao: number;
  tem_recuperacao: boolean;
  tem_prova_final: boolean;
}

interface ComposicaoNota {
  id: string;
  turma_id: string;
  periodo: number;
  numero_nota: number;
  nome: string;
  tipo_calculo: TipoCalculo;
  ativa: boolean;
}

interface ComponenteAvaliacao {
  id: string;
  composicao_id: string;
  nome: string;
  tipo: TipoComponente;
  peso: number;
  simulado_id?: string;
  ordem: number;
}

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
}

interface AlunoNota {
  id: string;
  nome: string;
  matricula?: string;
  possui_laudo: boolean;
  tipo_laudo?: string;
  notas_componentes: Record<string, number | null>;
  media_calculada: number | null;
  situacao: 'cursando' | 'aprovado' | 'recuperacao' | 'reprovado';
}

// ============================================================
// CONSTANTES
// ============================================================

const TIPOS_COMPONENTE: Record<TipoComponente, { label: string; descricao: string }> = {
  manual: { 
    label: 'Avaliação Manual', 
    descricao: 'Professor lança a nota manualmente'
  },
  simulado: { 
    label: 'Simulado', 
    descricao: 'Nota importada de simulado da plataforma'
  },
  atividade: { 
    label: 'Atividade Exportada', 
    descricao: 'Nota importada de atividade da plataforma'
  },
  prova_rede: { 
    label: 'Prova de Rede', 
    descricao: 'Prova aplicada pela rede de ensino'
  }
};

const TIPOS_CALCULO: Record<TipoCalculo, { label: string; descricao: string; formula: string }> = {
  simples: {
    label: 'Média Simples',
    descricao: 'Soma das notas dividida pela quantidade',
    formula: '(N1 + N2 + N3) / 3'
  },
  ponderada: {
    label: 'Média Ponderada',
    descricao: 'Cada componente tem um peso diferente',
    formula: '(N1×P1 + N2×P2 + N3×P3) / (P1+P2+P3)'
  }
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ComposicaoNotasPage() {
  const supabase = createClient();
  
  // ========== ESTADOS ==========
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<string>('');
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  
  const [configTurma, setConfigTurma] = useState<ConfiguracaoTurma | null>(null);
  const [mostrarConfigInicial, setMostrarConfigInicial] = useState(false);
  const [configTemp, setConfigTemp] = useState<Partial<ConfiguracaoTurma>>({
    tipo_periodo: 'bimestre',
    quantidade_periodos: 4,
    notas_por_periodo: [2, 2, 2, 2],
    media_aprovacao: 6.0,
    tem_recuperacao: true,
    tem_prova_final: false
  });
  
  const [periodo, setPeriodo] = useState<number>(1);
  const [numeroNota, setNumeroNota] = useState<number>(1);
  
  const [composicao, setComposicao] = useState<ComposicaoNota | null>(null);
  const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([]);
  
  const [alunosNotas, setAlunosNotas] = useState<AlunoNota[]>([]);
  const [notasEditadas, setNotasEditadas] = useState<Record<string, Record<string, string>>>({});
  
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfig, setMostrarConfig] = useState(true);
  const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
  const [mostrarModalReplicar, setMostrarModalReplicar] = useState(false);
  const [turmasReplicar, setTurmasReplicar] = useState<string[]>([]);
  const [periodosCopiar, setPeriodosCopiar] = useState<number[]>([]);
  
  const [novoComponente, setNovoComponente] = useState({
    nome: '',
    tipo: 'manual' as TipoComponente,
    peso: 1.0
  });
  
  // Estado para edição de componente
  const [componenteEditando, setComponenteEditando] = useState<ComponenteAvaliacao | null>(null);
  const [editTemp, setEditTemp] = useState({
    nome: '',
    tipo: 'manual' as TipoComponente,
    peso: 1.0
  });
  
  // Estado para importar simulado
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [componenteImportar, setComponenteImportar] = useState<ComponenteAvaliacao | null>(null);
  const [simuladosDisponiveis, setSimuladosDisponiveis] = useState<{id: string; titulo: string; data_aplicacao: string; status: string}[]>([]);
  const [simuladoSelecionado, setSimuladoSelecionado] = useState<string>('');
  const [importando, setImportando] = useState(false);

  // ========== CARREGAR TURMAS ==========
  useEffect(() => {
    async function carregarTurmas() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('turmas')
        .select('id, nome, ano_letivo')
        .order('ano_letivo', { ascending: false })
        .order('nome');

      if (data) setTurmas(data);
    }
    carregarTurmas();
  }, [supabase]);

  // ========== CARREGAR CONFIGURAÇÃO DA TURMA ==========
  const carregarConfigTurma = useCallback(async (turmaId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('configuracao_notas')
        .select('*')
        .eq('turma_id', turmaId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfigTurma({
          id: data.id,
          turma_id: data.turma_id,
          tipo_periodo: data.tipo_periodo || 'bimestre',
          quantidade_periodos: data.quantidade_periodos || 4,
          notas_por_periodo: data.notas_por_periodo || [2, 2, 2, 2],
          media_aprovacao: data.media_aprovacao || 6.0,
          tem_recuperacao: data.tem_recuperacao ?? true,
          tem_prova_final: data.tem_prova_final ?? false
        });
        setMostrarConfigInicial(false);
      } else {
        setConfigTurma(null);
        setMostrarConfigInicial(true);
        setConfigTemp({
          tipo_periodo: 'bimestre',
          quantidade_periodos: 4,
          notas_por_periodo: [2, 2, 2, 2],
          media_aprovacao: 6.0,
          tem_recuperacao: true,
          tem_prova_final: false
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ========== QUANDO MUDA TURMA ==========
  useEffect(() => {
    if (turmaId) {
      const turma = turmas.find(t => t.id === turmaId);
      setTurmaSelecionada(turma || null);
      carregarConfigTurma(turmaId);
      setPeriodo(1);
      setNumeroNota(1);
      setComposicao(null);
      setComponentes([]);
      setAlunosNotas([]);
    } else {
      setTurmaSelecionada(null);
      setConfigTurma(null);
      setMostrarConfigInicial(false);
    }
  }, [turmaId, turmas, carregarConfigTurma]);

  // ========== SALVAR CONFIGURAÇÃO INICIAL ==========
  const salvarConfigInicial = async () => {
    if (!turmaId) return;
    
    setSalvando(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const configParaSalvar = {
        turma_id: turmaId,
        usuario_id: user.id,
        tipo_periodo: configTemp.tipo_periodo,
        quantidade_periodos: configTemp.quantidade_periodos,
        notas_por_periodo: configTemp.notas_por_periodo,
        media_aprovacao: configTemp.media_aprovacao,
        tem_recuperacao: configTemp.tem_recuperacao,
        tem_prova_final: configTemp.tem_prova_final,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('configuracao_notas')
        .upsert(configParaSalvar, { onConflict: 'turma_id' })
        .select()
        .single();

      if (error) throw error;

      setConfigTurma({
        id: data.id,
        ...configParaSalvar
      } as ConfiguracaoTurma);
      setMostrarConfigInicial(false);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== HANDLERS DE CONFIGURAÇÃO ==========
  const handleQtdNotasPeriodo = (periodoIndex: number, qtd: number) => {
    setConfigTemp(prev => {
      const novasNotas = [...(prev.notas_por_periodo || [])];
      novasNotas[periodoIndex] = qtd;
      return { ...prev, notas_por_periodo: novasNotas };
    });
  };

  const handleTipoPeriodo = (tipo: TipoPeriodo) => {
    const qtd = tipo === 'trimestre' ? 3 : 4;
    const notas = Array(qtd).fill(2);
    setConfigTemp(prev => ({
      ...prev,
      tipo_periodo: tipo,
      quantidade_periodos: qtd,
      notas_por_periodo: notas
    }));
  };

  // ========== CARREGAR COMPOSIÇÃO ==========
  const carregarComposicao = useCallback(async () => {
    if (!turmaId || !configTurma) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: comp, error: compError } = await supabase
        .from('composicao_nota')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('periodo', periodo)
        .eq('numero_nota', numeroNota)
        .single();

      if (compError && compError.code !== 'PGRST116') throw compError;

      if (comp) {
        setComposicao(comp);
        
        const { data: comps, error: compsError } = await supabase
          .from('composicao_componentes')
          .select('*')
          .eq('composicao_id', comp.id)
          .order('ordem');

        if (compsError) throw compsError;
        setComponentes(comps || []);
        
        await carregarNotasAlunos(comp.id);
      } else {
        setComposicao(null);
        setComponentes([]);
        setAlunosNotas([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [turmaId, configTurma, periodo, numeroNota, supabase]);

  useEffect(() => {
    if (configTurma && !mostrarConfigInicial) {
      carregarComposicao();
    }
  }, [configTurma, mostrarConfigInicial, periodo, numeroNota, carregarComposicao]);

  // ========== CARREGAR NOTAS DOS ALUNOS ==========
  const carregarNotasAlunos = async (composicaoId: string) => {
    try {
      const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, possui_laudo, tipo_laudo')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome');

      if (alunosError) throw alunosError;

      const { data: notas, error: notasError } = await supabase
        .from('notas_componente')
        .select('aluno_id, componente_id, valor')
        .eq('composicao_id', composicaoId);

      if (notasError) throw notasError;

      const { data: medias, error: mediasError } = await supabase
        .from('medias_periodo')
        .select('aluno_id, media, situacao')
        .eq('turma_id', turmaId)
        .eq('periodo', periodo)
        .eq('numero_nota', numeroNota);

      if (mediasError) throw mediasError;

      const alunosComNotas: AlunoNota[] = (alunos || []).map(aluno => {
        const notasAluno: Record<string, number | null> = {};
        (notas || [])
          .filter(n => n.aluno_id === aluno.id)
          .forEach(n => { notasAluno[n.componente_id] = n.valor; });

        const mediaAluno = (medias || []).find(m => m.aluno_id === aluno.id);

        return {
          id: aluno.id,
          nome: aluno.nome,
          matricula: aluno.matricula,
          possui_laudo: aluno.possui_laudo || false,
          tipo_laudo: aluno.tipo_laudo,
          notas_componentes: notasAluno,
          media_calculada: mediaAluno?.media ?? null,
          situacao: mediaAluno?.situacao || 'cursando'
        };
      });

      setAlunosNotas(alunosComNotas);
      setNotasEditadas({});
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ========== CRIAR COMPOSIÇÃO ==========
  const criarComposicao = async () => {
    if (!turmaId) return;
    
    setSalvando(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('composicao_nota')
        .insert({
          usuario_id: user.id,
          turma_id: turmaId,
          periodo,
          numero_nota: numeroNota,
          nome: `N${numeroNota}`,
          tipo_calculo: 'ponderada',
          ativa: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setComposicao(data);
      setComponentes([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== ATUALIZAR TIPO CÁLCULO ==========
  const atualizarTipoCalculo = async (tipo: TipoCalculo) => {
    if (!composicao) return;
    
    try {
      const { error } = await supabase
        .from('composicao_nota')
        .update({ tipo_calculo: tipo })
        .eq('id', composicao.id);

      if (error) throw error;
      
      setComposicao(prev => prev ? { ...prev, tipo_calculo: tipo } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ========== ADICIONAR COMPONENTE ==========
  const handleAdicionarComponente = async () => {
    if (!composicao || !novoComponente.nome.trim()) return;
    
    setSalvando(true);
    
    try {
      const ordem = componentes.length + 1;
      
      const { data, error } = await supabase
        .from('composicao_componentes')
        .insert({
          composicao_id: composicao.id,
          nome: novoComponente.nome,
          tipo: novoComponente.tipo,
          peso: novoComponente.peso,
          ordem
        })
        .select()
        .single();

      if (error) throw error;
      
      setComponentes(prev => [...prev, data]);
      setNovoComponente({ nome: '', tipo: 'manual', peso: 1.0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== REMOVER COMPONENTE ==========
  const handleRemoverComponente = async (componenteId: string) => {
    if (!confirm('Remover este componente? As notas lançadas serão perdidas.')) return;
    
    setSalvando(true);
    
    try {
      const { error } = await supabase
        .from('composicao_componentes')
        .delete()
        .eq('id', componenteId);

      if (error) throw error;
      
      setComponentes(prev => prev.filter(c => c.id !== componenteId));
      
      if (composicao) {
        await carregarNotasAlunos(composicao.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== ATUALIZAR PESO ==========
  const handleAtualizarPeso = async (componenteId: string, peso: number) => {
    try {
      const { error } = await supabase
        .from('composicao_componentes')
        .update({ peso })
        .eq('id', componenteId);

      if (error) throw error;
      
      setComponentes(prev => 
        prev.map(c => c.id === componenteId ? { ...c, peso } : c)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ========== EDITAR COMPONENTE ==========
  const handleAbrirEdicao = (comp: ComponenteAvaliacao) => {
    setComponenteEditando(comp);
    setEditTemp({
      nome: comp.nome,
      tipo: comp.tipo,
      peso: comp.peso
    });
  };

  const handleSalvarEdicao = async () => {
    if (!componenteEditando) return;
    
    setSalvando(true);
    
    try {
      const { error } = await supabase
        .from('composicao_componentes')
        .update({
          nome: editTemp.nome,
          tipo: editTemp.tipo,
          peso: editTemp.peso
        })
        .eq('id', componenteEditando.id);

      if (error) throw error;
      
      setComponentes(prev => 
        prev.map(c => c.id === componenteEditando.id 
          ? { ...c, nome: editTemp.nome, tipo: editTemp.tipo, peso: editTemp.peso } 
          : c
        )
      );
      setComponenteEditando(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== IMPORTAR SIMULADO ==========
  const handleAbrirImportarSimulado = async (comp: ComponenteAvaliacao) => {
    setComponenteImportar(comp);
    setSimuladoSelecionado('');
    
    // Buscar simulados da turma
    try {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo, data_aplicacao, status')
        .eq('turma_id', turmaId)
        .order('data_aplicacao', { ascending: false });

      if (error) throw error;
      
      setSimuladosDisponiveis(data || []);
      setMostrarModalImportar(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportarNotas = async () => {
    if (!simuladoSelecionado || !componenteImportar || !composicao) return;
    
    setImportando(true);
    
    try {
      // Buscar notas do simulado
      const { data: notasSimulado, error: notasError } = await supabase
        .from('respostas_simulados')
        .select('aluno_id, acertos, total_questoes, nota')
        .eq('simulado_id', simuladoSelecionado);

      if (notasError) throw notasError;

      if (!notasSimulado || notasSimulado.length === 0) {
        alert('Nenhum resultado encontrado para este simulado.');
        setImportando(false);
        return;
      }

      // Preparar notas para inserir
      const notasParaInserir = notasSimulado.map(ns => {
        // Calcular nota: (acertos / total) * 10, ou usar nota já calculada
        let notaFinal = ns.nota;
        if (notaFinal === null || notaFinal === undefined) {
          notaFinal = ns.total_questoes > 0 
            ? Math.round((ns.acertos / ns.total_questoes) * 100) / 10 
            : 0;
        }
        
        return {
          aluno_id: ns.aluno_id,
          componente_id: componenteImportar.id,
          composicao_id: composicao.id,
          valor: notaFinal
        };
      });

      // Inserir/atualizar notas
      const { error: insertError } = await supabase
        .from('notas_componente')
        .upsert(notasParaInserir, { onConflict: 'aluno_id,componente_id' });

      if (insertError) throw insertError;

      // Vincular simulado ao componente
      await supabase
        .from('composicao_componentes')
        .update({ simulado_id: simuladoSelecionado })
        .eq('id', componenteImportar.id);

      // Atualizar componente local
      setComponentes(prev =>
        prev.map(c => c.id === componenteImportar.id
          ? { ...c, simulado_id: simuladoSelecionado }
          : c
        )
      );

      // Recarregar notas dos alunos
      await carregarNotasAlunos(composicao.id);

      // Recalcular médias para todos os alunos que receberam nota
      for (const nota of notasParaInserir) {
        await recalcularMedia(nota.aluno_id);
      }

      setMostrarModalImportar(false);
      setComponenteImportar(null);
      setSimuladoSelecionado('');
      
      alert(`${notasParaInserir.length} notas importadas com sucesso!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImportando(false);
    }
  };

  // ========== LANÇAR NOTA ==========
  const handleNotaChange = (alunoId: string, componenteId: string, valor: string) => {
    setNotasEditadas(prev => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || {}),
        [componenteId]: valor
      }
    }));
  };

  const handleSalvarNota = async (alunoId: string, componenteId: string) => {
    const valorStr = notasEditadas[alunoId]?.[componenteId];
    if (valorStr === undefined || !composicao) return;

    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor < 0 || valor > 10) {
      alert('Nota inválida. Digite um valor entre 0 e 10.');
      return;
    }

    try {
      const { error } = await supabase
        .from('notas_componente')
        .upsert({
          aluno_id: alunoId,
          componente_id: componenteId,
          composicao_id: composicao.id,
          valor
        }, { onConflict: 'aluno_id,componente_id' });

      if (error) throw error;

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

      setAlunosNotas(prev => 
        prev.map(a => 
          a.id === alunoId 
            ? { ...a, notas_componentes: { ...a.notas_componentes, [componenteId]: valor } }
            : a
        )
      );

      await recalcularMedia(alunoId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSalvarTodas = async () => {
    if (!composicao) return;
    
    setSalvando(true);
    
    try {
      const notasParaSalvar: any[] = [];
      
      Object.entries(notasEditadas).forEach(([alunoId, notas]) => {
        Object.entries(notas).forEach(([componenteId, valorStr]) => {
          const valor = parseFloat(valorStr.replace(',', '.'));
          if (!isNaN(valor) && valor >= 0 && valor <= 10) {
            notasParaSalvar.push({
              aluno_id: alunoId,
              componente_id: componenteId,
              composicao_id: composicao.id,
              valor
            });
          }
        });
      });

      if (notasParaSalvar.length > 0) {
        const { error } = await supabase
          .from('notas_componente')
          .upsert(notasParaSalvar, { onConflict: 'aluno_id,componente_id' });

        if (error) throw error;
        
        setNotasEditadas({});
        await carregarNotasAlunos(composicao.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== RECALCULAR MÉDIA ==========
  const recalcularMedia = async (alunoId: string) => {
    if (!composicao) return;
    
    const aluno = alunosNotas.find(a => a.id === alunoId);
    if (!aluno) return;

    let media = 0;
    let somaPesos = 0;
    let somaNotas = 0;
    let qtdNotas = 0;

    componentes.forEach(comp => {
      const nota = aluno.notas_componentes[comp.id];
      // Só considera componentes que têm nota lançada (não null/undefined)
      if (nota !== null && nota !== undefined) {
        if (composicao.tipo_calculo === 'ponderada') {
          somaNotas += nota * comp.peso;
          somaPesos += comp.peso;
        } else {
          somaNotas += nota;
          qtdNotas++;
        }
      }
    });

    // Só calcula média se tiver pelo menos uma nota
    if (composicao.tipo_calculo === 'ponderada' && somaPesos > 0) {
      media = somaNotas / somaPesos;
    } else if (qtdNotas > 0) {
      media = somaNotas / qtdNotas;
    } else {
      // Sem notas, não salva média
      setAlunosNotas(prev =>
        prev.map(a =>
          a.id === alunoId
            ? { ...a, media_calculada: null, situacao: 'cursando' }
            : a
        )
      );
      return;
    }

    const mediaAprovacao = configTurma?.media_aprovacao || 6.0;
    let situacao: AlunoNota['situacao'] = 'cursando';
    
    // Só define situação final se TODOS os componentes tiverem nota
    const totalComponentes = componentes.length;
    const componentesComNota = componentes.filter(c => 
      aluno.notas_componentes[c.id] !== null && aluno.notas_componentes[c.id] !== undefined
    ).length;
    
    if (componentesComNota === totalComponentes) {
      // Todas as notas lançadas - pode definir situação final
      if (media >= mediaAprovacao) {
        situacao = 'aprovado';
      } else if (media >= mediaAprovacao - 1.5) {
        situacao = 'recuperacao';
      } else {
        situacao = 'reprovado';
      }
    }

    try {
      await supabase
        .from('medias_periodo')
        .upsert({
          aluno_id: alunoId,
          turma_id: turmaId,
          periodo,
          numero_nota: numeroNota,
          media: Math.round(media * 10) / 10,
          situacao
        }, { onConflict: 'aluno_id,turma_id,periodo,numero_nota' });

      setAlunosNotas(prev =>
        prev.map(a =>
          a.id === alunoId
            ? { ...a, media_calculada: Math.round(media * 10) / 10, situacao }
            : a
        )
      );
    } catch (err: any) {
      console.error('Erro ao salvar média:', err);
    }
  };

  // ========== REPLICAR CONFIGURAÇÃO ==========
  const handleReplicarConfig = async () => {
    if (!configTurma || turmasReplicar.length === 0) return;
    
    setSalvando(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const configs = turmasReplicar.map(tId => ({
        turma_id: tId,
        usuario_id: user.id,
        tipo_periodo: configTurma.tipo_periodo,
        quantidade_periodos: configTurma.quantidade_periodos,
        notas_por_periodo: configTurma.notas_por_periodo,
        media_aprovacao: configTurma.media_aprovacao,
        tem_recuperacao: configTurma.tem_recuperacao,
        tem_prova_final: configTurma.tem_prova_final
      }));

      const { error } = await supabase
        .from('configuracao_notas')
        .upsert(configs, { onConflict: 'turma_id' });

      if (error) throw error;
      
      setMostrarModalReplicar(false);
      setTurmasReplicar([]);
      alert(`Configuração replicada para ${turmasReplicar.length} turma(s)!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== COPIAR COMPOSIÇÃO ==========
  const handleCopiarComposicao = async () => {
    if (!composicao || periodosCopiar.length === 0) return;
    
    setSalvando(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      for (const p of periodosCopiar) {
        const { data: novaComp, error: compError } = await supabase
          .from('composicao_nota')
          .insert({
            usuario_id: user.id,
            turma_id: turmaId,
            periodo: p,
            numero_nota: numeroNota,
            nome: `N${numeroNota}`,
            tipo_calculo: composicao.tipo_calculo,
            ativa: true
          })
          .select()
          .single();

        if (compError) throw compError;

        if (componentes.length > 0) {
          const novosComps = componentes.map(c => ({
            composicao_id: novaComp.id,
            nome: c.nome,
            tipo: c.tipo,
            peso: c.peso,
            ordem: c.ordem
          }));

          const { error: compsError } = await supabase
            .from('composicao_componentes')
            .insert(novosComps);

          if (compsError) throw compsError;
        }
      }
      
      setMostrarModalCopiar(false);
      setPeriodosCopiar([]);
      alert(`Composição copiada para ${periodosCopiar.length} período(s)!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // ========== HELPERS ==========
  const getNotaValor = (alunoId: string, componenteId: string): string => {
    if (notasEditadas[alunoId]?.[componenteId] !== undefined) {
      return notasEditadas[alunoId][componenteId];
    }
    const aluno = alunosNotas.find(a => a.id === alunoId);
    const nota = aluno?.notas_componentes[componenteId];
    return nota !== null && nota !== undefined ? nota.toFixed(1) : '';
  };

  const isNotaEditada = (alunoId: string, componenteId: string): boolean => {
    return notasEditadas[alunoId]?.[componenteId] !== undefined;
  };

  const somaPesos = componentes.reduce((acc, c) => acc + c.peso, 0);
  const temNotasPendentes = Object.keys(notasEditadas).length > 0;

  const getCorSituacao = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800';
      case 'reprovado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPeriodos = () => {
    if (!configTurma) return [];
    const nome = configTurma.tipo_periodo === 'trimestre' ? 'Trimestre' : 'Bimestre';
    return Array.from({ length: configTurma.quantidade_periodos }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}º ${nome}`
    }));
  };

  const getNotas = () => {
    if (!configTurma) return [];
    const qtd = configTurma.notas_por_periodo[periodo - 1] || 2;
    return Array.from({ length: qtd }, (_, i) => ({
      value: i + 1,
      label: `N${i + 1}`
    }));
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/notas" className="p-2 hover:bg-gray-100 rounded-lg transition">
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

      {/* Seleção de Turma */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
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

          {configTurma && !mostrarConfigInicial && (
            <>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <BookOpen className="h-4 w-4 inline mr-1" />
                  Período
                </label>
                <select
                  value={periodo}
                  onChange={(e) => { setPeriodo(parseInt(e.target.value)); setNumeroNota(1); }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {getPeriodos().map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota
                </label>
                <select
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {getNotas().map(n => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarModalReplicar(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="Replicar configuração para outras turmas"
                >
                  <Copy className="h-4 w-4" />
                  Replicar
                </button>
                {composicao && (
                  <>
                    <button
                      onClick={() => setMostrarModalCopiar(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      title="Copiar para outros períodos"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => window.print()}
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
            </>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 print:hidden">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      {!turmaId ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma turma para configurar as notas</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Carregando...
        </div>
      ) : mostrarConfigInicial ? (
        /* ========== CONFIGURAÇÃO INICIAL DA TURMA ========== */
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Settings2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuração Inicial</h2>
              <p className="text-gray-500">Defina a estrutura de notas para {turmaSelecionada?.nome}</p>
            </div>
          </div>

          {/* Tipo de Período */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Divisão do Ano Letivo
            </label>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                onClick={() => handleTipoPeriodo('bimestre')}
                className={`p-4 border-2 rounded-xl text-left transition ${
                  configTemp.tipo_periodo === 'bimestre'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-lg">4 Bimestres</div>
                <div className="text-sm text-gray-500">Divisão tradicional</div>
              </button>
              <button
                onClick={() => handleTipoPeriodo('trimestre')}
                className={`p-4 border-2 rounded-xl text-left transition ${
                  configTemp.tipo_periodo === 'trimestre'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-lg">3 Trimestres</div>
                <div className="text-sm text-gray-500">Três períodos</div>
              </button>
            </div>
          </div>

          {/* Quantidade de Notas por Período */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quantidade de Notas por Período
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: configTemp.quantidade_periodos || 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-2">
                    {i + 1}º {configTemp.tipo_periodo === 'trimestre' ? 'Trim.' : 'Bim.'}
                  </div>
                  <select
                    value={configTemp.notas_por_periodo?.[i] || 2}
                    onChange={(e) => handleQtdNotasPeriodo(i, parseInt(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-lg font-semibold"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'nota' : 'notas'}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
              <Info className="h-4 w-4" />
              Você poderá configurar os componentes de cada nota depois
            </p>
          </div>

          {/* Média de Aprovação */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Média para Aprovação
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={configTemp.media_aprovacao || 6.0}
                onChange={(e) => setConfigTemp(prev => ({ ...prev, media_aprovacao: parseFloat(e.target.value) }))}
                className="w-24 border rounded-lg px-3 py-2 text-lg font-semibold text-center"
              />
              <span className="text-gray-500">de 0 a 10</span>
            </div>
          </div>

          {/* Opções */}
          <div className="mb-8 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={configTemp.tem_recuperacao || false}
                onChange={(e) => setConfigTemp(prev => ({ ...prev, tem_recuperacao: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span>Permite recuperação paralela</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={configTemp.tem_prova_final || false}
                onChange={(e) => setConfigTemp(prev => ({ ...prev, tem_prova_final: e.target.checked }))}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span>Permite prova final</span>
            </label>
          </div>

          {/* Botão Salvar */}
          <button
            onClick={salvarConfigInicial}
            disabled={salvando}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <>Salvando...</>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Salvar Configuração
              </>
            )}
          </button>
        </div>
      ) : !composicao ? (
        /* ========== CRIAR COMPOSIÇÃO ========== */
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Settings2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">
            Nenhuma composição definida para N{numeroNota} do {periodo}º {configTurma?.tipo_periodo === 'trimestre' ? 'Trimestre' : 'Bimestre'}
          </p>
          <button
            onClick={criarComposicao}
            disabled={salvando}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {salvando ? 'Criando...' : 'Criar Composição'}
          </button>
        </div>
      ) : (
        /* ========== COMPOSIÇÃO + LANÇAMENTO ========== */
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
                          onChange={() => atualizarTipoCalculo(tipo)}
                          className="sr-only"
                        />
                        <div className="font-medium">{TIPOS_CALCULO[tipo].label}</div>
                        <div className="text-sm text-gray-500">{TIPOS_CALCULO[tipo].descricao}</div>
                        <div className="text-xs text-gray-400 mt-1 font-mono">{TIPOS_CALCULO[tipo].formula}</div>
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
                        <div key={comp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                          <div className="flex-1">
                            <span className="font-medium">{comp.nome}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                              comp.tipo === 'manual' ? 'bg-blue-100 text-blue-700' :
                              comp.tipo === 'simulado' ? 'bg-purple-100 text-purple-700' :
                              comp.tipo === 'prova_rede' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {TIPOS_COMPONENTE[comp.tipo as TipoComponente]?.label || comp.tipo}
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
                          {(comp.tipo === 'simulado' || comp.tipo === 'atividade') && (
                            <button
                              onClick={() => handleAbrirImportarSimulado(comp)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded flex items-center gap-1"
                              title="Importar notas"
                            >
                              <Download className="h-4 w-4" />
                              <span className="text-xs">Importar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleAbrirEdicao(comp)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
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

                  {/* Alerta de Pesos */}
                  {componentes.length > 0 && composicao.tipo_calculo === 'ponderada' && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      Math.abs(somaPesos - 10) < 0.01 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {Math.abs(somaPesos - 10) < 0.01 ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                      <span>
                        Soma dos pesos: <strong>{somaPesos.toFixed(1)}</strong>
                        {Math.abs(somaPesos - 10) >= 0.01 && ' (recomendado: 10.0)'}
                      </span>
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
                      onChange={(e) => setNovoComponente(prev => ({ ...prev, tipo: e.target.value as TipoComponente }))}
                      className="border rounded-lg px-3 py-2"
                    >
                      {Object.entries(TIPOS_COMPONENTE).map(([valor, { label }]) => (
                        <option key={valor} value={valor}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={novoComponente.peso}
                      onChange={(e) => setNovoComponente(prev => ({ ...prev, peso: parseFloat(e.target.value) || 1 }))}
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aluno</th>
                      {componentes.map(comp => (
                        <th key={comp.id} className="px-3 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]">
                          <div>{comp.nome}</div>
                          <div className="text-xs font-normal text-gray-500">({comp.peso.toFixed(1)})</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">Média</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-28 print:hidden">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alunosNotas.map((aluno, index) => (
                      <tr key={aluno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                        {componentes.map(comp => (
                          <td key={comp.id} className="px-3 py-3 text-center">
                            {comp.tipo === 'manual' || comp.tipo === 'prova_rede' ? (
                              <input
                                type="text"
                                value={getNotaValor(aluno.id, comp.id)}
                                onChange={(e) => handleNotaChange(aluno.id, comp.id, e.target.value)}
                                onBlur={() => isNotaEditada(aluno.id, comp.id) && handleSalvarNota(aluno.id, comp.id)}
                                onKeyDown={(e) => e.key === 'Enter' && isNotaEditada(aluno.id, comp.id) && handleSalvarNota(aluno.id, comp.id)}
                                className={`w-16 text-center border rounded px-2 py-1 text-sm print:border-none print:bg-transparent
                                  ${isNotaEditada(aluno.id, comp.id) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}
                                  focus:outline-none focus:ring-2 focus:ring-purple-500
                                `}
                                placeholder="--"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">Auto</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            aluno.media_calculada !== null
                              ? aluno.media_calculada >= (configTurma?.media_aprovacao || 6)
                                ? 'text-green-600'
                                : 'text-red-600'
                              : 'text-gray-400'
                          }`}>
                            {aluno.media_calculada !== null ? aluno.media_calculada.toFixed(1) : '--'}
                          </span>
                        </td>
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
                <div className="border-t bg-gray-50 px-4 py-3">
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
      )}

      {/* ========== MODAL IMPORTAR SIMULADO ========== */}
      {mostrarModalImportar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-2">Importar Notas do Simulado</h3>
            <p className="text-sm text-gray-500 mb-4">
              Selecione o simulado para importar as notas para "{componenteImportar?.nome}"
            </p>
            
            {simuladosDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum simulado encontrado para esta turma.</p>
                <p className="text-sm mt-1">Crie um simulado primeiro na página de Simulados.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {simuladosDisponiveis.map(sim => (
                  <label 
                    key={sim.id} 
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      simuladoSelecionado === sim.id ? 'border-purple-500 bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="simulado"
                      value={sim.id}
                      checked={simuladoSelecionado === sim.id}
                      onChange={(e) => setSimuladoSelecionado(e.target.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{sim.titulo}</div>
                      <div className="text-xs text-gray-500">
                        {sim.data_aplicacao ? new Date(sim.data_aplicacao).toLocaleDateString('pt-BR') : 'Sem data'}
                        {sim.status && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full ${
                            sim.status === 'finalizado' ? 'bg-green-100 text-green-700' :
                            sim.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {sim.status === 'finalizado' ? 'Finalizado' :
                             sim.status === 'em_andamento' ? 'Em andamento' :
                             sim.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setMostrarModalImportar(false);
                  setComponenteImportar(null);
                  setSimuladoSelecionado('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportarNotas}
                disabled={!simuladoSelecionado || importando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {importando ? 'Importando...' : 'Importar Notas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL EDITAR COMPONENTE ========== */}
      {componenteEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Componente</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Componente
                </label>
                <input
                  type="text"
                  value={editTemp.nome}
                  onChange={(e) => setEditTemp(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: Prova de Rede 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={editTemp.tipo}
                  onChange={(e) => setEditTemp(prev => ({ ...prev, tipo: e.target.value as TipoComponente }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {Object.entries(TIPOS_COMPONENTE).map(([valor, { label }]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={editTemp.peso}
                  onChange={(e) => setEditTemp(prev => ({ ...prev, peso: parseFloat(e.target.value) || 1 }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setComponenteEditando(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={!editTemp.nome.trim() || salvando}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL REPLICAR CONFIGURAÇÃO ========== */}
      {mostrarModalReplicar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Replicar Configuração</h3>
            <p className="text-sm text-gray-500 mb-4">
              Copiar a estrutura de notas ({configTurma?.tipo_periodo}, {configTurma?.notas_por_periodo?.join(', ')} notas) para outras turmas:
            </p>
            
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {turmas.filter(t => t.id !== turmaId).map(t => (
                <label key={t.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={turmasReplicar.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTurmasReplicar(prev => [...prev, t.id]);
                      } else {
                        setTurmasReplicar(prev => prev.filter(x => x !== t.id));
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>{t.nome} - {t.ano_letivo}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setMostrarModalReplicar(false); setTurmasReplicar([]); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReplicarConfig}
                disabled={turmasReplicar.length === 0 || salvando}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {salvando ? 'Replicando...' : `Replicar (${turmasReplicar.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL COPIAR COMPOSIÇÃO ========== */}
      {mostrarModalCopiar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Copiar Composição</h3>
            <p className="text-sm text-gray-500 mb-4">
              Copiar os componentes de N{numeroNota} para outros períodos:
            </p>
            
            <div className="space-y-2 mb-6">
              {getPeriodos().filter(p => p.value !== periodo).map(p => (
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
                onClick={() => { setMostrarModalCopiar(false); setPeriodosCopiar([]); }}
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
          body * { visibility: hidden; }
          .min-h-screen, .min-h-screen * { visibility: visible; }
          .min-h-screen { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
