import { Link } from 'react-router';
import { Logo } from './logo';

const repository = 'https://github.com/0Perera/agora-leiloes';

export function Footer() {
  return (
    <footer className="footer on-dark">
      <div className="ag-meander ag-meander--light footer-meander" />
      <div className="footer-body">
        <div className="footer-brand">
          <Logo className="footer-logo" />
          <div className="footer-identity">
            <span className="footer-name">ÁGORA</span>
            <span className="footer-motto">
              Casa de leilões de arte clássica
            </span>
          </div>
        </div>
        <nav className="footer-nav" aria-label="Rodapé">
          <Link className="footer-link" to="/#como-funciona">
            Como funciona
          </Link>
          <Link className="footer-link" to="/#auditoria">
            Auditoria
          </Link>
          <a
            className="footer-link"
            href={repository}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
      <div className="footer-credits">
        <span>Projeto do desafio Elite Dev da Verzel</span>
        <span>Imagens das obras: Cleveland Museum of Art.</span>
      </div>
    </footer>
  );
}
