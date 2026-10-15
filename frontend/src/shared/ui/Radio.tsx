import {
  Radio as AntRadio,
  type RadioChangeEvent,
  type RadioGroupProps as AntRadioGroupProps,
  type RadioProps as AntRadioProps,
} from 'antd';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

/**
 * Sự kiện khi thay đổi lựa chọn Radio.
 */
export type { RadioChangeEvent };

/**
 * Props của component Radio đơn lẻ.
 */
export interface RadioProps extends Pick<
  AntRadioProps,
  'checked' | 'defaultChecked' | 'disabled' | 'onChange' | 'name' | 'value' | 'id' | 'autoFocus'
> {
  children?: ReactNode;
  className?: string;
}

/**
 * Props của component RadioGroup (nhóm nhiều nút radio).
 */
export interface RadioGroupProps extends Pick<
  AntRadioGroupProps,
  | 'value'
  | 'defaultValue'
  | 'disabled'
  | 'onChange'
  | 'name'
  | 'options'
  | 'optionType'
  | 'buttonStyle'
  | 'size'
  | 'id'
> {
  children?: ReactNode;
  className?: string;
}

const RadioComponent: FC<RadioProps> = ({ children, className, ...rest }) => (
  <AntRadio className={clsx('text-[13px] text-text-secondary', className)} {...rest}>
    {children}
  </AntRadio>
);

/**
 * Nhóm các nút chọn một (RadioGroup):
 * Gom nhóm nhiều lựa chọn radio, chỉ cho phép chọn duy nhất 1 mục tại một thời điểm.
 */
const RadioGroup: FC<RadioGroupProps> = ({ children, className, ...rest }) => (
  <AntRadio.Group className={clsx(className)} {...rest}>
    {children}
  </AntRadio.Group>
);

export type RadioType = typeof RadioComponent & {
  Group: typeof RadioGroup;
  Button: typeof AntRadio.Button;
};

/**
 * Nút chọn một (Radio):
 * Cho phép người dùng chọn một phương án duy nhất trong một tập hợp các phương án loại trừ lẫn nhau.
 * Đính kèm sẵn `Radio.Group` và `Radio.Button`.
 */
export const Radio = RadioComponent as RadioType;
Radio.Group = RadioGroup;
Radio.Button = AntRadio.Button;
export { RadioGroup };
