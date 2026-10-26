import { Link } from 'react-router';
import { api } from '../../shared/api/client';
import type { Role, SignupRequest } from '../../shared/api/types';
import { AuthCard } from './auth-card';
import { FieldError, FormNotice, TextField } from './form-parts';
import { PasswordField } from './password-field';
import { useAuthForm } from './use-auth-form';

const initial: SignupRequest = { name: '', email: '', password: '', role: '' };

const roles: { id: Role; title: string; text: string }[] = [
  {
    id: 'BIDDER',
    title: 'Licitante',
    text: 'Deposita saldo simulado, dá lances ao vivo e arremata obras.',
  },
  {
    id: 'AUCTIONEER',
    title: 'Leiloeiro',
    text: 'Busca obras no acervo do museu e publica lotes. Não dá lances.',
  },
];

export function SignupPage() {
  const { values, errors, submitting, change, submit } = useAuthForm(
    'signup',
    initial,
    api.signup,
  );

  return (
    <AuthCard>
      <form className="auth-form" noValidate onSubmit={submit}>
        <div>
          <h1 className="page-title">Criar conta</h1>
          <p className="page-lede">
            Nos leilões, os outros participantes só veem um apelido. Seu nome e
            seu e-mail ficam só com a casa.
          </p>
        </div>
        {errors.notice && <FormNotice tone="error" notice={errors.notice} />}
        <RolePicker
          value={values.role}
          onChange={(role) => change('role', role)}
          error={errors.fields.role}
        />
        <TextField
          id="signup-name"
          label="Nome"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(value) => change('name', value)}
          error={errors.fields.name}
        />
        <TextField
          id="signup-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(value) => change('email', value)}
          error={errors.fields.email}
        />
        <PasswordField
          id="signup-password"
          autoComplete="new-password"
          value={values.password}
          onChange={(value) => change('password', value)}
          error={errors.fields.password}
          hint="Pelo menos 8 caracteres."
        />
        <button
          className="ag-btn ag-btn--primary auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </button>
        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </AuthCard>
  );
}

type RolePickerProps = {
  value: Role | '';
  onChange: (role: Role) => void;
  error?: string;
};

function RolePicker({ value, onChange, error }: RolePickerProps) {
  return (
    <fieldset className="role-fieldset" aria-describedby="role-note role-err">
      <legend className="ag-field__label role-legend">
        Como você vai usar a Ágora
      </legend>
      {roles.map((role, index) => {
        const on = value === role.id;
        return (
          <label key={role.id} className={on ? 'role-tile is-on' : 'role-tile'}>
            <input
              className="sr-only"
              type="radio"
              name="role"
              value={role.id}
              checked={on}
              onChange={() => onChange(role.id)}
            />
            <span className="role-num" aria-hidden="true">
              {index + 1}
            </span>
            <span className="role-body">
              <span className="role-head">
                <span className="role-title">{role.title}</span>
                {on && <span className="role-chosen">✓ Escolhido</span>}
              </span>
              <span className="role-text">{role.text}</span>
            </span>
          </label>
        );
      })}
      <span id="role-note" className="ag-field__hint">
        O papel não pode ser trocado depois.
      </span>
      <FieldError id="role-err" message={error} />
    </fieldset>
  );
}
