import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { authError } from './auth-errors';
import type { AuthField, AuthForm, AuthValues } from './auth-errors';

function validation(field: AuthField, rule: string): ApiError {
  return new ApiError(400, {
    code: 'VALIDATION_FAILED',
    fields: { [field]: rule },
  });
}

describe('authError', () => {
  it('mostra aviso de credenciais inválidas no formulário', () => {
    const result = authError(
      new ApiError(401, { code: 'INVALID_CREDENTIALS' }),
      'login',
      {},
    );
    expect(result.notice?.title).toBe('Não foi possível entrar');
  });

  it('mostra aviso de muitas tentativas no login bloqueado', () => {
    const result = authError(
      new ApiError(429, { code: 'TOO_MANY_ATTEMPTS' }),
      'login',
      {},
    );
    expect(result.notice).toEqual({
      title: 'Muitas tentativas.',
      text: 'Aguarde um minuto e tente de novo.',
    });
  });

  it('mostra e-mail já cadastrado sob o e-mail', () => {
    const result = authError(
      new ApiError(409, { code: 'EMAIL_TAKEN' }),
      'signup',
      {},
    );
    expect(result.fields.email).toBe(
      'Este e-mail já está cadastrado. Entre com ele ou use outro.',
    );
  });

  it.each<[AuthField, string, AuthForm, AuthValues, string]>([
    ['email', 'isEmail', 'login', { email: '' }, 'Informe seu e-mail.'],
    [
      'email',
      'isEmail',
      'signup',
      { email: 'ana@' },
      'Este e-mail não parece válido. Ex.: nome@dominio.com',
    ],
    ['password', 'isLength', 'signup', { password: '' }, 'Crie uma senha.'],
    ['password', 'isNotEmpty', 'login', { password: '' }, 'Informe sua senha.'],
    [
      'password',
      'isLength',
      'signup',
      { password: '1234' },
      'A senha precisa ter entre 8 e 128 caracteres.',
    ],
    [
      'role',
      'isIn',
      'signup',
      { role: '' },
      'Escolha se você vai participar como licitante ou leiloeiro.',
    ],
    ['name', 'isNotEmpty', 'signup', { name: '  ' }, 'Informe seu nome.'],
    [
      'name',
      'maxLength',
      'signup',
      { name: 'a'.repeat(101) },
      'Use no máximo 100 caracteres.',
    ],
  ])(
    'traduz %s com regra %s no formulário %s',
    (field, rule, form, values, message) => {
      const result = authError(validation(field, rule), form, values);
      expect(result.fields[field]).toBe(message);
    },
  );

  it.each([new ApiError(0), new ApiError(503), new TypeError('boom')])(
    'mostra aviso de conexão quando a API não responde (%s)',
    (error) => {
      const result = authError(error, 'login', {});
      expect(result.notice?.title).toBe('Não foi possível conectar.');
    },
  );
});
