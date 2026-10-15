import { SearchOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import type { ChangeEvent, FC } from 'react';

import { Input } from './Input';
import { Tooltip } from './Tooltip';

/**
 * Props của component SearchFilterInput.
 * - onOpenFilter: Callback khi người dùng click vào icon bộ lọc nâng cao ở góc phải ô tìm kiếm.
 * - hasActiveFilter: Bật chấm xanh báo hiệu đang có bộ lọc nâng cao được áp dụng.
 */
export interface SearchFilterInputProps {
  value?: string;
  onChange?: (val: string) => void;
  onSearch?: () => void;
  onPressEnter?: () => void;
  onOpenFilter?: () => void;
  placeholder?: string;
  allowClear?: boolean;
  hasActiveFilter?: boolean;
  className?: string;
  width?: number | string;
}

const FilterSlidersIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="currentColor"
    className={className ?? 'text-brand'}
  >
    <path d="M3 5h10v2H3V5zm14 0h4v2h-4V5zm-2-2h2v6h-2V3zM3 11h4v2H3v-2zm8 0h10v2H11v-2zm-2-2h2v6H9V9zm-6 8h10v2H3v-2zm14 0h4v2h-4v-2zm-2-2h2v6h-2v-6z" />
  </svg>
);

const SEARCH_PREFIX_ICON = <SearchOutlined className="mr-1 text-[13.5px] text-text-muted" />;

/**
 * Ô tìm kiếm kết hợp nút mở bộ lọc nâng cao (SearchFilterInput):
 * Tích hợp kính lúp tìm kiếm ở đầu và icon thanh trượt lọc ở cuối.
 * Khi có bộ lọc đang hoạt động (`hasActiveFilter = true`), icon lọc sẽ hiển thị chấm màu báo hiệu.
 */
export const SearchFilterInput: FC<SearchFilterInputProps> = ({
  value = '',
  onChange,
  onSearch,
  onPressEnter,
  onOpenFilter,
  placeholder = 'Tìm kiếm',
  allowClear = true,
  hasActiveFilter = false,
  className,
  width = 300,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event.target.value);
  };

  const handlePressEnter = (): void => {
    if (onPressEnter) {
      onPressEnter();
    } else if (onSearch) {
      onSearch();
    }
  };

  return (
    <div
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
      className={clsx('relative inline-flex items-center', className)}
    >
      <Input
        value={value}
        onChange={handleChange}
        onPressEnter={handlePressEnter}
        placeholder={placeholder}
        allowClear={allowClear}
        prefix={SEARCH_PREFIX_ICON}
        suffix={
          onOpenFilter ? (
            <div className="ml-1 flex items-center border-l border-border-divider py-0.5 pl-2">
              <Tooltip title="Tìm kiếm nâng cao">
                <button
                  type="button"
                  onClick={onOpenFilter}
                  aria-label="Tìm kiếm nâng cao"
                  className="relative flex cursor-pointer items-center justify-center rounded border-0 bg-transparent p-1 text-brand transition-colors hover:!bg-bg-brand-soft hover:!text-brand-dark"
                >
                  <FilterSlidersIcon />
                  {hasActiveFilter ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-status-danger ring-2 ring-white" />
                  ) : null}
                </button>
              </Tooltip>
            </div>
          ) : null
        }
        className="!h-[40px] rounded-lg border-border-standard text-xs shadow-none transition-all hover:!border-brand focus:!border-brand"
      />
    </div>
  );
};
