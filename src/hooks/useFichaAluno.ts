// ============================================================
// XYMATH - HOOK PARA FICHA DO ALUNO
// src/hooks/useFichaAluno.ts
// ============================================================

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { 
  FichaAluno, 
  AlunoAnotacao, 
  NovaAnotacao, 
  AtualizarAlunoPedagogico,
  TipoAnotacao
} from '@/types/ficha-aluno';

interface UseFichaAlunoReturn {
  // Estados
  ficha: FichaAluno | null;
  anotacoes: AlunoAnotacao[];
  loading: boolean;
  error: string | null;
  
  // Funções
  carregarFicha: (alunoId: string) => Promise<void>;
  atualizarDadosPedagogicos: (alunoId: string, dados: AtualizarAlunoPedagogico) => Promise<boolean>;
  adicionarAnotacao: (anotacao: NovaAnotacao) => Promise<boolean>;
  editarAnotacao: (anotacaoId: string, texto: string, tipo: TipoAnotacao) => Promise<boolean>;
  excluirAnotacao: (anotacaoId: string) => Promise<boolean>;
  carregarMaisAnotacoes: (alunoId: string, offset: number) => Promise<void>;
}

export function useFichaAluno(): UseFichaAlunoReturn {
  const [ficha, setFicha] = useState<FichaAluno | null>(null);
  const [anotacoes, setAnotacoes] = useState<AlunoAnotacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Carregar ficha completa do aluno
  const carregarFicha = useCallback(async (alunoId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar dados do aluno
      const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select(`
          id,
          nome,
          matricula,
          email,
          turma_id,
          possui_laudo,
          tipo_laudo,
          observacoes_pedagogicas,
          created_at,
          updated_at,
          turmas (
            id,
            nome,
            ano_serie
          )
        `)
        .eq('id', alunoId)
        .single();

      if (alunoError) throw alunoError;

      // Buscar anotações
      const { data: anotacoesData, error: anotacoesError } = await supabase
        .from('aluno_anotacoes')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (anotacoesError) throw anotacoesError;

      // Montar objeto da ficha
      const turmaData = aluno.turmas as any;
      const fichaCompleta: FichaAluno = {
        aluno: {
          id: aluno.id,
          nome: aluno.nome,
          matricula: aluno.matricula,
          email: aluno.email,
          turma_id: aluno.turma_id,
          possui_laudo: aluno.possui_laudo || false,
          tipo_laudo: aluno.tipo_laudo,
          observacoes_pedagogicas: aluno.observacoes_pedagogicas,
          created_at: aluno.created_at,
          updated_at: aluno.updated_at
        },
        turma: {
          id: turmaData.id,
          nome: turmaData.nome,
          ano_serie: turmaData.ano_serie
        },
        anotacoes: anotacoesData || [],
        estatisticas: {
          total_anotacoes: anotacoesData?.length || 0
        }
      };

      setFicha(fichaCompleta);
      setAnotacoes(anotacoesData || []);
    } catch (err) {
      console.error('Erro ao carregar ficha:', err);
      setError('Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Atualizar dados pedagógicos do aluno
  const atualizarDadosPedagogicos = useCallback(async (
    alunoId: string, 
    dados: AtualizarAlunoPedagogico
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('alunos')
        .update({
          possui_laudo: dados.possui_laudo,
          tipo_laudo: dados.tipo_laudo,
          observacoes_pedagogicas: dados.observacoes_pedagogicas,
          updated_at: new Date().toISOString()
        })
        .eq('id', alunoId);

      if (updateError) throw updateError;

      // Atualizar estado local
      if (ficha) {
        setFicha({
          ...ficha,
          aluno: {
            ...ficha.aluno,
            ...dados,
            updated_at: new Date().toISOString()
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Erro ao atualizar dados pedagógicos:', err);
      setError('Erro ao salvar alterações');
      return false;
    }
  }, [supabase, ficha]);

  // Adicionar nova anotação
  const adicionarAnotacao = useCallback(async (anotacao: NovaAnotacao): Promise<boolean> => {
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data: novaAnotacao, error: insertError } = await supabase
        .from('aluno_anotacoes')
        .insert({
          aluno_id: anotacao.aluno_id,
          usuario_id: user.user.id,
          texto: anotacao.texto,
          tipo: anotacao.tipo
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Adicionar ao início da lista
      setAnotacoes(prev => [novaAnotacao, ...prev]);
      
      // Atualizar estatísticas
      if (ficha) {
        setFicha({
          ...ficha,
          estatisticas: {
            ...ficha.estatisticas,
            total_anotacoes: ficha.estatisticas.total_anotacoes + 1
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Erro ao adicionar anotação:', err);
      setError('Erro ao salvar anotação');
      return false;
    }
  }, [supabase, ficha]);

  // Editar anotação existente
  const editarAnotacao = useCallback(async (
    anotacaoId: string, 
    texto: string,
    tipo: TipoAnotacao
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('aluno_anotacoes')
        .update({ 
          texto, 
          tipo,
          updated_at: new Date().toISOString() 
        })
        .eq('id', anotacaoId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setAnotacoes(prev => 
        prev.map(a => 
          a.id === anotacaoId 
            ? { ...a, texto, tipo, updated_at: new Date().toISOString() } 
            : a
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao editar anotação:', err);
      setError('Erro ao editar anotação');
      return false;
    }
  }, [supabase]);

  // Excluir anotação
  const excluirAnotacao = useCallback(async (anotacaoId: string): Promise<boolean> => {
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('aluno_anotacoes')
        .delete()
        .eq('id', anotacaoId);

      if (deleteError) throw deleteError;

      // Remover do estado local
      setAnotacoes(prev => prev.filter(a => a.id !== anotacaoId));
      
      // Atualizar estatísticas
      if (ficha) {
        setFicha({
          ...ficha,
          estatisticas: {
            ...ficha.estatisticas,
            total_anotacoes: ficha.estatisticas.total_anotacoes - 1
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Erro ao excluir anotação:', err);
      setError('Erro ao excluir anotação');
      return false;
    }
  }, [supabase, ficha]);

  // Carregar mais anotações (paginação)
  const carregarMaisAnotacoes = useCallback(async (alunoId: string, offset: number) => {
    try {
      const { data: maisAnotacoes, error: fetchError } = await supabase
        .from('aluno_anotacoes')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false })
        .range(offset, offset + 19);

      if (fetchError) throw fetchError;

      if (maisAnotacoes && maisAnotacoes.length > 0) {
        setAnotacoes(prev => [...prev, ...maisAnotacoes]);
      }
    } catch (err) {
      console.error('Erro ao carregar mais anotações:', err);
      setError('Erro ao carregar mais anotações');
    }
  }, [supabase]);

  return {
    ficha,
    anotacoes,
    loading,
    error,
    carregarFicha,
    atualizarDadosPedagogicos,
    adicionarAnotacao,
    editarAnotacao,
    excluirAnotacao,
    carregarMaisAnotacoes
  };
}
