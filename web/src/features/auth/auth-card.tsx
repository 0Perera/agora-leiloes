import { NavLink } from 'react-router';
import type { ReactNode } from 'react';
import './auth.css';

const steps = [
  'Licitantes depositam saldo simulado e dão lances ao vivo.',
  'Leiloeiros publicam lotes com obras do acervo do museu.',
  'Todo lote tem auditoria pública, sem precisar de conta.',
];

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-split">
      <Portal />
      <section className="auth-card" aria-label="Acesso">
        <nav
          className="auth-tabs"
          aria-label="Escolha entre entrar e criar conta"
        >
          <NavLink className="auth-tab" to="/login">
            Entrar
          </NavLink>
          <NavLink className="auth-tab" to="/signup">
            Criar conta
          </NavLink>
        </nav>
        {children}
      </section>
    </div>
  );
}

function Portal() {
  return (
    <section className="auth-portal on-dark" aria-label="Sobre a Ágora">
      <div>
        <p className="portal-kicker">Casa de leilões de arte clássica</p>
        <p className="portal-name">ÁGORA</p>
        <p className="portal-lede">
          Como na praça de Atenas: tudo à vista, e qualquer pessoa pode
          conferir.
        </p>
      </div>
      <Arch />
      <ol className="portal-list">
        {steps.map((step, index) => (
          <li key={step} className="portal-step">
            <span className="portal-step-num">{index + 1}</span>
            <span className="portal-step-text">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Arch() {
  return (
    <svg
      className="portal-arch"
      viewBox="0 0 280 230"
      width="280"
      height="230"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="10"
        width="260"
        height="400"
        rx="130"
        ry="130"
        fill="none"
        stroke="#e4cd92"
        strokeWidth="2"
      />
      <rect
        x="34"
        y="34"
        width="212"
        height="400"
        rx="106"
        ry="106"
        fill="none"
        stroke="#e4cd92"
        strokeWidth="1"
      />
      <rect
        x="58"
        y="58"
        width="164"
        height="400"
        rx="82"
        ry="82"
        fill="#1f4b96"
      />
      <rect
        x="82"
        y="82"
        width="116"
        height="400"
        rx="58"
        ry="58"
        fill="#9a7529"
      />
      <rect
        x="106"
        y="106"
        width="68"
        height="400"
        rx="34"
        ry="34"
        fill="#b23a1f"
      />
    </svg>
  );
}
