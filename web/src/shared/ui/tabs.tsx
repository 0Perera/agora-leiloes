import './tabs.css';

export type Tab<T extends string> = { id: T; label: string; count?: number };

type Props<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  label: string;
  onSelect: (id: T) => void;
};

export function Tabs<T extends string>({
  tabs,
  active,
  label,
  onSelect,
}: Props<T>) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className="tabs__tab"
          type="button"
          aria-pressed={active === tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <>
              {' '}
              <span className="tabs__count">({tab.count})</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
