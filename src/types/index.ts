// Tipos principais da aplicação xyMath

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  escola?: string;
  created_at: string;
}

export interface Escola {
  id: string;
  usuario_id: string;
  nome: string;
  rede: 'municipal' | 'estadual' | 'federal' | 'privada';
  created_at: string;
}

export interface Turma {
  id: string;
  usuario_id: string;
  escola_id?: string;
  nome: string;
  ano_serie: string;
  turno: 'matutino' | 'vespertino' | 'noturno';
  ano_letivo: number;
  ativa: boolean;
  created_at: string;
}

export interface Aluno {
  id: string;
  turma_id: string;
  nome: string;
  matricula?: string;
  email?: string;
  ativo: boolean;
  created_at: string;
}

// BNCC - Base Nacional Comum Curricular
export interface ComponenteCurricular {
  id: string;
  codigo: string; // Ex: MAT, POR, CIE
  nome: string; // Ex: Matemática, Português, Ciências
}

export interface HabilidadeBNCC {
  id: string;
  codigo: string; // Ex: EF05MA01
  descricao: string;
  componente_id: string;
  ano_serie: string;
}

export interface Descritor {
  id: string;
  codigo: string; // Ex: D1, D2
  descricao: string;
  componente_id: string;
}

export interface Questao {
  id: string;
  usuario_id: string;
  enunciado: string;
  imagem_url?: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e?: string;
  resposta_correta: 'A' | 'B' | 'C' | 'D' | 'E';
  componente_id: string;
  habilidade_id?: string;
  descritor_id?: string;
  ano_serie: string;
  dificuldade: 'facil' | 'medio' | 'dificil';
  tags?: string[];
  ativa: boolean;
  created_at: string;
}

export interface Simulado {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao?: string;
  turma_id?: string;
  data_aplicacao?: string;
  tempo_minutos?: number;
  questoes_ids: string[];
  configuracoes: SimuladoConfig;
  status: 'rascunho' | 'publicado' | 'encerrado';
  created_at: string;
}

export interface SimuladoConfig {
  embaralhar_questoes?: boolean;
  embaralhar_alternativas?: boolean;
  mostrar_gabarito_apos?: boolean;
  permitir_revisao?: boolean;
  pontuacao_questao?: number;
}

export interface Aplicacao {
  id: string;
  simulado_id: string;
  turma_id: string;
  data_aplicacao: string;
  status: 'agendada' | 'em_andamento' | 'finalizada';
  created_at: string;
}

export interface Resposta {
  id: string;
  aplicacao_id: string;
  aluno_id: string;
  questao_id: string;
  resposta_marcada: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  correta: boolean;
  created_at: string;
}

export interface ResultadoAluno {
  id: string;
  aplicacao_id: string;
  aluno_id: string;
  total_questoes: number;
  total_acertos: number;
  percentual: number;
  tempo_gasto_minutos?: number;
  corrigido_em: string;
  metodo_correcao: 'manual' | 'qrcode' | 'online';
}

export interface GabaritoQRCode {
  aplicacao_id: string;
  aluno_id: string;
  respostas: string; // Ex: "ABCDABCDAB"
  timestamp: string;
}

// Estatísticas
export interface EstatisticaTurma {
  turma_id: string;
  simulado_id: string;
  media_acertos: number;
  mediana: number;
  desvio_padrao: number;
  maior_nota: number;
  menor_nota: number;
  total_alunos: number;
  alunos_participantes: number;
}

export interface EstatisticaQuestao {
  questao_id: string;
  simulado_id: string;
  total_respostas: number;
  acertos: number;
  percentual_acerto: number;
  distribuicao: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
}

export interface DesempenhoHabilidade {
  habilidade_id: string;
  codigo: string;
  descricao: string;
  total_questoes: number;
  acertos: number;
  percentual: number;
}

// Filtros
export interface FiltroQuestoes {
  componente_id?: string;
  habilidade_id?: string;
  descritor_id?: string;
  ano_serie?: string;
  dificuldade?: string;
  busca?: string;
}

export interface FiltroSimulados {
  turma_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}
