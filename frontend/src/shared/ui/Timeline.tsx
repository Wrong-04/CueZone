import { Timeline as AntTimeline, type TimelineProps as AntTimelineProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Timeline (thừa hưởng từ Ant Design TimelineProps).
 */
export type TimelineProps = AntTimelineProps;

/**
 * Dòng thời gian tiến trình (Timeline):
 * Hiển thị chuỗi sự kiện theo thứ tự thời gian (như lịch sử xử lý hồ sơ, luồng phê duyệt, trạng thái bồi thường).
 */
export const Timeline: FC<TimelineProps> = ({ className, ...props }) => (
  <AntTimeline className={clsx(className)} {...props} />
);
