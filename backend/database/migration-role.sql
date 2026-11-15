-- Provisionamento único por um administrador, com o schema financas já existente.
-- A senha do migrador é configurada separadamente e nunca entra no Git.
CREATE ROLE moneyfinder_migrator NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
GRANT moneyfinder_migrator TO postgres;
GRANT CONNECT ON DATABASE postgres TO moneyfinder_migrator;
-- CREATE no banco é usado somente para a transferência do schema e revogado em seguida.
GRANT CREATE ON DATABASE postgres TO moneyfinder_migrator;
ALTER SCHEMA financas OWNER TO moneyfinder_migrator;
ALTER TABLE financas.usuarios OWNER TO moneyfinder_migrator;
ALTER TABLE financas.categorias OWNER TO moneyfinder_migrator;
ALTER TABLE financas.fontes_destinos OWNER TO moneyfinder_migrator;
ALTER TABLE financas.lancamentos OWNER TO moneyfinder_migrator;
REVOKE CREATE ON DATABASE postgres FROM moneyfinder_migrator;
-- Privilégios e políticas existentes de moneyfinder_app são preservados.
