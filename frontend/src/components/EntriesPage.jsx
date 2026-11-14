import { serverErrors } from '../services/formErrors.js'
import { useResource } from '../services/useResource.js'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { api, params } from '../services/api.js'
import { currentDay, monthRange, money, date, typeLabel } from '../services/format.js'
import {
  ResourceState,
  PageTitle,
  Summary,
  Field,
  Modal,
  Empty,
  ConfirmDelete,
  FormError,
} from './common.jsx'
import Icon from './Icon.jsx'

function EntryForm({ item, categories, sources, onClose, onSaved }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: item
      ? {
          tipo: item.tipo,
          descricao: item.descricao,
          valor: (item.valor_centavos / 100).toFixed(2),
          data: item.data,
          categoriaId: item.categoria_id,
          fonteDestinoId: item.fonte_destino_id,
          totalParcelas: item.total_parcelas,
        }
      : { tipo: 'saida', data: currentDay(), totalParcelas: 1 },
  })
  const [message, setMessage] = useState('')
  const type = useWatch({ control, name: 'tipo' })
  const sourceId = useWatch({ control, name: 'fonteDestinoId' })
  const source = sources.find((s) => s.id === Number(sourceId))
  const input = (name, label, inputType, options = {}, attrs = {}) => (
    <Field label={label} id={name} error={errors[name]}>
      <input
        id={name}
        type={inputType}
        aria-invalid={!!errors[name]}
        {...register(name, { required: 'Preencha este campo.', ...options })}
        {...attrs}
      />
    </Field>
  )
  async function submit(data) {
    setMessage('')
    try {
      await api(`/lancamentos${item ? `/${item.id}` : ''}`, {
        method: item ? 'PUT' : 'POST',
        body: {
          ...data,
          totalParcelas: item
            ? item.total_parcelas
            : source?.tipo === 'cartao_credito'
              ? data.totalParcelas
              : 1,
        },
      })
      onSaved()
      onClose()
    } catch (e) {
      serverErrors(e, setError, setMessage)
    }
  }
  return (
    <Modal
      title={
        item
          ? `Editar ${item.total_parcelas > 1 ? `parcela ${item.parcela_atual}/${item.total_parcelas}` : 'lançamento'}`
          : 'Novo lançamento'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Tipo de movimentação" id="tipo" error={errors.tipo}>
          <select
            id="tipo"
            {...register('tipo', {
              onChange: () => {
                setValue('categoriaId', '')
                setValue('fonteDestinoId', '')
              },
            })}
          >
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
        </Field>
        {input(
          'descricao',
          'Descrição',
          'text',
          { maxLength: { value: 120, message: 'Use até 120 caracteres.' } },
          { autoFocus: true, placeholder: 'Ex.: Compra no supermercado' },
        )}
        <div className="form-grid">
          {input(
            'valor',
            item?.total_parcelas > 1 ? 'Valor desta parcela (R$)' : 'Valor total (R$)',
            'number',
            { min: { value: 0.01, message: 'O valor deve ser positivo.' } },
            { min: '0.01', step: '0.01' },
          )}
          {input(
            'data',
            item?.total_parcelas > 1 ? 'Data desta parcela' : 'Data da compra / movimento',
            'date',
            {},
            { min: '1900-01-01', max: '2100-12-31' },
          )}
        </div>
        <div className="form-grid">
          <Field label="Categoria" id="categoriaId" error={errors.categoriaId}>
            <select
              id="categoriaId"
              {...register('categoriaId', { required: 'Selecione uma categoria.' })}
            >
              <option value="">Selecione</option>
              {categories
                .filter((c) => c.tipo === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            label={type === 'entrada' ? 'Fonte' : 'Destino'}
            id="fonteDestinoId"
            error={errors.fonteDestinoId}
          >
            <select
              id="fonteDestinoId"
              {...register('fonteDestinoId', { required: 'Selecione uma fonte/destino.' })}
            >
              <option value="">Selecione</option>
              {sources
                .filter(
                  (s) =>
                    s.tipo === 'conta' ||
                    s.tipo === (type === 'entrada' ? 'renda' : 'cartao_credito'),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        {source?.tipo === 'cartao_credito' &&
          !item &&
          input(
            'totalParcelas',
            'Número de parcelas',
            'number',
            {
              min: { value: 1, message: 'Use de 1 a 48.' },
              max: { value: 48, message: 'Use de 1 a 48.' },
            },
            { min: '1', max: '48' },
          )}
        {!item && source?.tipo === 'cartao_credito' && (
          <p className="form-hint">
            O valor total será dividido em centavos. A primeira parcela recebe a diferença do
            arredondamento.
          </p>
        )}
        {item?.total_parcelas > 1 && (
          <p className="form-hint">
            Esta edição altera apenas a parcela selecionada. Para refazer o parcelamento, exclua a
            compra e cadastre outra.
          </p>
        )}
        <FormError message={message} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
export default function EntriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const [filters, setFilters] = useState({
    ...monthRange(),
    tipo: '',
    categoriaId: '',
    fonteDestinoId: '',
    pagina: 1,
  })
  const state = useResource(`/lancamentos?${params(filters)}`, version)
  const categories = useResource('/categorias', version)
  const sources = useResource('/fontes-destinos', version)
  const [editing, setEditing] = useState(() => (searchParams.has('novo') ? null : undefined))
  const [deleting, setDeleting] = useState(null)
  const refresh = () => setVersion((v) => v + 1)
  function close() {
    setEditing(undefined)
    if (searchParams.has('novo')) setSearchParams({}, { replace: true })
  }
  function filter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, pagina: 1 }))
  }
  return (
    <>
      <PageTitle
        title="Cada movimento conta."
        action={
          <button className="button" onClick={() => setEditing(null)}>
            <Icon name="plus" size={18} /> Novo lançamento
          </button>
        }
      >
        Acompanhe suas entradas, despesas e compras parceladas.
      </PageTitle>
      <form className="filters panel" onSubmit={(e) => e.preventDefault()}>
        <Field label="De" id="inicio">
          <input
            id="inicio"
            type="date"
            value={filters.inicio}
            onChange={(e) => filter('inicio', e.target.value)}
          />
        </Field>
        <Field label="Até" id="fim">
          <input
            id="fim"
            type="date"
            value={filters.fim}
            onChange={(e) => filter('fim', e.target.value)}
          />
        </Field>
        <Field label="Tipo" id="filterTipo">
          <select
            id="filterTipo"
            value={filters.tipo}
            onChange={(e) => filter('tipo', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </Field>
        <Field label="Categoria" id="filterCategoria">
          <select
            id="filterCategoria"
            value={filters.categoriaId}
            onChange={(e) => filter('categoriaId', e.target.value)}
          >
            <option value="">Todas</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({typeLabel[c.tipo]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fonte / destino" id="filterFonte">
          <select
            id="filterFonte"
            value={filters.fonteDestinoId}
            onChange={(e) => filter('fonteDestinoId', e.target.value)}
          >
            <option value="">Todos</option>
            {sources.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Field>
      </form>
      {categories.error && <ResourceState resource={categories} />}
      {sources.error && <ResourceState resource={sources} />}
      <ResourceState resource={state}>
        {state.data && (
          <>
            <Summary data={state.data} />
            <section className="panel">
              <div className="panel-heading">
                <h2>Seus lançamentos</h2>
                <span className="pill neutral">{state.data.quantidade} registros</span>
              </div>
              {state.data.itens.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Fonte / destino</th>
                        <th>Valor</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.itens.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.descricao}</strong>
                            {r.total_parcelas > 1 && (
                              <small className="subline">
                                Parcela {r.parcela_atual}/{r.total_parcelas}
                              </small>
                            )}
                          </td>
                          <td>{date(r.data)}</td>
                          <td>{r.categoria_nome}</td>
                          <td>{r.fonte_destino_nome}</td>
                          <td className={`amount ${r.tipo === 'entrada' ? 'positive' : ''}`}>
                            {r.tipo === 'entrada' ? '+' : '−'} {money(r.valor_centavos)}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="icon-button"
                                aria-label={`Editar ${r.descricao}`}
                                onClick={() => setEditing(r)}
                              >
                                <Icon name="edit" size={17} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Excluir ${r.descricao}`}
                                onClick={() => setDeleting(r)}
                              >
                                <Icon name="trash" size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Nenhum lançamento neste período">
                  Ajuste os filtros ou registre uma nova movimentação.
                </Empty>
              )}
              <div className="pagination">
                <span>
                  Página {state.data.pagina} de {state.data.paginas}
                </span>
                <div>
                  <button
                    className="button secondary small"
                    disabled={filters.pagina <= 1}
                    onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina - 1 }))}
                  >
                    Anterior
                  </button>
                  <button
                    className="button secondary small"
                    disabled={filters.pagina >= state.data.paginas}
                    onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina + 1 }))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </ResourceState>
      {editing !== undefined &&
        (categories.loading || sources.loading ? (
          <Modal title="Carregando opções" onClose={close}>
            <ResourceState resource={categories.loading ? categories : sources} />
          </Modal>
        ) : categories.error || sources.error ? (
          <Modal title="Não foi possível carregar as opções" onClose={close}>
            <ResourceState resource={categories.error ? categories : sources} />
          </Modal>
        ) : (
          <EntryForm
            item={editing}
            categories={categories.data || []}
            sources={sources.data || []}
            onClose={close}
            onSaved={refresh}
          />
        ))}
      {deleting && (
        <ConfirmDelete
          item={deleting}
          installments={deleting.total_parcelas > 1}
          onClose={() => setDeleting(null)}
          onDelete={async (all) => {
            await api(`/lancamentos/${deleting.id}?todasParcelas=${all}`, { method: 'DELETE' })
            refresh()
          }}
        />
      )}
    </>
  )
}
