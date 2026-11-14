import { useEffect, useRef, useState } from 'react'
import { money } from '../services/format.js'
import Icon from './Icon.jsx'

export function ResourceState({ resource, children }) {
  if (resource.loading)
    return (
      <div className="loading-state" role="status">
        <span className="spinner" /> Carregando seus dados…
      </div>
    )
  if (resource.error)
    return (
      <div className="alert" role="alert">
        <p>{resource.error}</p>
        <button className="button secondary" onClick={resource.retry}>
          Tentar novamente
        </button>
      </div>
    )
  return children
}
export function Empty({ title = 'Ainda não há registros', children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="wallet" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children || 'Adicione seu primeiro registro para começar.'}</p>
    </div>
  )
}
export function PageTitle({ eyebrow = 'SEU DINHEIRO, MAIS CLARO', title, children, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}
export function Summary({ data }) {
  return (
    <div className="summary-grid">
      {[
        ['Entradas', data.entradas_centavos, 'arrow', 'income'],
        ['Saídas', data.saidas_centavos, 'down', 'expense'],
        ['Saldo do período', data.saldo_centavos, 'wallet', 'balance'],
      ].map(([label, value, icon, cls]) => (
        <div className={`stat-card ${cls}`} key={label}>
          <div className="stat-label">
            {label}
            <span>
              <Icon name={icon} />
            </span>
          </div>
          <strong>{money(value)}</strong>
          <small>{cls === 'balance' ? 'Entradas menos saídas' : 'No período selecionado'}</small>
        </div>
      ))}
    </div>
  )
}
export function Field({ label, error, id, children }) {
  return (
    <div className={`field ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error.message || error}
        </span>
      )}
    </div>
  )
}
export function Modal({ title, children, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button aria-label="Fechar janela" className="icon-button" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function FormError({ message }) {
  return message ? (
    <div className="alert" role="alert">
      {message}
    </div>
  ) : null
}
export function ConfirmDelete({ item, onClose, onDelete, installments = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [all, setAll] = useState(false)
  async function confirm() {
    setBusy(true)
    try {
      await onDelete(all)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Excluir registro?" onClose={onClose}>
      <p className="modal-copy">
        Você está excluindo <strong>{item.nome || item.descricao}</strong>. Essa ação não poderá ser
        desfeita.
      </p>
      {installments && (
        <label className="checkbox-row">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Excluir
          todas as parcelas desta compra
        </label>
      )}
      <FormError message={error} />
      <div className="form-actions">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="button danger" onClick={confirm} disabled={busy}>
          {busy ? 'Excluindo…' : 'Confirmar exclusão'}
        </button>
      </div>
    </Modal>
  )
}
