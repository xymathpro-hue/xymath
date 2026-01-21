// ============================================================
// XYMATH - HOOK PARA SISTEMA DE NOTAS
// src/hooks/useNotas.ts
// ============================================================

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { 
  ConfiguracaoNotas,
  UpsertConfiguracaoNotas,
  AlunoComNotas,
  LancarNota,
  SituacaoAluno
} from '@/types/notas';

interface UseNotasReturn {
  // Estados
  configuracao: ConfiguracaoNotas | null;
  alunosComNotas: AlunoComNotas[];
  loading: boolean;
  error: string | null;
  
  // Funções
  carregarConfiguracao: () => Promise<void>;
  salvarConfiguracao: (config: UpsertConfiguracaoNotas) => Promise<boolean>;
  carregarNotasTurma: (turmaId: string, periodo: number) => Promise<void>;
  lancarNota: (dados: LancarNota) => Promise<boolean>;
  lancarNotasEmLote: (notas: LancarNota[]) => Promise<boolean>;
  calcularMediaPeriodo: (alunoId: string, turmaId: string, periodo: number) => Promise<number | null>;
  atualizarSituacao: (alunoId: string, turmaId: string, periodo: number, situacao: SituacaoAluno) => Promise<boolean>;
  limparErro: () => void;
}

