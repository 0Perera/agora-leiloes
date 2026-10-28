import { useNow } from '../../shared/lib/use-now';
import { Featured } from './featured';
import { HowItWorks } from './how-it-works';
import { Showcase } from './showcase';
import { useFeatured } from './use-featured';
import './lots.css';

export function HomePage() {
  // um relógio só para a página: destaque e cards contam no mesmo segundo
  const now = useNow();
  const { featured, retry } = useFeatured();
  const offset = featured.status === 'ready' ? featured.offset : 0;

  return (
    <div className="home-page">
      <Featured state={featured} now={now} onRetry={retry} />
      <Showcase now={now} offset={offset} />
      <HowItWorks />
    </div>
  );
}
