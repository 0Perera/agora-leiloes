import { Link } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { secondsLeft, splitLeft } from '../../shared/lib/countdown';
import { formatShortDate } from '../../shared/lib/date';
import { minimumOf, situationOf } from '../../shared/lib/live-bids';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { BidSituation } from '../../shared/ui/bid-situation';
import { LoadError } from '../../shared/ui/load-error';
import { useWalletRefresh } from '../wallet/use-wallet-refresh';
import type { Featured as FeaturedState, ReadyFeatured } from './use-featured';

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
  return <FeaturedLot room={state} now={now} />;
}

function FeaturedLot({ room, now }: { room: ReadyFeatured; now: number }) {
  const { lot, offset } = room;
  const live = lot.status === 'live';

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
        <HeroFacts lot={lot} />
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
        {live && lot.me && (
          <FeaturedSituation lot={lot} me={lot.me} top={room.bids[0]} />
        )}
        <div className="home-hero__actions">
          <Link className="ag-btn ag-btn--primary" to={`/lots/${lot.id}`}>
            {live ? 'Entrar na sala do lote' : 'Ver o lote'}
          </Link>
          <Link
            className="ag-btn ag-btn--quiet home-hero__audit"
            to={`/lots/${lot.id}/audit`}
            aria-label={`Auditar o ${lotLabel(lot.number)}`}
          >
            Auditar este lote
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

function HeroFacts({ lot }: { lot: LotDetail }) {
  const hasBids = lot.currentBid !== null;

  return (
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
  );
}

// só licitante recebe me, e só ele tem carteira para reler
function FeaturedSituation({
  lot,
  me,
  top,
}: {
  lot: LotDetail;
  me: NonNullable<LotDetail['me']>;
  top: BidHistoryItem | undefined;
}) {
  const situation = situationOf(me, top);
  useWalletRefresh(situation);
  if (situation === 'none') return null;

  return (
    <div className="home-hero__situation">
      <BidSituation situation={situation} minimum={minimumOf(lot)} />
    </div>
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
      <LoadError
        title="Não foi possível carregar o lote em destaque"
        text="Algo deu errado ao buscar o destaque. A vitrine abaixo continua disponível."
        onRetry={onRetry}
      />
    </section>
  );
}
