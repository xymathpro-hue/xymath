-- =====================================================
-- XYMATH - ESTRUTURA COMPLETA FASE 2
-- Execute no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR QUESTÕES PARA PÚBLICAS
-- =====================================================

UPDATE questoes 
SET is_publica = true 
WHERE usuario_id = 'fb9b212c-9912-4539-a1c0-3c1a5110a27c';

-- =====================================================
-- 2. TABELA: LISTAS DE EXERCÍCIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS listas_exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    ano_serie VARCHAR(20),
    disciplina VARCHAR(50) DEFAULT 'Matemática',
    instrucoes TEXT,
    mostrar_gabarito BOOLEAN DEFAULT false,
    mostrar_resolucao BOOLEAN DEFAULT false,
    is_publica BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para listas
CREATE INDEX IF NOT EXISTS idx_listas_usuario ON listas_exercicios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_listas_publica ON listas_exercicios(is_publica);

-- =====================================================
-- 3. TABELA: QUESTÕES DA LISTA
-- =====================================================

CREATE TABLE IF NOT EXISTS lista_questoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_id UUID NOT NULL REFERENCES listas_exercicios(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL DEFAULT 0,
    peso DECIMAL(3,1) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_lista_questoes_ordem ON lista_questoes(lista_id, ordem);

-- =====================================================
-- 4. TABELA: GABARITOS (para correção QR)
-- =====================================================

CREATE TABLE IF NOT EXISTS gabaritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL, -- Código curto para QR (ex: XY2024ABC)
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('simulado', 'lista')),
    referencia_id UUID NOT NULL, -- ID do simulado ou lista
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    respostas JSONB NOT NULL, -- {"1": "A", "2": "C", "3": "B", ...}
    total_questoes INTEGER NOT NULL,
    valor_questao DECIMAL(4,2) DEFAULT 1.0,
    data_aplicacao DATE,
    turma_id UUID REFERENCES turmas(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para gabaritos
CREATE INDEX IF NOT EXISTS idx_gabaritos_codigo ON gabaritos(codigo);
CREATE INDEX IF NOT EXISTS idx_gabaritos_usuario ON gabaritos(usuario_id);

-- =====================================================
-- 5. TABELA: CORREÇÕES (respostas dos alunos)
-- =====================================================

CREATE TABLE IF NOT EXISTS correcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gabarito_id UUID NOT NULL REFERENCES gabaritos(id) ON DELETE CASCADE,
    aluno_nome VARCHAR(200),
    aluno_id UUID REFERENCES usuarios(id), -- Futuro: quando aluno tiver conta
    turma_id UUID REFERENCES turmas(id),
    respostas JSONB NOT NULL, -- {"1": "A", "2": "B", "3": "C", ...}
    acertos INTEGER NOT NULL DEFAULT 0,
    erros INTEGER NOT NULL DEFAULT 0,
    em_branco INTEGER NOT NULL DEFAULT 0,
    nota DECIMAL(5,2),
    percentual DECIMAL(5,2),
    tempo_correcao INTEGER, -- segundos
    corrigido_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para correções
CREATE INDEX IF NOT EXISTS idx_correcoes_gabarito ON correcoes(gabarito_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_aluno ON correcoes(aluno_nome);

-- =====================================================
-- 6. TABELA: ESTATÍSTICAS POR QUESTÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS estatisticas_questao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    gabarito_id UUID NOT NULL REFERENCES gabaritos(id) ON DELETE CASCADE,
    total_respostas INTEGER DEFAULT 0,
    acertos INTEGER DEFAULT 0,
    erros INTEGER DEFAULT 0,
    em_branco INTEGER DEFAULT 0,
    percentual_acerto DECIMAL(5,2),
    distribuicao_respostas JSONB, -- {"A": 10, "B": 5, "C": 20, "D": 15}
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questao_id, gabarito_id)
);

-- =====================================================
-- 7. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Listas de Exercícios
ALTER TABLE listas_exercicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem suas listas e publicas" ON listas_exercicios;
CREATE POLICY "Usuarios veem suas listas e publicas" ON listas_exercicios
    FOR SELECT USING (usuario_id = auth.uid() OR is_publica = true);

DROP POLICY IF EXISTS "Usuarios criam suas listas" ON listas_exercicios;
CREATE POLICY "Usuarios criam suas listas" ON listas_exercicios
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios editam suas listas" ON listas_exercicios;
CREATE POLICY "Usuarios editam suas listas" ON listas_exercicios
    FOR UPDATE USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios deletam suas listas" ON listas_exercicios;
CREATE POLICY "Usuarios deletam suas listas" ON listas_exercicios
    FOR DELETE USING (usuario_id = auth.uid());

-- Lista Questões
ALTER TABLE lista_questoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gerenciam questoes de suas listas" ON lista_questoes;
CREATE POLICY "Usuarios gerenciam questoes de suas listas" ON lista_questoes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM listas_exercicios WHERE id = lista_id AND usuario_id = auth.uid())
    );

-- Gabaritos
ALTER TABLE gabaritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem seus gabaritos" ON gabaritos;
CREATE POLICY "Usuarios veem seus gabaritos" ON gabaritos
    FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios criam gabaritos" ON gabaritos;
