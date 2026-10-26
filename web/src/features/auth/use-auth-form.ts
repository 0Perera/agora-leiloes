import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../../app/use-session';
import type { AuthResponse } from '../../shared/api/types';
import { authError } from './auth-errors';
import type { AuthErrors, AuthField, AuthForm } from './auth-errors';

type Values = Partial<Record<AuthField, string>>;

export function useAuthForm<V extends Values>(
  form: AuthForm,
  initial: V,
  send: (values: V) => Promise<AuthResponse>,
) {
  const { signIn } = useSession();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<AuthErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  function change(field: keyof V & AuthField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      fields: { ...current.fields, [field]: undefined },
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({ fields: {} });
    try {
      signIn(await send(values));
    } catch (error) {
      setErrors(authError(error, form, values));
      setSubmitting(false);
    }
  }

  return { values, errors, submitting, change, submit };
}
