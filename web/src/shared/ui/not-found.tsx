import { Link } from 'react-router';
import './not-found.css';

type Props = {
  kicker: string;
  title: string;
  text: string;
  back: string;
};

export function NotFound({ kicker, title, text, back }: Props) {
  return (
    <div className="not-found" role="alert">
      <p className="not-found__kicker">{kicker}</p>
      <h1 className="not-found__title">{title}</h1>
      <p className="not-found__text">{text}</p>
      <Link className="ag-btn ag-btn--secondary" to="/">
        {back}
      </Link>
    </div>
  );
}
