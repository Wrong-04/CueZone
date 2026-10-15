import {
  Checkbox as AntCheckbox,
  type GetProps,
  type CheckboxProps as AntCheckboxProps,
} from 'antd';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

/**
 * Props của component Checkbox (kế thừa các thuộc tính chọn lọc từ Ant Design CheckboxProps).
 */
export interface CheckboxProps extends Pick<
  AntCheckboxProps,
  'checked' | 'defaultChecked' | 'disabled' | 'indeterminate' | 'onChange' | 'name' | 'value'
> {
  children?: ReactNode;
  className?: string;
  /** Nhãn cho trình đọc màn hình khi checkbox không có children (vd dùng thay icon ở tiêu đề section). */
  'aria-label'?: string;
}

/**
 * Props của component CheckboxGroup (nhóm nhiều hộp kiểm).
 */
export type CheckboxGroupProps = GetProps<typeof AntCheckbox.Group>;

const CheckboxComponent: FC<CheckboxProps> = ({ children, className, ...rest }) => (
  <AntCheckbox className={clsx('text-[13px] text-text-secondary', className)} {...rest}>
    {children}
  </AntCheckbox>
);

export type CompoundedCheckbox = FC<CheckboxProps> & {
  Group: typeof AntCheckbox.Group;
};

/**
 * Hộp kiểm (Checkbox):
 * Cho phép người dùng chọn một hoặc nhiều mục, đã căn chỉnh cỡ chữ và màu sắc theo theme hệ thống.
 * Đính kèm sẵn `Checkbox.Group`.
 */
export const Checkbox: CompoundedCheckbox = Object.assign(CheckboxComponent as CompoundedCheckbox, {
  Group: AntCheckbox.Group,
});
