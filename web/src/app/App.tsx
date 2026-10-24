import { useEffect, useState } from 'react';
import { api } from '../shared/api/client';

type ApiStatus = 'loading' | 'ok' | 'down';

const labels: Record<ApiStatus, string> = {
  loading: 'verificando…',
  ok: 'ok',
  down: 'indisponível',
};

function App() {
  const [status, setStatus] = useState<ApiStatus>('loading');

  useEffect(() => {
    api
      .getHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('down'));
  }, []);

  return (
    <main>
      <h1>Ágora</h1>
      <p>API: {labels[status]}</p>
    </main>
  );
}

export default App;
