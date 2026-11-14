import { useResource } from '../services/useResource.js'
import { Link } from 'react-router'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import { currentDay, monthRange, money, date } from '../services/format.js'
import { params } from '../services/api.js'
import { ResourceState, Summary, PageTitle, Empty } from './common.jsx'
import { CategoryChart } from './Charts.jsx'
import Icon from './Icon.jsx'

export default function Dashboard() {
  const { usuario } = useAuth()
  const [month, setMonth] = useState(currentDay().slice(0, 7))
  const query = params(monthRange(month))
  const entries = useResource(`/lancamentos?${query}&porPagina=5`)
  const categories = useResource(`/relatorios/categorias?${query}`)
  return (
    <>
      <PageTitle
        eyebrow={`OLÁ, ${usuario.nome.split(' ')[0].toLocaleUpperCase('pt-BR')} ☀`}
        title="Um olhar sobre suas finanças."
      >
        Pequenos passos hoje. Mais tranquilidade amanhã.
      </PageTitle>
      <div className="toolbar">
        <label className="month-control">
          Seu resumo de{' '}
          <input
            type="month"
            aria-label="Mês do resumo"
            value={month}
            min="1900-01"
            max="2100-12"
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value)
            }}
          />
        </label>
        <Link className="button" to="/lancamentos?novo=1">
          <Icon name="plus" size={18} /> Novo lançamento
        </Link>
      </div>
      <ResourceState resource={entries}>
        {entries.data && (
          <>
            <Summary data={entries.data} />
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">NO SEU RITMO</span>
                    <h2>Últimas movimentações</h2>
                  </div>
                  <Link to="/lancamentos" className="text-link">
                    Ver todas <Icon name="chevron" size={15} />
                  </Link>
                </div>
                {entries.data.itens.length ? (
                  <div className="movement-list">
                    {entries.data.itens.map((r) => (
                      <div className="movement" key={r.id}>
                        <span className={`movement-icon ${r.tipo}`}>
                          <Icon name={r.tipo === 'entrada' ? 'arrow' : 'down'} size={19} />
                        </span>
                        <div>
                          <strong>{r.descricao}</strong>
                          <small>
                            {r.categoria_nome} · {date(r.data)}
                          </small>
                        </div>
                        <b className={r.tipo === 'entrada' ? 'positive' : ''}>
                          {r.tipo === 'entrada' ? '+' : '−'} {money(r.valor_centavos)}
                        </b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty title="Seu próximo passo começa aqui">
                    Registre uma entrada ou saída para acompanhar o mês.
                  </Empty>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">PARA ONDE VAI</span>
                    <h2>Despesas por categoria</h2>
                  </div>
                  <Icon name="chart" />
                </div>
                <ResourceState resource={categories}>
                  {categories.data && <CategoryChart data={categories.data.categorias} />}
                </ResourceState>
              </section>
            </div>
            <section className="planning-note">
              <span className="planning-icon">
                <Icon name="health" size={28} />
              </span>
              <div>
                <span className="eyebrow">OLHE UM POUCO MAIS À FRENTE</span>
                <h3>Seu futuro também merece atenção.</h3>
                <p>Acompanhe as próximas faturas e encontre espaço para os seus planos.</p>
              </div>
              <Link className="button secondary" to="/faturas">
                Ver minhas faturas <Icon name="arrow" size={16} />
              </Link>
            </section>
          </>
        )}
      </ResourceState>
    </>
  )
}