CREATE POLICY "Usuarios criam gabaritos" ON gabaritos
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios editam seus gabaritos" ON gabaritos;
CREATE POLICY "Usuarios editam seus gabaritos" ON gabaritos
    FOR UPDATE USING (usuario_id = auth.uid());

-- Correções
ALTER TABLE correcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem correcoes de seus gabaritos" ON correcoes;
CREATE POLICY "Usuarios veem correcoes de seus gabaritos" ON correcoes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM gabaritos WHERE id = gabarito_id AND usuario_id = auth.uid())
    );

DROP POLICY IF EXISTS "Usuarios criam correcoes" ON correcoes;
CREATE POLICY "Usuarios criam correcoes" ON correcoes
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM gabaritos WHERE id = gabarito_id AND usuario_id = auth.uid())
    );

-- Estatísticas
ALTER TABLE estatisticas_questao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios veem estatisticas de seus gabaritos" ON estatisticas_questao;
CREATE POLICY "Usuarios veem estatisticas de seus gabaritos" ON estatisticas_questao
    FOR ALL USING (
        EXISTS (SELECT 1 FROM gabaritos WHERE id = gabarito_id AND usuario_id = auth.uid())
    );

-- =====================================================
-- 8. FUNÇÃO: GERAR CÓDIGO ÚNICO PARA QR
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_codigo_gabarito()
RETURNS VARCHAR(20) AS $$
DECLARE
    codigo VARCHAR(20);
    existe BOOLEAN;
BEGIN
    LOOP
        -- Gera código: XY + ano + 5 caracteres aleatórios
        codigo := 'XY' || TO_CHAR(CURRENT_DATE, 'YY') || 
                  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Verifica se já existe
        SELECT EXISTS(SELECT 1 FROM gabaritos WHERE gabaritos.codigo = gerar_codigo_gabarito.codigo) INTO existe;
        
        IF NOT existe THEN
            RETURN codigo;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNÇÃO: CALCULAR ESTATÍSTICAS
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_estatisticas_gabarito(p_gabarito_id UUID)
RETURNS VOID AS $$
DECLARE
    v_questao RECORD;
    v_gabarito_respostas JSONB;
    v_total INTEGER;
    v_acertos INTEGER;
    v_erros INTEGER;
    v_branco INTEGER;
    v_distribuicao JSONB;
BEGIN
    -- Pega respostas do gabarito
    SELECT respostas INTO v_gabarito_respostas FROM gabaritos WHERE id = p_gabarito_id;
    
    -- Para cada questão do gabarito
    FOR v_questao IN 
        SELECT DISTINCT key::INTEGER as numero 
        FROM jsonb_each_text(v_gabarito_respostas)
        ORDER BY numero
    LOOP
        -- Calcula estatísticas
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE (respostas->>v_questao.numero::TEXT) = (v_gabarito_respostas->>v_questao.numero::TEXT)),
            COUNT(*) FILTER (WHERE (respostas->>v_questao.numero::TEXT) IS NOT NULL AND (respostas->>v_questao.numero::TEXT) != (v_gabarito_respostas->>v_questao.numero::TEXT)),
            COUNT(*) FILTER (WHERE (respostas->>v_questao.numero::TEXT) IS NULL OR (respostas->>v_questao.numero::TEXT) = '')
        INTO v_total, v_acertos, v_erros, v_branco
        FROM correcoes
        WHERE gabarito_id = p_gabarito_id;
        
        -- Calcula distribuição de respostas
        SELECT jsonb_object_agg(resp, cnt) INTO v_distribuicao
        FROM (
            SELECT respostas->>v_questao.numero::TEXT as resp, COUNT(*) as cnt
            FROM correcoes
            WHERE gabarito_id = p_gabarito_id
            GROUP BY respostas->>v_questao.numero::TEXT
        ) sub;
        
        -- Atualiza ou insere estatísticas
        INSERT INTO estatisticas_questao (questao_id, gabarito_id, total_respostas, acertos, erros, em_branco, percentual_acerto, distribuicao_respostas)
        VALUES (
            NULL, -- TODO: Mapear questao_id
            p_gabarito_id,
            v_total,
            v_acertos,
            v_erros,
            v_branco,
            CASE WHEN v_total > 0 THEN (v_acertos::DECIMAL / v_total * 100) ELSE 0 END,
            v_distribuicao
        )
        ON CONFLICT (questao_id, gabarito_id) 
        DO UPDATE SET
            total_respostas = EXCLUDED.total_respostas,
            acertos = EXCLUDED.acertos,
            erros = EXCLUDED.erros,
            em_branco = EXCLUDED.em_branco,
            percentual_acerto = EXCLUDED.percentual_acerto,
            distribuicao_respostas = EXCLUDED.distribuicao_respostas,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'Tabelas criadas:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('listas_exercicios', 'lista_questoes', 'gabaritos', 'correcoes', 'estatisticas_questao');

SELECT 'Questões públicas:' as info, COUNT(*) as total FROM questoes WHERE is_publica = true;
