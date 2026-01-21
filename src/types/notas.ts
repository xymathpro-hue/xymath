// ============================================================
// XYMATH - TIPOS PARA SISTEMA DE NOTAS
// src/types/notas.ts
// ============================================================

// Tipo de divisão do ano letivo
export type TipoDivisao = 'bimestral' | 'trimestral';

// Situação do aluno no período
export type SituacaoAluno = 'cursando' | 'aprovado' | 'recuperacao' | 'reprovado';

// Tipos de componentes de nota
export type TipoComponente = 
  | 'simulado'
  | 'rede'
  | 'atividades_media'
  | 'atividades_soma'
  | 'manual'
  | 'participacao';

// Configuração de notas do usuário
export interface ConfiguracaoNotas {
  id: string;
  usuario_id: string;
  tipo_divisao: TipoDivisao;
  notas_por_periodo: number;
  media_aprovacao: number;
  tem_recuperacao_paralela: boolean;
  tem_prova_final: boolean;
  created_at: string;
  updated_at: string;
}

// Modelo de nota (N1, N2, etc)
export interface ModeloNota {
  id: string;
  usuario_id: string;
  turma_id: string | null;
  nome: string;
  periodo: number;
  numero_nota: number;
  valor_total: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  componentes?: ModeloNotaComponente[];
}

// Componente do modelo de nota
export interface ModeloNotaComponente {
  id: string;
  modelo_nota_id: string;
  nome: string;
  tipo: TipoComponente;
  peso: number;
  referencia_id: string | null;
  ordem: number;
  created_at: string;
}

// Nota lançada
export interface Nota {
  id: string;
  aluno_id: string;
  turma_id: string;
  periodo: number;
  numero_nota: number;
  nota: number | null;
  componentes: NotaComponenteValor[] | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

// Valor de cada componente na nota lançada
export interface NotaComponenteValor {
  componente_id: string;
  nome: string;
  tipo: TipoComponente;
  peso: number;
  valor: number | null;
}

// Média do período
export interface MediaPeriodo {
  id: string;
  aluno_id: string;
  turma_id: string;
  periodo: number;
  media: number | null;
  situacao: SituacaoAluno;
  nota_recuperacao: number | null;
  media_final: number | null;
  created_at: string;
  updated_at: string;
}

// Aluno com notas
export interface AlunoComNotas {
  id: string;
  nome: string;
  matricula: string | null;
  possui_laudo: boolean;
  tipo_laudo: string | null;
  notas: Record<number, number | null>; // numero_nota -> valor
  media_atividades: number | null;
  media_periodo: number | null;
  situacao: SituacaoAluno;
}

// Para criar/atualizar configuração
export interface UpsertConfiguracaoNotas {
  tipo_divisao: TipoDivisao;
  notas_por_periodo: number;
  media_aprovacao: number;
  tem_recuperacao_paralela: boolean;
  tem_prova_final: boolean;
}

// Para criar modelo de nota
export interface NovoModeloNota {
  turma_id?: string;
  nome: string;
  periodo: number;
  numero_nota: number;
  valor_total?: number;
  componentes: NovoComponente[];
}

// Para criar componente
export interface NovoComponente {
  nome: string;
  tipo: TipoComponente;
  peso: number;
  referencia_id?: string;
  ordem?: number;
}

// Para lançar nota
export interface LancarNota {
  aluno_id: string;
  turma_id: string;
  periodo: number;
  numero_nota: number;
  nota: number;
  componentes?: NotaComponenteValor[];
  observacao?: string;
}

// Configuração dos tipos de componente para UI
export const TIPOS_COMPONENTE_CONFIG: Record<TipoComponente, {
  label: string;
  descricao: string;
  icon: string;
  cor: string;
  automatico: boolean;
}> = {
  simulado: {
    label: 'Simulado',
    descricao: 'Nota de simulado da plataforma',
    icon: 'FileText',
    cor: 'text-blue-600',
    automatico: true
  },
  rede: {
    label: 'Avaliação de Rede',
    descricao: 'Avaliação externa (municipal/estadual)',
    icon: 'Building',
    cor: 'text-purple-600',
    automatico: false
  },
  atividades_media: {
    label: 'Média das Atividades',
    descricao: 'Calcula automaticamente a média das atividades',
    icon: 'Calculator',
    cor: 'text-green-600',
    automatico: true
  },
  atividades_soma: {
    label: 'Soma das Atividades',
    descricao: 'Soma os pontos das atividades',
    icon: 'Plus',
    cor: 'text-green-600',
    automatico: true
  },
  manual: {
    label: 'Nota Manual',
    descricao: 'Nota inserida manualmente',
    icon: 'Edit',
    cor: 'text-gray-600',
    automatico: false
  },
  participacao: {
    label: 'Participação',
    descricao: 'Nota de participação em sala',
    icon: 'Hand',
    cor: 'text-yellow-600',
    automatico: false
  }
};

// Opções de períodos
export const PERIODOS_BIMESTRE = [
  { value: 1, label: '1º Bimestre' },
  { value: 2, label: '2º Bimestre' },
  { value: 3, label: '3º Bimestre' },
  { value: 4, label: '4º Bimestre' }
];

export const PERIODOS_TRIMESTRE = [
  { value: 1, label: '1º Trimestre' },
  { value: 2, label: '2º Trimestre' },
  { value: 3, label: '3º Trimestre' }
];

// Helper para obter nome do período
export function getNomePeriodo(periodo: number, tipoDivisao: TipoDivisao): string {
  if (tipoDivisao === 'trimestral') {
    return PERIODOS_TRIMESTRE.find(p => p.value === periodo)?.label || `${periodo}º Trimestre`;
  }
  return PERIODOS_BIMESTRE.find(p => p.value === periodo)?.label || `${periodo}º Bimestre`;
}

// Helper para obter período atual
export function getPeriodoAtual(tipoDivisao: TipoDivisao): number {
  const mes = new Date().getMonth() + 1;
  
  if (tipoDivisao === 'trimestral') {
    if (mes >= 2 && mes <= 4) return 1;
    if (mes >= 5 && mes <= 8) return 2;
    return 3;
  }
  
  // Bimestral
  if (mes >= 2 && mes <= 4) return 1;
  if (mes >= 5 && mes <= 6) return 2;
  if (mes >= 7 && mes <= 9) return 3;
  return 4;
}
