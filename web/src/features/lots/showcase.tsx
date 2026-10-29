import type { LotShowcase, LotStatus } from '../../shared/api/types';
import { LoadError } from '../../shared/ui/load-error';
import { Pager } from '../../shared/ui/pager';
import { Tabs } from '../../shared/ui/tabs';
import { LotCard } from './lot-card';
import { useShowcase } from './use-showcase';

const tabs: { id: LotStatus; label: string }[] = [
  { id: 'live', label: 'Ao vivo' },
  { id: 'scheduled', label: 'Agendados' },
  { id: 'ended', label: 'Encerrados' },
];

const empties: Record<
  LotStatus,
  { title: string; text: string; action: string; to: LotStatus }
> = {
  live: {
    title: 'Nenhum lote ao vivo agora',
    text: 'Os próximos leilões já estão agendados. Veja quando abrem os lances.',
    action: 'Ver agendados',
    to: 'scheduled',
  },
  scheduled: {
    title: 'Nenhum lote agendado',
    text: 'Assim que o leiloeiro publicar novos lotes, eles aparecem aqui.',
    action: 'Ver lotes ao vivo',
    to: 'live',
  },
  ended: {
    title: 'Nenhum lote encerrado ainda',
    text: 'Os resultados aparecem aqui quando a contagem de um lote chegar a zero.',
    action: 'Ver lotes ao vivo',
    to: 'live',
  },
};

const noCounts: Record<LotStatus, number> = { live: 0, scheduled: 0, ended: 0 };

type Props = {
  now: number;
  offset: number;
};

export function Showcase({ now, offset }: Props) {
  const view = useShowcase();
  const counts = view.impossible ? noCounts : view.showcase.data?.counts;

  return (
    <section className="home-showcase" aria-labelledby="vitrine-title">
      <header className="ag-section">
        <h2 id="vitrine-title" className="ag-section__title">
          A vitrine
        </h2>
        <div className="ag-meander home-showcase__meander" />
        <p className="ag-section__lede">
          Obras do acervo clássico europeu, separadas por momento do leilão.
        </p>
      </header>

      <div className="home-toolbar">
        <Tabs
          tabs={tabs.map((tab) => ({ ...tab, count: counts?.[tab.id] }))}
          active={view.tab}
          label="Estado dos lotes"
          onSelect={view.choose}
        />
        <label className="home-search">
          <span className="ag-field__label">Buscar na vitrine</span>
          <span className="ag-input home-search__box">
            <span className="ag-input__prefix" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5L21 21" />
              </svg>
            </span>
            <input
              className="ag-input__control home-search__control"
              type="search"
              maxLength={100}
              placeholder="Obra, artista ou lote"
              value={view.text}
              onChange={(event) => view.type(event.target.value)}
            />
          </span>
        </label>
      </div>

      <ShowcaseBody view={view} now={now} offset={offset} />
    </section>
  );
}

type View = ReturnType<typeof useShowcase>;

function ShowcaseBody({
  view,
  now,
  offset,
}: {
  view: View;
  now: number;
  offset: number;
}) {
  if (view.impossible) return <NoMatch onClear={view.clear} />;
  const { showcase } = view;
  if (showcase.status === 'loading') return <ShowcaseSkeleton />;
  if (showcase.status === 'error')
    return <ShowcaseError onRetry={view.retry} />;
  if (showcase.data.total === 0) {
    return view.searching ? (
      <NoMatch onClear={view.clear} />
    ) : (
      <EmptyTab tab={view.tab} onGo={view.choose} />
    );
  }
  return <LotGrid data={showcase.data} view={view} now={now} offset={offset} />;
}

function LotGrid({
  data,
  view,
  now,
  offset,
}: {
  data: LotShowcase;
  view: View;
  now: number;
  offset: number;
}) {
  return (
    <>
      <div className="home-grid">
        {data.items.map((lot) => (
          <LotCard key={lot.id} lot={lot} now={now} offset={offset} />
        ))}
      </div>
      <Pager
        page={view.page}
        pageSize={data.pageSize}
        total={data.total}
        label="Páginas da vitrine"
        onTurn={view.turn}
      />
    </>
  );
}

function ShowcaseSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando lotes da vitrine.
      </p>
      <div className="home-grid" aria-hidden="true">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="home-skel-card">
            <div className="niche">
              <div className="niche__stage">
                <div className="skel home-skel--card-art" />
              </div>
            </div>
            <div className="home-skel-card__strip" />
            <div className="home-skel-card__body">
              <div className="skel home-skel--number" />
              <div className="skel home-skel--card-title" />
              <div className="skel home-skel--artist" />
              <div className="skel home-skel--meta" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ShowcaseError({ onRetry }: { onRetry: () => void }) {
  return (
    <LoadError
      title="Não foi possível carregar a vitrine"
      text="Algo deu errado ao buscar os lotes. Seus lances e seu saldo não foram afetados."
      onRetry={onRetry}
      centered
    />
  );
}

function EmptyTab({
  tab,
  onGo,
}: {
  tab: LotStatus;
  onGo: (tab: LotStatus) => void;
}) {
  const empty = empties[tab];
  return (
    <div className="home-empty" role="status">
      <div className="home-empty__arch" aria-hidden="true" />
      <h3 className="home-empty__title">{empty.title}</h3>
      <p className="home-empty__text">{empty.text}</p>
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        onClick={() => onGo(empty.to)}
      >
        {empty.action}
      </button>
    </div>
  );
}

function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="home-nomatch">
      <div className="ag-notice ag-notice--info" role="status">
        <span className="ag-notice__mark" aria-hidden="true">
          i
        </span>
        <p className="ag-notice__title">Nenhum lote encontrado</p>
        <p className="ag-notice__text">
          Nada nesta aba corresponde à busca. Tente outro nome de obra, artista
          ou número de lote.
        </p>
      </div>
      <button
        className="ag-btn ag-btn--quiet home-nomatch__clear"
        type="button"
        onClick={onClear}
      >
        Limpar busca
      </button>
    </div>
  );
}
