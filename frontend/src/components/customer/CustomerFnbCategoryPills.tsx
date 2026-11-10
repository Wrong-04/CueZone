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
      className="flex w-full gap-1.5 overflow-x-auto rounded-xl border border-[#3b3d40] bg-[#202124] p-1.5"
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
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              active
                ? "bg-[#111315] text-[#00bfa5]"
                : "text-[#b8c0ce] hover:bg-[#2b2d30] hover:text-white"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] ${
                active ? "bg-[#063c38] text-[#00bfa5]" : "bg-[#2e3033] text-[#aeb4be]"
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
