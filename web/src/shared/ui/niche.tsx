import type { ReactNode } from 'react';
import './niche.css';

export function Niche({ children }: { children: ReactNode }) {
  return (
    <div className="niche">
      <div className="niche__stage">{children}</div>
    </div>
  );
}
