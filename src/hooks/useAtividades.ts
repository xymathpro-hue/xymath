// ============================================================
// XYMATH - HOOK PARA CONTROLE DE ATIVIDADES
// src/hooks/useAtividades.ts
// ============================================================

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { 
  Atividade, 
  NovaAtividade, 
  AtividadeEntrega,
  LancarEntrega,
  AtividadeComEstatisticas,
  AlunoComEntrega,
  StatusEntrega
} from '@/types/atividades';

interface UseAtividadesReturn {
  // Estados
  atividades: AtividadeComEstatisticas[];
  atividadeAtual: Atividade | null;
  alunosComEntrega: AlunoComEntrega[];
  loading: boolean;
  error: string | null;
  
  // Funções de Atividades
  carregarAtividades: (turmaId: string, bimestre?: number) => Promise<void>;
  criarAtividade: (atividade: NovaAtividade) => Promise<boolean>;
  editarAtividade: (id: string, dados: Partial<NovaAtividade>) => Promise<boolean>;
  excluirAtividade: (id: string) => Promise<boolean>;
  
  // Funções de Entregas
  carregarEntregas: (atividadeId: string) => Promise<void>;
  lancarEntrega: (entrega: LancarEntrega) => Promise<boolean>;
  lancarEntregasEmLote: (atividadeId: string, entregas: LancarEntrega[]) => Promise<boolean>;
  
  // Utilitários
  limparErro: () => void;
}

