import { useRef } from 'react';
import { Link } from 'react-router';
import { useSession } from '../../app/use-session';
import { api } from '../../shared/api/client';
import type { LoginRequest } from '../../shared/api/types';
import { AuthCard } from './auth-card';
import { DemoAccountsBox } from './demo-accounts-box';
import { FormNotice, TextField } from './form-parts';
import { PasswordField } from './password-field';
import { useAuthForm } from './use-auth-form';

const initial: LoginRequest = { email: '', password: '' };

export function LoginPage() {
  const { expired } = useSession();
  const { values, errors, submitting, change, submit } = useAuthForm(
    'login',
    initial,
    api.login,
  );
  const showExpired = expired && !errors.notice;
  const submitRef = useRef<HTMLButtonElement>(null);

  function pick({ email, password }: LoginRequest) {
    change('email', email);
    change('password', password);
    submitRef.current?.focus();
  }

  return (
    <AuthCard>
      <form className="auth-form" noValidate onSubmit={submit}>
        <div>
          <h1 className="page-title">Bem-vindo de volta</h1>
          <p className="page-lede">
            Entre com o e-mail e a senha da sua conta.
          </p>
        </div>
        {showExpired && (
          <FormNotice
            tone="info"
            notice={{ text: 'Sua sessão expirou, entre de novo.' }}
          />
        )}
        {errors.notice && <FormNotice tone="error" notice={errors.notice} />}
        <TextField
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(value) => change('email', value)}
          error={errors.fields.email}
        />
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          value={values.password}
          onChange={(value) => change('password', value)}
          error={errors.fields.password}
        />
        <button
          ref={submitRef}
          className="ag-btn ag-btn--primary auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="auth-switch">
          Ainda não tem conta? <Link to="/signup">Criar conta</Link>
        </p>
      </form>
      <DemoAccountsBox onPick={pick} />
    </AuthCard>
  );
}
