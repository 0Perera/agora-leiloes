import type { ReactNode } from 'react';
import './niche.css';

export function Niche({ children }: { children: ReactNode }) {
  return (
    <div className="arch">
      <div className="arch__stage">{children}</div>
    </div>
  );
}
