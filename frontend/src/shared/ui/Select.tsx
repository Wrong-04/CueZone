import { Select as AntSelect, type SelectProps as AntSelectProps } from 'antd';
import clsx from 'clsx';

/**
 * Props của component Select (thừa hưởng từ Ant Design SelectProps có kiểu generic T).
 */
export type SelectProps<T = unknown> = AntSelectProps<T>;

function InternalSelect<T = unknown>({ className, ...props }: SelectProps<T>) {
  return <AntSelect<T> className={clsx(className)} {...props} />;
}

/**
 * Hộp chọn danh sách thả xuống (Select):
 * Cho phép người dùng chọn 1 hoặc nhiều giá trị từ danh sách tùy chọn (options).
 * Đính kèm sẵn `Select.Option` và `Select.OptGroup`.
 */
export const Select = Object.assign(InternalSelect, {
  Option: AntSelect.Option,
  OptGroup: AntSelect.OptGroup,
});
