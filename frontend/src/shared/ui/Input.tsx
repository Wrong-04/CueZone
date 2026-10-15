import {
  Input as AntInput,
  type GetProps,
  type InputProps as AntInputProps,
  type InputRef as AntInputRef,
} from 'antd';
import type {
  TextAreaProps as AntTextAreaProps,
  PasswordProps as AntPasswordProps,
  SearchProps as AntSearchProps,
} from 'antd/es/input';
import clsx from 'clsx';
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';

/**
 * Props của component Input cơ bản.
 */
export type InputProps = AntInputProps;

/**
 * Ref tham chiếu tới thẻ input DOM.
 */
export type InputRef = AntInputRef;

/**
 * Props cho ô nhập văn bản nhiều dòng (TextArea).
 */
export type TextAreaProps = AntTextAreaProps;

/**
 * Props cho ô nhập mật khẩu (Password).
 */
export type PasswordProps = AntPasswordProps;

/**
 * Props cho ô tìm kiếm (Search).
 */
export type SearchProps = AntSearchProps;

/**
 * Props cho ô nhập mã xác thực OTP.
 */
export type OTPProps = GetProps<typeof AntInput.OTP>;

type CompoundedInput = ForwardRefExoticComponent<InputProps & RefAttributes<InputRef>> & {
  TextArea: typeof AntInput.TextArea;
  Password: typeof AntInput.Password;
  Search: typeof AntInput.Search;
  Group: typeof AntInput.Group;
  OTP: typeof AntInput.OTP;
};

const InternalInput = forwardRef<InputRef, InputProps>(({ className, ...props }, ref) => (
  <AntInput ref={ref} className={clsx(className)} {...props} />
));

InternalInput.displayName = 'Input';

/**
 * Ô nhập liệu cơ bản (Input):
 * Hỗ trợ forwardRef và đính kèm sẵn các biến thể: `Input.TextArea`, `Input.Password`, `Input.Search`, `Input.Group`, `Input.OTP`.
 */
export const Input: CompoundedInput = Object.assign(InternalInput as CompoundedInput, {
  TextArea: AntInput.TextArea,
  Password: AntInput.Password,
  Search: AntInput.Search,
  Group: AntInput.Group,
  OTP: AntInput.OTP,
});
