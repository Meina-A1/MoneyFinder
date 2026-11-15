# Apresentação do MoneyFinder

Roteiro de ensaio do Projeto 2, baseado nas seções 10.11–10.14 do enunciado. Planejamento: 9 minutos, com 1 minuto de margem. Todos os integrantes devem estudar o código e conseguir explicar qualquer trecho.

## Antes da aula

- Confirmar com o professor a comunicação do PostgreSQL/Supabase e a aprovação das bibliotecas do README.
- Se a entrega for em dupla, confirmar a situação do histórico: o PDF pede commits de ambos; este repositório usa apenas Meina-A1, conforme a decisão do responsável.
- Revisar o código que recebeu auxílio de IA.
- Garantir internet, Node.js 22.16+ e credenciais em backend/.env. Fechar esse arquivo antes de compartilhar a tela.
- Ter as contas ana@demo.local e bruno@demo.local, ambas com senha fictícia Demo12345.
- Abrir editor, navegador e terminais. Instalar as dependências antes da apresentação.

## Preparar e executar pelo terminal

Na pasta MoneyFinder, em PowerShell:

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

O setup preserva o .env existente. Neste computador, db:migrate usa moneyfinder_migrator em DATABASE_ADMIN_URL, proprietário apenas de financas e seus objetos. O Express usa moneyfinder_app, sem DDL. Em banco novo, a primeira criação do schema exige uma conexão com CREATE no banco; seguir o README para o provisionamento. Não apagar o banco para repetir a apresentação: o DDL pode ser reaplicado e o seed preserva contas existentes.

Mostrar a subida dos serviços em dois terminais:

```powershell
npm.cmd run dev:backend
```

```powershell
npm.cmd run dev:frontend
```

Frontend: http://127.0.0.1:5173. API: http://127.0.0.1:3001/api. Se os serviços já estiverem rodando, encerrar as instâncias do próprio projeto com Ctrl+C antes de iniciá-las novamente.

Com a API em execução, demonstrar as requisições em outro terminal:

```powershell
npm.cmd run demo:api
```

Esse comando mostra 401 sem token, login das contas fictícias, 404 para acesso cruzado, 409 com campo de e-mail e depois CPF, e consultas aos relatórios. Não imprime tokens. As tentativas de cadastro são rejeitadas; nenhum cadastro ou lançamento é criado pelo roteiro.

## Sequência cronometrada

| Tempo      | Mostrar                           | Explicação e resultado esperado                                                                                                                                                        |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00  | Pastas, DDL e arquivos principais | React → Express → PostgreSQL; rotas/controladores, models, autenticação, erros e pool. UNIQUE, CHECK, NOT NULL e FKs compostas.                                                        |
| 1:00–2:00  | Terminal                          | Rodar db:migrate e db:seed; iniciar backend/frontend em terminais separados. O projeto PostgreSQL já está provisionado; o DDL é reaplicável.                                           |
| 2:00–3:15  | Cadastro no navegador             | Criar uma conta de ensaio. Sair e repetir o e-mail com outra capitalização e CPF diferente. Depois usar outro e-mail e o mesmo CPF com outra máscara. Mostrar o erro no campo correto. |
| 3:15–4:00  | Login e demo:api                  | Fazer login de Ana; demonstrar 401 e 404. O usuario_id vem exclusivamente do JWT validado no servidor.                                                                                 |
| 4:00–6:00  | CRUD                              | Criar, listar, editar e excluir uma categoria e uma conta sem vínculos; fazer o mesmo com um lançamento simples. Criar cartão e compra em 3 parcelas, como abaixo.                     |
| 6:00–8:15  | Filtros, relatórios e faturas     | Mostrar totais/paginação, categoria com percentual e comparação, fonte com entradas/saídas/saldo e a fatura de cada parcela.                                                           |
| 8:15–9:00  | Saúde financeira                  | Três indicadores, projeção com gráfico e dicas; explicar fórmulas e limitações.                                                                                                        |
| 9:00–10:00 | Perguntas ou margem               | Explicar o trecho solicitado; limpar os dados de ensaio pelo CRUD se houver tempo.                                                                                                     |

Para a conta nova: nome Carla Ensaio, e-mail `carla-ensaio-<identificador>@demo.local` e CPF sintético 123.456.789-09, se ainda estiver livre. Em ensaios posteriores, usar a conta já criada ou ajustar o cenário. Não usar dados pessoais reais.

## Exemplo de compra no fechamento

Na conta de Ana, criar “Cartão ensaio”: fechamento dia 25, vencimento dia 5, limite R$ 1.000,00. Criar saída de R$ 100,00 em 3 vezes, em categoria de saída, com data no dia 25 do mês atual.

Exemplo para novembro de 2026:

