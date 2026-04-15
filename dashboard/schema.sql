-- ============================================================
-- ClinFit — Schema do Banco de Dados (Supabase / PostgreSQL)
--
-- INSTRUÇÕES:
-- 1. Acesse seu projeto em https://supabase.com/dashboard
-- 2. Vá em SQL Editor
-- 3. Cole todo este conteúdo e execute
-- ============================================================


-- ── Extensão para UUIDs ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── TABELA: usuarios ────────────────────────────────────────
-- Perfil público dos usuários (nutricionistas / personal trainers)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  nome        TEXT NOT NULL DEFAULT '',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: cada usuário só acessa o próprio perfil
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios: leitura própria" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios: inserção própria" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios: atualização própria" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);


-- ── TABELA: clientes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  telefone         TEXT,
  email            TEXT,
  data_nascimento  DATE,
  objetivo         TEXT,
  observacoes      TEXT,
  status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_usuario ON public.clientes(usuario_id);
CREATE INDEX idx_clientes_status  ON public.clientes(status);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes: acesso do dono" ON public.clientes
  FOR ALL USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ── TABELA: sessoes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessoes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data         DATE NOT NULL,
  horario      TIME NOT NULL,
  duracao      INTEGER NOT NULL DEFAULT 50,    -- minutos
  tipo         TEXT NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial', 'online')),
  status       TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'realizada', 'cancelada')),
  observacoes  TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessoes_usuario   ON public.sessoes(usuario_id);
CREATE INDEX idx_sessoes_cliente   ON public.sessoes(cliente_id);
CREATE INDEX idx_sessoes_data      ON public.sessoes(data);

ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessoes: acesso do dono" ON public.sessoes
  FOR ALL USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ── TABELA: cobrancas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  valor        NUMERIC(10, 2) NOT NULL,
  vencimento   DATE NOT NULL,
  descricao    TEXT,
  tipo         TEXT NOT NULL DEFAULT 'mensalidade' CHECK (tipo IN ('mensalidade', 'sessao_avulsa', 'pacote', 'outro')),
  status       TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cobrancas_usuario    ON public.cobrancas(usuario_id);
CREATE INDEX idx_cobrancas_cliente    ON public.cobrancas(cliente_id);
CREATE INDEX idx_cobrancas_vencimento ON public.cobrancas(vencimento);
CREATE INDEX idx_cobrancas_status     ON public.cobrancas(status);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobrancas: acesso do dono" ON public.cobrancas
  FOR ALL USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ── TABELA: evolucao ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evolucao (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data         DATE NOT NULL,
  peso         NUMERIC(5, 1),   -- kg
  gordura      NUMERIC(4, 1),   -- percentual
  cintura      NUMERIC(5, 1),   -- cm
  quadril      NUMERIC(5, 1),   -- cm
  braco        NUMERIC(5, 1),   -- cm
  observacoes  TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evolucao_usuario  ON public.evolucao(usuario_id);
CREATE INDEX idx_evolucao_cliente  ON public.evolucao(cliente_id);
CREATE INDEX idx_evolucao_data     ON public.evolucao(data);

ALTER TABLE public.evolucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evolucao: acesso do dono" ON public.evolucao
  FOR ALL USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ── FUNÇÃO: criar perfil automaticamente no cadastro ────────
-- Dispara quando um novo usuário se registra via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger que executa a função acima
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
