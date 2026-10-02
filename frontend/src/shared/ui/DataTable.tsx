import { DownloadOutlined } from '@ant-design/icons';
import { type TablePaginationConfig } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import clsx from 'clsx';
import { useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from './Button';
import { Card } from './Card';
import { Pagination } from './Pagination';
import { Table, type ColumnsType } from './Table';

/**
 * Props của component DataTable:
 * Hỗ trợ phân trang, padding dòng trống để cố định chiều cao bảng, xuất Excel, chọn dòng (checkbox), click dòng,...
 */
export interface DataTableProps<T> {
  title?: ReactNode;
  total?: number;
  totalText?: string;
  extra?: ReactNode;
  onExport?: () => void;
  exportText?: string;
  columns: ColumnsType<T>;
  dataSource: T[];
  rowKey?: string | ((record: T, index?: number) => string | number);
  loading?: boolean;
  page?: number;
  pageSize?: number;
  minRows?: number;
  padEmptyRows?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
  pagination?: boolean | TablePaginationConfig;
  onRowClick?: (record: T, index?: number) => void;
  className?: string;
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string | true; y?: number | string };
  /**
   * Render the table alone — no Card wrapper, no title/total header bar and
   * none of the `eclaim-data-table` chrome. For tables nested inside another
   * card, where the default card-in-card styling reads wrong.
   */
  bare?: boolean;
  /** AntD Table's `bordered`. Bật sẵn — tắt chỉ khi thật sự cần bảng không viền. */
  bordered?: boolean;
  /** Chọn nhiều dòng bằng checkbox. Dòng đệm luôn bị khoá, không chọn được. */
  rowSelection?: TableRowSelection<T>;
  /** AntD Table's `summary`, for a totals row. Receives the real rows only — never the padding placeholders. */
  summary?: (data: readonly T[]) => ReactNode;
  /** Per-row class. Applied on real rows only; placeholder rows keep their own class. */
  rowClassName?: (record: T, index?: number) => string;
}

interface PlaceholderRow {
  __isPlaceholder: true;
  __placeholderKey: string;
}

function isPlaceholder(record: unknown): record is PlaceholderRow {
  return typeof record === 'object' && record !== null && '__isPlaceholder' in record;
}

const CARD_BODY_STYLES = {
  body: { padding: 0, display: 'flex', flexDirection: 'column' as const, flex: 1, minHeight: 0 },
};

/**
 * Bảng dữ liệu nghiệp vụ hoàn chỉnh (DataTable):
 * Tích hợp sẵn khung Card, thanh tiêu đề đếm tổng số bản ghi, nút Xuất Excel, tự động chèn dòng đệm (minRows) giữ bảng cố định độ cao và phân trang chuẩn.
 */
