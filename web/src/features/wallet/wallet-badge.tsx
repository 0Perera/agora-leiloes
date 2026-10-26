import { NavLink } from 'react-router';
import { formatMoney } from '../../shared/lib/money';
import { useWallet } from './use-wallet';
import './wallet.css';

export function WalletBadge() {
  const state = useWallet();
  if (state.status !== 'ready') return null;
  const free = formatMoney(state.wallet.available);
  const held = formatMoney(state.wallet.committed);

  return (
    <NavLink
      className="wallet-scroll"
      to="/wallet"
      aria-label={`Carteira: ${free} disponíveis, ${held} em lances`}
    >
      <span className="ws-roll" aria-hidden="true" />
      <span className="ws-sheet">
        <Coin />
        <span className="ws-rows">
          <span className="ws-lbl">Disponível</span>
          <span className="ws-free">{free}</span>
          <span className="ws-lbl">Em lances</span>
          <span className="ws-held">{held}</span>
        </span>
      </span>
      <span className="ws-roll" aria-hidden="true" />
    </NavLink>
  );
}

function Coin() {
  return (
    <svg
      className="ws-coin"
      width="34"
      height="34"
      viewBox="7 7 34 34"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="17" fill="#9a7529" />
      <circle
        cx="24"
        cy="24"
        r="16.4"
        fill="none"
        stroke="#745616"
        strokeWidth=".8"
        strokeDasharray="1 1.3"
      />
      <circle
        cx="24"
        cy="24"
        r="14"
        fill="none"
        stroke="#e4cd92"
        strokeWidth="1"
        strokeDasharray="1.4 2"
      />
      <circle cx="24" cy="24" r="11" fill="#745616" />
      <path
        d="M15.5 17 A11 11 0 0 1 31 14.5"
        fill="none"
        stroke="#e4cd92"
        strokeOpacity=".35"
        strokeWidth="2"
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="11"
        fontWeight="700"
        fill="#e4cd92"
      >
        R$
      </text>
    </svg>
  );
}
