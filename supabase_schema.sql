-- =====================================================
-- XYMATH - Script de Criação do Banco de Dados
-- Plataforma de Avaliação de Matemática
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  escola TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON usuarios
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" ON usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- TABELA: turmas
-- =====================================================
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ano_serie TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('matutino', 'vespertino', 'noturno', 'integral')),
  ano_letivo INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_turmas_usuario ON turmas(usuario_id);
CREATE INDEX idx_turmas_ativa ON turmas(ativa);

-- RLS para turmas
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias turmas" ON turmas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar turmas" ON turmas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas turmas" ON turmas
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas turmas" ON turmas
  FOR DELETE USING (auth.uid() = usuario_id);

-- =====================================================
-- TABELA: alunos
-- =====================================================
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  matricula TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alunos_turma ON alunos(turma_id);
CREATE INDEX idx_alunos_ativo ON alunos(ativo);

-- RLS para alunos
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver alunos de suas turmas" ON alunos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM turmas WHERE turmas.id = alunos.turma_id AND turmas.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem criar alunos em suas turmas" ON alunos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM turmas WHERE turmas.id = alunos.turma_id AND turmas.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar alunos de suas turmas" ON alunos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM turmas WHERE turmas.id = alunos.turma_id AND turmas.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar alunos de suas turmas" ON alunos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM turmas WHERE turmas.id = alunos.turma_id AND turmas.usuario_id = auth.uid())
  );

-- =====================================================
-- TABELA: questoes
-- =====================================================
CREATE TABLE IF NOT EXISTS questoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  imagem_url TEXT,
  alternativa_a TEXT NOT NULL,
  alternativa_b TEXT NOT NULL,
  alternativa_c TEXT NOT NULL,
  alternativa_d TEXT NOT NULL,
  alternativa_e TEXT,
  resposta_correta CHAR(1) NOT NULL CHECK (resposta_correta IN ('A', 'B', 'C', 'D', 'E')),
  ano_serie TEXT NOT NULL,
  unidade_tematica TEXT,
  habilidade_codigo TEXT,
  descritor_codigo TEXT,
  dificuldade TEXT NOT NULL CHECK (dificuldade IN ('facil', 'medio', 'dificil')),
  tags TEXT[],
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_questoes_usuario ON questoes(usuario_id);
CREATE INDEX idx_questoes_ano_serie ON questoes(ano_serie);
CREATE INDEX idx_questoes_dificuldade ON questoes(dificuldade);
CREATE INDEX idx_questoes_unidade ON questoes(unidade_tematica);
CREATE INDEX idx_questoes_habilidade ON questoes(habilidade_codigo);
CREATE INDEX idx_questoes_descritor ON questoes(descritor_codigo);
CREATE INDEX idx_questoes_ativa ON questoes(ativa);

-- RLS para questoes
ALTER TABLE questoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias questões" ON questoes
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar questões" ON questoes
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas questões" ON questoes
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas questões" ON questoes
  FOR DELETE USING (auth.uid() = usuario_id);

-- =====================================================
-- TABELA: simulados
-- =====================================================
CREATE TABLE IF NOT EXISTS simulados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  data_aplicacao DATE,
  tempo_minutos INTEGER DEFAULT 60,
  questoes_ids UUID[] NOT NULL DEFAULT '{}',
  configuracoes JSONB DEFAULT '{"embaralhar_questoes": true, "embaralhar_alternativas": false, "mostrar_gabarito_apos": true, "permitir_revisao": true}',
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'encerrado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_simulados_usuario ON simulados(usuario_id);
CREATE INDEX idx_simulados_turma ON simulados(turma_id);
CREATE INDEX idx_simulados_status ON simulados(status);

-- RLS para simulados
ALTER TABLE simulados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios simulados" ON simulados
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar simulados" ON simulados
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus simulados" ON simulados
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus simulados" ON simulados
  FOR DELETE USING (auth.uid() = usuario_id);

-- =====================================================
-- TABELA: aplicacoes (instância de simulado para turma)
-- =====================================================
CREATE TABLE IF NOT EXISTS aplicacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data_aplicacao DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'finalizada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_aplicacoes_simulado ON aplicacoes(simulado_id);
CREATE INDEX idx_aplicacoes_turma ON aplicacoes(turma_id);

-- RLS para aplicacoes
ALTER TABLE aplicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver aplicações de seus simulados" ON aplicacoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM simulados WHERE simulados.id = aplicacoes.simulado_id AND simulados.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem criar aplicações" ON aplicacoes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM simulados WHERE simulados.id = aplicacoes.simulado_id AND simulados.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar aplicações" ON aplicacoes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM simulados WHERE simulados.id = aplicacoes.simulado_id AND simulados.usuario_id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar aplicações" ON aplicacoes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM simulados WHERE simulados.id = aplicacoes.simulado_id AND simulados.usuario_id = auth.uid())
  );

