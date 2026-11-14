-- Login exclusivo do servidor Express. A senha é definida fora do histórico de migrações.
CREATE ROLE moneyfinder_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 5;
GRANT CONNECT ON DATABASE postgres TO moneyfinder_app;
GRANT USAGE ON SCHEMA financas TO moneyfinder_app;
GRANT SELECT, INSERT ON financas.usuarios TO moneyfinder_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON financas.categorias, financas.fontes_destinos, financas.lancamentos TO moneyfinder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA financas TO moneyfinder_app;

-- Somente esta credencial privada do backend passa pelas políticas abaixo.
-- A API valida o JWT e restringe cada consulta por usuario_id; não usamos Supabase Auth.
-- anon/authenticated não recebem acesso ao schema nem estas políticas.
CREATE POLICY moneyfinder_backend ON financas.usuarios FOR ALL TO moneyfinder_app USING (true) WITH CHECK (true);
CREATE POLICY moneyfinder_backend ON financas.categorias FOR ALL TO moneyfinder_app USING (true) WITH CHECK (true);
CREATE POLICY moneyfinder_backend ON financas.fontes_destinos FOR ALL TO moneyfinder_app USING (true) WITH CHECK (true);
CREATE POLICY moneyfinder_backend ON financas.lancamentos FOR ALL TO moneyfinder_app USING (true) WITH CHECK (true);
