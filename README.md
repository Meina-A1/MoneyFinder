# MoneyFinder

Aplicação de controle financeiro pessoal do **Projeto 2 de Programação Web Fullstack**. Mantendo a identidade visual do projeto 1: paleta roxa, fontes DM Sans/Outfit, símbolo do gato e cartões arredondados.

React/Vite no frontend, API REST própria em Node.js/Express e PostgreSQL hospedado no Supabase. O cadastro, o hash das senhas e a emissão/validação de JWT são feitos pelo Express. O Supabase fornece o banco; a aplicação não depende do Supabase Auth ou de acesso direto às tabelas pelo navegador.

## Supabase configurado

- Projeto: [MoneyFinder](https://supabase.com/dashboard/project/ocxuycnvmkaxtdgsfgng), organização Meina, região São Paulo (`sa-east-1`).
- Referência: `ocxuycnvmkaxtdgsfgng`.
- Schema e login do servidor já provisionados pelas migrações `moneyfinder_initial_schema` e `moneyfinder_backend_role`; o migrador foi provisionado por `moneyfinder_scoped_migration_role`.
- Este checkout está configurado para o PostgreSQL real pelo Session pooler, com certificado CA oficial e verificação TLS habilitada.
- `backend/.env` contém a credencial privada de `moneyfinder_app`; ela não é versionada. O certificado local também é ignorado pelo Git.
- Seed executado: 2 usuários fictícios, 14 categorias, 8 fontes/destinos e 48 lançamentos; ambos os usuários têm 3 meses de histórico.
- Verificação real: conexão `pg`, login, isolamento, duplicatas, CRUD, parcelamento, faturas, relatórios e saúde financeira passaram. Os registros temporários de teste foram removidos.

Para executar este checkout, use `npm run dev`. Para repetir o seed sem substituir os dados existentes, use `npm run db:seed`.

O login da aplicação não possui permissão de DDL. Neste checkout, `DATABASE_ADMIN_URL` já usa o login separado `moneyfinder_migrator`, proprietário apenas do schema `financas` e de seus objetos; sem superusuário, criação de bancos, criação de roles ou bypass global de RLS. `npm run db:migrate` usa essa conexão e preserva os dados existentes. A credencial fica somente em `backend/.env`. O bootstrap de permissões está em `backend/database/migration-role.sql`, aplicado uma única vez por um administrador após o schema inicial. A senha é definida separadamente. `backend/database/backend-role.sql` registra o bootstrap do login do Express e suas políticas.

Em banco novo, a primeira criação do schema precisa de uma conexão com `CREATE` no banco; depois, provisionam-se os logins e troca-se `DATABASE_URL` pela credencial restrita do Express. O migrador deste computador não cria outros schemas nem bancos.

## Tecnologias

| Camada | Bibliotecas |
| --- | --- |
| Frontend | React 19, Vite, React Router, React Hook Form, Recharts, CSS e SVG |
| Backend | Node.js, Express 5, pg, bcryptjs (bcrypt em JavaScript), jsonwebtoken, dotenv, cors, express-rate-limit |
| Banco | PostgreSQL no Supabase; migração SQL e seed próprios |
| Desenvolvimento | Node Test Runner, PGlite para testes, ESLint, Prettier e GitHub Actions |

## Requisitos

- Node.js 22.16 ou superior e npm.
- Projeto PostgreSQL no Supabase, ou PostgreSQL local para desenvolvimento.
- Acesso à internet para o banco remoto.
- Comunicar ao professor o banco escolhido e confirmar a aprovação das bibliotecas usadas, como pede o enunciado.

## Preparar o projeto

```bash
git clone https://github.com/Meina-A1/MoneyFinder.git
cd MoneyFinder
npm ci
npm run setup
```

O setup cria `backend/.env` com um `JWT_SECRET` aleatório, sem sobrescrever configurações existentes. Nunca versione esse arquivo.

1. No projeto do Supabase, abra **Connect** e escolha **Session pooler**, porta 5432. Essa conexão funciona em redes IPv4.
2. Copie a conexão para `DATABASE_URL` em `backend/.env`, substituindo a senha. Caracteres especiais na senha precisam de codificação de URL.
3. Mantenha `DATABASE_SSL=true`. Se necessário, baixe o certificado CA no painel e informe seu caminho em `DATABASE_CA_PATH`. A validação TLS permanece habilitada.
4. Em banco novo, configure `DATABASE_ADMIN_URL` com uma conexão que possa criar o schema; no checkout já configurado, o migrador tem propriedade de `financas`. Execute os comandos abaixo. O banco de destino deve ser exclusivo para esta aplicação.

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:3001/api

O Vite encaminha `/api` ao Express. Em terminais separados, use `npm run dev:backend` e `npm run dev:frontend`. Para PostgreSQL local sem TLS, ajuste `DATABASE_URL` e `DATABASE_SSL=false` somente no ambiente local.

## Dados fictícios para demonstração

O seed cria **2 usuários**, **3 meses de lançamentos por usuário**, categorias, contas e um cartão com compra parcelada. As datas acompanham o mês em que o seed é executado.

| E-mail | Senha de demonstração |
| --- | --- |
| ana@demo.local | Demo12345 |
| bruno@demo.local | Demo12345 |

Os CPFs são exemplos sintéticos para exercitar a validação. O seed não altera usuários que já tenham esses e-mails; repeti-lo preserva os dados existentes. Use essas contas apenas no banco destinado à demonstração acadêmica.

## Funcionalidades

- Cadastro com nome, e-mail, CPF com dígitos verificadores, senha e confirmação.
- E-mail e CPF normalizados e únicos no PostgreSQL; duplicatas retornam 409 junto ao campo.
- Senhas com bcrypt e salt; JWT HS256 com expiração de uma hora, emissor e audiência.
- Login, logout, recuperação da sessão em `sessionStorage`, rotas protegidas e retorno ao login em caso de 401/expiração.
- CRUD de categorias, fontes/destinos e lançamentos. Exclusão de itens vinculados é bloqueada.
- Filtros por período, tipo, categoria e fonte/destino; paginação com totais de todo o filtro.
- Parcelamento de compras no cartão em 1 a 48 vezes, com criação atômica em uma transação.
- Relatórios por categoria e por fonte/destino, com gráficos, percentuais e comparação com o período anterior.
- Fatura aberta e previsão das três seguintes, com fechamento, vencimento, parcelas, total e limite utilizado/disponível.
- Saúde financeira: três indicadores, projeção para três meses e dicas calculadas no backend.

## Regras financeiras

**Dinheiro:** valores são recebidos como reais com até duas casas decimais e persistidos como inteiros em centavos (`BIGINT`). Os campos da resposta com sufixo `_centavos` também usam centavos. R$ 100,00 em 3 vezes gera 3334 + 3333 + 3333 centavos; o resto fica na primeira parcela. Cada parcela precisa ter ao menos um centavo.

**Datas das parcelas:** `data_compra` preserva a compra original; `data` representa a competência mensal da parcela, com o dia ajustado ao último dia do mês quando necessário. Os relatórios por período usam `data`. A previsão de faturas usa a compra original e o número da parcela, evitando somar meses duas vezes. As datas de fatura são calculadas em UTC, e o dia atual segue America/Sao_Paulo.

**Fechamento:** compra anterior ao fechamento entra na fatura que fecha naquele mês. Compra no dia do fechamento ou depois entra na seguinte. As parcelas seguintes avançam um mês cada. Vencimento maior que o dia nominal de fechamento fica no mesmo mês; caso contrário, no mês seguinte. Dias inexistentes são ajustados ao fim do mês.

**Limite:** todas as parcelas cuja fatura ainda não venceu comprometem o limite, mesmo fora das quatro faturas exibidas. Como o modelo mínimo não tem baixa/pagamento, parcelas vencidas deixam de comprometê-lo pela data de vencimento. O disponível pode ficar negativo; o limite é informativo, sem bloqueio de compras.

**Edição:** editar um lançamento parcelado altera somente aquela parcela, preservando o identificador do grupo e a contagem original. O valor digitado é o valor da parcela. Para mudar a quantidade de parcelas, exclua a compra inteira e crie outra. Na exclusão, a interface permite escolher uma parcela ou todas.

**Comparação:** o período anterior contém exatamente o mesmo número de dias, imediatamente antes do escolhido. Um período de 30 dias pode não corresponder a um mês civil completo. Quando o total anterior é zero, a variação percentual é apresentada como sem base anterior.

**Saúde financeira:** taxa de poupança = (entradas - saídas) / entradas do mês; comprometimento = faturas da janela aberta e duas seguintes / (média de renda dos três meses anteriores × 3); parcelas futuras = parcelas com competência posterior a hoje. A projeção parte do saldo registrado até o fim do mês atual, soma a média das entradas e subtrai a média das saídas fora do cartão e as faturas conhecidas de cada mês futuro. Meses sem registros contam como zero. As dicas usam referências educativas de 20% de poupança, 30% de comprometimento e alerta de saldo negativo. A tela informa que são estimativas, e não uma garantia de resultado.

## Organização

```text
backend/
  database/           schema.sql, migração e seed
  src/
    server.js         app Express e inicialização
    config/           ambiente, pool pg e transações
    models/           consultas parametrizadas e regras de negócio
    routes/           rotas e controladores
    middlewares/      autenticação e erros centralizados
  tests/              testes HTTP, PostgreSQL e regras financeiras
frontend/
  src/
    App.jsx           rotas e navegação
    components/       páginas, formulários, gráficos e componentes
    contexts/         AuthContext e AuthProvider
    services/         cliente HTTP único, carregamento e formatação
scripts/              setup e inicialização simultânea
```

As funções puras de CPF, dinheiro, datas e faturas ficam em `backend/src/models/rules.js`. Os controladores ficam nos arquivos de rotas; não há pasta controllers. Consultas SQL ficam nos models; conexão e migração são responsabilidade da configuração e dos scripts de banco.

## Banco e segurança

O DDL está em `backend/database/schema.sql`. As quatro tabelas são `usuarios`, `categorias`, `fontes_destinos` e `lancamentos`, no schema privado `financas`. Há `UNIQUE`, `NOT NULL`, `CHECK`, índices e chaves estrangeiras compostas que impedem relacionamentos entre usuários e categorias de tipo incompatível.

O schema não deve ser adicionado aos schemas expostos pela Data API do Supabase. O acesso público ao schema/tabelas é revogado e RLS fica habilitada. As políticas `moneyfinder_backend` permitem acesso somente ao login privado `moneyfinder_app`, que recebe SELECT/INSERT em usuários e CRUD nas tabelas financeiras, sem privilégios administrativos ou de DDL. Esse login representa o servidor Express; a autorização de cada pessoa é feita na API por `usuario_id` obtido exclusivamente do JWT. Esse JWT próprio não é um token do Supabase Auth. Nunca coloque a conexão do banco, senha, JWT_SECRET ou chave privilegiada em variáveis `VITE_*`.

O pool `pg` mantém até 5 conexões. Uma transação usa sempre o mesmo cliente e o libera em `finally`. O Express valida os campos, usa parâmetros SQL, limita o JSON a 32 KB, restringe CORS à origem configurada e limita cadastro/login a 30 tentativas por 15 minutos por IP. A API nunca devolve `senha_hash`.

## Rotas

Todas as rotas são relativas a `/api`. Somente cadastro e login dispensam Bearer JWT.

| Método | Rota | Uso |
| --- | --- | --- |
| POST | /auth/cadastro | Criar conta e padrões, retornando token |
| POST | /auth/login | Login |
| GET | /auth/me | Usuário autenticado |
| GET, POST | /categorias | Listar/criar categorias |
| GET, PUT, DELETE | /categorias/:id | Detalhar/editar/excluir categoria |
| GET, POST | /fontes-destinos | Listar/criar fontes e destinos |
| GET, PUT, DELETE | /fontes-destinos/:id | Detalhar/editar/excluir fonte/destino |
| GET | /lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina= | Filtrar e paginar |
| POST | /lancamentos | Criar lançamento e parcelas |
| GET, PUT, DELETE | /lancamentos/:id | Detalhar/editar/excluir parcela |
| DELETE | /lancamentos/:id?todasParcelas=true | Excluir compra inteira |
| GET | /relatorios/categorias?inicio=&fim= | Totais, percentuais, comparação |
| GET | /relatorios/fontes-destinos?inicio=&fim= | Entradas, saídas e saldo por conta |
| GET | /relatorios/faturas?meses=3 | Aberta e 3 futuras; aceita 3 a 12 |
| GET | /saude-financeira | Indicadores, projeção e dicas |

Exemplo de criação:

```json
{
  "tipo": "saida",
  "descricao": "Notebook",
  "valor": "100.00",
  "data": "2026-12-28",
  "categoriaId": 3,
  "fonteDestinoId": 4,
  "totalParcelas": 3
}
```

IDs são exemplos: use os retornados pela conta autenticada. Erros seguem `{ "erro": "Mensagem", "campos": { "nomeDoCampo": "Detalhe" } }`. Status: 201 criado, 204 excluído, 400 dados inválidos, 401 sessão inválida, 404 recurso inexistente para o usuário, 409 conflito e 429 limite de tentativas.

## Verificar

```bash
npm run lint
npm test
npm run build
# Com a API em execução:
npm run demo:api
```

Os testes de integração usam **PGlite, um motor PostgreSQL embarcado**, apenas como dependência de desenvolvimento. Exercitam HTTP, SQL, chaves estrangeiras, unicidade, transações e regras de faturas sem precisar de credenciais. Não substituem o teste final da conexão real via `pg` com o Supabase.

Para produção local, execute `npm run build` e `npm start`; o Express também serve a SPA compilada. Em hospedagens separadas, configure `VITE_API_URL` antes do build e `FRONTEND_ORIGIN` no backend. GitHub Pages sozinho não executa Express nem hospeda o banco; este repositório tem CI de lint/testes/build e não publicação automática no Pages.

## Apoio e referências

O OpenAI Codex foi usado como apoio na implementação, documentação e verificações. Os integrantes devem revisar e ser capazes de explicar o código entregue.

- [Enunciado do Projeto 2](https://costasilvati.github.io/fullStack/projeto-2.html)
- [Conexão PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Transações com node-postgres](https://node-postgres.com/features/transactions)
- [Express](https://expressjs.com/)
- [React Router](https://reactrouter.com/)
- [Recharts](https://recharts.github.io/)