-- =====================================================
-- TABELA: respostas
-- =====================================================
CREATE TABLE IF NOT EXISTS respostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aplicacao_id UUID NOT NULL REFERENCES aplicacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  resposta_marcada CHAR(1) CHECK (resposta_marcada IN ('A', 'B', 'C', 'D', 'E', NULL)),
  correta BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aplicacao_id, aluno_id, questao_id)
);

-- Índices
CREATE INDEX idx_respostas_aplicacao ON respostas(aplicacao_id);
CREATE INDEX idx_respostas_aluno ON respostas(aluno_id);
CREATE INDEX idx_respostas_questao ON respostas(questao_id);

-- RLS para respostas
ALTER TABLE respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver respostas de suas aplicações" ON respostas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = respostas.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar respostas" ON respostas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = respostas.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar respostas" ON respostas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = respostas.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

-- =====================================================
-- TABELA: resultados (resumo por aluno)
-- =====================================================
CREATE TABLE IF NOT EXISTS resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aplicacao_id UUID NOT NULL REFERENCES aplicacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  total_questoes INTEGER NOT NULL,
  total_acertos INTEGER NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  tempo_gasto_minutos INTEGER,
  corrigido_em TIMESTAMPTZ DEFAULT NOW(),
  metodo_correcao TEXT NOT NULL DEFAULT 'manual' CHECK (metodo_correcao IN ('manual', 'qrcode', 'online')),
  UNIQUE(aplicacao_id, aluno_id)
);

-- Índices
CREATE INDEX idx_resultados_aplicacao ON resultados(aplicacao_id);
CREATE INDEX idx_resultados_aluno ON resultados(aluno_id);

-- RLS para resultados
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver resultados de suas aplicações" ON resultados
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = resultados.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar resultados" ON resultados
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = resultados.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar resultados" ON resultados
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM aplicacoes 
      JOIN simulados ON simulados.id = aplicacoes.simulado_id 
      WHERE aplicacoes.id = resultados.aplicacao_id AND simulados.usuario_id = auth.uid()
    )
  );

-- =====================================================
-- FUNÇÃO: Calcular estatísticas de uma aplicação
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_estatisticas_aplicacao(p_aplicacao_id UUID)
RETURNS TABLE (
  media_acertos DECIMAL,
  mediana DECIMAL,
  maior_nota DECIMAL,
  menor_nota DECIMAL,
  total_alunos INTEGER,
  alunos_participantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(r.percentual)::DECIMAL, 2) as media_acertos,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.percentual)::DECIMAL as mediana,
    MAX(r.percentual)::DECIMAL as maior_nota,
    MIN(r.percentual)::DECIMAL as menor_nota,
    (SELECT COUNT(*)::INTEGER FROM alunos a 
     JOIN aplicacoes ap ON ap.turma_id = a.turma_id 
     WHERE ap.id = p_aplicacao_id AND a.ativo = true) as total_alunos,
    COUNT(DISTINCT r.aluno_id)::INTEGER as alunos_participantes
  FROM resultados r
  WHERE r.aplicacao_id = p_aplicacao_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Calcular estatísticas por questão
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_estatisticas_questao(p_aplicacao_id UUID, p_questao_id UUID)
RETURNS TABLE (
  total_respostas INTEGER,
  acertos INTEGER,
  percentual_acerto DECIMAL,
  respostas_a INTEGER,
  respostas_b INTEGER,
  respostas_c INTEGER,
  respostas_d INTEGER,
  respostas_e INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_respostas,
    COUNT(CASE WHEN r.correta THEN 1 END)::INTEGER as acertos,
    ROUND((COUNT(CASE WHEN r.correta THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as percentual_acerto,
    COUNT(CASE WHEN r.resposta_marcada = 'A' THEN 1 END)::INTEGER as respostas_a,
    COUNT(CASE WHEN r.resposta_marcada = 'B' THEN 1 END)::INTEGER as respostas_b,
    COUNT(CASE WHEN r.resposta_marcada = 'C' THEN 1 END)::INTEGER as respostas_c,
    COUNT(CASE WHEN r.resposta_marcada = 'D' THEN 1 END)::INTEGER as respostas_d,
    COUNT(CASE WHEN r.resposta_marcada = 'E' THEN 1 END)::INTEGER as respostas_e
  FROM respostas r
  WHERE r.aplicacao_id = p_aplicacao_id AND r.questao_id = p_questao_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS (se necessário)
-- =====================================================
-- Supabase gerencia permissões automaticamente via RLS

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
