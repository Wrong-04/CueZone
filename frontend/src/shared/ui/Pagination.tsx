import React, { useMemo } from "react";
import clsx from "clsx";

export interface PaginationProps {
  current?: number;
  page?: number;
  pageSize?: number;
  total?: number;
  unit?: string;
  itemLabel?: string;
  label?: string;
  onChange?: (page: number, pageSize?: number) => void;
  className?: string;
  showTotal?: boolean | ((total: number, range: [number, number]) => React.ReactNode);
  showSizeChanger?: boolean;
  pageSizeOptions?: string[];
  size?: "small" | "default" | "large";
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  current: propCurrent,
  page: propPage,
  pageSize = 8,
  total = 0,
  unit,
  itemLabel,
  label,
  onChange,
  className,
  showTotal = true,
  disabled = false,
}) => {
  const current = Math.max(1, propCurrent ?? propPage ?? 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);
  const displayUnit = unit || itemLabel || label || "bản ghi";

  // Phân trang thông minh: nếu > 7 trang thì rút gọn có dấu '...'
  const pages = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (current >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", current - 1, current, current + 1, "...", totalPages];
  }, [current, totalPages]);

  const handlePageChange = (newPage: number) => {
    if (disabled || newPage === current || newPage < 1 || newPage > totalPages) return;
    onChange?.(newPage, pageSize);
  };

  const renderInfo = () => {
    if (typeof showTotal === "function") {
      return showTotal(total, [start, end]);
    }
    if (showTotal === false) return null;
    return (
      <span className="text-xs sm:text-sm text-slate-700 font-medium">
        Hiển thị {start}-{end} trên tổng số {total} {displayUnit}
      </span>
    );
  };

  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white",
        className
      )}
    >
      <div>{renderInfo()}</div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        {/* Nút Trước (<) */}
        <button
          type="button"
          disabled={disabled || current <= 1}
          onClick={() => handlePageChange(current - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
          aria-label="Trang trước"
          title="Trang trước"
        >
          &lt;
        </button>

        {/* Các nút số trang */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-6 text-center text-slate-400 text-xs font-bold select-none"
              >
                ...
              </span>
            );
          }
          const isCurrent = p === current;
          return (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => handlePageChange(p)}
              className={clsx(
                "min-w-7 h-7 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition",
                isCurrent
                  ? "bg-emerald-600 text-white shadow-xs border border-emerald-600"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              )}
            >
              {p}
            </button>
          );
        })}

        {/* Nút Sau (>) */}
        <button
          type="button"
          disabled={disabled || current >= totalPages}
          onClick={() => handlePageChange(current + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
          aria-label="Trang sau"
          title="Trang sau"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
