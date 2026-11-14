-- Schema privado: não é exposto pela Data API pública do Supabase.
CREATE SCHEMA IF NOT EXISTS financas;

CREATE TABLE IF NOT EXISTS financas.usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL CHECK(length(trim(nome)) BETWEEN 2 AND 120),
  email VARCHAR(160) NOT NULL UNIQUE CHECK(email = lower(trim(email))),
  cpf CHAR(11) NOT NULL UNIQUE CHECK(cpf ~ '^[0-9]{11}$'),
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financas.categorias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES financas.usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(60) NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 60),
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
  UNIQUE(usuario_id, nome, tipo),
  UNIQUE(id, usuario_id, tipo)
);
CREATE UNIQUE INDEX IF NOT EXISTS categorias_nome_normalizado ON financas.categorias(usuario_id, lower(nome), tipo);

CREATE TABLE IF NOT EXISTS financas.fontes_destinos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES financas.usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(60) NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 60),
  tipo TEXT NOT NULL CHECK(tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento INTEGER CHECK(dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER CHECK(dia_vencimento BETWEEN 1 AND 31),
  limite_centavos BIGINT CHECK(limite_centavos BETWEEN 1 AND 999999999999),
  UNIQUE(usuario_id, nome),
  UNIQUE(id, usuario_id),
  CHECK(tipo <> 'cartao_credito' OR (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite_centavos IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS fontes_nome_normalizado ON financas.fontes_destinos(usuario_id, lower(nome));

CREATE TABLE IF NOT EXISTS financas.lancamentos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES financas.usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL CHECK(length(trim(descricao)) BETWEEN 1 AND 120),
  valor_centavos BIGINT NOT NULL CHECK(valor_centavos BETWEEN 1 AND 999999999999),
  data DATE NOT NULL,
  data_compra DATE NOT NULL,
  categoria_id INTEGER NOT NULL,
  fonte_destino_id INTEGER NOT NULL,
  parcela_atual INTEGER NOT NULL DEFAULT 1 CHECK(parcela_atual BETWEEN 1 AND total_parcelas),
  total_parcelas INTEGER NOT NULL DEFAULT 1 CHECK(total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(categoria_id, usuario_id, tipo) REFERENCES financas.categorias(id, usuario_id, tipo),
  FOREIGN KEY(fonte_destino_id, usuario_id) REFERENCES financas.fontes_destinos(id, usuario_id),
  CHECK(total_parcelas = 1 OR grupo_parcelamento IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_usuario_data ON financas.lancamentos(usuario_id, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo ON financas.lancamentos(usuario_id, grupo_parcelamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON financas.lancamentos(categoria_id, usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fonte ON financas.lancamentos(fonte_destino_id, usuario_id);

-- O Express conecta com a credencial de servidor. Nenhum acesso anônimo às tabelas.
REVOKE ALL ON SCHEMA financas FROM PUBLIC;

-- Defesa adicional: apenas a conexão privilegiada do servidor acessa as tabelas.
ALTER TABLE financas.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.fontes_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.lancamentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA financas FROM PUBLIC;
