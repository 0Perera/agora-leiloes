// a API do acervo e a do livro aceitam no máximo a página 100
const maxPage = 100;

type Props = {
  page: number;
  pageSize: number;
  total: number;
  label: string;
  onTurn: (page: number) => void;
};

export function Pager({ page, pageSize, total, label, onTurn }: Props) {
  if (total <= pageSize) return null;
  const pages = Math.min(Math.ceil(total / pageSize), maxPage);

  return (
    <nav className="panel-pager" aria-label={label}>
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        disabled={page <= 1}
        onClick={() => onTurn(page - 1)}
      >
        Anterior
      </button>
      <span className="panel-muted">
        Página {page} de {pages}
      </span>
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        disabled={page >= pages}
        onClick={() => onTurn(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
