import { useResource } from '../services/useResource.js'
import { Link } from 'react-router'
import { money, date, monthLabel } from '../services/format.js'
import { Empty, PageTitle, ResourceState } from './common.jsx'
import Icon from './Icon.jsx'

export default function InvoicesPage() {
  const state = useResource('/relatorios/faturas?meses=3')
  return (
    <>
      <PageTitle title="Sem surpresas na próxima fatura.">
        Veja a fatura aberta e as três seguintes, com cada parcela no seu lugar.
      </PageTitle>
      <ResourceState resource={state}>
        {state.data &&
          (state.data.cartoes.length ? (
            state.data.cartoes.map((card) => (
              <section key={card.id} className="invoice-section">
                <div className="card-overview">
                  <div className="card-identity">
                    <Icon name="card" size={30} />
                    <div>
                      <span className="eyebrow">SEU CARTÃO</span>
                      <h2>{card.nome}</h2>
                      <small>
                        Fecha dia {card.dia_fechamento} · vence dia {card.dia_vencimento}
                      </small>
                    </div>
                  </div>
                  <div className="limit-details">
                    <span>
                      Limite utilizado<strong>{money(card.utilizado_centavos)}</strong>
                    </span>
                    <span>
                      Disponível
                      <strong className={card.disponivel_centavos < 0 ? 'negative' : ''}>
                        {money(card.disponivel_centavos)}
                      </strong>
                    </span>
                    <span>
                      Limite total<strong>{money(card.limite_centavos)}</strong>
                    </span>
                  </div>
                  <progress
                    value={Math.min(card.utilizado_centavos, card.limite_centavos)}
                    max={card.limite_centavos}
                    aria-label={`Limite utilizado de ${card.nome}`}
                  />
                  <p>Todas as parcelas ainda não vencidas comprometem o limite.</p>
                </div>
                <div className="invoices-grid">
                  {card.faturas.map((bill, index) => (
                    <div className="panel invoice" key={bill.referencia}>
                      <span className={`pill ${index === 0 ? 'entrada' : 'neutral'}`}>
                        {index === 0 ? 'Fatura aberta' : `Previsão +${index}`}
                      </span>
                      <h3>{monthLabel(bill.referencia)}</h3>
                      <strong className="invoice-total">{money(bill.total_centavos)}</strong>
                      <dl>
                        <div>
                          <dt>Fechamento</dt>
                          <dd>{date(bill.fechamento)}</dd>
                        </div>
                        <div>
                          <dt>Vencimento</dt>
                          <dd>{date(bill.vencimento)}</dd>
                        </div>
                      </dl>
                      <div className="invoice-items">
                        {bill.itens.length ? (
                          bill.itens.map((item) => (
                            <div key={item.id}>
                              <span>
                                {item.descricao}
                                <small>
                                  Parcela {item.parcela_atual}/{item.total_parcelas}
                                </small>
                              </span>
                              <strong>{money(item.valor_centavos)}</strong>
                            </div>
                          ))
                        ) : (
                          <p>Nenhuma compra prevista.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <section className="panel">
              <Empty title="Seus cartões começam aqui">
                Cadastre um cartão de crédito em fontes e destinos para acompanhar as faturas.
              </Empty>
              <div className="center-action">
                <Link className="button" to="/fontes-destinos">
                  Cadastrar cartão <Icon name="plus" size={16} />
                </Link>
              </div>
            </section>
          ))}
      </ResourceState>
    </>
  )
}
