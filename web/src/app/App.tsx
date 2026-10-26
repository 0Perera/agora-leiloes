import { RouterProvider } from 'react-router';
import { router } from './router';
import { SessionProvider } from './session-provider';

function expire() {
  void router.navigate('/login', { replace: true, state: { expired: true } });
}

function App() {
  return (
    <SessionProvider onExpire={expire}>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}

export default App;
