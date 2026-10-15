import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface ChoiceInputProps<T extends string> {
  label: ReactNode;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Khung input 40px chứa group button (quy ước UI #2): nhãn bên trái, các lựa chọn
 * nằm trong cùng viền; lựa chọn đang chọn bị `disabled`. Nút là `<button>` thường
 * (như `SearchFilterInput`) vì `Button` base ép cao 40px, không lọt trong khung.
 */
export function ChoiceInput<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: ChoiceInputProps<T>): ReactNode {
  return (
    <div
      role="group"
      aria-label={typeof label === 'string' ? label : undefined}
      className={clsx(
        'flex h-10 items-center gap-1 rounded-lg border border-border-standard bg-white pl-3 pr-1',
        className,
      )}
    >
      <span className="flex-1 truncate text-[13px] text-text-secondary">{label}</span>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={active}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              'h-8 rounded-md border-0 px-3 text-[13px] font-semibold transition-colors',
              active
                ? 'cursor-default bg-brand text-white'
                : 'cursor-pointer bg-transparent text-text-secondary hover:bg-bg-brand-soft hover:text-brand',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