export function DataTable<T extends object>({
  title,
  total,
  totalText,
  extra,
  onExport,
  exportText = 'Xuất Excel',
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  page = 1,
  pageSize = 20,
  minRows = 20,
  padEmptyRows = true,
  onPageChange,
  pagination = true,
  onRowClick,
  className,
  size = 'small',
  scroll,
  bare = false,
  // Viền ô là một phần của kiểu bảng chuẩn (giống bảng "Lịch sử tổn thất"),
  // nên bật mặc định thay vì để từng nơi gọi tự bật.
  bordered = true,
  summary,
  rowClassName,
  rowSelection,
}: DataTableProps<T>): ReactNode {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(page);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  const currentPage = page ?? internalPage;
  const currentPageSize = pageSize ?? internalPageSize;

  const totalCount = total ?? dataSource.length;

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setInternalPage(newPage);
    setInternalPageSize(newPageSize);
    onPageChange?.(newPage, newPageSize);
  };

  const pagedData = useMemo(() => {
    if (pagination === false) return dataSource;
    if (total != null && total !== dataSource.length) return dataSource;
    const start = (currentPage - 1) * currentPageSize;
    return dataSource.slice(start, start + currentPageSize);
  }, [dataSource, pagination, total, currentPage, currentPageSize]);

  const displayDataSource = useMemo<(T | PlaceholderRow)[]>(() => {
    if (!padEmptyRows || minRows <= 0 || pagedData.length >= minRows) return pagedData;
    const padded: (T | PlaceholderRow)[] = [...pagedData];
    for (let i = pagedData.length; i < minRows; i++) {
      padded.push({ __isPlaceholder: true, __placeholderKey: `__empty_row_${i}` });
    }
    return padded;
  }, [pagedData, padEmptyRows, minRows]);

  const wrappedColumns: ColumnsType<T | PlaceholderRow> = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        render: (value, record, index) => {
          if (isPlaceholder(record)) return ' ';
          const original = (col as { render?: (v: unknown, r: T, i: number) => ReactNode }).render;
          return original ? original(value, record as T, index) : ((value as ReactNode) ?? '');
        },
      })) as ColumnsType<T | PlaceholderRow>,
    [columns],
  );

  const displayTotalText = totalText ?? `${totalCount} bản ghi`;

  const wrappedSummary = useMemo(() => {
    if (!summary) return undefined;
    return (data: readonly (T | PlaceholderRow)[]) => {
      const realRows = data.filter((r) => !isPlaceholder(r)) as readonly T[];
      return summary(realRows);
    };
  }, [summary]);

  const wrappedRowSelection = useMemo(() => {
    if (!rowSelection) return undefined;
    const { getCheckboxProps, ...rest } = rowSelection;
    return {
      ...rest,
      // Dòng đệm không phải bản ghi thật nên không bao giờ được chọn.
      getCheckboxProps: (record: T | PlaceholderRow) =>
        isPlaceholder(record) ? { disabled: true } : (getCheckboxProps?.(record as T) ?? {}),
    } as TableRowSelection<T | PlaceholderRow>;
  }, [rowSelection]);

  const tableNode = (
    <Table<T | PlaceholderRow>
      columns={wrappedColumns}
      dataSource={displayDataSource}
      rowKey={(record) =>
        isPlaceholder(record)
          ? record.__placeholderKey
          : typeof rowKey === 'function'
            ? rowKey(record)
            : ((record as Record<string, string | number>)[rowKey] ??
              (record as Record<string, string | number>).id ??
              (record as Record<string, string | number>).key ??
              'row')
      }
      loading={loading}
      pagination={false}
      size={size}
      scroll={scroll}
      bordered={bordered}
      // Khi khung ngoài là nơi cuộn dọc, nhờ AntD ghim header vào chính khung
      // đó. `position: sticky` tự viết không dùng được vì `.ant-table-content`
      // (cuộn ngang) chen vào giữa và trở thành scrollport gần nhất.
      sticky={scroll?.y ? undefined : { getContainer: () => wrapperRef.current ?? window }}
      rowSelection={wrappedRowSelection}
      summary={wrappedSummary}
      onRow={(record, index) =>
        isPlaceholder(record)
          ? { className: 'empty-placeholder-row select-none pointer-events-none' }
          : {
              onClick: onRowClick ? () => onRowClick(record, index) : undefined,
              className: clsx(
                onRowClick && 'cursor-pointer hover:bg-bg-app',
                rowClassName?.(record, index),
              ),
            }
      }
    />
  );

  // Mỗi trục chỉ được có ĐÚNG MỘT khung cuộn, nếu không sẽ thấy hai thanh cuộn
  // lồng nhau: khi caller đặt `scroll.y`, AntD tự tạo `.ant-table-body` cuộn cả
  // hai trục nên khung ngoài phải cắt; khi có `scroll.x`, AntD cuộn ngang trong
  // `.ant-table-content` nên khung ngoài chỉ giữ trục dọc.
  const wrapperOverflow = scroll?.y
    ? 'overflow-hidden'
    : scroll?.x
      ? 'overflow-x-hidden overflow-y-auto'
      : 'overflow-auto';

  const paginationNode =
    pagination !== false ? (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-divider bg-white px-4 py-2.5">
        <span className="text-[12.5px] text-text-secondary">
          {totalCount > 0
            ? `Hiển thị ${Math.min((currentPage - 1) * currentPageSize + 1, totalCount)}-${Math.min(currentPage * currentPageSize, totalCount)} trên ${totalCount} bản ghi`
            : '0 bản ghi'}
        </span>
        <Pagination
          current={currentPage}
          pageSize={currentPageSize}
          total={totalCount}
          onChange={handlePageChange}
          // DataTable renders the record count itself, to the left of the pager.
          showTotal={() => null}
        />
      </div>
    ) : null;

  if (bare) {
    return (
      <div
        ref={wrapperRef}
        className={clsx('eclaim-data-table flex flex-1 flex-col', wrapperOverflow, className)}
      >
        {tableNode}
        {paginationNode}
      </div>
    );
  }

  return (
    <Card
      variant="borderless"
      className={clsx(
        'flex w-full flex-col overflow-hidden rounded-lg border-none bg-bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        className,
      )}
      styles={CARD_BODY_STYLES}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-divider bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          {title ? <span className="text-[13.5px] font-bold text-text-main">{title}</span> : null}
          {displayTotalText ? (
            <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[12px] font-medium text-text-muted">
              {displayTotalText}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExport ? (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={onExport}
              className="flex items-center gap-1 rounded border-border-divider px-2.5 text-xs text-text-secondary hover:!border-brand hover:!text-brand"
            >
              {exportText}
            </Button>
          ) : null}
          {extra}
        </div>
      </div>

      <div
        ref={wrapperRef}
        className={clsx('eclaim-data-table flex min-h-0 flex-1 flex-col', wrapperOverflow)}
      >
        {tableNode}
      </div>
      {paginationNode}
    </Card>
  );
}
