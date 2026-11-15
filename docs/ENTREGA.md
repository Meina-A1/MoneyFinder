# Conferência da entrega — Projeto 2

Mapa da Tabela 10.7 e do roteiro da seção 10.11 do enunciado. Os pontos são pesos da rubrica, não uma nota atribuída.

| Critério                             | Peso | Evidência para conferir                                                                                                                            |
| ------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Cadastro validado no servidor     | 5    | models/users.js, rules.js, AuthPage.jsx; testes de campos/CPF/senha.                                                                               |
| 2. Unicidade e 409                   | 5    | UNIQUE no DDL, normalização, erro no campo e demo:api.                                                                                             |
| 3. Login/JWT/hash com salt           | 5    | routes/auth.js e middlewares/auth.js.                                                                                                              |
| 4. Isolamento                        | 5    | usuario_id nas consultas, FKs compostas e 404 no acesso cruzado.                                                                                   |
| 5. CRUD de categorias/fontes         | 7    | catalogs.js e CatalogPage.jsx; cartão e exclusão vinculada.                                                                                        |
| 6. CRUD de lançamentos               | 8    | entries.js e EntriesPage.jsx; valor/data/tipo/posse.                                                                                               |
| 7. Filtros/paginação/totais          | 5    | Totais de todo o filtro em entries.js; filtros na interface.                                                                                       |
| 8. Parcelamento                      | 5    | Transação, divisão dos centavos e rollback.                                                                                                        |
| 9. Relatório por categoria           | 7    | Totais, percentual, gráfico e período anterior.                                                                                                    |
| 10. Relatório por fonte              | 5    | Entradas, saídas, saldo e gráfico.                                                                                                                 |
| 11. Faturas                          | 8    | Fechamento, parcelas futuras, limite utilizado/disponível.                                                                                         |
| 12. API REST                         | 4    | Verbos, códigos HTTP e middleware único de erros.                                                                                                  |
| 13. Banco/pool                       | 4    | DDL, constraints, centavos e pool pg.                                                                                                              |
| 14. Segurança                        | 4    | .env ignorado, parâmetros SQL, validação, CORS e rate limit.                                                                                       |
| 15. Frontend                         | 5    | Rotas protegidas, AuthProvider, api.js e estados de carga/erro.                                                                                    |
| 16. Estrutura/docs/scripts/histórico | 3    | README, pastas, DDL, seed e commits separados. Ressalva: o PDF pede commits de ambos; o histórico usa somente Meina-A1 por decisão do responsável. |
| 17. Explicação por ambos             | 5    | Depende da apresentação e do domínio pessoal; estudar APRESENTACAO.md.                                                                             |
| 18. Execução pelo terminal           | 5    | Migração, seed, backend e frontend disponíveis; executar na aula.                                                                                  |
| 19. Roteiro em até 10 minutos        | 5    | Roteiro preparado; execução e tempo dependem do ensaio/apresentação.                                                                               |
| Saúde financeira                     | +10  | Três indicadores no backend, projeção com gráfico e dicas.                                                                                         |

Os critérios funcionais 1–15 somam 82 pontos possíveis. Evidências técnicas não garantem pontuação: a avaliação também depende da apresentação e da validação do professor.

## Verificação técnica

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run db:seed
# Com backend iniciado:
npm.cmd run demo:api
```

Os testes usam PostgreSQL embarcado/PGlite e não precisam das credenciais remotas. A conexão Supabase e os scripts de terminal são verificados separadamente. O DDL é reaplicável; o seed preserva os usuários existentes.

No checkout configurado, DATABASE_URL usa moneyfinder_app e DATABASE_ADMIN_URL usa moneyfinder_migrator. A segunda credencial é privada e limitada a financas, sem superusuário, criação de bancos ou de roles. Em instalação nova, configurar as credenciais localmente; o Git não fornece senhas do banco.

## Pendências do responsável

- Confirmar a comunicação do banco e aprovação prévia das bibliotecas, sem presumir aprovação retroativa.
- Confirmar a aceitação de autoria Git somente por Meina-A1 se a entrega for em dupla.
- Ensaiar com cronômetro e garantir que todos expliquem qualquer trecho.
- Conferir o prazo oficial no ambiente virtual e enviar o link pelo canal indicado na disciplina.

## Entregáveis

- Repositório: https://github.com/Meina-A1/MoneyFinder
- README: instalação, ambiente, regras, rotas e referências.
- Scripts DDL, seed, setup e execução.
- APRESENTACAO.md: roteiro e mapa de estudo.
- .github/workflows/ci.yml: lint, testes e build.

O enunciado pede link do repositório e apresentação. Supabase hospeda o banco; a API e o frontend são executados localmente na demonstração.