export function useAtividades(): UseAtividadesReturn {
  const [atividades, setAtividades] = useState<AtividadeComEstatisticas[]>([]);
  const [atividadeAtual, setAtividadeAtual] = useState<Atividade | null>(null);
  const [alunosComEntrega, setAlunosComEntrega] = useState<AlunoComEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Limpar erro
  const limparErro = useCallback(() => setError(null), []);

  // Carregar atividades de uma turma
  const carregarAtividades = useCallback(async (turmaId: string, bimestre?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('atividades')
        .select(`
          *,
          turmas (nome)
        `)
        .eq('turma_id', turmaId)
        .order('data_entrega', { ascending: false, nullsFirst: false });

      if (bimestre) {
        query = query.eq('bimestre', bimestre);
      }

      const { data: atividadesData, error: atividadesError } = await query;

      if (atividadesError) throw atividadesError;

      // Buscar estatísticas de cada atividade
      const atividadesComStats: AtividadeComEstatisticas[] = await Promise.all(
        (atividadesData || []).map(async (atividade: any) => {
          // Contar alunos da turma
          const { count: totalAlunos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('turma_id', turmaId)
            .eq('ativo', true);

          // Buscar entregas desta atividade
          const { data: entregas } = await supabase
            .from('atividade_entregas')
            .select('status')
            .eq('atividade_id', atividade.id);

          const entregues = entregas?.filter(e => e.status === 'entregue').length || 0;
          const atrasados = entregas?.filter(e => e.status === 'atrasado').length || 0;
          const naoEntregues = entregas?.filter(e => e.status === 'nao_entregue').length || 0;
          const pendentes = (totalAlunos || 0) - entregues - atrasados - naoEntregues;

          return {
            ...atividade,
            turma_nome: atividade.turmas?.nome,
            total_alunos: totalAlunos || 0,
            entregues,
            atrasados,
            nao_entregues: naoEntregues,
            pendentes,
            percentual_entrega: totalAlunos 
              ? Math.round(((entregues + atrasados) / totalAlunos) * 100) 
              : 0
          };
        })
      );

      setAtividades(atividadesComStats);
    } catch (err) {
      console.error('Erro ao carregar atividades:', err);
      setError('Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Criar nova atividade
  const criarAtividade = useCallback(async (atividade: NovaAtividade): Promise<boolean> => {
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error: insertError } = await supabase
        .from('atividades')
        .insert({
          usuario_id: user.user.id,
          turma_id: atividade.turma_id,
          titulo: atividade.titulo,
          descricao: atividade.descricao || null,
          tipo: atividade.tipo,
          data_entrega: atividade.data_entrega || null,
          valor: atividade.valor,
          bimestre: atividade.bimestre || null
        });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Erro ao criar atividade:', err);
      setError('Erro ao criar atividade');
      return false;
    }
  }, [supabase]);

  // Editar atividade
  const editarAtividade = useCallback(async (
    id: string, 
    dados: Partial<NovaAtividade>
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('atividades')
        .update({
          titulo: dados.titulo,
          descricao: dados.descricao,
          tipo: dados.tipo,
          data_entrega: dados.data_entrega,
          valor: dados.valor,
          bimestre: dados.bimestre,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Erro ao editar atividade:', err);
      setError('Erro ao editar atividade');
      return false;
    }
  }, [supabase]);

  // Excluir atividade
  const excluirAtividade = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('atividades')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setAtividades(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      console.error('Erro ao excluir atividade:', err);
      setError('Erro ao excluir atividade');
      return false;
    }
  }, [supabase]);

  // Carregar alunos com entregas de uma atividade
  const carregarEntregas = useCallback(async (atividadeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar atividade
      const { data: atividade, error: atividadeError } = await supabase
        .from('atividades')
        .select('*')
        .eq('id', atividadeId)
        .single();

      if (atividadeError) throw atividadeError;
      setAtividadeAtual(atividade);

      // Buscar alunos da turma
      const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, possui_laudo, tipo_laudo')
        .eq('turma_id', atividade.turma_id)
        .eq('ativo', true)
        .order('nome');

      if (alunosError) throw alunosError;

      // Buscar entregas existentes
      const { data: entregas, error: entregasError } = await supabase
        .from('atividade_entregas')
        .select('*')
        .eq('atividade_id', atividadeId);

      if (entregasError) throw entregasError;

      // Combinar alunos com entregas
      const alunosComEntregaData: AlunoComEntrega[] = (alunos || []).map(aluno => ({
        ...aluno,
        entrega: entregas?.find(e => e.aluno_id === aluno.id) || null
      }));

      setAlunosComEntrega(alunosComEntregaData);
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      setError('Erro ao carregar entregas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Lançar entrega individual
  const lancarEntrega = useCallback(async (entrega: LancarEntrega): Promise<boolean> => {
    setError(null);
    
    try {
      // Usar upsert para criar ou atualizar
      const { error: upsertError } = await supabase
        .from('atividade_entregas')
        .upsert({
          atividade_id: entrega.atividade_id,
          aluno_id: entrega.aluno_id,
          status: entrega.status,
          nota: entrega.nota ?? null,
          observacao: entrega.observacao ?? null,
          data_entrega_real: entrega.status === 'entregue' || entrega.status === 'atrasado' 
            ? new Date().toISOString().split('T')[0] 
            : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'atividade_id,aluno_id'
        });

      if (upsertError) throw upsertError;

      // Atualizar estado local
      setAlunosComEntrega(prev => 
        prev.map(a => 
          a.id === entrega.aluno_id 
            ? { 
                ...a, 
                entrega: {
                  id: a.entrega?.id || '',
                  atividade_id: entrega.atividade_id,
                  aluno_id: entrega.aluno_id,
                  status: entrega.status,
                  nota: entrega.nota ?? null,
                  data_entrega_real: new Date().toISOString().split('T')[0],
                  observacao: entrega.observacao ?? null,
                  created_at: a.entrega?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              } 
            : a
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao lançar entrega:', err);
      setError('Erro ao lançar entrega');
      return false;
    }
  }, [supabase]);

  // Lançar entregas em lote
  const lancarEntregasEmLote = useCallback(async (
    atividadeId: string, 
    entregas: LancarEntrega[]
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const entregasParaUpsert = entregas.map(e => ({
        atividade_id: atividadeId,
        aluno_id: e.aluno_id,
        status: e.status,
        nota: e.nota ?? null,
        observacao: e.observacao ?? null,
        data_entrega_real: e.status === 'entregue' || e.status === 'atrasado' 
          ? new Date().toISOString().split('T')[0] 
          : null,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabase
        .from('atividade_entregas')
        .upsert(entregasParaUpsert, {
          onConflict: 'atividade_id,aluno_id'
        });

      if (upsertError) throw upsertError;

      return true;
    } catch (err) {
      console.error('Erro ao lançar entregas em lote:', err);
      setError('Erro ao lançar entregas');
      return false;
    }
  }, [supabase]);

  return {
    atividades,
    atividadeAtual,
    alunosComEntrega,
    loading,
    error,
    carregarAtividades,
    criarAtividade,
    editarAtividade,
    excluirAtividade,
    carregarEntregas,
    lancarEntrega,
    lancarEntregasEmLote,
    limparErro
  };
}
