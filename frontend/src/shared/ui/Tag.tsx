import { Tag as AntTag, type TagProps as AntTagProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Tag (thừa hưởng từ Ant Design TagProps).
 */
export type TagProps = AntTagProps;

type CompoundedTag = FC<TagProps> & {
  CheckableTag: typeof AntTag.CheckableTag;
};

/**
 * Thẻ nhãn phân loại / trạng thái (Tag):
 * Dùng để gắn nhãn danh mục, trạng thái (ví dụ: Chờ duyệt, Đã thanh toán, Huỷ bỏ) kèm màu sắc tương ứng.
 * Hỗ trợ `Tag.CheckableTag` để cho phép bật/tắt chọn thẻ nhãn.
 */
export const Tag: CompoundedTag = Object.assign(
  (({ className, ...props }: TagProps) => (
    <AntTag className={clsx('font-medium', className)} {...props} />
  )) as FC<TagProps>,
  {
    CheckableTag: AntTag.CheckableTag,
  },
);
