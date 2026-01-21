// ============================================================
// XYMATH - TIPOS PARA FICHA DO ALUNO
// src/types/ficha-aluno.ts
// ============================================================

// Tipos de laudo disponíveis
export type TipoLaudo = 
  | 'TDAH'
  | 'TEA'
  | 'Dislexia'
  | 'Discalculia'
  | 'Disgrafia'
  | 'TDI'
  | 'TOD'
  | 'Deficiência Visual'
  | 'Deficiência Auditiva'
  | 'Deficiência Física'
  | 'Altas Habilidades'
  | 'Outro';

// Tipos de anotação
export type TipoAnotacao = 
  | 'geral'
  | 'reuniao'
  | 'coordenacao'
  | 'comportamento'
  | 'desempenho'
  | 'saude'
  | 'adaptacao';

// Interface do Aluno com campos pedagógicos
export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  email: string | null;
  turma_id: string;
  possui_laudo: boolean;
  tipo_laudo: TipoLaudo | null;
  observacoes_pedagogicas: string | null;
  created_at: string;
  updated_at: string;
}

// Interface da Turma
export interface Turma {
  id: string;
  nome: string;
  ano_serie: string;
}

// Interface de Anotação
export interface AlunoAnotacao {
  id: string;
  aluno_id: string;
  usuario_id: string;
  texto: string;
  tipo: TipoAnotacao;
  created_at: string;
  updated_at: string;
}

// Interface para criação de anotação
export interface NovaAnotacao {
  aluno_id: string;
  texto: string;
  tipo: TipoAnotacao;
}

// Interface para atualização de aluno (campos pedagógicos)
export interface AtualizarAlunoPedagogico {
  possui_laudo?: boolean;
  tipo_laudo?: TipoLaudo | null;
  observacoes_pedagogicas?: string | null;
}

// Interface da Ficha Completa do Aluno
export interface FichaAluno {
  aluno: Aluno;
  turma: Turma;
  anotacoes: AlunoAnotacao[];
  estatisticas: {
    total_anotacoes: number;
  };
}

// Configuração de tipos de anotação para UI
export const TIPOS_ANOTACAO_CONFIG: Record<TipoAnotacao, {
  label: string;
  icon: string;
  cor: string;
  bgColor: string;
}> = {
  geral: {
    label: 'Geral',
    icon: 'FileText',
    cor: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  reuniao: {
    label: 'Reunião',
    icon: 'Users',
    cor: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  coordenacao: {
    label: 'Coordenação',
    icon: 'Building',
    cor: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  comportamento: {
    label: 'Comportamento',
    icon: 'AlertCircle',
    cor: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  desempenho: {
    label: 'Desempenho',
    icon: 'TrendingUp',
    cor: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  saude: {
    label: 'Saúde',
    icon: 'Heart',
    cor: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  adaptacao: {
    label: 'Adaptação',
    icon: 'Settings',
    cor: 'text-teal-600',
    bgColor: 'bg-teal-100'
  }
};

// Lista de tipos de laudo para select
export const TIPOS_LAUDO_OPTIONS: { value: TipoLaudo; label: string; descricao: string }[] = [
  { value: 'TDAH', label: 'TDAH', descricao: 'Transtorno do Déficit de Atenção com Hiperatividade' },
  { value: 'TEA', label: 'TEA', descricao: 'Transtorno do Espectro Autista' },
  { value: 'Dislexia', label: 'Dislexia', descricao: 'Dificuldade de aprendizagem na leitura' },
  { value: 'Discalculia', label: 'Discalculia', descricao: 'Dificuldade de aprendizagem em matemática' },
  { value: 'Disgrafia', label: 'Disgrafia', descricao: 'Dificuldade de aprendizagem na escrita' },
  { value: 'TDI', label: 'TDI', descricao: 'Transtorno do Desenvolvimento Intelectual' },
  { value: 'TOD', label: 'TOD', descricao: 'Transtorno Opositor Desafiador' },
  { value: 'Deficiência Visual', label: 'Deficiência Visual', descricao: 'Baixa visão ou cegueira' },
  { value: 'Deficiência Auditiva', label: 'Deficiência Auditiva', descricao: 'Surdez parcial ou total' },
  { value: 'Deficiência Física', label: 'Deficiência Física', descricao: 'Limitações motoras' },
  { value: 'Altas Habilidades', label: 'Altas Habilidades', descricao: 'Superdotação' },
  { value: 'Outro', label: 'Outro', descricao: 'Outro tipo de laudo não especificado' }
];
