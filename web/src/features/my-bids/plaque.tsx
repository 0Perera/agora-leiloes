import type { ReactNode } from 'react';
import { lotImageUrl } from '../../shared/api/client';
import { lotLabel } from '../../shared/lib/roman';

export type Tone = 'blue' | 'red' | 'neutral';

export type Fact = {
  label: string;
  value: ReactNode;
  paid?: boolean;
  plain?: boolean;
  muted?: boolean;
  urgent?: boolean;
};

type Props = {
  id: number;
  number: number;
  artworkId: number;
  title: string;
  artist: string;
  tag: { text: string; tone: Tone };
  facts: Fact[];
  children: ReactNode;
};

function valueClass(fact: Fact): string {
  const classes = ['bids-plaque__value'];
  if (fact.paid) classes.push('bids-plaque__value--paid');
  if (fact.plain) classes.push('bids-plaque__value--plain');
  if (fact.muted) classes.push('bids-plaque__value--muted');
  if (fact.urgent) classes.push('bids-plaque__value--urgent');
  return classes.join(' ');
}

export function Plaque({
  id,
  number,
  artworkId,
  title,
  artist,
  tag,
  facts,
  children,
}: Props) {
  return (
    <article
      className="bids-plaque"
      aria-label={`${lotLabel(number)}, ${tag.text}`}
    >
      <span className={`bids-plaque__tag bids-plaque__tag--${tag.tone}`}>
        {tag.text}
      </span>
      <div className="bids-plaque__wall">
        <img
          className="bids-plaque__image"
          src={lotImageUrl(id, artworkId)}
          alt={`Imagem de ${title}`}
          loading="lazy"
        />
      </div>
      <div className="bids-plaque__body">
        <div>
          <p className="bids-plaque__lot">{lotLabel(number)}</p>
          <h3 className="bids-plaque__title">{title}</h3>
          <p className="bids-plaque__artist">{artist}</p>
        </div>
        <dl className="bids-plaque__facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="ag-lot__label">{fact.label}</dt>
              <dd className={valueClass(fact)}>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="bids-plaque__actions">{children}</div>
      </div>
    </article>
  );
}
