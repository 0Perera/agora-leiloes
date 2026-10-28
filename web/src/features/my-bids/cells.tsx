import { lotImageUrl } from '../../shared/api/client';
import { lotLabel, toRoman } from '../../shared/lib/roman';

export function NumCell({ number }: { number: number }) {
  const roman = toRoman(number);
  return (
    <div className="bids-num" role="cell" aria-label={lotLabel(number)}>
      <span aria-hidden="true">{roman ?? number}</span>
      {roman && (
        <span className="bids-num-plain" aria-hidden="true">
          nº {number}
        </span>
      )}
    </div>
  );
}

type WorkProps = { id: number; title: string; artist: string };

export function WorkCell({ id, title, artist }: WorkProps) {
  return (
    <div className="bids-work" role="cell">
      <span className="bids-thumb" aria-hidden="true">
        <img
          className="bids-thumb-image"
          src={lotImageUrl(id)}
          alt=""
          loading="lazy"
        />
      </span>
      <span className="bids-work-text">
        <span className="bids-work-title">{title}</span>
        <span className="bids-work-artist">{artist}</span>
      </span>
    </div>
  );
}