| Parcela | Valor    | Competência | Fechamento | Vencimento |
| ------- | -------- | ----------- | ---------- | ---------- |
| 1/3     | R$ 33,34 | 25/11/2026  | 25/12/2026 | 05/01/2027 |
| 2/3     | R$ 33,33 | 25/12/2026  | 25/01/2027 | 05/02/2027 |
| 3/3     | R$ 33,33 | 25/01/2027  | 25/02/2027 | 05/03/2027 |

Atualizar o mês da compra na aula para manter as parcelas na janela exibida. A referência da fatura é o mês do vencimento. Compra no fechamento entra no ciclo seguinte. data_compra mantém o dia original; data representa a competência mensal. A soma permanece R$ 100,00, com o resto na primeira parcela.

Editar uma parcela e explicar que as outras não mudam. Para limpar, excluir todas as parcelas da compra antes de remover o cartão. Exclusão de categoria/fonte vinculada é bloqueada.

## Mapa para estudar o código

| Arquivo                                 | O que explicar                                                           |
| --------------------------------------- | ------------------------------------------------------------------------ |
| backend/database/schema.sql             | Constraints, centavos e FKs compostas.                                   |
| backend/src/server.js                   | Inicialização, CORS, JSON limitado, montagem das rotas e erros.          |
| backend/src/config/database.js          | Pool pg; transação com o mesmo cliente; rollback e liberação no finally. |
| backend/src/models/users.js             | Normalização, validação, cadastro e tratamento de UNIQUE.                |
| backend/src/routes/auth.js              | bcrypt, salt, JWT de uma hora, emissor/audiência e rate limit.           |
| backend/src/middlewares/auth.js         | JWT validado e usuarioId obtido do sub.                                  |
| backend/src/models/catalogs.js          | CRUD, regras de cartão e exclusão com vínculos.                          |
| backend/src/models/entries.js           | Posse, filtros, totais e parcelamento atômico.                           |
| backend/src/models/rules.js             | CPF, centavos, divisão, datas e faturas.                                 |
| backend/src/models/reports.js           | Agregações, período anterior, limite e saúde financeira.                 |
| frontend/src/App.jsx                    | Rotas protegidas e navegação.                                            |
| frontend/src/contexts/AuthProvider.jsx  | sessionStorage, restauração, expiração e logout.                         |
| frontend/src/services/api.js            | Cliente único, Bearer e tratamento de 401.                               |
| frontend/src/components/EntriesPage.jsx | React Hook Form, erros de campo e atualização após CRUD.                 |
| frontend/src/components/ReportsPage.jsx | Consumo de dados agregados e gráficos.                                   |

## Perguntas de ensaio

- **Por que centavos inteiros?** Evitam arredondamentos de ponto flutuante; a divisão conserva a soma.
- **Como impedir acesso cruzado?** O middleware valida o token e as consultas filtram pelo usuario_id do JWT. FKs compostas impedem vínculos entre pessoas.
- **Por que UNIQUE no banco?** A validação prévia não impede duas requisições concorrentes; a API traduz 23505 para 409 com o campo.
- **Por que transação nas parcelas?** Todas são gravadas ou nenhuma.
- **Por que duas datas?** data_compra orienta a fatura; data representa a competência mensal da parcela.
- **O JWT usa Supabase Auth?** Não. O Express emite e valida o token; Supabase hospeda o PostgreSQL.
- **A RLS separa os usuários finais?** As políticas admitem somente a credencial privada do Express. A API separa usuários por usuario_id. O schema não é exposto na Data API.
- **Por que dois logins do banco?** moneyfinder_app faz o CRUD autorizado; moneyfinder_migrator é usado para DDL somente em financas.
- **Como funciona o limite?** Parcelas com faturas ainda não vencidas comprometem o limite. Não há baixa de pagamento no modelo mínimo; a limitação está no README.
- **A projeção garante o saldo futuro?** Não; usa médias históricas e faturas conhecidas.

## Rascunho para o professor

Revisar e enviar pessoalmente; nenhum envio foi realizado:

> Professor, estamos usando PostgreSQL hospedado no Supabase, API Node.js/Express e autenticação JWT no Projeto 2. As bibliotecas principais são React, Vite, React Router, React Hook Form, Recharts, pg, bcryptjs, jsonwebtoken, dotenv, cors e express-rate-limit; ESLint, Prettier e PGlite são usados em desenvolvimento/testes. Podemos confirmar a aprovação dessas escolhas? Repositório: https://github.com/Meina-A1/MoneyFinder. O histórico está atribuído somente a Meina-A1; precisamos confirmar se isso é aceito para a forma de entrega do trabalho.

A aprovação precisa vir do professor; este rascunho não comprova aprovação prévia.
