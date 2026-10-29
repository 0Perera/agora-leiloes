import { Link } from 'react-router';
import { Logo } from './logo';
import type { Session } from './session';
import { useSession } from './use-session';

const repository = 'https://github.com/0Perera/agora-leiloes';

type FooterLink = { to: string; label: string };

const browse: FooterLink[] = [
  { to: '/', label: 'Vitrine' },
  { to: '/#como-funciona', label: 'Como funciona' },
  { to: '/#auditoria', label: 'Auditoria' },
];

// leiloeiro não tem tela de carteira: /wallet é só de licitante
function accountLinks(session: Session | null): FooterLink[] {
  if (!session)
    return [
      { to: '/login', label: 'Entrar' },
      { to: '/signup', label: 'Criar conta' },
    ];
  if (session.user.role === 'AUCTIONEER')
    return [{ to: '/dashboard', label: 'Painel do leiloeiro' }];
  return [
    { to: '/my-bids', label: 'Meus lances' },
    { to: '/wallet', label: 'Carteira' },
  ];
}

export function Footer() {
  const { session } = useSession();

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
        <nav className="footer-map" aria-label="Rodapé">
          <Column id="footer-browse" title="Navegar" links={browse} />
          <Column
            id="footer-account"
            title="Sua conta"
            links={accountLinks(session)}
          />
        </nav>
      </div>
      <div className="footer-credits">
        <div className="footer-credits-line">
          <span>
            Projeto do desafio Elite Dev da Verzel ·{' '}
            <a
              className="footer-credit-link"
              href={repository}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </span>
          <span>Imagens das obras: Cleveland Museum of Art.</span>
        </div>
      </div>
    </footer>
  );
}

type ColumnProps = { id: string; title: string; links: FooterLink[] };

function Column({ id, title, links }: ColumnProps) {
  return (
    <div className="footer-column">
      <h2 id={id} className="footer-column-title">
        {title}
      </h2>
      <ul className="footer-links" aria-labelledby={id}>
        {links.map((link) => (
          <li key={link.to}>
            <Link className="footer-link" to={link.to}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
