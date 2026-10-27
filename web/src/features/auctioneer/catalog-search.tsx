import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../shared/api/client';
import type {
  Artwork,
  CatalogDepartment,
  CatalogSearch as SearchPage,
} from '../../shared/api/types';
import { FieldError } from '../../shared/ui/field-error';
import { Pager } from './pager';

const departments: { value: CatalogDepartment; label: string }[] = [
  {
    value: 'European Painting and Sculpture',
    label: 'Pintura e escultura europeia',
  },
  { value: 'Greek and Roman Art', label: 'Arte grega e romana' },
];

type Query = { q: string; department: CatalogDepartment; page: number };

type Search =
  | { status: 'idle' }
  | { status: 'loading'; query: Query }
  | { status: 'error'; query: Query }
  | { status: 'ready'; query: Query; result: SearchPage };

type Props = {
  selected: Artwork | null;
  onPick: (artwork: Artwork) => void;
};

export function CatalogSearch({ selected, onPick }: Props) {
  const [text, setText] = useState('');
  const [department, setDepartment] = useState<CatalogDepartment>(
    departments[0].value,
  );
  const [empty, setEmpty] = useState(false);
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const latest = useRef(0);

  async function run(query: Query) {
    const attempt = ++latest.current;
    setSearch({ status: 'loading', query });
    try {
      const result = await api.catalogSearch(
        query.q,
        query.department,
        query.page,
      );
      if (attempt === latest.current)
        setSearch({ status: 'ready', query, result });
    } catch {
      if (attempt === latest.current) setSearch({ status: 'error', query });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = text.trim();
    if (q === '') return setEmpty(true);
    void run({ q, department, page: 1 });
  }

  return (
    <div className="panel-search">
      <form className="panel-search-form" noValidate onSubmit={submit}>
        <label className="ag-field panel-search-term" htmlFor="q">
          <span className="ag-field__label">1. Buscar no acervo do museu</span>
          <span className={empty ? 'ag-input is-invalid' : 'ag-input'}>
            <span className="ag-input__prefix" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              id="q"
              className="ag-input__control panel-text"
              type="search"
              autoComplete="off"
              maxLength={100}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setEmpty(false);
              }}
              aria-invalid={empty}
              aria-describedby="q-help q-err"
            />
          </span>
          <span id="q-help" className="ag-field__hint">
            Título, artista, técnica ou lugar. Ex.: portrait, marble, Rome.
          </span>
          <FieldError
            id="q-err"
            message={empty ? 'Digite um termo para buscar no acervo.' : ''}
          />
        </label>
        <label className="ag-field panel-search-department" htmlFor="dept">
          <span className="ag-field__label">Departamento</span>
          <span className="ag-input">
            <select
              id="dept"
              className="ag-input__control panel-text panel-select"
              value={department}
              onChange={(event) =>
                setDepartment(event.target.value as CatalogDepartment)
              }
            >
              {departments.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button
          className="ag-btn ag-btn--secondary panel-search-submit"
          type="submit"
        >
          Buscar
        </button>
      </form>
      <SearchState
        search={search}
        selected={selected}
        onPick={onPick}
        onRun={run}
      />
    </div>
  );
}

type StateProps = {
  search: Search;
  selected: Artwork | null;
  onPick: (artwork: Artwork) => void;
  onRun: (query: Query) => Promise<void>;
};

function SearchState({ search, selected, onPick, onRun }: StateProps) {
  if (search.status === 'idle') return null;
  if (search.status === 'loading') return <ResultsSkeleton />;
  if (search.status === 'error')
    return (
      <div className="panel-error panel-error--row" role="alert">
        <div className="ag-notice ag-notice--error">
          <span className="ag-notice__mark" aria-hidden="true">
            ✕
          </span>
          <p className="ag-notice__title">O acervo do museu não respondeu</p>
          <p className="ag-notice__text">
            A busca está fora do ar por enquanto. Os lotes já publicados
            continuam funcionando normalmente.
          </p>
        </div>
        <button
          className="ag-btn ag-btn--secondary"
          type="button"
          onClick={() => void onRun(search.query)}
        >
          Tentar de novo
        </button>
      </div>
    );
  const { query, result } = search;
  if (result.total === 0)
    return (
      <div className="panel-empty" role="status">
        <p className="panel-empty-title">
          Nenhuma obra encontrada para “{query.q}”
        </p>
        <p className="panel-empty-text">
          Tente um termo mais amplo, como o nome de uma cidade, um material ou
          um século.
        </p>
      </div>
    );
  return (
    <Results
      query={query}
      result={result}
      selected={selected}
      onPick={onPick}
      onRun={onRun}
    />
  );
}

type ResultsProps = Omit<StateProps, 'search'> & {
  query: Query;
  result: SearchPage;
};

function Results({ query, result, selected, onPick, onRun }: ResultsProps) {
  const found =
    result.total === 1
      ? '1 obra encontrada'
      : `${result.total} obras encontradas`;

  return (
    <>
      <p className="panel-muted" role="status">
        {found} para “{query.q}”. Escolha uma para montar o lote.
      </p>
      <div className="panel-results">
        {result.items.map((artwork) => (
          <ResultCard
            key={artwork.id}
            artwork={artwork}
            selected={selected?.id === artwork.id}
            onPick={onPick}
          />
        ))}
      </div>
      <Pager
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        label="Páginas do acervo"
        onTurn={(page) => void onRun({ ...query, page })}
      />
    </>
  );
}

type CardProps = {
  artwork: Artwork;
  selected: boolean;
  onPick: (artwork: Artwork) => void;
};

function ResultCard({ artwork, selected, onPick }: CardProps) {
  return (
    <button
      className="panel-result"
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(artwork)}
    >
      <span className="panel-wall">
        <img
          className="panel-wall-image"
          src={artwork.imageUrl}
          alt=""
          loading="lazy"
        />
      </span>
      <span className="panel-result-body">
        <span className="panel-result-title">{artwork.title}</span>
        <span className="panel-result-artist">{artwork.artist}</span>
        <span
          className={
            selected ? 'panel-result-tag is-selected' : 'panel-result-tag'
          }
        >
          {selected ? `✓ Selecionada · ${artwork.type}` : artwork.type}
        </span>
      </span>
    </button>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Buscando no acervo.
      </p>
      <div className="panel-results" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="panel-result-skel">
            <div className="panel-skel panel-skel--wall" />
            <div className="panel-result-body">
              <div className="panel-skel panel-skel--line" />
              <div className="panel-skel panel-skel--short" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#745616"
      strokeWidth="2"
      strokeLinecap="square"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  );
}
