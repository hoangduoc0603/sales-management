import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  selectedId: string;
  onChange(id: string): void;
}

export function Tabs({ items, onChange, selectedId }: TabsProps) {
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  return (
    <div className="cn-tabs">
      <div className="cn-tab-list" role="tablist">
        {items.map((item) => (
          <button
            aria-controls={`panel-${item.id}`}
            aria-selected={item.id === selected?.id}
            className="cn-tab"
            id={`tab-${item.id}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {selected ? (
        <div
          aria-labelledby={`tab-${selected.id}`}
          className="cn-tab-panel"
          id={`panel-${selected.id}`}
          role="tabpanel"
        >
          {selected.content}
        </div>
      ) : null}
    </div>
  );
}
