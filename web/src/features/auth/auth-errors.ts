import { ApiError } from '../../shared/api/client';

export type AuthForm = 'login' | 'signup';
export type AuthField = 'name' | 'email' | 'password' | 'role';
export type AuthValues = Partial<Record<AuthField, string>>;

export type Notice = {
  title: string;
  text: string;
};

export type AuthErrors = {
  notice?: Notice;
  fields: Partial<Record<AuthField, string>>;
};

const invalidCredentials: Notice = {
  title: 'Não foi possível entrar',
  text: 'E-mail ou senha incorretos. Confira e tente de novo.',
};

const connectionFailed: Notice = {
  title: 'Não foi possível conectar.',
  text: 'Tente de novo.',
};

const emailTaken =
  'Este e-mail já está cadastrado. Entre com ele ou use outro.';
const emailInvalid = 'Este e-mail não parece válido. Ex.: nome@dominio.com';
const roleMissing =
  'Escolha se você vai participar como licitante ou leiloeiro.';

const emptyMessages: Record<AuthField, (form: AuthForm) => string> = {
  name: () => 'Informe seu nome.',
  email: () => 'Informe seu e-mail.',
  password: (form) =>
    form === 'signup' ? 'Crie uma senha.' : 'Informe sua senha.',
  role: () => roleMissing,
};

const maxLengths: Record<AuthField, number> = {
  name: 100,
  email: 254,
  password: 128,
  role: 0,
};

const ruleMessages: Record<string, (field: AuthField) => string> = {
  isEmail: () => emailInvalid,
  isLength: () => 'A senha precisa ter entre 8 e 128 caracteres.',
  maxLength: (field) => `Use no máximo ${maxLengths[field]} caracteres.`,
  isIn: () => roleMissing,
};

export function authError(
  error: unknown,
  form: AuthForm,
  values: AuthValues,
): AuthErrors {
  if (!(error instanceof ApiError))
    return { notice: connectionFailed, fields: {} };
  if (error.code === 'INVALID_CREDENTIALS')
    return { notice: invalidCredentials, fields: {} };
  if (error.code === 'EMAIL_TAKEN') return { fields: { email: emailTaken } };
  if (error.code === 'VALIDATION_FAILED' && error.fields)
    return { fields: fieldErrors(error.fields, form, values) };
  return { notice: connectionFailed, fields: {} };
}

function fieldErrors(
  fields: Record<string, string>,
  form: AuthForm,
  values: AuthValues,
): AuthErrors['fields'] {
  const errors: AuthErrors['fields'] = {};
  for (const [field, rule] of Object.entries(fields)) {
    if (isAuthField(field))
      errors[field] = fieldMessage(field, rule, values[field] ?? '', form);
  }
  return errors;
}

function isAuthField(field: string): field is AuthField {
  return field in emptyMessages;
}

function fieldMessage(
  field: AuthField,
  rule: string,
  value: string,
  form: AuthForm,
): string {
  // a API manda só a regra; campo vazio ganha a mensagem de "informe", não a da regra
  const empty = field === 'password' ? value === '' : value.trim() === '';
  if (empty) return emptyMessages[field](form);
  return ruleMessages[rule]?.(field) ?? 'Confira este campo.';
}
