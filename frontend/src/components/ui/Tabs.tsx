type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export default function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className="inline-flex rounded-control border border-border bg-surface p-1" role="tablist" aria-label="Email views">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={`min-h-9 rounded-[6px] px-4 text-sm font-semibold transition ${activeId === item.id ? 'bg-primary-tint text-primary shadow-sm' : 'text-muted hover:text-text'}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}