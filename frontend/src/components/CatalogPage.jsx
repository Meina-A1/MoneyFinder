import { serverErrors } from '../services/formErrors.js'
import { useResource } from '../services/useResource.js'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { api } from '../services/api.js'
import { money, typeLabel } from '../services/format.js'
import {
  ResourceState,
  PageTitle,
  Field,
  Modal,
  Empty,
  ConfirmDelete,
  FormError,
} from './common.jsx'
import Icon from './Icon.jsx'

function CatalogForm({ item, category, onClose, onSaved }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: item
      ? {
          nome: item.nome,
          tipo: item.tipo,
          diaFechamento: item.dia_fechamento,
          diaVencimento: item.dia_vencimento,
          limite: item.limite_centavos ? (item.limite_centavos / 100).toFixed(2) : '',
        }
      : { nome: '', tipo: category ? 'saida' : 'conta' },
  })
  const [message, setMessage] = useState('')
  const card = useWatch({ control, name: 'tipo' }) === 'cartao_credito'
  async function submit(data) {
    setMessage('')
    try {
      await api(`/${category ? 'categorias' : 'fontes-destinos'}${item ? `/${item.id}` : ''}`, {
        method: item ? 'PUT' : 'POST',
        body: data,
      })
      onSaved()
      onClose()
    } catch (e) {
      serverErrors(e, setError, setMessage)
    }
  }
  return (
    <Modal
      title={`${item ? 'Editar' : 'Nova'} ${category ? 'categoria' : 'fonte ou destino'}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Nome" id="nome" error={errors.nome}>
          <input
            id="nome"
            autoFocus
            aria-invalid={!!errors.nome}
            {...register('nome', {
              required: 'Informe o nome.',
              maxLength: { value: 60, message: 'Use até 60 caracteres.' },
            })}
            placeholder={category ? 'Ex.: Educação' : 'Ex.: Minha conta ou cartão'}
          />
        </Field>
        <Field label="Tipo" id="tipo" error={errors.tipo}>
          <select id="tipo" {...register('tipo')}>
            {(category ? ['entrada', 'saida'] : ['conta', 'renda', 'cartao_credito']).map(
              (value) => (
                <option key={value} value={value}>
                  {typeLabel[value]}
                </option>
              ),
            )}
          </select>
        </Field>
        {card && (
          <>
            <div className="form-grid">
              <Field label="Dia do fechamento" id="diaFechamento" error={errors.diaFechamento}>
                <input
                  id="diaFechamento"
                  type="number"
                  min="1"
                  max="31"
                  {...register('diaFechamento', {
                    required: 'Informe o dia.',
                    min: { value: 1, message: 'Use de 1 a 31.' },
                    max: { value: 31, message: 'Use de 1 a 31.' },
                  })}
                />
              </Field>
              <Field label="Dia do vencimento" id="diaVencimento" error={errors.diaVencimento}>
                <input
                  id="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  {...register('diaVencimento', {
                    required: 'Informe o dia.',
                    min: { value: 1, message: 'Use de 1 a 31.' },
                    max: { value: 31, message: 'Use de 1 a 31.' },
                  })}
                />
              </Field>
            </div>
            <Field label="Limite (R$)" id="limite" error={errors.limite}>
              <input
                id="limite"
                type="number"
                min="0.01"
                step="0.01"
                {...register('limite', {
                  required: 'Informe o limite.',
                  min: { value: 0.01, message: 'Informe um limite positivo.' },
                })}
              />
            </Field>
            <p className="form-hint">
              Compras feitas no dia do fechamento entram na próxima fatura.
            </p>
          </>
        )}
        <FormError message={message} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
export default function CatalogPage({ category = false }) {
  const [version, setVersion] = useState(0)
  const resource = category ? 'categorias' : 'fontes-destinos'
  const state = useResource(`/${resource}`, version)
  const [editing, setEditing] = useState(undefined)
  const [deleting, setDeleting] = useState(null)
  const refresh = () => setVersion((v) => v + 1)
  return (
    <>
      <PageTitle
        title={category ? 'Um lugar para cada movimento.' : 'De onde vem. Para onde vai.'}
        action={
          <button className="button" onClick={() => setEditing(null)}>
            <Icon name="plus" size={18} /> {category ? 'Nova categoria' : 'Nova fonte ou destino'}
          </button>
        }
      >
        {category
          ? 'Organize suas entradas e saídas do seu jeito.'
          : 'Reúna suas contas, fontes de renda e cartões de crédito.'}
      </PageTitle>
      <section className="panel">
        <div className="panel-heading">
          <h2>{category ? 'Suas categorias' : 'Suas fontes e destinos'}</h2>
          <span className="pill neutral">{state.data?.length || 0} registros</span>
        </div>
        <ResourceState resource={state}>
          {state.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    {!category && (
                      <>
                        <th>Fechamento / vencimento</th>
                        <th>Limite</th>
                      </>
                    )}
                    <th className="actions-heading">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="table-name">
                          <span className="table-icon">
                            <Icon
                              name={
                                category
                                  ? 'category'
                                  : r.tipo === 'cartao_credito'
                                    ? 'card'
                                    : 'wallet'
                              }
                              size={18}
                            />
                          </span>
                          {r.nome}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${r.tipo}`}>{typeLabel[r.tipo]}</span>
                      </td>
                      {!category && (
                        <>
                          <td>
                            {r.tipo === 'cartao_credito'
                              ? `Dia ${r.dia_fechamento} / dia ${r.dia_vencimento}`
                              : '—'}
                          </td>
                          <td>{r.limite_centavos ? money(r.limite_centavos) : '—'}</td>
                        </>
                      )}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Editar ${r.nome}`}
                            onClick={() => setEditing(r)}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Excluir ${r.nome}`}
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
            <Empty />
          )}
        </ResourceState>
      </section>
      {editing !== undefined && (
        <CatalogForm
          category={category}
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <ConfirmDelete
          item={deleting}
          onClose={() => setDeleting(null)}
          onDelete={async () => {
            await api(`/${resource}/${deleting.id}`, { method: 'DELETE' })
            refresh()
          }}
        />
      )}
    </>
  )
}
