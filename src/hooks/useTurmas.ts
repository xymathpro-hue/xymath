// ============================================================
// XYMATH - HOOK PARA TURMAS
// src/hooks/useTurmas.ts
// ============================================================

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  ano_serie: string | null;
  turno: string | null;
  ativa: boolean;
  created_at: string;
}

interface UseTurmasReturn {
  turmas: Turma[];
  loading: boolean;
  error: string | null;
  carregarTurmas: () => Promise<void>;
  getTurmaById: (id: string) => Turma | undefined;
}

export function useTurmas(): UseTurmasReturn {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const carregarTurmas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('turmas')
        .select('*')
        .eq('usuario_id', user.user.id)
        .eq('ativa', true)
        .order('ano_letivo', { ascending: false })
        .order('nome');

      if (fetchError) throw fetchError;

      setTurmas(data || []);
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
      setError('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getTurmaById = useCallback((id: string): Turma | undefined => {
    return turmas.find(t => t.id === id);
  }, [turmas]);

  return {
    turmas,
    loading,
    error,
    carregarTurmas,
    getTurmaById
  };
}
