// ============================================================
// XYMATH - TIPOS PARA COMPOSIÇÃO DE NOTAS
// src/types/composicao-notas.ts
// ============================================================

// Tipo de cálculo da média
export type TipoCalculo = 'simples' | 'ponderada';

// Tipo de componente
export type TipoComponente = 'manual' | 'simulado' | 'atividades';

// Composição da nota (N1, N2, etc)
export interface ComposicaoNota {
  id: string;
  usuario_id: string;
  turma_id: string;
  periodo: number;
  numero_nota: number;
  nome: string;
  tipo_calculo: TipoCalculo;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  componentes?: ComposicaoComponente[];
}

// Componente da composição
export interface ComposicaoComponente {
  id: string;
  composicao_id: string;
  nome: string;
  tipo: TipoComponente;
  peso: number;
  simulado_id: string | null;
  ordem: number;
  created_at: string;
}

// Nota de um componente
export interface NotaComponente {
  id: string;
  aluno_id: string;
  componente_id: string;
  valor: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

// Para criar composição
export interface NovaComposicao {
  turma_id: string;
  periodo: number;
  numero_nota: number;
  nome: string;
  tipo_calculo: TipoCalculo;
}

// Para criar componente
export interface NovoComponente {
  nome: string;
  tipo: TipoComponente;
  peso: number;
  simulado_id?: string;
  ordem?: number;
}

// Para lançar nota de componente
export interface LancarNotaComponente {
  aluno_id: string;
  componente_id: string;
  valor: number;
  observacao?: string;
}

// Aluno com notas detalhadas por componente
export interface AlunoNotasDetalhadas {
  id: string;
  nome: string;
  matricula: string | null;
  possui_laudo: boolean;
  tipo_laudo: string | null;
  notas_componentes: Record<string, number | null>; // componente_id -> valor
  media_calculada: number | null;
  situacao: string;
}

// Simulado para seleção
export interface SimuladoOpcao {
  id: string;
  nome: string;
  data_aplicacao: string | null;
}

// Config do tipo de componente para UI
export const TIPOS_COMPONENTE: Record<TipoComponente, {
  label: string;
  descricao: string;
  icone: string;
  cor: string;
  automatico: boolean;
}> = {
  manual: {
    label: 'Avaliação Manual',
    descricao: 'Nota digitada manualmente (prova de rede, trabalho, etc)',
    icone: 'Edit',
    cor: 'text-blue-600',
    automatico: false
  },
  simulado: {
    label: 'Simulado xyMath',
    descricao: 'Nota importada automaticamente do simulado',
    icone: 'FileText',
    cor: 'text-purple-600',
    automatico: true
  },
  atividades: {
    label: 'Média das Atividades',
    descricao: 'Calcula automaticamente a média das atividades do bimestre',
    icone: 'Calculator',
    cor: 'text-green-600',
    automatico: true
  }
};

// Labels dos tipos de cálculo
export const TIPOS_CALCULO: Record<TipoCalculo, {
  label: string;
  descricao: string;
  formula: string;
}> = {
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
