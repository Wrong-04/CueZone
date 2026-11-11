interface CustomerFnbCategoryPillsProps {
  items: Array<{ key: string; label: string; badge: number }>;
  activeKey: string;
  onSelect: (key: string) => void;
}

export function CustomerFnbCategoryPills({
  items,
  activeKey,
  onSelect,
}: CustomerFnbCategoryPillsProps) {
  return (
    <div
      role="tablist"
      aria-label="Lọc danh mục thực đơn"
      className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-2xs"
    >
      {items.map((item) => {
        const active = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              active
                ? "bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200/80 text-slate-500"
              }`}
            >
              {item.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
