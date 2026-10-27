import { Link } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { LotDetail } from '../../shared/api/types';
import { secondsLeft, splitLeft } from '../../shared/lib/countdown';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import type { Featured as FeaturedState } from './use-featured';

const urgentSeconds = 120;

type Props = {
  state: FeaturedState;
  now: number;
  onRetry: () => void;
};

export function Featured({ state, now, onRetry }: Props) {
  if (state.status === 'none') return null;
  if (state.status === 'loading') return <FeaturedSkeleton />;
  if (state.status === 'error') return <FeaturedError onRetry={onRetry} />;
  return <FeaturedLot lot={state.lot} now={now} offset={state.offset} />;
}

function FeaturedLot({
  lot,
  now,
  offset,
}: {
  lot: LotDetail;
  now: number;
  offset: number;
}) {
  const live = lot.status === 'live';
  const hasBids = lot.currentBid !== null;

  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="home-hero__text">
        <p className="home-kicker">
          {live ? 'Em destaque agora' : 'Próximo leilão'}
        </p>
        <div className="home-hero__tags">
          <span
            className={`ag-badge ${live ? 'ag-badge--live' : 'ag-badge--scheduled'}`}
          >
            {live ? 'Ao vivo' : 'Agendado'}
          </span>
          <span className="home-kicker">{lotLabel(lot.number)}</span>
        </div>
        <div>
          <h1 id="hero-title" className="home-hero__title">
            {lot.title}
          </h1>
          <p className="home-hero__artist">{lot.artist}</p>
        </div>
        {lot.description && (
          <p className="home-hero__description">{lot.description}</p>
        )}
        <div className="home-hero__facts">
          <div>
            <span className="ag-lot__label">
              {hasBids ? 'Lance atual' : 'Lance inicial'}
            </span>
            <span className="home-hero__price">
              {formatMoney(lot.currentBid ?? lot.startingBid)}
            </span>
          </div>
          <div>
            <span className="ag-lot__label">Aumento mínimo</span>
            <span className="home-hero__fact home-hero__fact--gold">
              + {formatMoney(lot.increment)}
            </span>
          </div>
          <div>
            <span className="ag-lot__label">Lances</span>
            <span className="home-hero__fact">{lot.bidCount}</span>
          </div>
        </div>
        <div className="home-hero__timing">
          {live ? (
            <HeroCountdown seconds={secondsLeft(lot.endsAt, now, offset)} />
          ) : (
            <div className="home-hero__opens">
              <span className="ag-lot__label">Abre em</span>
              <span className="home-hero__opens-date">
                {formatShortDate(lot.startsAt)}
              </span>
            </div>
          )}
        </div>
        <div>
          <Link className="ag-btn ag-btn--primary" to={`/lots/${lot.id}`}>
            {live ? 'Entrar na sala do lote' : 'Ver o lote'}
          </Link>
        </div>
      </div>
      <div className="home-hero__art">
        <div className="niche niche--hero">
          <div className="niche__stage">
            <img
              className="niche__image"
              src={lotImageUrl(lot.id)}
              alt={`Imagem de ${lot.title}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCountdown({ seconds }: { seconds: number }) {
  const { first, second, inHours } = splitLeft(seconds);
  const urgent = seconds < urgentSeconds ? ' ag-countdown--urgent' : '';

  return (
    <>
      <div
        className={`ag-countdown${urgent}`}
        role="timer"
        aria-label="Tempo restante do lote"
      >
        <div className="ag-countdown__units">
          <div className="ag-countdown__unit">
            <span className="ag-countdown__value home-countdown__value">
              {first}
            </span>
            <span className="ag-countdown__label">
              {inHours ? 'Horas' : 'Min'}
            </span>
          </div>
          <span className="ag-countdown__sep home-countdown__sep">:</span>
          <div className="ag-countdown__unit">
            <span className="ag-countdown__value home-countdown__value">
              {second}
            </span>
            <span className="ag-countdown__label">
              {inHours ? 'Min' : 'Seg'}
            </span>
          </div>
        </div>
      </div>
      <p className="home-hero__note">
        Lances nos últimos 2 minutos somam 2 minutos ao fim.
      </p>
    </>
  );
}

function FeaturedSkeleton() {
  return (
    <section className="home-hero" aria-busy="true">
      <p className="sr-only" role="status">
        Carregando o lote em destaque.
      </p>
      <div className="home-hero__text" aria-hidden="true">
        <div className="skel home-skel--kicker" />
        <div className="skel home-skel--title" />
        <div className="skel home-skel--line" />
        <div className="skel home-skel--facts" />
        <div className="skel home-skel--button" />
      </div>
      <div className="home-hero__art" aria-hidden="true">
        <div className="niche niche--hero">
          <div className="niche__stage">
            <div className="skel home-skel--art" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="home-hero home-hero--error">
      <div className="home-error" role="alert">
        <div className="ag-notice ag-notice--error">
          <span className="ag-notice__mark" aria-hidden="true">
            ✕
          </span>
          <p className="ag-notice__title">
            Não foi possível carregar o lote em destaque
          </p>
          <p className="ag-notice__text">
            Algo deu errado ao buscar o destaque. A vitrine abaixo continua
            disponível.
          </p>
        </div>
        <button
          className="ag-btn ag-btn--secondary"
          type="button"
          onClick={onRetry}
        >
          Tentar de novo
        </button>
      </div>
    </section>
  );
}
