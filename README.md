# 📐 xyMath - Plataforma de Avaliação de Matemática

Sistema para criação de simulados, correção via QR Code e análise de desempenho. Do 6º ano ao Ensino Médio, alinhado à BNCC.

## 🚀 Funcionalidades

- ✅ Gestão de Turmas e Alunos (importação Excel/CSV)
- ✅ Banco de Questões com filtros BNCC/SAEB
- ✅ Criação de Simulados
- ✅ Dashboard com estatísticas
- 🔄 Geração de gabarito PDF com QR Code
- 🔄 Correção via leitura de QR Code
- 🔄 Análises estatísticas detalhadas

## 🛠️ Tecnologias

- Next.js 14, React, TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Auth)

## 📦 Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar Supabase
# - Crie projeto em supabase.com
# - Execute supabase_schema.sql no SQL Editor

# 3. Configurar ambiente
cp .env.example .env.local
# Edite com suas credenciais Supabase

# 4. Executar
npm run dev
```

## 📁 Estrutura

```
src/
├── app/(auth)/        # Login, Cadastro
├── app/(dashboard)/   # Dashboard, Turmas, Questões, Simulados
├── components/ui/     # Button, Input, Modal, Table...
├── lib/constants.ts   # Habilidades BNCC, Descritores SAEB
└── types/             # TypeScript types
```

## 🎯 BNCC Incluída

- Fundamental II: EF06MA01 a EF09MA23
- Ensino Médio: EM13MAT101 a EM13MAT511
- Descritores SAEB: D1 a D38

## 📱 Deploy

1. Conecte ao Vercel
2. Configure variáveis de ambiente
3. Deploy!

---
**xyMath** - Simplificando avaliações de Matemática 📐
