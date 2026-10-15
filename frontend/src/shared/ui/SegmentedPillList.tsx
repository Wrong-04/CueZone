import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface SegmentedPillItem {
  key: string;
  label: ReactNode;
  badge?: ReactNode;
  /** Tailwind bg-* class cho chấm trạng thái đầu pill (mặc định không hiện chấm). */
  dotClassName?: string;
}

export interface SegmentedPillListProps {
  items: SegmentedPillItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}

/**
 * Nhóm pill chọn 1-trong-nhiều (danh sách vụ việc/lần giám định...), bọc trong
 * khung viền, wrap nhiều dòng khi nhiều lựa chọn. Pill đang chọn tự `disabled`
 * (quy ước UI #2).
 */
export function SegmentedPillList({
  items,
  activeKey,
  onSelect,
  className,
}: SegmentedPillListProps): ReactNode {
  return (
    <div
      className={clsx(
        'inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-border-divider bg-[#f1f5f9] p-1 shadow-2xs',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            disabled={active}
            aria-pressed={active}
            onClick={() => onSelect(item.key)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[12.5px] transition-all select-none font-medium',
              active
                ? 'cursor-default !bg-white !font-bold !text-[#06a897] !shadow-2xs !border !border-black/5'
                : 'cursor-pointer !bg-transparent !text-[#64748b] hover:!bg-white/60 hover:!text-[#0f172a] !border-transparent',
            )}
          >
            {item.dotClassName ? (
              <span className={clsx('w-2 h-2 rounded-full shrink-0', item.dotClassName)} />
            ) : null}
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0',
                  active ? 'bg-[#06a897]/15 text-[#06a897]' : 'bg-gray-200/80 text-gray-600',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
