import {
  Col as AntCol,
  Row as AntRow,
  type ColProps as AntColProps,
  type RowProps as AntRowProps,
} from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Row (dòng trong hệ thống lưới 24 cột).
 */
export type RowProps = AntRowProps;

/**
 * Props của component Col (cột trong hệ thống lưới 24 cột).
 */
export type ColProps = AntColProps;

/**
 * Dòng bố cục (Row):
 * Khung hàng ngang chứa các cột `Col`, hỗ trợ chia khoảng cách `gutter` linh hoạt.
 */
export const Row: FC<RowProps> = ({ className, ...props }) => (
  <AntRow className={clsx(className)} {...props} />
);

/**
 * Cột bố cục (Col):
 * Phân chia độ rộng theo hệ thống 24 cột (span, offset, responsive breakpoint: xs, sm, md, lg, xl).
 */
export const Col: FC<ColProps> = ({ className, ...props }) => (
  <AntCol className={clsx(className)} {...props} />
);
