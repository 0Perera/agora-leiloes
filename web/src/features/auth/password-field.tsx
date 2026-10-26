import { useState } from 'react';
import { TextField } from './form-parts';

type Props = {
  id: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
};

export function PasswordField(props: Props) {
  const [shown, setShown] = useState(false);

  return (
    <TextField
      {...props}
      label="Senha"
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          className="password-toggle"
          type="button"
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
        >
          {shown ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  );
}
