// ============================================================
// XYMATH - HOOK PARA COMPOSIÇÃO DE NOTAS
// src/hooks/useComposicaoNotas.ts
// ============================================================

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type {
  ComposicaoNota,
  ComposicaoComponente,
  NovaComposicao,
  NovoComponente,
  AlunoNotasDetalhadas,
  LancarNotaComponente,
  SimuladoOpcao,
  TipoCalculo
} from '@/types/composicao-notas';

interface UseComposicaoNotasReturn {
  // Estados
  composicao: ComposicaoNota | null;
  componentes: ComposicaoComponente[];
  alunosNotas: AlunoNotasDetalhadas[];
  simulados: SimuladoOpcao[];
  loading: boolean;
  error: string | null;

  // Funções de composição
  carregarComposicao: (turmaId: string, periodo: number, numeroNota: number) => Promise<void>;
  criarComposicao: (dados: NovaComposicao) => Promise<string | null>;
  atualizarTipoCalculo: (composicaoId: string, tipo: TipoCalculo) => Promise<boolean>;
  copiarComposicao: (composicaoId: string, paraPeriodos: number[]) => Promise<boolean>;

  // Funções de componentes
  adicionarComponente: (composicaoId: string, componente: NovoComponente) => Promise<boolean>;
  atualizarComponente: (componenteId: string, dados: Partial<NovoComponente>) => Promise<boolean>;
  removerComponente: (componenteId: string) => Promise<boolean>;
  reordenarComponentes: (componenteIds: string[]) => Promise<boolean>;

  // Funções de notas
  carregarNotasAlunos: (turmaId: string, composicaoId: string) => Promise<void>;
  lancarNota: (dados: LancarNotaComponente) => Promise<boolean>;
  lancarNotasEmLote: (notas: LancarNotaComponente[]) => Promise<boolean>;
  calcularMedia: (alunoId: string, composicaoId: string) => Promise<number | null>;
  recalcularTodasMedias: (turmaId: string, composicaoId: string) => Promise<boolean>;

  // Funções auxiliares
  carregarSimulados: (turmaId: string) => Promise<void>;
  limparErro: () => void;
}

