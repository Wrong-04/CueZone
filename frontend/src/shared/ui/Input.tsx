import {
  Input as AntInput,
  type GetProps,
  type InputProps as AntInputProps,
  type InputRef as AntInputRef,
} from "antd";
import type {
  TextAreaProps as AntTextAreaProps,
  PasswordProps as AntPasswordProps,
  SearchProps as AntSearchProps,
} from "antd/es/input";
import clsx from "clsx";
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from "react";

export type InputProps = AntInputProps;

export type InputRef = AntInputRef;

export type TextAreaProps = AntTextAreaProps;

export type PasswordProps = AntPasswordProps;

export type SearchProps = AntSearchProps;

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

InternalInput.displayName = "Input";

export const Input: CompoundedInput = Object.assign(InternalInput as CompoundedInput, {
  TextArea: AntInput.TextArea,
  Password: AntInput.Password,
  Search: AntInput.Search,
  Group: AntInput.Group,
  OTP: AntInput.OTP,
});
