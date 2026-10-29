import { Link } from 'react-router';
import type { MyBids, MyBidsSection } from '../../shared/api/types';
import type { Load } from '../../shared/lib/load';
import { LoadError } from '../../shared/ui/load-error';
import { Pager } from '../../shared/ui/pager';
import { Tabs } from '../../shared/ui/tabs';
import { Lost } from './lost';
import { Ongoing } from './ongoing';
import { useMyBids } from './use-my-bids';
import { Won } from './won';
import './my-bids.css';

const sections: { id: MyBidsSection; label: string }[] = [
  { id: 'ongoing', label: 'Em andamento' },
  { id: 'won', label: 'Arrematados' },
  { id: 'lost', label: 'Não arrematados' },
];

export function MyBidsPage() {
  const myBids = useMyBids();

  return (
    <div className="bids-page">
      <div>
        <p className="bids-eyebrow">Seus registros</p>
        <h1 className="bids-title">Meus lances</h1>
        <p className="bids-lede">
          Acompanhe cada lote em que você deu lance, do primeiro lance ao
          arremate.
        </p>
      </div>
      <Content {...myBids} />
    </div>
  );
}

type Props = ReturnType<typeof useMyBids>;

function Content({ state, section, retry, choose, turn }: Props) {
  const { data } = state;
  if (!data)
    return state.status === 'error' ? (
      <BidsError onRetry={retry} />
    ) : (
      <PageSkeleton />
    );
  const { counts } = data;
  if (
    counts.ongoing + counts.won + counts.lost === 0 &&
    state.status !== 'error'
  )
    return <NoBids />;

  return (
    <section className="bids-section" aria-label="Seus lotes">
      <Tabs
        tabs={sections.map((item) => ({ ...item, count: counts[item.id] }))}
        active={section}
        label="Seções de meus lances"
        onSelect={choose}
      />
      <SectionBody state={state} onRetry={retry} onTurn={turn} />
    </section>
  );
}

type BodyProps = {
  state: Load<MyBids>;
  onRetry: () => void;
  onTurn: (page: number) => void;
};

function SectionBody({ state, onRetry, onTurn }: BodyProps) {
  if (state.status === 'error') return <BidsError onRetry={onRetry} />;
  if (state.status === 'loading') return <SectionSkeleton />;
  const { data } = state;

  return (
    <>
      <Items data={data} />
      <Pager
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        label="Páginas de meus lances"
        onTurn={onTurn}
      />
    </>
  );
}

function Items({ data }: { data: MyBids }) {
  if (data.section === 'ongoing') return <Ongoing items={data.items} />;
  if (data.section === 'won') return <Won items={data.items} />;
  return <Lost items={data.items} />;
}

function BidsError({ onRetry }: { onRetry: () => void }) {
  return (
    <LoadError
      title="Não foi possível carregar seus lances"
      text="Seus lances continuam registrados nos lotes. Só a consulta falhou."
      onRetry={onRetry}
    />
  );
}

function NoBids() {
  return (
    <div className="bids-none" role="status">
      <div className="bids-none__arch" aria-hidden="true" />
      <h2 className="bids-none__title">Você ainda não deu lances</h2>
      <p className="bids-none__text">
        Quando você der um lance, o lote aparece aqui até o fim do leilão,
        ganhando ou não.
      </p>
      <Link className="ag-btn ag-btn--primary" to="/">
        Ver lotes ao vivo
      </Link>
    </div>
  );
}

function PageSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando seus lances.
      </p>
      <div className="bids-skel" aria-hidden="true">
        <div className="skel bids-skel--tabs" />
        <Rows />
      </div>
    </>
  );
}

function SectionSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando seus lances.
      </p>
      <div className="bids-skel" aria-hidden="true">
        <Rows />
      </div>
    </>
  );
}

function Rows() {
  return (
    <>
      {[1, 2].map((row) => (
        <div key={row} className="skel bids-skel--plaque" />
      ))}
    </>
  );
}
