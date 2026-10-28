import { useNow } from '../../shared/lib/use-now';
import { AuditLookup } from './audit-lookup';
import { Featured } from './featured';
import { HowItWorks } from './how-it-works';
import { Showcase } from './showcase';
import { useFeatured } from './use-featured';
import { useHashScroll } from './use-hash-scroll';
import './lots.css';

export function HomePage() {
  // um relógio só para a página: destaque e cards contam no mesmo segundo
  const now = useNow();
  const { featured, retry } = useFeatured();
  const offset = featured.status === 'ready' ? featured.offset : 0;
  // o destaque muda a altura ao carregar e empurraria a seção para fora da tela
  useHashScroll(featured.status !== 'loading');

  return (
    <div className="home-page">
      <Featured state={featured} now={now} onRetry={retry} />
      <Showcase now={now} offset={offset} />
      <HowItWorks />
      <AuditLookup />
    </div>
  );
}
