import { useResource } from '../services/useResource.js'
import { money, monthLabel } from '../services/format.js'
import { PageTitle, ResourceState } from './common.jsx'
import { ProjectionChart } from './Charts.jsx'
import Icon from './Icon.jsx'

export default function HealthPage() {
  const state = useResource('/saude-financeira')
  return (
    <>
      <PageTitle title="Cuide dos seus próximos passos.">
        Indicadores para refletir sobre seus hábitos e planejar com mais calma.
      </PageTitle>
      <ResourceState resource={state}>
        {state.data && (
          <>
            <div className="summary-grid">
              {[
                [
                  'Taxa de poupança',
                  state.data.taxa_poupanca === null
                    ? 'Sem entradas'
                    : `${state.data.taxa_poupanca.toFixed(1)}%`,
                  'Do mês atual',
                ],
                [
                  'Comprometimento com cartões',
                  state.data.comprometimento_cartoes === null
                    ? 'Sem histórico de renda'
                    : `${state.data.comprometimento_cartoes.toFixed(1)}%`,
                  'Faturas na janela de 3 meses / renda média × 3',
                ],
                [
                  'Parcelas futuras',
                  money(state.data.parcelas_futuras_centavos),
                  'Valores registrados após a data de hoje',
                ],
              ].map(([label, value, hint]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-label">{label}</div>
                  <strong>{value}</strong>
                  <small>{hint}</small>
                </div>
              ))}
            </div>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">OLHANDO ADIANTE</span>
                  <h2>Projeção para os próximos três meses</h2>
                </div>
                <Icon name="health" />
              </div>
              <ProjectionChart data={state.data.projecoes} />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Faturas conhecidas</th>
                      <th>Saldo projetado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.projecoes.map((r) => (
                      <tr key={r.mes}>
                        <td>{monthLabel(r.mes)}</td>
                        <td>{money(r.faturas_centavos)}</td>
                        <td>{money(r.saldo_centavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="comparison-note">
                Estimativa educativa: saldo registrado + média de receitas e despesas fora do cartão
                dos 3 meses anteriores − faturas conhecidas. Meses sem registros contam como zero.
                Compras novas e mudanças de renda alteram a projeção.
              </p>
            </section>
            <section className="tips-grid">
              {state.data.dicas.map((tip) => (
                <div className="tip" key={tip}>
                  <Icon name="health" size={23} />
                  <p>{tip}</p>
                </div>
              ))}
            </section>
          </>
        )}
      </ResourceState>
    </>
  )
}
