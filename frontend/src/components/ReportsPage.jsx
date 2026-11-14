import { useResource } from '../services/useResource.js'
import { useState } from 'react'
import { params } from '../services/api.js'
import { date, monthRange, money, typeLabel } from '../services/format.js'
import { Field, PageTitle, ResourceState } from './common.jsx'
import { CategoryChart, SourceChart } from './Charts.jsx'

export default function ReportsPage() {
  const [range, setRange] = useState(monthRange)
  const query = params(range)
  const categories = useResource(`/relatorios/categorias?${query}`)
  const sources = useResource(`/relatorios/fontes-destinos?${query}`)
  return (
    <>
      <PageTitle title="Os números contam uma história.">
        Entenda seus hábitos e compare o que mudou.
      </PageTitle>
      <div className="filters panel compact">
        <Field label="Data inicial" id="reportInicio">
          <input
            id="reportInicio"
            type="date"
            value={range.inicio}
            onChange={(e) => setRange((r) => ({ ...r, inicio: e.target.value }))}
          />
        </Field>
        <Field label="Data final" id="reportFim">
          <input
            id="reportFim"
            type="date"
            value={range.fim}
            onChange={(e) => setRange((r) => ({ ...r, fim: e.target.value }))}
          />
        </Field>
        <p>
          Os totais consideram todas as movimentações do período, independentemente da paginação.
        </p>
      </div>
      <ResourceState resource={categories}>
        {categories.data && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">POR CATEGORIA</span>
                <h2>O desenho das suas despesas</h2>
              </div>
              <strong>{money(categories.data.total_saidas_centavos)}</strong>
            </div>
            <CategoryChart data={categories.data.categorias} />
            <p className="comparison-note">
              Período anterior: {date(categories.data.periodoAnterior.inicio)} a{' '}
              {date(categories.data.periodoAnterior.fim)} · mesmo número de dias
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Total atual</th>
                    <th>% das saídas</th>
                    <th>Período anterior</th>
                    <th>Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.data.categorias.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.nome}</strong>
                      </td>
                      <td>{typeLabel[r.tipo]}</td>
                      <td>{money(r.total_centavos)}</td>
                      <td>{r.tipo === 'saida' ? `${r.percentual.toFixed(1)}%` : '—'}</td>
                      <td>{money(r.anterior_centavos)}</td>
                      <td>
                        {r.variacao === null
                          ? r.total_centavos
                            ? 'Sem base anterior'
                            : '—'
                          : `${r.variacao > 0 ? '+' : ''}${r.variacao.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </ResourceState>
      <ResourceState resource={sources}>
        {sources.data && (
          <section className="panel spaced">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">POR FONTE E DESTINO</span>
                <h2>Seus caminhos financeiros</h2>
              </div>
            </div>
            <SourceChart data={sources.data.fontesDestinos} />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fonte / destino</th>
                    <th>Tipo</th>
                    <th>Entradas</th>
                    <th>Saídas</th>
                    <th>Saldo das contas</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.data.fontesDestinos.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.nome}</strong>
                      </td>
                      <td>{typeLabel[r.tipo]}</td>
                      <td className="positive">{money(r.entradas_centavos)}</td>
                      <td>{money(r.saidas_centavos)}</td>
                      <td>{r.tipo === 'conta' ? money(r.saldo_centavos) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </ResourceState>
    </>
  )
}
