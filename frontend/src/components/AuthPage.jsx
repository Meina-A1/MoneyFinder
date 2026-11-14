import { validCpf } from '../services/validation.js'
import { serverErrors } from '../services/formErrors.js'
import { Link, Navigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import { Field, FormError } from './common.jsx'
import Icon from './Icon.jsx'

function maskCpf(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
export default function AuthPage({ registerMode = false }) {
  const { usuario, login, cadastrar, notice } = useAuth()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm()
  const [message, setMessage] = useState('')
  if (usuario) return <Navigate to={location.state?.from || '/'} replace />
  async function submit(data) {
    setMessage('')
    try {
      await (registerMode ? cadastrar(data) : login(data))
    } catch (error) {
      serverErrors(error, setError, setMessage)
    }
  }
  const control = (name, label, type = 'text', options = {}) => (
    <Field key={name} label={label} id={name} error={errors[name]}>
      <input
        id={name}
        type={type}
        autoComplete={
          name === 'senha'
            ? registerMode
              ? 'new-password'
              : 'current-password'
            : name === 'confirmacaoSenha'
              ? 'new-password'
              : name === 'nome'
                ? 'name'
                : name === 'email'
                  ? 'email'
                  : 'off'
        }
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...register(name, { required: 'Preencha este campo.', ...options })}
      />
    </Field>
  )
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="logo" size={25} />
          </span>
          money<span className="brand-light">finder</span>
          <span className="brand-dot">.</span>
        </Link>
        <div>
          <span className="eyebrow">UM RESPIRO PARA O SEU BOLSO</span>
          <h1>
            Menos contas
            <br />
            na cabeça.
            <br />
            <em>Mais clareza.</em>
          </h1>
          <p>Entenda para onde seu dinheiro vai e planeje o que vem pela frente.</p>
          <div className="auth-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <i>um passo de cada vez ↗</i>
          </div>
        </div>
        <small>Projeto 2 · Programação Web Fullstack</small>
      </section>
      <main className="auth-main">
        <div className="auth-form">
          <span className="mini-label">
            <Icon name="lock" size={15} /> SEU ESPAÇO FINANCEIRO
          </span>
          <h2>{registerMode ? 'Comece com clareza.' : 'Que bom ter você aqui.'}</h2>
          <p>
            {registerMode
              ? 'Crie sua conta e organize sua vida financeira.'
              : 'Entre para acompanhar suas finanças.'}
          </p>
          <FormError message={notice} />
          <form onSubmit={handleSubmit(submit)} noValidate>
            {registerMode &&
              control('nome', 'Seu nome', 'text', {
                minLength: { value: 2, message: 'Use pelo menos 2 caracteres.' },
                maxLength: 120,
              })}
            {control('email', 'E-mail', 'email', {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Informe um e-mail válido.',
              },
              maxLength: 160,
            })}
            {registerMode &&
              control('cpf', 'CPF', 'text', {
                onChange: (e) => {
                  e.target.value = maskCpf(e.target.value)
                },
                validate: (value) => validCpf(value) || 'Informe um CPF válido.',
              })}
            {control(
              'senha',
              'Senha',
              'password',
              registerMode
                ? {
                    minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' },
                    pattern: {
                      value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                      message: 'Inclua letras e números.',
                    },
                  }
                : {},
            )}
            {registerMode &&
              control('confirmacaoSenha', 'Confirmar senha', 'password', {
                validate: (value) =>
                  value === getValues('senha') || 'As senhas precisam ser iguais.',
              })}
            <FormError message={message} />
            <button className="button full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Aguarde…'
                : registerMode
                  ? 'Criar minha conta'
                  : 'Entrar na minha conta'}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {registerMode ? 'Já tem uma conta?' : 'Primeira vez por aqui?'}{' '}
            <Link to={registerMode ? '/login' : '/cadastro'}>
              {registerMode ? 'Entrar' : 'Criar conta'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
