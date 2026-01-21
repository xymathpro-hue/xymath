// ============================================================
// XYMATH - TIPOS PARA CONTROLE DE ATIVIDADES
// src/types/atividades.ts
// ============================================================

// Tipos de atividade disponíveis
export type TipoAtividade = 
  | 'classe'
  | 'casa'
  | 'trabalho'
  | 'grupo'
  | 'pesquisa'
  | 'participacao'
  | 'outro';

// Status de entrega
export type StatusEntrega = 
  | 'pendente'
  | 'entregue'
  | 'atrasado'
  | 'nao_entregue';

// Interface da Atividade
export interface Atividade {
  id: string;
  usuario_id: string;
  turma_id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoAtividade;
  data_entrega: string | null;
  valor: number;
  periodo: string | null;
  bimestre: number | null;
  created_at: string;
  updated_at: string;
}

// Interface para criar atividade
export interface NovaAtividade {
  turma_id: string;
  titulo: string;
  descricao?: string;
  tipo: TipoAtividade;
  data_entrega?: string;
  valor: number;
  bimestre?: number;
}

// Interface de Entrega
export interface AtividadeEntrega {
  id: string;
  atividade_id: string;
  aluno_id: string;
  status: StatusEntrega;
  nota: number | null;
  data_entrega_real: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para lançar entrega
export interface LancarEntrega {
  atividade_id: string;
  aluno_id: string;
  status: StatusEntrega;
  nota?: number;
  observacao?: string;
}

// Interface de Atividade com estatísticas
export interface AtividadeComEstatisticas extends Atividade {
  turma_nome?: string;
  total_alunos: number;
  entregues: number;
  atrasados: number;
  nao_entregues: number;
  pendentes: number;
  percentual_entrega: number;
}

// Interface de Aluno com entrega
export interface AlunoComEntrega {
  id: string;
  nome: string;
  matricula: string | null;
  possui_laudo: boolean;
  tipo_laudo: string | null;
  entrega: AtividadeEntrega | null;
}

// Interface de estatísticas do aluno
export interface EstatisticasAtividadesAluno {
  total_atividades: number;
  atividades_entregues: number;
  soma_notas: number;
  soma_valores: number;
  media: number;
  percentual_entrega: number;
}

// Configuração de tipos de atividade para UI
export const TIPOS_ATIVIDADE_CONFIG: Record<TipoAtividade, {
  label: string;
  icon: string;
  cor: string;
  bgColor: string;
}> = {
  classe: {
    label: 'Atividade de Classe',
    icon: 'BookOpen',
    cor: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  casa: {
    label: 'Tarefa de Casa',
    icon: 'Home',
    cor: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  trabalho: {
    label: 'Trabalho Individual',
    icon: 'FileText',
    cor: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  grupo: {
    label: 'Trabalho em Grupo',
    icon: 'Users',
    cor: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  pesquisa: {
    label: 'Pesquisa',
    icon: 'Search',
    cor: 'text-teal-600',
    bgColor: 'bg-teal-100'
  },
  participacao: {
    label: 'Participação',
    icon: 'Hand',
    cor: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  outro: {
    label: 'Outro',
    icon: 'MoreHorizontal',
    cor: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
};

// Configuração de status de entrega para UI
export const STATUS_ENTREGA_CONFIG: Record<StatusEntrega, {
  label: string;
  cor: string;
  bgColor: string;
}> = {
  pendente: {
    label: 'Pendente',
    cor: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  entregue: {
    label: 'Entregue',
    cor: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  atrasado: {
    label: 'Atrasado',
    cor: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  nao_entregue: {
    label: 'Não Entregue',
    cor: 'text-red-600',
    bgColor: 'bg-red-100'
  }
};

// Lista de bimestres
export const BIMESTRES_OPTIONS = [
  { value: 1, label: '1º Bimestre' },
  { value: 2, label: '2º Bimestre' },
  { value: 3, label: '3º Bimestre' },
  { value: 4, label: '4º Bimestre' }
];

// Lista de trimestres
export const TRIMESTRES_OPTIONS = [
  { value: 1, label: '1º Trimestre' },
  { value: 2, label: '2º Trimestre' },
  { value: 3, label: '3º Trimestre' }
];