export function useComposicaoNotas(): UseComposicaoNotasReturn {
  const [composicao, setComposicao] = useState<ComposicaoNota | null>(null);
  const [componentes, setComponentes] = useState<ComposicaoComponente[]>([]);
  const [alunosNotas, setAlunosNotas] = useState<AlunoNotasDetalhadas[]>([]);
  const [simulados, setSimulados] = useState<SimuladoOpcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const limparErro = useCallback(() => setError(null), []);

  // ============================================================
  // COMPOSIÇÃO
  // ============================================================

  const carregarComposicao = useCallback(async (
    turmaId: string,
    periodo: number,
    numeroNota: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Buscar composição existente
      const { data: comp, error: compError } = await supabase
        .from('composicao_nota')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('periodo', periodo)
        .eq('numero_nota', numeroNota)
        .single();

      if (compError && compError.code !== 'PGRST116') {
        throw compError;
      }

      if (comp) {
        setComposicao(comp);

        // Buscar componentes
        const { data: comps, error: compsError } = await supabase
          .from('composicao_componentes')
          .select('*')
          .eq('composicao_id', comp.id)
          .order('ordem');

        if (compsError) throw compsError;
        setComponentes(comps || []);
      } else {
        setComposicao(null);
        setComponentes([]);
      }
    } catch (err) {
      console.error('Erro ao carregar composição:', err);
      setError('Erro ao carregar composição');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const criarComposicao = useCallback(async (dados: NovaComposicao): Promise<string | null> => {
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error: insertError } = await supabase
        .from('composicao_nota')
        .insert({
          usuario_id: user.user.id,
          turma_id: dados.turma_id,
          periodo: dados.periodo,
          numero_nota: dados.numero_nota,
          nome: dados.nome,
          tipo_calculo: dados.tipo_calculo
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setComposicao(data);
      return data.id;
    } catch (err) {
      console.error('Erro ao criar composição:', err);
      setError('Erro ao criar composição');
      return null;
    }
  }, [supabase]);

  const atualizarTipoCalculo = useCallback(async (
    composicaoId: string,
    tipo: TipoCalculo
  ): Promise<boolean> => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('composicao_nota')
        .update({ tipo_calculo: tipo, updated_at: new Date().toISOString() })
        .eq('id', composicaoId);

      if (updateError) throw updateError;

      setComposicao(prev => prev ? { ...prev, tipo_calculo: tipo } : null);
      return true;
    } catch (err) {
      console.error('Erro ao atualizar tipo de cálculo:', err);
      setError('Erro ao atualizar tipo de cálculo');
      return false;
    }
  }, [supabase]);

  const copiarComposicao = useCallback(async (
    composicaoId: string,
    paraPeriodos: number[]
  ): Promise<boolean> => {
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Buscar composição original com componentes
      const { data: original, error: origError } = await supabase
        .from('composicao_nota')
        .select('*')
        .eq('id', composicaoId)
        .single();

      if (origError) throw origError;

      const { data: compsOriginal, error: compsError } = await supabase
        .from('composicao_componentes')
        .select('*')
        .eq('composicao_id', composicaoId)
        .order('ordem');

      if (compsError) throw compsError;

      // Criar cópias para cada período
      for (const periodo of paraPeriodos) {
        // Verificar se já existe
        const { data: existe } = await supabase
          .from('composicao_nota')
          .select('id')
          .eq('turma_id', original.turma_id)
          .eq('periodo', periodo)
          .eq('numero_nota', original.numero_nota)
          .single();

        if (existe) continue; // Pular se já existe

        // Criar composição
        const { data: novaComp, error: novaError } = await supabase
          .from('composicao_nota')
          .insert({
            usuario_id: user.user.id,
            turma_id: original.turma_id,
            periodo: periodo,
            numero_nota: original.numero_nota,
            nome: original.nome,
            tipo_calculo: original.tipo_calculo
          })
          .select()
          .single();

        if (novaError) throw novaError;

        // Copiar componentes
        if (compsOriginal && compsOriginal.length > 0) {
          const novosComps = compsOriginal.map(c => ({
            composicao_id: novaComp.id,
            nome: c.nome,
            tipo: c.tipo,
            peso: c.peso,
            simulado_id: null, // Não copiar simulado específico
            ordem: c.ordem
          }));

          const { error: compsInsertError } = await supabase
            .from('composicao_componentes')
            .insert(novosComps);

          if (compsInsertError) throw compsInsertError;
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao copiar composição:', err);
      setError('Erro ao copiar composição');
      return false;
    }
  }, [supabase]);

  // ============================================================
  // COMPONENTES
  // ============================================================

  const adicionarComponente = useCallback(async (
    composicaoId: string,
    componente: NovoComponente
  ): Promise<boolean> => {
    setError(null);

    try {
      const ordem = componentes.length;

      const { data, error: insertError } = await supabase
        .from('composicao_componentes')
        .insert({
          composicao_id: composicaoId,
          nome: componente.nome,
          tipo: componente.tipo,
          peso: componente.peso,
          simulado_id: componente.simulado_id || null,
          ordem: componente.ordem ?? ordem
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setComponentes(prev => [...prev, data]);
      return true;
    } catch (err) {
      console.error('Erro ao adicionar componente:', err);
      setError('Erro ao adicionar componente');
      return false;
    }
  }, [supabase, componentes.length]);

  const atualizarComponente = useCallback(async (
    componenteId: string,
    dados: Partial<NovoComponente>
  ): Promise<boolean> => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('composicao_componentes')
        .update(dados)
        .eq('id', componenteId);

      if (updateError) throw updateError;

      setComponentes(prev =>
        prev.map(c => c.id === componenteId ? { ...c, ...dados } : c)
      );
      return true;
    } catch (err) {
      console.error('Erro ao atualizar componente:', err);
      setError('Erro ao atualizar componente');
      return false;
    }
  }, [supabase]);

  const removerComponente = useCallback(async (componenteId: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('composicao_componentes')
        .delete()
        .eq('id', componenteId);

      if (deleteError) throw deleteError;

      setComponentes(prev => prev.filter(c => c.id !== componenteId));
      return true;
    } catch (err) {
      console.error('Erro ao remover componente:', err);
      setError('Erro ao remover componente');
      return false;
    }
  }, [supabase]);

  const reordenarComponentes = useCallback(async (componenteIds: string[]): Promise<boolean> => {
    setError(null);

    try {
      for (let i = 0; i < componenteIds.length; i++) {
        await supabase
          .from('composicao_componentes')
          .update({ ordem: i })
          .eq('id', componenteIds[i]);
      }

      setComponentes(prev => {
        const ordenados = [...prev].sort((a, b) => {
          return componenteIds.indexOf(a.id) - componenteIds.indexOf(b.id);
        });
        return ordenados.map((c, i) => ({ ...c, ordem: i }));
      });

      return true;
    } catch (err) {
      console.error('Erro ao reordenar componentes:', err);
      setError('Erro ao reordenar componentes');
      return false;
    }
  }, [supabase]);

  // ============================================================
  // NOTAS
  // ============================================================

  const carregarNotasAlunos = useCallback(async (
    turmaId: string,
    composicaoId: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Buscar alunos da turma
      const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, possui_laudo, tipo_laudo')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome');

      if (alunosError) throw alunosError;

      // Buscar componentes
      const { data: comps, error: compsError } = await supabase
        .from('composicao_componentes')
        .select('id')
        .eq('composicao_id', composicaoId);

      if (compsError) throw compsError;

      const componenteIds = (comps || []).map(c => c.id);

      // Buscar notas
      const { data: notas, error: notasError } = await supabase
        .from('notas_componente')
        .select('*')
        .in('componente_id', componenteIds.length > 0 ? componenteIds : ['00000000-0000-0000-0000-000000000000']);

      if (notasError) throw notasError;

      // Buscar composição para tipo de cálculo
      const { data: comp } = await supabase
        .from('composicao_nota')
        .select('tipo_calculo')
        .eq('id', composicaoId)
        .single();

      // Buscar componentes com pesos
      const { data: compsComPeso } = await supabase
        .from('composicao_componentes')
        .select('id, peso')
        .eq('composicao_id', composicaoId);

      const mediaAprovacao = 6.0;

      // Montar dados dos alunos
      const alunosData: AlunoNotasDetalhadas[] = (alunos || []).map(aluno => {
        const notasAluno = (notas || []).filter(n => n.aluno_id === aluno.id);

        // Montar notas por componente
        const notasComponentes: Record<string, number | null> = {};
        notasAluno.forEach(n => {
          notasComponentes[n.componente_id] = n.valor;
        });

        // Calcular média
        let mediaCalculada: number | null = null;
        const notasValidas = notasAluno.filter(n => n.valor !== null);

        if (notasValidas.length > 0 && compsComPeso) {
          if (comp?.tipo_calculo === 'simples') {
            const soma = notasValidas.reduce((acc, n) => acc + (n.valor || 0), 0);
            mediaCalculada = soma / notasValidas.length;
          } else {
            // Ponderada
            let somaValores = 0;
            let somaPesos = 0;
            notasValidas.forEach(n => {
              const componente = compsComPeso.find(c => c.id === n.componente_id);
              if (componente) {
                somaValores += (n.valor || 0) * componente.peso;
                somaPesos += componente.peso;
              }
            });
            if (somaPesos > 0) {
              mediaCalculada = somaValores / somaPesos;
            }
          }
          if (mediaCalculada !== null) {
            mediaCalculada = Math.round(mediaCalculada * 100) / 100;
          }
        }

        // Determinar situação
        let situacao = 'cursando';
        if (mediaCalculada !== null) {
          situacao = mediaCalculada >= mediaAprovacao ? 'aprovado' : 'recuperacao';
        }

        return {
          id: aluno.id,
          nome: aluno.nome,
          matricula: aluno.matricula,
          possui_laudo: aluno.possui_laudo || false,
          tipo_laudo: aluno.tipo_laudo,
          notas_componentes: notasComponentes,
          media_calculada: mediaCalculada,
          situacao
        };
      });

      setAlunosNotas(alunosData);
    } catch (err) {
      console.error('Erro ao carregar notas:', err);
      setError('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const lancarNota = useCallback(async (dados: LancarNotaComponente): Promise<boolean> => {
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from('notas_componente')
        .upsert({
          aluno_id: dados.aluno_id,
          componente_id: dados.componente_id,
          valor: dados.valor,
          observacao: dados.observacao || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id,componente_id'
        });

      if (upsertError) throw upsertError;

      // Atualizar estado local
      setAlunosNotas(prev =>
        prev.map(a =>
          a.id === dados.aluno_id
            ? {
                ...a,
                notas_componentes: {
                  ...a.notas_componentes,
                  [dados.componente_id]: dados.valor
                }
              }
            : a
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao lançar nota:', err);
      setError('Erro ao lançar nota');
      return false;
    }
  }, [supabase]);

  const lancarNotasEmLote = useCallback(async (notas: LancarNotaComponente[]): Promise<boolean> => {
    setError(null);

    try {
      const notasParaUpsert = notas.map(n => ({
        aluno_id: n.aluno_id,
        componente_id: n.componente_id,
        valor: n.valor,
        observacao: n.observacao || null,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabase
        .from('notas_componente')
        .upsert(notasParaUpsert, {
          onConflict: 'aluno_id,componente_id'
        });

      if (upsertError) throw upsertError;

      return true;
    } catch (err) {
      console.error('Erro ao lançar notas em lote:', err);
      setError('Erro ao lançar notas');
      return false;
    }
  }, [supabase]);

  const calcularMedia = useCallback(async (
    alunoId: string,
    composicaoId: string
  ): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .rpc('calcular_media_composicao', {
          p_aluno_id: alunoId,
          p_composicao_id: composicaoId
        });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao calcular média:', err);
      return null;
    }
  }, [supabase]);

  const recalcularTodasMedias = useCallback(async (
    turmaId: string,
    composicaoId: string
  ): Promise<boolean> => {
    try {
      await carregarNotasAlunos(turmaId, composicaoId);
      return true;
    } catch (err) {
      console.error('Erro ao recalcular médias:', err);
      return false;
    }
  }, [carregarNotasAlunos]);

  // ============================================================
  // SIMULADOS
  // ============================================================

  const carregarSimulados = useCallback(async (turmaId: string) => {
    try {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, nome, data_aplicacao')
        .eq('turma_id', turmaId)
        .order('data_aplicacao', { ascending: false });

      if (error) throw error;
      setSimulados(data || []);
    } catch (err) {
      console.error('Erro ao carregar simulados:', err);
      setSimulados([]);
    }
  }, [supabase]);

  return {
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
    reordenarComponentes,
    carregarNotasAlunos,
    lancarNota,
    lancarNotasEmLote,
    calcularMedia,
    recalcularTodasMedias,
    carregarSimulados,
    limparErro
  };
}
