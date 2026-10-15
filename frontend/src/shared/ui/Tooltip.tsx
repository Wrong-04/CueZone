import { Tooltip as AntTooltip, type TooltipProps as AntTooltipProps } from 'antd';
import type { FC } from 'react';

/**
 * Props của component Tooltip (thừa hưởng từ Ant Design TooltipProps).
 */
export type TooltipProps = AntTooltipProps;

/**
 * Chú thích giải thích nhanh (Tooltip):
 * Hiển thị một khung chú thích nhỏ giải thích ý nghĩa của nút bấm, nhãn hoặc icon khi hover chuột qua.
 */
export const Tooltip: FC<TooltipProps> = (props) => {
  return <AntTooltip {...props} />;
};
