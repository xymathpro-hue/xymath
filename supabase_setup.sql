-- =====================================================
-- XYMATH - SCRIPT DE CRIAÇÃO DO BANCO
-- Cole este script inteiro no SQL Editor do Supabase
-- e clique em RUN
-- =====================================================

-- 1. TABELA DE USUÁRIOS (PROFESSORES)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  escola TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_ver" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "usuarios_criar" ON usuarios FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "usuarios_editar" ON usuarios FOR UPDATE USING (auth.uid() = id);

-- 2. TABELA DE TURMAS
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ano_serie TEXT NOT NULL,
  turno TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL DEFAULT 2024,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turmas_todas" ON turmas FOR ALL USING (auth.uid() = usuario_id);

-- 3. TABELA DE ALUNOS
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  matricula TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alunos_todas" ON alunos FOR ALL USING (
  EXISTS (SELECT 1 FROM turmas WHERE turmas.id = alunos.turma_id AND turmas.usuario_id = auth.uid())
);

-- 4. TABELA DE QUESTÕES
CREATE TABLE IF NOT EXISTS questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  imagem_url TEXT,
  alternativa_a TEXT NOT NULL,
  alternativa_b TEXT NOT NULL,
  alternativa_c TEXT NOT NULL,
  alternativa_d TEXT NOT NULL,
  alternativa_e TEXT,
  resposta_correta TEXT NOT NULL,
  ano_serie TEXT NOT NULL,
  unidade_tematica TEXT,
  habilidade_codigo TEXT,
  habilidade_descricao TEXT,
  descritor_codigo TEXT,
  descritor_descricao TEXT,
  dificuldade TEXT NOT NULL,
  fonte TEXT,
  is_publica BOOLEAN DEFAULT FALSE,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questoes_ver" ON questoes FOR SELECT USING (usuario_id = auth.uid() OR is_publica = TRUE);
CREATE POLICY "questoes_criar" ON questoes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "questoes_editar" ON questoes FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "questoes_deletar" ON questoes FOR DELETE USING (auth.uid() = usuario_id);

-- 5. TABELA DE SIMULADOS
CREATE TABLE IF NOT EXISTS simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  data_aplicacao DATE,
  tempo_minutos INTEGER DEFAULT 60,
  questoes_ids UUID[] DEFAULT '{}',
  configuracoes JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE simulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simulados_todas" ON simulados FOR ALL USING (auth.uid() = usuario_id);

-- 6. TABELA DE APLICAÇÕES (quando aplica simulado para turma)
CREATE TABLE IF NOT EXISTS aplicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data_aplicacao DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'agendada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aplicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aplicacoes_todas" ON aplicacoes FOR ALL USING (
  EXISTS (SELECT 1 FROM simulados WHERE simulados.id = aplicacoes.simulado_id AND simulados.usuario_id = auth.uid())
);

-- 7. TABELA DE RESPOSTAS DOS ALUNOS
CREATE TABLE IF NOT EXISTS respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aplicacao_id UUID NOT NULL REFERENCES aplicacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  resposta_marcada TEXT,
  correta BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aplicacao_id, aluno_id, questao_id)
);

ALTER TABLE respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "respostas_todas" ON respostas FOR ALL USING (
  EXISTS (
    SELECT 1 FROM aplicacoes 
    JOIN simulados ON simulados.id = aplicacoes.simulado_id 
    WHERE aplicacoes.id = respostas.aplicacao_id AND simulados.usuario_id = auth.uid()
  )
);

-- 8. TABELA DE RESULTADOS
CREATE TABLE IF NOT EXISTS resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aplicacao_id UUID NOT NULL REFERENCES aplicacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  total_questoes INTEGER NOT NULL,
  total_acertos INTEGER NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  tempo_gasto_minutos INTEGER,
  corrigido_em TIMESTAMPTZ DEFAULT NOW(),
  metodo_correcao TEXT DEFAULT 'manual',
  UNIQUE(aplicacao_id, aluno_id)
);

ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resultados_todas" ON resultados FOR ALL USING (
  EXISTS (
    SELECT 1 FROM aplicacoes 
    JOIN simulados ON simulados.id = aplicacoes.simulado_id 
    WHERE aplicacoes.id = resultados.aplicacao_id AND simulados.usuario_id = auth.uid()
  )
);

-- =====================================================
-- PRONTO! Banco de dados criado com sucesso!
-- =====================================================