export function useNotas(): UseNotasReturn {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoNotas | null>(null);
  const [alunosComNotas, setAlunosComNotas] = useState<AlunoComNotas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const limparErro = useCallback(() => setError(null), []);

  // Carregar configuração do usuário
  const carregarConfiguracao = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('configuracao_notas')
        .select('*')
        .eq('usuario_id', user.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setConfiguracao(data);
      } else {
        // Criar configuração padrão
        const configPadrao: UpsertConfiguracaoNotas = {
          tipo_divisao: 'bimestral',
          notas_por_periodo: 2,
          media_aprovacao: 6.0,
          tem_recuperacao_paralela: true,
          tem_prova_final: true
        };

        const { data: novaConfig, error: insertError } = await supabase
          .from('configuracao_notas')
          .insert({
            usuario_id: user.user.id,
            ...configPadrao
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfiguracao(novaConfig);
      }
    } catch (err) {
      console.error('Erro ao carregar configuração:', err);
      setError('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Salvar configuração
  const salvarConfiguracao = useCallback(async (config: UpsertConfiguracaoNotas): Promise<boolean> => {
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error: upsertError } = await supabase
        .from('configuracao_notas')
        .upsert({
          usuario_id: user.user.id,
          ...config,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usuario_id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      setConfiguracao(data);
      return true;
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      setError('Erro ao salvar configuração');
      return false;
    }
  }, [supabase]);

  // Carregar notas de uma turma em um período
  const carregarNotasTurma = useCallback(async (turmaId: string, periodo: number) => {
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

      // Buscar notas do período (tabela notas_periodo)
      const { data: notas, error: notasError } = await supabase
        .from('notas_periodo')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('periodo', periodo);

      if (notasError) throw notasError;

      // Buscar médias do período
      const { data: medias, error: mediasError } = await supabase
        .from('medias_periodo')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('periodo', periodo);

      if (mediasError && mediasError.code !== 'PGRST116') {
        throw mediasError;
      }

      // Montar dados dos alunos com notas
      const alunosComNotasData: AlunoComNotas[] = (alunos || []).map(aluno => {
        const notasAluno = (notas || []).filter(n => n.aluno_id === aluno.id);
        const mediaAluno = (medias || [])?.find(m => m.aluno_id === aluno.id);

        // Montar objeto de notas por numero_nota
        const notasObj: Record<number, number | null> = {};
        notasAluno.forEach(n => {
          notasObj[n.numero_nota] = n.valor;
        });

        return {
          id: aluno.id,
          nome: aluno.nome,
          matricula: aluno.matricula,
          possui_laudo: aluno.possui_laudo || false,
          tipo_laudo: aluno.tipo_laudo,
          notas: notasObj,
          media_atividades: null,
          media_periodo: mediaAluno?.media || null,
          situacao: (mediaAluno?.situacao as SituacaoAluno) || 'cursando'
        };
      });

      setAlunosComNotas(alunosComNotasData);
    } catch (err) {
      console.error('Erro ao carregar notas:', err);
      setError('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Lançar nota individual
  const lancarNota = useCallback(async (dados: LancarNota): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: upsertError } = await supabase
        .from('notas_periodo')
        .upsert({
          aluno_id: dados.aluno_id,
          turma_id: dados.turma_id,
          periodo: dados.periodo,
          numero_nota: dados.numero_nota,
          valor: dados.nota,
          observacao: dados.observacao || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id,turma_id,periodo,numero_nota'
        });

      if (upsertError) throw upsertError;

      // Atualizar estado local
      setAlunosComNotas(prev => 
        prev.map(a => 
          a.id === dados.aluno_id 
            ? { 
                ...a, 
                notas: { 
                  ...a.notas, 
                  [dados.numero_nota]: dados.nota 
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

  // Lançar notas em lote
  const lancarNotasEmLote = useCallback(async (notas: LancarNota[]): Promise<boolean> => {
    setError(null);
    
    try {
      const notasParaUpsert = notas.map(n => ({
        aluno_id: n.aluno_id,
        turma_id: n.turma_id,
        periodo: n.periodo,
        numero_nota: n.numero_nota,
        valor: n.nota,
        observacao: n.observacao || null,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabase
        .from('notas_periodo')
        .upsert(notasParaUpsert, {
          onConflict: 'aluno_id,turma_id,periodo,numero_nota'
        });

      if (upsertError) throw upsertError;

      return true;
    } catch (err) {
      console.error('Erro ao lançar notas em lote:', err);
      setError('Erro ao lançar notas');
      return false;
    }
  }, [supabase]);

  // Calcular média do período
  const calcularMediaPeriodo = useCallback(async (
    alunoId: string, 
    turmaId: string, 
    periodo: number
  ): Promise<number | null> => {
    try {
      // Buscar configuração atualizada do banco
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: configAtual } = await supabase
        .from('configuracao_notas')
        .select('notas_por_periodo, media_aprovacao')
        .eq('usuario_id', user.user.id)
        .single();

      const notasPorPeriodo = configAtual?.notas_por_periodo || 2;
      const mediaAprovacao = configAtual?.media_aprovacao || 6.0;

      // Buscar notas do aluno no período
      const { data: notas, error: notasError } = await supabase
        .from('notas_periodo')
        .select('valor')
        .eq('aluno_id', alunoId)
        .eq('turma_id', turmaId)
        .eq('periodo', periodo)
        .not('valor', 'is', null);

      if (notasError) throw notasError;

      if (!notas || notas.length === 0) return null;

      const soma = notas.reduce((acc, n) => acc + (n.valor || 0), 0);
      const media = soma / notasPorPeriodo;

      // Salvar média
      const situacao: SituacaoAluno = media >= mediaAprovacao ? 'aprovado' : 'recuperacao';

      await supabase
        .from('medias_periodo')
        .upsert({
          aluno_id: alunoId,
          turma_id: turmaId,
          periodo: periodo,
          media: Math.round(media * 100) / 100,
          situacao: situacao,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id,turma_id,periodo'
        });

      return Math.round(media * 100) / 100;
    } catch (err) {
      console.error('Erro ao calcular média:', err);
      return null;
    }
  }, [supabase]);

  // Atualizar situação do aluno
  const atualizarSituacao = useCallback(async (
    alunoId: string,
    turmaId: string,
    periodo: number,
    situacao: SituacaoAluno
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('medias_periodo')
        .upsert({
          aluno_id: alunoId,
          turma_id: turmaId,
          periodo: periodo,
          situacao: situacao,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id,turma_id,periodo'
        });

      if (updateError) throw updateError;

      // Atualizar estado local
      setAlunosComNotas(prev => 
        prev.map(a => 
          a.id === alunoId ? { ...a, situacao } : a
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar situação:', err);
      setError('Erro ao atualizar situação');
      return false;
    }
  }, [supabase]);

  return {
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
    atualizarSituacao,
    limparErro
  };
}
