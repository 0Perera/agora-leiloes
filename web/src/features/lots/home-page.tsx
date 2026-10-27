import { useEffect, useState } from 'react';
import { Featured } from './featured';
import { HowItWorks } from './how-it-works';
import { Showcase } from './showcase';
import { useFeatured } from './use-featured';
import './lots.css';

// um relógio só para a página: destaque e cards contam no mesmo segundo
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function HomePage() {
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
